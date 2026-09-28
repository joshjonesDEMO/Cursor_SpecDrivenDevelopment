import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import { check } from "./check.mjs";

const CHECK = fileURLToPath(new URL("./check.mjs", import.meta.url));
let root;
let folder;

function write(rel, text) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function git(...args) {
  const identity = ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false"];
  return execFileSync("git", ["-C", root, "-c", "init.defaultBranch=main", ...identity, ...args], { encoding: "utf8" });
}

function spec(status, { logged = status, extra = "", log = "" } = {}) {
  return `# Spec: Widget

**Status:** ${status}
**Track:** Full

## Requirements

- **FR-001:** One.
- **FR-002:** Two.
<!-- - **FR-009:** Dropped. [NEEDS CLARIFICATION: keep?] -->

### Non-functional

- **NFR-001:** Fast.
${extra}
## Acceptance criteria

### FR-001: one

## Clarifications

- 2026-09-24. Q: [NEEDS CLARIFICATION: why?] A: Because. Affects: FR-002.

## Log

- YYYY-MM-DD. Status: Draft. Template line.
- 2026-09-24. Status: Draft. Spec created.

\`\`\`sh
# a fenced comment inside the Log
\`\`\`

- 2026-09-24. Clarify resolved all [NEEDS CLARIFICATION] markers.
- 2026-09-25. Status: ${logged}. Gate passed.
${log}`;
}

const PLAN = `# Plan

## File map

| File | Change | Covers |
|------|--------|--------|
| \`src/a.js\` | Create | FR-001 |
| \`src/b.js\` | Modify | FR-002 |
| \`test/*.test.js\` | Tests | FR-001, FR-002 |

## Test strategy
`;

const TASKS = `# Tasks

## Group 1: Characterization

- [x] **T001** Pin current behavior
  - Files: \`test/a.test.js\`
  - Covers: BL-001
  - Depends on: none

## Group 2: Build

- [ ] **T002** [P] Build A
  - Files: \`src/a.js\`, \`test/a.test.js\`
  - Covers: FR-001, NFR-001
- [ ] **T003** [P] Build B
  - Files: \`src/b.js\`
  - Covers: FR-002

## Coverage check

| Requirement | Tasks |
|-------------|-------|
| FR-001 | T009 |

- Requirements without a task: none
`;

const CLEAN = `| Requirement | Tasks |
|-------------|-------|
| FR-001 | T002 |
| FR-002 | T003 |
| NFR-001 | T002 |
| BL-001 | T001 |

- Requirements without a task: none
- Tasks without a requirement: none
- Tasks covering unknown requirements: none
- File map entries without a task: none
- Task files outside the file map: none

- Status matches the Log: yes (Tasks approved)
- Clarification markers: none`;

function feature(files, dir = "specs/001-widget") {
  for (const [name, text] of Object.entries(files)) write(`${dir}/${name}`, text);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sdd-check-"));
  folder = join(root, "specs", "001-widget");
});

test("a clean Full-track feature passes, ignoring markers mentioned in the Log and Clarifications", () => {
  feature({ "spec.md": spec("Tasks approved"), "plan.md": PLAN, "tasks.md": TASKS });
  assert.deepEqual(check({ folder }), { text: `${CLEAN}\n\nResult: pass`, ok: true });
});

test("reports every coverage, status, and clarification problem", () => {
  const tasks = `## Tasks

- [ ] **T001** Build A
  - Files: \`src/a.js\`
  - Covers: FR-001 [NEEDS CLARIFICATION: which A?]
- [ ] **T002** Refactor X
  - Files: \`src/x.js\`
  - Covers: Must not (no regressions) [NEEDS CLARIFICATION: scope?]
`;
  const extra = "\n- [NEEDS CLARIFICATION: how fast?]\n";
  feature({ "spec.md": spec("In progress", { logged: "Tasks approved", extra }), "plan.md": PLAN, "tasks.md": tasks });
  assert.deepEqual(check({ folder }), {
    text: `| Requirement | Tasks |
|-------------|-------|
| FR-001 | T001 |
| FR-002 | none |
| NFR-001 | none |

- Requirements without a task: FR-002, NFR-001
- Tasks without a requirement: T002
- Tasks covering unknown requirements: none
- File map entries without a task: \`src/b.js\`, \`test/*.test.js\`
- Task files outside the file map: T002 \`src/x.js\`

- Status matches the Log: no (Status: In progress, Log: Tasks approved)
- Clarification markers: 3 (spec.md, tasks.md)

Result: fail`,
    ok: false,
  });
});

