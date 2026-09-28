#!/usr/bin/env node
/**
 * Coverage and consistency check for one feature's artifacts.
 *
 * Usage: node check.mjs <spec-folder> [--diff [<base>]]
 * Exits 0 when every check passes, 1 when any fails, 2 when it cannot run.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVED,
  inFileMap,
  outline,
  parseDiffBase,
  parseFileMap,
  parseLogStatus,
  parseRequirements,
  parseStatus,
  parseTasks,
  parseTrack,
} from "./artifacts.mjs";

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function list(items) {
  return items.length === 0 ? "none" : items.join(", ");
}

function code(text) {
  return `\`${text}\``;
}

function render(checks) {
  return checks.map(([label, value]) => `- ${label}: ${value}`).join("\n");
}

function liteTasks(spec) {
  const lines = outline(spec);
  const start = lines.findIndex(({ line, level }) => (level === 2 || level === 3) && /^#+\s+Tasks\b/i.test(line));
  if (start === -1) return null;
  const end = lines.findIndex(({ level }, index) => index > start && level !== null && level <= lines[start].level);
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .map(({ line }) => line)
    .join("\n");
}

function coverage(requirements, { tasks, unparsed }, fileMap) {
  const tasksFor = (id) => tasks.filter((task) => task.covers.includes(id)).map((task) => task.id);
  const ids = [...new Set([...requirements, ...tasks.flatMap((task) => task.covers)])];
  const table = ["| Requirement | Tasks |", "|-------------|-------|", ...ids.map((id) => `| ${id} | ${list(tasksFor(id))} |`)];
  const unknown = tasks.flatMap((task) =>
    task.covers.filter((id) => !id.startsWith("BL-") && !requirements.includes(id)).map((id) => `${task.id} ${id}`),
  );
  const checks = [
    requirements.length === 0
      ? ["Requirements", "not found"]
      : ["Requirements without a task", list(requirements.filter((id) => tasksFor(id).length === 0))],
    ["Tasks without a requirement", list(tasks.filter((task) => task.covers.length === 0).map((task) => task.id))],
    ["Tasks covering unknown requirements", list(unknown)],
  ];
  if (fileMap.length === 0) {
    checks.push(["File map", "not found"]);
  } else {
    const files = tasks.flatMap((task) => task.files);
    const untouched = fileMap.filter((entry) => !files.some((file) => inFileMap(file, [entry])));
    const outside = tasks.flatMap((task) =>
      task.files.filter((file) => !inFileMap(file, fileMap)).map((file) => `${task.id} ${code(file)}`),
    );
    checks.push(["File map entries without a task", list(untouched.map(code))]);
    checks.push(["Task files outside the file map", list(outside)]);
  }
  if (unparsed.length > 0) checks.push(["Unparsed task lines", list(unparsed.map(code))]);
  const fileless = tasks.filter((task) => task.files.length === 0).map((task) => task.id);
  if (fileless.length > 0) checks.push(["Tasks without files", list(fileless)]);
  return { table: table.join("\n"), checks };
}

function statusCheck(spec) {
  const status = parseStatus(spec);
  const logged = parseLogStatus(spec);
  if (status !== null && status === logged) return `yes (${status})`;
  return `no (Status: ${status ?? "missing"}, Log: ${logged ?? "none"})`;
}

function withoutHistory(markdown) {
  let skipping = false;
  return outline(markdown)
    .filter(({ line, level }) => {
      if (level !== null && level <= 2) skipping = /^##\s+(Log|Clarifications)\b/i.test(line);
      return !skipping;
    })
    .map(({ line }) => line)
    .join("\n");
}

function markerCheck(artifacts) {
  const counts = artifacts
    .filter(([, text]) => text !== null)
    .map(([name, text]) => [name, withoutHistory(text).split("[NEEDS CLARIFICATION").length - 1])
    .filter(([, count]) => count > 0);
  if (counts.length === 0) return "none";
  const total = counts.reduce((sum, [, count]) => sum + count, 0);
  return `${total} (${counts.map(([name]) => name).join(", ")})`;
}

function changedFiles(root, base) {
  const git = (...args) =>
    execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const names = (...args) => git(...args).split("\0").filter((path) => path !== "");
  const prefix = git("rev-parse", "--show-prefix").trim();
  const paths = [
    ...names("diff", "-z", "--name-only", "--no-relative", "--no-renames", base, "--"),
    ...names("ls-files", "-z", "--others", "--exclude-standard", "--full-name", ":/"),
  ];
  return [...new Set(paths)].map((path) => (path.startsWith(prefix) ? path.slice(prefix.length) : posix.relative(prefix, path)));
}

function diffCheck(root, spec, fileMap, base) {
  const from = base ?? parseDiffBase(spec);
  if (from === null) return ["Diff base", "not found in the Log"];
  const outside = changedFiles(root, from).filter(
    (path) => path.startsWith("../") || (!path.startsWith("specs/") && !inFileMap(path, fileMap)),
  );
  return ["Changed files outside the file map", list(outside.map(code))];
}

export function check({ folder, diff = false, base }) {
  const dir = resolve(folder);
  const spec = readText(join(dir, "spec.md"));
  if (spec === null) throw new Error(`No spec.md in ${dir}`);
  const plan = readText(join(dir, "plan.md"));
  const tasks = readText(join(dir, "tasks.md"));
  const fileMap = parseFileMap(plan ?? spec);
  const taskList = tasks ?? liteTasks(spec);
  const lite = parseTrack(spec) === "Lite" || outline(spec).some(({ line, level }) => level === 2 && /^##\s+Plan\b/i.test(line));

  const sections = [];
  const checks = [];
  if (taskList !== null) {
    const covered = coverage(parseRequirements(spec), parseTasks(taskList), fileMap);
    sections.push(covered.table, render(covered.checks));
    checks.push(...covered.checks);
  } else if (lite || [...APPROVED, "Implemented"].includes(parseStatus(spec))) {
    const missing = [["Task list", "not found"]];
    sections.push(render(missing));
    checks.push(...missing);
  }
  const always = [
    ["Status matches the Log", statusCheck(spec)],
    ["Clarification markers", markerCheck([["spec.md", spec], ["plan.md", plan], ["tasks.md", tasks]])],
  ];
  if (diff) always.push(diffCheck(dirname(dirname(dir)), spec, fileMap, base));
  sections.push(render(always));
  checks.push(...always);

  const ok = checks.every(([, value]) => value === "none" || value.startsWith("yes ("));
  return { text: [...sections, `Result: ${ok ? "pass" : "fail"}`].join("\n\n"), ok };
}

function parseArgs(args) {
  const [folder, flag, base, ...rest] = args;
  if (folder === undefined || folder.startsWith("-") || rest.length > 0) return null;
  if (flag === undefined) return { folder };
  if (flag !== "--diff" || base?.startsWith("-")) return null;
  return { folder, diff: true, base };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args === null) {
    process.stderr.write("Usage: node check.mjs <spec-folder> [--diff [<base>]]\n");
    return 2;
  }
  try {
    const { text, ok } = check(args);
    process.stdout.write(`${text}\n`);
    return ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.message.trim()}\n`);
    return 2;
  }
}

function isMain() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) {
  process.exitCode = main();
}
