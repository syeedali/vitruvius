/**
 * check-output-quality.mjs — Drift detection for Vitruvius research outputs.
 *
 * Checks for common quality issues that indicate skill drift:
 * - Missing MACHINE_VERDICT line (verifier outputs)
 * - Missing inline citations [1], [2]
 * - Missing Sources section
 * - Sources entries listed but never cited in the body
 * - Repo claims anchored to a bare filename instead of a path
 * - Missing evidence trail table
 * - Final research deliverables that answer nobody's question: no artifact
 *   anchor, no negative coverage, or a recommendation with no stated evidence
 * - Craft mode (`--craft`): template prose, hype, staged openers, duplicate
 *   headings, repeated long sentences, and unconditional further-work calls.
 *   Advisory unless `--strict` is also passed.
 *
 * The grounding checks are deliberately narrow. They apply only to files with
 * positive evidence of being a final research deliverable — a provenance
 * sidecar, a GOAL-CHECK record, or a problem-anchor record beside them. Guessing
 * from a filename would fail provenance sidecars, FMEA tables, and comparison
 * matrices, and would train agents to satisfy a checker instead of a reader.
 *
 * These checks are a cheap net, not the contract. `vitruvius-problem-anchor`
 * is the real gate: it resolves anchors against bytes and binds findings to
 * decisions, which no heading check can do.
 *
 * Usage: node scripts/check-output-quality.mjs <file-or-dir> [--craft] [--strict]
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

const args = process.argv.slice(2);
const KNOWN_FLAGS = new Set(["--craft", "--strict"]);
for (const arg of args) {
  if (arg.startsWith("--") && !KNOWN_FLAGS.has(arg)) {
    console.error(`unknown flag: ${arg} (usage: check-output-quality.mjs <file-or-dir> [--craft] [--strict])`);
    process.exit(2);
  }
}
const CRAFT = args.includes("--craft");
const STRICT = CRAFT && args.includes("--strict");
const target = args.find((arg) => !arg.startsWith("--")) || "outputs";

// --- artifact anchors -------------------------------------------------------
// A file anchor: `path:line` or `path:9-13`, delimited so a citation to
// packages/solver/x.ts:13 cannot satisfy an anchor of solver/x.ts:1.
const FILE_ANCHOR = /(?:^|[\s`([])(?<![\w./-])[\w.][\w./-]*\.(?:ts|tsx|js|mjs|cjs|py|json|md|ya?ml|go|rs|java|c|cc|cpp|h|hpp|sql|sh|ps1):\d+(?![0-9])(?:\s*[-\u2013\u2014]\s*\d+)?/;
// A measured command: an invocation paired with a result, so a report grounded
// in `npx vitest run` -> 13 passed counts as anchored.
const COMMAND = /\b(?:npm|npx|yarn|pnpm|node|deno|bun|python3?|pytest|go|cargo|make|bash|sh|powershell|dotnet|java|mvn|gradle|vitest|tsc|eslint|ruff|git)\b[^\n]{0,120}/i;
const RESULT = /\b\d+\s*(?:pass(?:ing|ed)?|fail(?:ing|ed|ures?)?|error(?:s)?|test(?:s)?|assertions?|ok|green|red)\b/i;
const MEASURED_COMMAND = new RegExp(`(?:${COMMAND.source}[\\s\\S]{0,80}?${RESULT.source}|${RESULT.source}[\\s\\S]{0,80}?${COMMAND.source})`, "i");

// --- required sections ------------------------------------------------------
// A heading is not evidence. Each match must be followed by real body text, so
// a bare `## Not found` cannot satisfy the check.
const SECTION_BODY = 40;
const NEGATIVE_COVERAGE = [
  "what we did not find",
  "what we could not find",
  "what we did not establish",
  "what the literature does not settle",
  "negative coverage",
  "negative findings",
  "negative results",
  "evidence gaps?",
  "gaps? (?:and|,) (?:limits?|boundaries)",
  "sources? deliberately not used",
  "not found",
  "open questions",
  "caveats? and limitations",
  "limits? of the evidence",
  "boundaries of (?:this|the) study",
];
const IMPACT_VS_EVIDENCE = [
  "impact vs\\.? evidence",
  "impact\\s*/\\s*evidence",
  "impact-vs-evidence",
  "priority vs\\.? evidence",
  "recommendations? and evidence",
  "evidence behind each recommendation",
  "confidence and cost of being wrong",
];

