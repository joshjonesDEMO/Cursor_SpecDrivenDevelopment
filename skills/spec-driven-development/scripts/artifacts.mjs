/**
 * Parsers for the spec-driven-development artifacts (spec.md, plan.md, tasks.md). The gate hook imports this module,
 * so a parsing change here changes what the hook enforces.
 */

export const PRE_APPROVAL = ["Draft", "Spec approved", "Plan approved"];
export const APPROVED = ["Tasks approved", "In progress", "Delivery pending"];
const KNOWN = [...PRE_APPROVAL, ...APPROVED, "Implemented", "Superseded", "Baseline draft", "Baseline"].sort(
  (a, b) => b.length - a.length,
);

function stripMarkup(text) {
  return text.replace(/[*`]/g, "").trim();
}

function stripComments(markdown) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

// Gherkin and code sketches in fences put `#` comments at column 0, and those must not end a section.
export function outline(markdown) {
  let fence = null;
  return stripComments(markdown)
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
      if (fence !== null) {
        const closes = marker?.[0] === fence[0] && marker.length >= fence.length && /^\s*[`~]+\s*$/.test(line);
        if (closes) fence = null;
        return { line, level: null };
      }
      if (marker !== undefined) {
        fence = marker;
        return { line, level: null };
      }
      return { line, level: line.match(/^(#{1,6})\s/)?.[1].length ?? null };
    });
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

function knownStatus(value) {
  const lower = value.toLowerCase();
  return KNOWN.find((status) => lower.startsWith(status.toLowerCase())) ?? null;
}

export function parseStatus(spec) {
  const value = settingValue(spec, "Status");
  return value === null || value.includes("|") ? null : knownStatus(value);
}

export function parseLogStatus(spec) {
  const values = stripComments(spec)
    .split("\n")
    .map((line) => stripMarkup(line).match(/^(?:[-+]\s*)?\d{4}-\d{2}-\d{2}\.\s*Status:\s*(.*)$/i)?.[1])
    .filter((value) => value !== undefined);
  return values.length === 0 ? null : knownStatus(values.at(-1));
}

export function isActive(status) {
  return PRE_APPROVAL.includes(status) || APPROVED.includes(status);
}

export function parseTrack(spec) {
  const value = settingValue(spec, "Track")?.toLowerCase() ?? "";
  if (value.includes("|")) return null;
  return ["Lite", "Full"].find((track) => value.startsWith(track.toLowerCase())) ?? null;
}

export function parseDiffBase(spec) {
  for (const line of stripComments(spec).split("\n")) {
    const match = stripMarkup(line).match(/\bDiff base:\s*([0-9a-f]{7,40})\b/i);
    if (match !== null) return match[1];
  }
  return null;
}

export function parseRequirements(spec) {
  let inside = false;
  const sections = outline(spec)
    .filter(({ line, level }) => {
      if (level === null || level > 2) return inside;
      inside = level === 2 && /requirement/i.test(line);
      return false;
    })
    .map(({ line }) => line)
    .join("\n");
  const number = (id) => Number(id.split("-")[1]);
  return [...new Set(sections.match(/\bN?FR-\d+\b/g) ?? [])].sort(
    (a, b) => a.startsWith("NFR") - b.startsWith("NFR") || number(a) - number(b),
  );
}

// A note needs a space before it so route groups like app/(shop)/page.tsx survive. A note that names a path keeps its
// parentheses, so the path shows up as unmatched instead of vanishing.
function splitFiles(text) {
  return text
    .replace(/\s+\([^)`]*\)/g, "")
    .split(",")
    .map((part) => part.replace(/`/g, "").trim())
    .filter((part) => part !== "");
}

export function parseTasks(markdown) {
  const tasks = [];
  const unparsed = [];
  let task = null;
  let field = null;
  for (const line of stripComments(markdown).split("\n")) {
    if (line.trim() === "") continue;
    const indent = line.match(/^\s*/)[0].length;
    if (task !== null && indent <= task.indent) task = null;
    const listItem = /^\s*(?:[-*+]|\d+[.)])\s/.test(line);
    if (field !== null && (task === null || indent <= field.indent || listItem)) field = null;
    const header = line.match(/^(\s*)[-*+]\s+\[.\]\s+(?:\*\*)?(T\d+)\b/);
    if (header !== null) {
      task = { id: header[2], indent: header[1].length, covers: "", files: "" };
      tasks.push(task);
    } else if (/^\s*(?:[-*+]|\d+[.)])\s+\[[^\]]{0,3}\](?!\()/.test(line)) {
      unparsed.push(line.trim());
    } else if (task === null && /^\s*(?:[-*+]|\d+[.)])\s+\**T\d+\b/.test(line)) {
      unparsed.push(line.trim());
    } else if (field !== null) {
      task[field.name] += ` ${line.trim()}`;
    } else if (task !== null) {
      const match = line.match(/^\s*(?:[-*+]\s+)?\**(covers|files)\**:\**\s*(.*)$/i);
      if (match === null) continue;
      field = { name: match[1].toLowerCase(), indent };
      task[field.name] = match[2];
    }
  }
  return {
    tasks: tasks.map(({ id, covers, files }) => ({
      id,
      covers: covers.match(/\b(?:N?FR|BL)-\d+\b/g) ?? [],
      files: splitFiles(files),
    })),
    unparsed,
  };
}

export function parseFileMap(markdown) {
  const lines = outline(markdown);
  const start = lines.findIndex(({ line, level }) => level >= 2 && level <= 4 && /^#+\s+File map\b/i.test(line));
  if (start === -1) return [];
  const mapLevel = lines[start].level;
  const entries = [];
  for (const { line, level } of lines.slice(start + 1)) {
    if (level !== null && level <= mapLevel) break;
    if (!line.trimStart().startsWith("|")) continue;
    const cell = line.split("|")[1].trim();
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
