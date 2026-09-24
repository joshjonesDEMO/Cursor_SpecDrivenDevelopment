import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import { evaluate, inFileMap, parseEnforce, parseFileMap, parseStatus } from "./enforce-gates.mjs";

const HOOK = fileURLToPath(new URL("./enforce-gates.mjs", import.meta.url));
const ALLOW = { permission: "allow" };
let root;

function write(rel, text) {
  const path = join(root, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
}

function spec(status, extra = "") {
  return `# Spec: Lockout\n\n**Status:** ${status}\n**Track:** Full\n${extra}`;
}

function call(rel, { conversation = "conv-1", tool = "Write", content, roots = [root] } = {}) {
  const tool_input = { file_path: join(root, rel) };
  if (content !== undefined) tool_input.content = content;
  return evaluate({ hook_event_name: "preToolUse", tool_name: tool, conversation_id: conversation, workspace_roots: roots, tool_input });
}

const PLAN = `# Plan

## File map

| File | Change | Covers |
|------|--------|--------|
| \`src/auth/lockout.ts\` | Create | FR-003 |
| \`src/auth/login.ts\`, \`src/auth/session.ts\` | Modify | FR-003 |
| \`src/auth/**/*.test.ts\` | Tests | FR-003 |
| \`src/migrations\` | New migration | FR-004 |

## Test strategy

| \`src/unrelated.ts\` | not a file map row |
`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sdd-repo-"));
  process.env.SDD_GATES_STATE_DIR = mkdtempSync(join(tmpdir(), "sdd-state-"));
  write("specs/constitution.md", "## Workflow settings\n\n- Enforce gates: on\n");
});

test("allows everything when enforcement is off", () => {
  write("specs/constitution.md", "- Enforce gates: off\n");
  call("specs/001-lockout/spec.md", { content: spec("Draft") });
  assert.deepEqual(call("src/auth/lockout.ts"), ALLOW);
});

test("does not touch conversations that never edited a spec", () => {
  write("specs/001-lockout/spec.md", spec("Draft"));
  assert.deepEqual(call("src/auth/lockout.ts", { conversation: "other" }), ALLOW);
});

test("the first write creating spec.md binds the conversation and blocks code", () => {
  assert.deepEqual(call("specs/001-lockout/spec.md", { content: spec("Draft") }), ALLOW);
  write("specs/001-lockout/spec.md", spec("Draft"));
  assert.equal(call("src/auth/lockout.ts").permission, "deny");
  assert.equal(call("src/auth/lockout.ts", { tool: "Delete" }).permission, "deny");
  assert.deepEqual(call("specs/001-lockout/plan.md", { content: "# Plan" }), ALLOW);
});

test("once tasks are approved, allows file-map edits and denies the rest", () => {
  write("specs/001-lockout/spec.md", spec("In progress"));
  write("specs/001-lockout/plan.md", PLAN);
  call("specs/001-lockout/tasks.md", { content: "# Tasks" });
  for (const path of [
    "src/auth/lockout.ts",
    "src/auth/session.ts",
    "src/auth/lockout.test.ts",
    "src/auth/deep/nested.test.ts",
    "src/migrations/004_lockout.sql",
  ]) {
    assert.deepEqual(call(path), ALLOW, path);
  }
  assert.equal(call("src/unrelated.ts").permission, "deny");
});

test("reads the Lite file map from spec.md when there is no plan.md", () => {
  const lite = spec("Tasks approved", `\n## Plan\n\n### File map\n\n| File | Change |\n|---|---|\n| \`src/tweak.ts\` | Modify |\n\n## Tasks\n`);
  call("specs/002-tweak/spec.md", { content: lite });
  write("specs/002-tweak/spec.md", lite);
  assert.deepEqual(call("src/tweak.ts"), ALLOW);
  assert.equal(call("src/other.ts").permission, "deny");
});

test("ignores the commented example file map in the real spec template", () => {
  const template = readFileSync(new URL("../skills/spec-driven-development/templates/spec.md", import.meta.url), "utf8");
  const lite = template
    .replace(/^\*\*Status:\*\*.*$/m, "**Status:** Tasks approved")
    .concat("\n## Plan\n\n### File map\n\n| File | Change |\n|---|---|\n| `src/real.ts` | Modify |\n");
  assert.deepEqual(parseFileMap(lite), ["src/real.ts"]);
  call("specs/004-lite/spec.md", { content: lite });
  write("specs/004-lite/spec.md", lite);
  assert.deepEqual(call("src/real.ts"), ALLOW);
});