function hasSectionWithBody(text, patterns) {
  const source = patterns.join("|");
  const heading = new RegExp(`^#{1,4}\\s*(?:${source})\\b[\\s\\S]*?$`, "im");
  const match = heading.exec(text);
  if (!match) return false;
  const after = text.slice(match.index + match[0].length);
  const nextHeading = /^#{1,4}\s+/m.exec(after);
  const body = (nextHeading ? after.slice(0, nextHeading.index) : after).replace(/[#*`_\-\s>]/g, "");
  return body.trim().length >= SECTION_BODY;
}

function isFinalDeliverable(filePath) {
  const name = basename(filePath);
  if (name.endsWith(".provenance.md")) return false;
  if (name.startsWith(".")) return false;
  if (/(?:draft|cited|plan|verifier|verification)/.test(name)) return false;
  // Positive evidence only. A provenance sidecar is not enough: every shaped
  // artifact in the outputs tree (FMEA tables, comparison matrices, ranked
  // evidence) has one too. The GOAL-CHECK and problem-anchor records are
  // produced only by the shared engineering-research method, so their presence
  // is what identifies a graded research deliverable. Absent that, the file is
  // not ours to judge.
  const stem = name.slice(0, -extname(name).length);
  const markers = [`${stem}-goal-check.json`, `${stem}-problem-anchor.json`];
  return markers.some((marker) => existsSync(join(dirname(filePath), marker)));
}

// A numbered Sources entry that nothing cites is a reference kept for looks.
function uncitedSources(text) {
  const heading = /^#{1,4}\s*Sources\b/im.exec(text);
  if (!heading) return [];
  const body = text.slice(0, heading.index);
  const after = text.slice(heading.index + heading[0].length);
  const listed = [...after.matchAll(/^\s*(\d+)\.\s+/gm)].map((m) => m[1]);
  if (listed.length === 0) return [];
  const cited = new Set([...body.matchAll(/\[(\d+)\]/g)].map((m) => m[1]));
  return listed.filter((n) => !cited.has(n));
}

// A repo claim anchored to a bare code filename (`solver.ts:42`) cannot be
// resolved by a reader; only a path is checkable. Prose/config files commonly
// sit at a repo root, so they are exempt; code files rarely do.
const CODE_EXT = "ts|tsx|js|mjs|cjs|py|go|rs|java|c|cc|cpp|h|hpp|sql|sh|ps1";
function bareCodeAnchors(text) {
  const pattern = new RegExp(`(?:^|[\`(<\\s])([\\w.-]+\\.(?:${CODE_EXT})):\\d+`, "gi");
  const bad = [];
  for (const match of text.matchAll(pattern)) {
    if (!match[1].includes("/")) bad.push(match[1]);
  }
  return [...new Set(bad)];
}

// --- craft audit (advisory) -------------------------------------------------
// The default checks above are the integrity net. This mode is the craft layer:
// it finds the predictable prose and structure defaults that survive a correct
// report. It is advisory unless --strict is passed; the craft pass decides
// which signs matter, and a good report may have none.
const CRAFT_SKIP_LINE = /^\s*(?:>|```|~~~|\|)/;
const CRAFT_GENERIC_OPENER =
  /^\s*(?:This report (?:provides|offers|presents) (?:a )?(?:comprehensive|detailed|thorough|broad) (?:overview|analysis|review)|In today's (?:fast-paced|rapidly (?:evolving|changing))|It is important to note that|This document aims to)/i;
const CRAFT_HYPE =
  /\b(?:comprehensive|seamless|cutting-edge|paradigm-shifting|holistic|synerg(?:y|istic)|game-changing|revolutioni[sz]e|delve)\b/gi;
const CRAFT_STAGED =
  /\b(?:Let's dive in|Let's explore|Here's what you need to know|In this report, we will|This report will (?:explore|examine|discuss))\b/i;
const CRAFT_CHAT = /\b(?:I hope this helps|Let me know if you|Feel free to (?:ask|reach out))\b/i;
const CRAFT_NOT_X =
  /\b(?:not|isn't|wasn't|doesn't|didn't) (?:just|only|merely) [^.\n]{1,80}\b(?:but|rather)\b/i;
const CRAFT_FURTHER =
  /\b(?:further|future|additional) (?:work|research|study|investigation|testing) (?:is|will be|should be|remains) (?:needed|required|recommended|necessary)\b/i;
const CRAFT_CONDITION =
  /\b(?:if|when|unless|until|before|after|to (?:confirm|decide|change|rule out|validate)|would change|depends on|provided that)\b/i;

function proseLines(text) {
  const lines = [];
  let fence = false;
  let inFrontmatter = false;
  let frontmatterDone = false;
  for (const [index, raw] of text.split("\n").entries()) {
    const trimmed = raw.trim();
    if (!frontmatterDone && index === 0 && trimmed === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === "---") {
        inFrontmatter = false;
        frontmatterDone = true;
      }
      continue;
    }
    frontmatterDone = true;
    if (/^(?:```|~~~)/.test(trimmed)) {
      fence = !fence;
      continue;
    }
    if (fence || CRAFT_SKIP_LINE.test(raw)) continue;
    lines.push({ line: index + 1, text: raw });
  }
  return lines;
}