test("a task in another header format keeps its own fields", () => {
  const tasks = `- [ ] **T001** Refactor the logger while we're here
  - Files: \`src/logger.js\`
  - Covers: none
- [ ] **T002:** Build
  - Files: \`src/a.js\`
  - Covers: FR-001
- [ ] **T003** Tidy config
  - Files: src/config.js
  - Covers: FR-010
`;
  feature({ "spec.md": spec("Tasks approved"), "plan.md": PLAN, "tasks.md": tasks });
  assert.deepEqual(check({ folder }), {
    text: `| Requirement | Tasks |
|-------------|-------|
| FR-001 | T002 |
| FR-002 | none |
| NFR-001 | none |
| FR-010 | T003 |

- Requirements without a task: FR-002, NFR-001
- Tasks without a requirement: T001
- Tasks covering unknown requirements: T003 FR-010
- File map entries without a task: \`src/b.js\`, \`test/*.test.js\`
- Task files outside the file map: T001 \`src/logger.js\`, T003 \`src/config.js\`

- Status matches the Log: yes (Tasks approved)
- Clarification markers: none

Result: fail`,
    ok: false,
  });
});

// Every artifact shape the parsers must accept or reject lives in this one fixture. Add new shapes here rather than in
// a separate test, so a rule change that fixes one shape can't silently drop another.
test("pins every requirement, task header, and Files shape the parsers accept or reject", () => {
  const shapes = `# Spec: Shapes

**Status:** Tasks approved
**Track:** Full

## Requirements

- **FR-001:** Colon, and a forward reference to FR-004.
- **FR-002** — Dash.

\`\`\`gherkin
# A Gherkin comment at column 0 is not a heading
Scenario: fenced
\`\`\`

- FR-003. Period.
1. **FR-004:** Numbered.
- **FR-00x:** Template placeholder, not an ID.

| ID | Requirement |
|----|-------------|
| FR-005 | Table row inside the section. |

## Non-functional requirements

- **NFR-001:** p95 under 200 ms.

## Acceptance criteria

### FR-006: a heading outside the requirement sections

## Coverage check

| FR-007 | T006 |

## Log

- 2026-09-25. Status: Tasks approved. Gate 3 approved.
`;
  const plan = `## File map

| File | Change |
|------|--------|
| \`src/a.js\`, \`src/b.js\`, \`src/c.js\`, \`src/d.js\` | Create |
| \`src/e.js\`, \`src/f.js\`, \`src/g.js\`, \`src/h.js\` | Modify |
| \`test/*.test.js\` | Tests |
| \`app/(shop)/page.tsx\` | Modify |
`;
  const tasks = `## Group 1

- [ ] **T001** All backticked, with notes
  - Files: \`src/a.js\` (create), \`test/a.test.js\` (create)
  - Covers: FR-001

~~~sh
# a shell comment at column 0
~~~

- [ ] **T002:** A note containing a comma
  - Files: \`src/b.js\` (create, then extend), \`src/c.js\`
  - Covers: FR-002
  - T003 depends on this
- [ ] T003 Mixed backticked and plain
  - Files: \`src/d.js\`, src/outside.js
  - Covers: FR-003
* [ ] **T004** Plain comma list
  * Files: src/e.js, src/f.js, app/(shop)/page.tsx (modify)
  * Covers: FR-004
  - [ ] **T005** Indented, with a wrapped Files line
    - Files: \`src/g.js\`,
      \`src/h.js\`
    - Covers: FR-005, NFR-001
- [ ] Update the docs
- [x] **T006** Covers IDs defined only outside the requirement sections
  - Covers: FR-006, FR-007
- [ ] **T007** A note that names a path
  - Files: \`src/a.js\` (tests in \`test/a.test.js\`)
  - Covers: FR-001
- See [the plan](plan.md)
- **T008** Forgot the checkbox
1. [ ] **T009** Numbered
- [  ] **T010** Two-space box
`;
  feature({ "spec.md": shapes, "plan.md": plan, "tasks.md": tasks });
  assert.deepEqual(check({ folder }), {
    text: `| Requirement | Tasks |
|-------------|-------|
| FR-001 | T001, T007 |
| FR-002 | T002 |
| FR-003 | T003 |
| FR-004 | T004 |
| FR-005 | T005 |
| NFR-001 | T005 |
| FR-006 | T006 |
| FR-007 | T006 |

- Requirements without a task: none
- Tasks without a requirement: none
- Tasks covering unknown requirements: T006 FR-006, T006 FR-007
- File map entries without a task: none
- Task files outside the file map: T003 \`src/outside.js\`, T007 \`src/a.js (tests in test/a.test.js)\`
- Unparsed task lines: \`- [ ] Update the docs\`, \`- **T008** Forgot the checkbox\`, \`1. [ ] **T009** Numbered\`, \`- [  ] **T010** Two-space box\`
- Tasks without files: T006

- Status matches the Log: yes (Tasks approved)
- Clarification markers: none

Result: fail`,
    ok: false,
  });
});