test("releases the conversation once the feature is implemented", () => {
  call("specs/001-lockout/spec.md", { content: spec("Draft") });
  write("specs/001-lockout/spec.md", spec("Implemented"));
  assert.deepEqual(call("src/anything.ts"), ALLOW);
  write("specs/001-lockout/spec.md", spec("Draft"));
  assert.deepEqual(call("src/anything.ts"), ALLOW);
});

test("editing a baseline or implemented spec keeps the active feature bound", () => {
  write("specs/003-feature/spec.md", spec("Draft"));
  write("specs/auth-baseline/spec.md", spec("Baseline"));
  call("specs/003-feature/spec.md", { content: spec("Draft") });
  call("specs/auth-baseline/spec.md", { content: spec("Baseline") });
  call("specs/billing-baseline/spec.md", { content: spec("Baseline draft") });
  assert.equal(call("src/auth/login.ts").permission, "deny");
});

test("agents cannot turn enforcement off", () => {
  const off = "## Workflow settings\n\n- Enforce gates: off\n";
  assert.equal(call("specs/constitution.md", { content: off }).permission, "deny");
  assert.equal(call("specs/constitution.md", { tool: "Delete" }).permission, "deny");
  const amended = "## Workflow settings\n\n- Enforce gates: on\n- Critic model: inherit\n";
  assert.deepEqual(call("specs/constitution.md", { content: amended }), ALLOW);
});

test("chooses the innermost workspace root", () => {
  const outer = root;
  root = join(outer, "packages", "api");
  write("specs/constitution.md", "- Enforce gates: on\n");
  write("specs/001-x/spec.md", spec("Draft"));
  call("specs/001-x/spec.md", { content: spec("Draft"), roots: [outer, root] });
  assert.equal(call("src/x.ts", { roots: [outer, root] }).permission, "deny");
});

test("ignores files outside every workspace root", () => {
  assert.deepEqual(
    evaluate({ conversation_id: "c", workspace_roots: [root], tool_input: { file_path: "/elsewhere/x.ts" } }),
    ALLOW,
  );
});

test("parses common formatting variants of status and settings", () => {
  assert.equal(parseStatus("**Status:** tasks approved (2026-09-24)"), "Tasks approved");
  assert.equal(parseStatus("**Status**: `Draft`"), "Draft");
  assert.equal(parseStatus("Status: Baseline draft"), "Baseline draft");
  assert.equal(parseStatus("**Status:** Draft | Spec approved"), null);
  assert.equal(parseEnforce("- **Enforce gates:** `on`"), true);
  assert.equal(parseEnforce("- Enforce gates: ON  <!-- team decision -->"), true);
  assert.equal(parseEnforce("- Enforce gates: off"), false);
});

test("file map parsing stops at the next section and keeps every path", () => {
  assert.deepEqual(parseFileMap(PLAN), [
    "src/auth/lockout.ts",
    "src/auth/login.ts",
    "src/auth/session.ts",
    "src/auth/**/*.test.ts",
    "src/migrations",
  ]);
  assert.equal(inFileMap("src/a?b.ts", ["src/a?b.ts"]), true);
  assert.equal(inFileMap("src/axb.ts", ["src/a?b.ts"]), false);
});

test("the script fails open on malformed stdin", () => {
  const run = spawnSync("node", [HOOK], { input: "not json", encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.deepEqual(JSON.parse(run.stdout), ALLOW);
});

test("the script returns a deny decision end to end", () => {
  const run = (rel, content) =>
    spawnSync("node", [HOOK], {
      input: JSON.stringify({
        tool_name: "Write",
        conversation_id: "c",
        workspace_roots: [root],
        tool_input: { file_path: join(root, rel), ...(content === undefined ? {} : { content }) },
      }),
      encoding: "utf8",
      env: process.env,
    });
  run("specs/001-lockout/spec.md", spec("Draft"));
  write("specs/001-lockout/spec.md", spec("Draft"));
  assert.equal(JSON.parse(run("src/x.ts").stdout).permission, "deny");
});
