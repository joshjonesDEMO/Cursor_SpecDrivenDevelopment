#!/usr/bin/env node
/**
 * Optional gate enforcement for the spec-driven-development skill.
 *
 * Off unless the repo's specs/constitution.md says `Enforce gates: on`. A
 * conversation is bound to a feature the first time it edits a file under
 * specs/<feature-id>/ whose spec is active. From then on, that conversation's
 * edits outside specs/ are denied until the spec reaches `Tasks approved`, and
 * afterwards edits outside the plan's file map are denied. preToolUse honors
 * only allow and deny, so there is no "ask" tier. Any error fails open: a
 * broken hook must never block unrelated work.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVED,
  PRE_APPROVAL,
  inFileMap,
  isActive,
  parseEnforce,
  parseFileMap,
  parseStatus,
} from "../skills/spec-driven-development/scripts/artifacts.mjs";

const ALLOW = { permission: "allow" };

export function decide({ relPath, featureId, status, fileMap }) {
  if (PRE_APPROVAL.includes(status)) {
    return {
      permission: "deny",
      user_message: `Blocked an edit to ${relPath}: spec ${featureId} is "${status}". Code changes wait until the tasks are approved. For unrelated work, start a new chat.`,
      agent_message: `Spec-driven gate: specs/${featureId}/spec.md has status "${status}". Do not edit files outside specs/ until the status is "Tasks approved". Put throwaway spikes in the OS temp directory. Otherwise finish the current phase and stop at its gate.`,
    };
  }
  if (APPROVED.includes(status) && fileMap.length > 0 && !inFileMap(relPath, fileMap)) {
    return {
      permission: "deny",
      user_message: `Blocked an edit to ${relPath}: it is not in the approved file map for spec ${featureId}. For unrelated work, start a new chat.`,
      agent_message: `Spec-driven gate: ${relPath} is outside the approved file map for ${featureId}. If the edit is unrelated to this feature, ask the user to do it in a new chat. If this feature needs it, stop and propose a plan change per rule 6. That reopens the plan gate.`,
    };
  }
  return ALLOW;
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function sha1(text) {
  return createHash("sha1").update(text).digest("hex");
}

function bindingPath(root, conversation) {
  const dir = process.env.SDD_GATES_STATE_DIR ?? join(tmpdir(), "cursor-sdd-gates");
  return join(dir, sha1(root), sha1(conversation));
}

// Parallel tool calls in one chat run the hook concurrently, so a reader must never see a half-written file.
function bind(path, featureId) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, featureId);
  renameSync(temp, path);
}

function findRoot(filePath, roots) {
  return roots
    .filter((root) => {
      const rel = relative(root, filePath);
      return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
    })
    .sort((a, b) => b.length - a.length)[0];
}

function guardConstitution(input, relPath, constitution) {
  const content = input.tool_input.content;
  const disabling = input.tool_name === "Delete" || (typeof content === "string" && !parseEnforce(content));
  if (relPath !== "specs/constitution.md" || !disabling || !parseEnforce(constitution)) return null;
  return {
    permission: "deny",
    user_message: "Blocked an agent edit that would turn off gate enforcement. To turn it off, edit `Enforce gates` in specs/constitution.md yourself.",
    agent_message: "Spec-driven gate: agents may not turn off gate enforcement. Ask the user to change `Enforce gates` in specs/constitution.md.",
  };
}

export function evaluate(input) {
  const filePath = input.tool_input?.file_path;
  const conversation = input.conversation_id;
  if (typeof filePath !== "string" || typeof conversation !== "string") return ALLOW;

  const root = findRoot(filePath, input.workspace_roots ?? []);
  if (root === undefined) return ALLOW;

  const constitution = readText(join(root, "specs", "constitution.md"));
  if (constitution === null) return ALLOW;
  const relPath = relative(root, filePath).split(sep).join("/");

  const guard = guardConstitution(input, relPath, constitution);
  if (guard !== null) return guard;
  if (!parseEnforce(constitution)) return ALLOW;

  const binding = bindingPath(root, conversation);
  const bound = readText(binding);
  const specFolder = relPath.match(/^specs\/([^/]+)\//)?.[1];
  if (relPath.startsWith("specs/")) {
    if (specFolder !== undefined && bound !== specFolder) {
      const writingSpec = relPath === `specs/${specFolder}/spec.md` && typeof input.tool_input.content === "string";
      const specText = writingSpec ? input.tool_input.content : readText(join(root, "specs", specFolder, "spec.md"));
      const folderStatus = specText === null ? null : parseStatus(specText);
      if (folderStatus === null || isActive(folderStatus)) bind(binding, specFolder);
    }
    return ALLOW;
  }

  if (bound === null) return ALLOW;

  const spec = readText(join(root, "specs", bound, "spec.md"));
  const status = spec === null ? null : parseStatus(spec);
  if (status === null || !isActive(status)) {
    rmSync(binding, { force: true });
    return ALLOW;
  }

  const plan = readText(join(root, "specs", bound, "plan.md"));
  const fileMap = parseFileMap(plan ?? spec);
  return decide({ relPath, featureId: bound, status, fileMap });
}

async function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  let result;
  try {
    result = evaluate(JSON.parse(raw));
  } catch {
    result = ALLOW;
  }
  process.stdout.write(JSON.stringify(result));
}

function isMain() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) {
  await main();
}