test("a spec whose requirements cannot be parsed fails instead of reporting no gaps", () => {
  const unreadable = "# Spec\n\n**Status:** Tasks approved\n\n## Requirements\n\n- R1: One.\n\n## Log\n\n- 2026-09-25. Status: Tasks approved.\n";
  feature({ "spec.md": unreadable, "plan.md": PLAN, "tasks.md": TASKS });
  assert.deepEqual(check({ folder }), {
    text: `| Requirement | Tasks |
|-------------|-------|
| BL-001 | T001 |
| FR-001 | T002 |
| NFR-001 | T002 |
| FR-002 | T003 |

- Requirements: not found
- Tasks without a requirement: none
- Tasks covering unknown requirements: T002 FR-001, T002 NFR-001, T003 FR-002
- File map entries without a task: none
- Task files outside the file map: none

- Status matches the Log: yes (Tasks approved)
- Clarification markers: none

Result: fail`,
    ok: false,
  });
});

test("a task list without a file map fails on the missing map", () => {
  feature({ "spec.md": spec("Tasks approved"), "plan.md": "# Plan\n\n## Approach\n", "tasks.md": TASKS });
  assert.deepEqual(check({ folder }), {
    text: `| Requirement | Tasks |
|-------------|-------|
| FR-001 | T002 |
| FR-002 | T003 |
| NFR-001 | T002 |
| BL-001 | T001 |

- Requirements without a task: none
- Tasks without a requirement: none
- Tasks covering unknown requirements: none
- File map: not found

- Status matches the Log: yes (Tasks approved)
- Clarification markers: none

Result: fail`,
    ok: false,
  });
});