function craftDuplicateHeadings(lines) {
  const signs = [];
  const seen = new Map();
  for (const { line, text } of lines) {
    const match = text.match(/^#{1,4}\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const key = match[1].toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key) continue;
    if (seen.has(key)) {
      signs.push({
        line,
        id: "duplicate-heading",
        detail: `"${match[1]}" repeats line ${seen.get(key)}`,
      });
    } else {
      seen.set(key, line);
    }
  }
  return signs;
}

function craftRepeatedSentences(lines) {
  const signs = [];
  const seen = new Map();
  for (const { line, text } of lines) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      if (sentence.split(/\s+/).length < 14) continue;
      const key = sentence.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
      if (!key) continue;
      if (seen.has(key)) {
        const excerpt = sentence.length > 80 ? `${sentence.slice(0, 80)}…` : sentence;
        signs.push({
          line,
          id: "repeated-sentence",
          detail: `repeats line ${seen.get(key)}: "${excerpt}"`,
        });
      } else {
        seen.set(key, line);
      }
    }
  }
  return signs;
}

function craftAudit(filePath) {
  const lines = proseLines(readFileSync(filePath, "utf-8"));
  const signs = [];
  for (const [index, { line, text }] of lines.entries()) {
    if (index < 20 && CRAFT_GENERIC_OPENER.test(text)) {
      signs.push({ line, id: "generic-opener", detail: "start with the decision or the finding" });
    }
    for (const match of text.matchAll(CRAFT_HYPE)) {
      signs.push({ line, id: "hype-word", detail: `"${match[0]}" — say what the thing does` });
    }
    if (CRAFT_STAGED.test(text)) {
      signs.push({ line, id: "staged-opener", detail: "start with the point, not the run-up" });
    }
    if (CRAFT_CHAT.test(text)) {
      signs.push({ line, id: "chat-residue", detail: "remove the chat wrapper" });
    }
    if (CRAFT_NOT_X.test(text)) {
      signs.push({ line, id: "not-x-but-y", detail: "state the positive claim directly" });
    }
    if (CRAFT_FURTHER.test(text)) {
      const windowText = [text, lines[index + 1]?.text, lines[index + 2]?.text]
        .filter(Boolean)
        .join(" ");
      if (!CRAFT_CONDITION.test(windowText)) {
        signs.push({
          line,
          id: "unconditional-further-work",
          detail: "name the condition that would make the further work change the decision",
        });
      }
    }
  }
  signs.push(...craftDuplicateHeadings(lines));
  signs.push(...craftRepeatedSentences(lines));
  return signs;
}

