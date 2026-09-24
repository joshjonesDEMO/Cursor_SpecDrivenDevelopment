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
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const ALLOW = { permission: "allow" };
const PRE_APPROVAL = ["Draft", "Spec approved", "Plan approved"];
const APPROVED = ["Tasks approved", "In progress", "Delivery pending"];
const KNOWN = [...PRE_APPROVAL, ...APPROVED, "Implemented", "Superseded", "Baseline draft", "Baseline"].sort(
  (a, b) => b.length - a.length,
);

function stripMarkup(text) {
  return text.replace(/[*`]/g, "").trim();
}

function stripComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

function settingValue(markdown, key) {
  for (const line of stripComments(markdown).split("\n")) {
    const cleaned = stripMarkup(line).replace(/^[-+]\s*/, "");
    const match = cleaned.match(/^([^:]+):\s*(.*)$/);
    if (match !== null && match[1].trim().toLowerCase() === key.toLowerCase()) return match[2].trim();
  }
  return null;
}

export function parseEnforce(constitution) {
  return (settingValue(constitution, "Enforce gates") ?? "").split(/\s/)[0].toLowerCase() === "on";
}

export function parseStatus(spec) {
  const value = settingValue(spec, "Status");
  if (value === null || value.includes("|")) return null;
  const lower = value.toLowerCase();
  return KNOWN.find((status) => lower.startsWith(status.toLowerCase())) ?? null;
}

function isActive(status) {
  return PRE_APPROVAL.includes(status) || APPROVED.includes(status);
}

export function parseFileMap(markdown) {
  const lines = stripComments(markdown).split("\n");
  const start = lines.findIndex((line) => /^#{2,4}\s+File map\b/i.test(line));
  if (start === -1) return [];
  const level = lines[start].match(/^#+/)[0].length;
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    const heading = line.match(/^(#+)\s/);
    if (heading !== null && heading[1].length <= level) break;
    if (!line.trimStart().startsWith("|")) continue;
    const cell = (line.split("|")[1] ?? "").trim();
    if (cell === "" || /^:?-+:?$/.test(cell) || cell.toLowerCase() === "file") continue;
    const spans = [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    for (const path of spans.length > 0 ? spans : [cell]) entries.push(path.trim().replace(/^\.\//, ""));
  }
  return entries;
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  const pattern = escaped
    .replace(/\*\*\//g, "\u0001")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0001/g, "(?:.*/)?")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${pattern}$`);
}

export function inFileMap(relPath, entries) {
  return entries.some((entry) => {
    if (entry.includes("*")) return globToRegExp(entry).test(relPath);
    const dir = entry.replace(/\/$/, "");
    return relPath === dir || relPath.startsWith(`${dir}/`);
  });
}

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

function statePath(root) {
  const dir = process.env.SDD_GATES_STATE_DIR ?? join(tmpdir(), "cursor-sdd-gates");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${createHash("sha1").update(root).digest("hex")}.json`);
}

function loadBindings(root) {
  try {
    return JSON.parse(readFileSync(statePath(root), "utf8"));
  } catch {
    return {};
  }
}

function setBinding(root, conversation, featureId) {
  const path = statePath(root);
  const bindings = loadBindings(root);
  if (featureId === undefined) delete bindings[conversation];
  else bindings[conversation] = featureId;
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(bindings));
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

  const bound = loadBindings(root)[conversation];
  const specFolder = relPath.match(/^specs\/([^/]+)\//)?.[1];
  if (relPath.startsWith("specs/")) {
    if (specFolder !== undefined && bound !== specFolder) {
      const writingSpec = relPath === `specs/${specFolder}/spec.md` && typeof input.tool_input.content === "string";
      const specText = writingSpec ? input.tool_input.content : readText(join(root, "specs", specFolder, "spec.md"));
      const folderStatus = specText === null ? null : parseStatus(specText);
      if (folderStatus === null || isActive(folderStatus)) setBinding(root, conversation, specFolder);
    }
    return ALLOW;
  }

  if (bound === undefined) return ALLOW;

  const spec = readText(join(root, "specs", bound, "spec.md"));
  const status = spec === null ? null : parseStatus(spec);
  if (status === null || !isActive(status)) {
    setBinding(root, conversation, undefined);
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
  let result = ALLOW;
  try {
    result = evaluate(JSON.parse(raw));
  } catch {
    result = ALLOW;
  }
  process.stdout.write(JSON.stringify(result));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