test("a Lite spec built from the real template passes, ignoring the commented example", () => {
  const template = readFileSync(new URL("../templates/spec.md", import.meta.url), "utf8");
  const lite = template
    .replace(/^\*\*Status:\*\*.*$/m, "**Status:** Tasks approved")
    .replace(/^- \[NEEDS CLARIFICATION.*$/gm, "")
    .replace(/^## Log$/m, "## Log\n\n- 2026-09-28. Status: Tasks approved. Gate 1 approved.")
    .concat(`
## Plan

### File map

| File | Change | Covers |
|------|--------|--------|
| \`src/cart.js\` | Modify | FR-001, FR-002 |

## Tasks

### Group 1: Apply

- [ ] **T001** Apply the code
  - Files: \`src/cart.js\`
  - Covers: FR-001, FR-002, NFR-001
`);
  feature({ "spec.md": lite });
  assert.deepEqual(check({ folder }), {
    text: `| Requirement | Tasks |
|-------------|-------|
| FR-001 | T001 |
| FR-002 | T001 |
| NFR-001 | T001 |

- Requirements without a task: none
- Tasks without a requirement: none
- Tasks covering unknown requirements: none
- File map entries without a task: none
- Task files outside the file map: none

- Status matches the Log: yes (Tasks approved)
- Clarification markers: none

Result: pass`,
    ok: true,
  });
});

const LITE_DRAFT = `# Spec: Tweak

**Status:** Draft
**Track:** Lite

## Requirements

- **FR-001:** One.
- **FR-002:** Two.

## Log

- 2026-09-28. Status: Draft. Spec created.
`;

test("a Lite spec at Draft runs coverage on tasks nested under its Plan", () => {
  const tasks = `
## Plan

### File map

| File | Change |
|---|---|
| \`src/tweak.js\` | Modify |

### Tasks

- [ ] **T001** Tweak
  - Files: \`src/tweak.js\`, \`src/other.js\`
  - Covers: FR-001

\`\`\`python
# a fenced comment is not a heading that ends the task list
\`\`\`

- [ ] **T002** Tweak again
  - Files: \`src/tweak.js\`
  - Covers: FR-002
`;
  feature({ "spec.md": LITE_DRAFT + tasks });
  assert.deepEqual(check({ folder }), {
    text: `| Requirement | Tasks |
|-------------|-------|
| FR-001 | T001 |
| FR-002 | T002 |

- Requirements without a task: none
- Tasks without a requirement: none
- Tasks covering unknown requirements: none
- File map entries without a task: none
- Task files outside the file map: T001 \`src/other.js\`

- Status matches the Log: yes (Draft)
- Clarification markers: none

Result: fail`,
    ok: false,
  });
});

test("a Lite spec at Draft without tasks fails on the missing list", () => {
  feature({ "spec.md": LITE_DRAFT });
  assert.deepEqual(check({ folder }), {
    text: "- Task list: not found\n\n- Status matches the Log: yes (Draft)\n- Clarification markers: none\n\nResult: fail",
    ok: false,
  });
});

test("a Gate 1 spec with no plan or tasks prints only the status and clarification lines", () => {
  feature({ "spec.md": spec("Draft", { logged: "Draft" }) });
  assert.deepEqual(check({ folder }), {
    text: "- Status matches the Log: yes (Draft)\n- Clarification markers: none\n\nResult: pass",
    ok: true,
  });
});

test("an approved Full-track spec without a task list fails on the missing list", () => {
  feature({ "spec.md": spec("Tasks approved"), "plan.md": PLAN });
  assert.deepEqual(check({ folder }), {
    text: `- Task list: not found

- Status matches the Log: yes (Tasks approved)
- Clarification markers: none

Result: fail`,
    ok: false,
  });
});

test("--diff from the Log's Diff base reports changes, untracked files, and renames outside the map", () => {
  feature({ "spec.md": spec("Tasks approved"), "plan.md": PLAN, "tasks.md": TASKS });
  write("src/a.js", "a\n");
  write("src/legacy/old.js", "old\n");
  write("README.md", "readme\n");
  git("init", "-q");
  git("add", ".");
  git("commit", "-qm", "base");
  const base = git("rev-parse", "HEAD").trim();
  feature({ "spec.md": spec("Tasks approved", { log: `- 2026-09-26. T001 started. Diff base: \`${base}\`.\n` }) });
  write("README.md", "changed\n");
  write("scratch.js", "untracked\n");
  write("src/a.js", "changed\n");
  git("mv", "src/legacy/old.js", "src/b.js");
  write("specs/001-widget/tasks.md", `${TASKS}\n`);
  write("specs/notes.md", "untracked\n");
  assert.deepEqual(check({ folder, diff: true }), {
    text: `${CLEAN}
- Changed files outside the file map: \`README.md\`, \`src/legacy/old.js\`, \`scratch.js\`

Result: fail`,
    ok: false,
  });
});

test("--diff without a Diff base in the Log fails", () => {
  feature({ "spec.md": spec("Tasks approved"), "plan.md": PLAN, "tasks.md": TASKS });
  assert.deepEqual(check({ folder, diff: true }), {
    text: `${CLEAN}\n- Diff base: not found in the Log\n\nResult: fail`,
    ok: false,
  });
});

test("--diff reports changes elsewhere in the repo when specs/ is in a subfolder", () => {
  const api = "packages/api";
  folder = join(root, api, "specs", "001-widget");
  feature({ "spec.md": spec("Tasks approved"), "plan.md": PLAN, "tasks.md": TASKS }, `${api}/specs/001-widget`);
  write(`${api}/src/a.js`, "a\n");
  write("packages/web/src/w.js", "w\n");
  write("README.md", "readme\n");
  git("init", "-q");
  git("add", ".");
  git("commit", "-qm", "base");
  write(`${api}/src/a.js`, "changed\n");
  write("packages/web/src/w.js", "changed\n");
  write("packages/web/src/new.js", "untracked\n");
  write("README.md", "changed\n");
  assert.deepEqual(check({ folder, diff: true, base: "HEAD" }), {
    text: `${CLEAN}
- Changed files outside the file map: \`../../README.md\`, \`../web/src/w.js\`, \`../web/src/new.js\`

Result: fail`,
    ok: false,
  });
});

const FAILING = "- Status matches the Log: no (Status: missing, Log: none)\n- Clarification markers: none\n\nResult: fail\n";

test("the script exits 1 on a failing feature and 2 on a missing spec.md or a bad base", () => {
  feature({ "spec.md": "# Spec\n\n**Status:** Draft | Spec approved\n" });
  const failing = spawnSync(process.execPath, [CHECK, folder], { encoding: "utf8" });
  assert.equal(failing.status, 1);
  assert.equal(failing.stdout, FAILING);
  const missing = spawnSync(process.execPath, [CHECK, join(root, "specs", "002-none")], { encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.equal(missing.stderr, `No spec.md in ${join(root, "specs", "002-none")}\n`);
  const usage = spawnSync(process.execPath, [CHECK, folder, "--diff", "--output=x"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.equal(usage.stderr, "Usage: node check.mjs <spec-folder> [--diff [<base>]]\n");
});

test("the script runs when invoked through a symlinked folder", () => {
  feature({ "spec.md": "# Spec\n\n**Status:** Draft | Spec approved\n" });
  const link = join(mkdtempSync(join(tmpdir(), "sdd-link-")), "scripts");
  symlinkSync(dirname(CHECK), link, "dir");
  const run = spawnSync(process.execPath, [join(link, "check.mjs"), folder], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, FAILING);
});
