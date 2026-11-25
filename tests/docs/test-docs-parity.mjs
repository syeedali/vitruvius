/**
 * DP1 — docs/code parity.
 *
 * Transfer from src-05 (5087ac8 "List only commands and tools that
 * exist"; e18b7e3 "Check every docs page ... against the code"). Vitruvius had
 * command-contract parity but nothing that reads the README/help card back
 * against it, so a doc could name a dead command or omit a real one.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { commands } from "../../installer/contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const contract = new Set(commands.map((command) => command.name));

const read = (relative) => readFileSync(join(root, relative), "utf8");
const readme = read("README.md");
const commandsDoc = read("COMMANDS.md");
const help = read("skills/vitruvius-help/SKILL.md");

// The README is a front door, not the manual. A line cap keeps it from growing
// back into a 600-line inventory; detailed behavior belongs in docs/ and skill
// references.
assert.ok(
  readme.split("\n").length <= 250,
  `README.md is ${readme.split("\n").length} lines; move detail into docs/ or COMMANDS.md`,
);
for (const required of ["ABOUT.md", "COMMANDS.md", "docs/EVIDENCE.md", "docs/INSTALL.md", "docs/ARCHITECTURE.md"]) {
  assert.ok(existsSync(join(root, required)), `public documentation is missing ${required}`);
}

// Normalize namespaced helpers so `/vitruvius:audit` and `/skill:x` tokenize as
// `/audit` and `/x`, then collect `/name` mentions.
const MENTION = /(?<=^|\s|`|[*\[(])\/([a-z][a-z0-9-]{2,})\b(?!\/)/g;
function mentions(text) {
  const normalized = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\/vitruvius:/g, "/")
    .replace(/\/skill:/g, "/");
  return [...normalized.matchAll(MENTION)].map((match) => match[1]);
}

const readmeMentions = new Set(mentions(readme));
const commandsMentions = new Set(mentions(commandsDoc));
const helpMentions = new Set(mentions(help));

// 1. Public docs may only name commands that exist.
for (const [file, found] of [
  ["README.md", readmeMentions],
  ["COMMANDS.md", commandsMentions],
  ["vitruvius-help", helpMentions],
]) {
  for (const name of found) {
    if (name === "skill") continue;
    assert.ok(contract.has(name), `${file} mentions /${name}, which is not in the command contract`);
  }
}

// 2. Every contract command is documented in the catalogue, README, or help card.
const undocumented = [...contract].filter(
  (name) => !commandsMentions.has(name) && !readmeMentions.has(name) && !helpMentions.has(name),
);
assert.deepEqual(undocumented, [], `contract commands missing from docs: ${undocumented.join(", ")}`);

// 3. Relative markdown links in the README resolve on disk.
const LINK = /\]\(([^)#\s]+)\)/g;
const missing = [];
for (const match of readme.matchAll(LINK)) {
  const target = match[1];
  if (/^https?:/i.test(target) || target.startsWith("#")) continue;
  const path = target.split("#")[0].replace(/[.,;:]+$/, "");
  if (path === "") continue;
  if (!existsSync(join(root, path))) missing.push(path);
}
assert.deepEqual(missing, [], `README links to missing paths: ${missing.join(", ")}`);

console.log(
  `PASS: docs parity — README ${readme.split("\n").length}/250 lines, ${contract.size} commands documented, ` +
    `${readmeMentions.size + commandsMentions.size + helpMentions.size} doc mentions, all README links resolve`,
);
