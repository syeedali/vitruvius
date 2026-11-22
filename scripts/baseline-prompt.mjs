#!/usr/bin/env node
// baseline-prompt.mjs — emit the exact prompt for one baseline comparison case.
//
// The comparison is only real when the control runs with NO Vitruvius context.
// This script does not call a model; it makes the control reproducible:
//
//   node scripts/baseline-prompt.mjs --list
//   node scripts/baseline-prompt.mjs --case <id> --condition baseline
//   node scripts/baseline-prompt.mjs --case <id> --condition with-vitruvius
//   node scripts/baseline-prompt.mjs --check-isolation <directory>
//
// The baseline prompt is checked for Vitruvius vocabulary before it is printed.
// A directory inside the repository, or one carrying AGENTS.md / skills /
// .opencode / .claude, is refused as an isolation target.
//
// Reference: evals/baseline/RUNNER.md

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CASES_PATH = join(REPO_ROOT, "evals", "baseline", "cases.json");
const cases = JSON.parse(readFileSync(CASES_PATH, "utf8")).cases;

const args = process.argv.slice(2);
const flagValue = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};

if (args.includes("--list")) {
  for (const entry of cases) console.log(`${entry.id}\t${entry.question}`);
  process.exit(0);
}

if (args.includes("--check-isolation")) {
  const target = resolve(flagValue("--check-isolation") ?? "");
  const rel = relative(REPO_ROOT, target);
  const outsideRepo = rel === ".." || rel.startsWith(`..${sep}`) || /^[A-Za-z]:/.test(rel);
  const reasons = [];
  if (!outsideRepo) reasons.push("directory is inside the Vitruvius repository");
  if (!existsSync(target)) {
    reasons.push("directory does not exist");
  } else if (!statSync(target).isDirectory()) {
    reasons.push("path is not a directory");
  }
  for (const marker of ["AGENTS.md", "CLAUDE.md", "skills", ".opencode", ".claude"]) {
    if (existsSync(join(target, marker))) reasons.push(`directory contains ${marker}`);
  }
  // An agent may load configuration from an ancestor directory. A scratch
  // directory under a home that carries ~/.claude is not isolated even when
  // the leaf is empty.
  let ancestor = dirname(target);
  while (true) {
    for (const marker of ["AGENTS.md", "CLAUDE.md", "skills", ".opencode", ".claude"]) {
      if (existsSync(join(ancestor, marker))) {
        reasons.push(`ancestor ${ancestor} contains ${marker}`);
      }
    }
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  console.log(
    JSON.stringify(
      { schema: "vitruvius-baseline-isolation.v1", directory: target, isolated: reasons.length === 0, reasons },
      null,
      2,
    ),
  );
  process.exit(reasons.length === 0 ? 0 : 1);
}

const caseId = flagValue("--case");
const condition = flagValue("--condition") ?? "baseline";
if (!caseId) {
  console.error("usage: node scripts/baseline-prompt.mjs --case <id> [--condition baseline|with-vitruvius] [--json]");
  process.exit(2);
}
if (!["baseline", "with-vitruvius"].includes(condition)) {
  console.error(`unknown condition: ${condition} (expected baseline or with-vitruvius)`);
  process.exit(2);
}

const entry = cases.find((candidate) => candidate.id === caseId);
if (!entry) {
  console.error(`unknown case: ${caseId}\nAvailable: ${cases.map((candidate) => candidate.id).join(", ")}`);
  process.exit(2);
}

const defaultAnswer =
  condition === "baseline" ? "answer.md" : `evals/baseline/results/${caseId}/${condition}/answer.md`;
const defaultSources =
  condition === "baseline" ? "sources" : `evals/baseline/results/${caseId}/${condition}/sources`;
const answerPath = flagValue("--answer") ?? defaultAnswer;
const sourcesDir = flagValue("--sources") ?? defaultSources;

const contract = `Output contract (required):
1. Write your final answer as markdown to ${answerPath}.
2. Save every source you actually retrieve (fetch a URL, read a file) to
   ${sourcesDir}/<short-name>.txt.
3. Append a fenced JSON block to the end of the answer, in exactly this shape:
   {"citations":[{"locator":"<source as cited>","status":"read|recalled","supported":true,"artifact_path":"<path to the saved source, or null>"}]}
   - status is "read" ONLY if you retrieved that source in this run and saved
     it; otherwise "recalled".
   - supported is true if the source backs the claim it is attached to, false if
     it does not, null if unknown.
   - Cite only sources you believe exist. Do not invent a source to fill the
     contract.`;

const preamble =
  condition === "baseline"
    ? "Answer this question as a capable engineer. Cite the sources you rely on."
    : `Run the Vitruvius engineering-research method (/engineering-research) on the
question below. Follow it exactly: read sources directly, never infer a value
from a title or memory; cite document + section for every claim; mark each
claim verified / inferred / blocked; never fabricate a source; do not sign off a
design.`;

const prompt = `${preamble}\n\nQUESTION: ${entry.question}\n\n${contract}`;

// The control must not carry the treatment's vocabulary. Fail closed rather
// than print a contaminated baseline prompt.
const forbidden = /\bvitruvius\b|\/engineering-research\b|never fabricate|read sources directly|verified \/ inferred \/ blocked/i;
if (condition === "baseline" && forbidden.test(prompt)) {
  console.error("baseline prompt contains Vitruvius vocabulary; refusing to emit a contaminated control");
  process.exit(2);
}

if (args.includes("--json")) {
  console.log(JSON.stringify({ schema: "vitruvius-baseline-prompt.v1", case_id: caseId, condition, prompt, answer_path: answerPath, sources_dir: sourcesDir }, null, 2));
} else {
  console.log(prompt);
}