function checkFile(filePath) {
  const problems = [];
  const text = readFileSync(filePath, "utf-8");
  const filename = basename(filePath);
  const isVerifier = filename.includes("verifier") || filename.includes("verification");
  const isDraft = filename.includes("draft") || filename.includes("cited");
  const isPlan = filename.includes("plan");
  const final = isFinalDeliverable(filePath);

  if (isVerifier && !text.includes("MACHINE_VERDICT:")) {
    problems.push(`${filename}: missing MACHINE_VERDICT line`);
  }

  if (isDraft && !/\[\d+\]/.test(text)) {
    problems.push(`${filename}: missing inline citations [1], [2]`);
  }

  if (isDraft && !text.includes("## Sources") && !text.includes("## sources")) {
    problems.push(`${filename}: missing Sources section`);
  }

  if ((isDraft || final) && uncitedSources(text).length > 0) {
    const uncited = uncitedSources(text).map((n) => `[${n}]`).join(", ");
    problems.push(`${filename}: Sources ${uncited} listed but never cited in the body`);
  }

  if (isVerifier && !text.includes("Evidence Trail") && !text.includes("evidence trail")) {
    problems.push(`${filename}: missing Evidence Trail table`);
  }

  if (isPlan && !text.includes("Key Questions") && !text.includes("key questions")) {
    problems.push(`${filename}: missing Key Questions section`);
  }

  if (isPlan && !text.includes("Evidence Needed") && !text.includes("evidence needed")) {
    problems.push(`${filename}: missing Evidence Needed section`);
  }

  if (final) {
    if (!FILE_ANCHOR.test(text) && !MEASURED_COMMAND.test(text)) {
      problems.push(
        `${filename}: no artifact anchor — ground a claim in path:line or in a command and its result`,
      );
    }
    const bare = bareCodeAnchors(text);
    if (bare.length > 0) {
      problems.push(
        `${filename}: bare filename anchor ${bare.map((b) => `\`${b}\``).join(", ")} — repo claims need path:line`,
      );
    }
    if (!hasSectionWithBody(text, NEGATIVE_COVERAGE)) {
      problems.push(`${filename}: no negative-coverage section with content (what was searched for and not found)`);
    }
    if (!hasSectionWithBody(text, IMPACT_VS_EVIDENCE)) {
      problems.push(`${filename}: no impact-vs-evidence section with content`);
    }
  }

  return problems;
}

function collectFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Hidden dirs (.plans, .drafts, .archive) are working/backup space,
        // not checked artifacts
        if (entry.name.startsWith(".")) continue;
        files.push(...collectFiles(fullPath));
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        files.push(fullPath);
      }
    }
  } catch { /* dir doesn't exist */ }
  return files;
}

// Collect files
let files = [];
let singleFile = false;
if (existsSync(target)) {
  singleFile = statSync(target).isFile();
  files = singleFile ? [target] : collectFiles(target);
} else {
  console.log(`PASS: ${target} does not exist yet (no outputs to check)`);
  process.exit(0);
}

// Craft mode is advisory unless --strict is passed. On a directory it judges
// only final deliverables, so drafts and plans are not rewritten into shape.
if (CRAFT) {
  const craftFiles = files.filter((file) => singleFile || isFinalDeliverable(file));
  let craftSigns = 0;
  for (const file of craftFiles) {
    const signs = craftAudit(file);
    if (signs.length === 0) continue;
    craftSigns += signs.length;
    console.log(`CRAFT: ${signs.length} sign(s) in ${basename(file)}`);
    for (const sign of signs) {
      console.log(`  ${basename(file)}:${sign.line} [${sign.id}] ${sign.detail}`);
    }
  }
  if (craftSigns === 0) {
    console.log(`PASS: craft audit found no signs in ${craftFiles.length} file(s)`);
    process.exit(0);
  }
  console.log(
    `\nCRAFT: ${craftSigns} sign(s) across ${craftFiles.length} file(s)` +
      `${STRICT ? " (strict: failing)" : " (advisory)"}`,
  );
  process.exit(STRICT ? 1 : 0);
}

let totalProblems = 0;
const results = [];

for (const file of files) {
  const problems = checkFile(file);
  if (problems.length > 0) {
    results.push({ file: basename(file), problems });
    totalProblems += problems.length;
  }
}

// Output
if (totalProblems === 0) {
  console.log(`PASS: ${files.length} files checked, no drift detected`);
  console.log("  - All verifier outputs have MACHINE_VERDICT");
  console.log("  - All drafts have inline citations + Sources");
  console.log("  - All plans have Key Questions + Evidence Needed");
  console.log("  - All verifier outputs have Evidence Trail");
  console.log("  - Every final deliverable is anchored and records what it did not find");
  console.log("  - Sources entries are cited; repo anchors carry a path");
  process.exit(0);
}

console.error(`DRIFT DETECTED: ${totalProblems} issue(s) across ${results.length} file(s):\n`);
for (const { file, problems } of results) {
  for (const p of problems) {
    console.error(`  ${p}`);
  }
}
process.exit(1);
