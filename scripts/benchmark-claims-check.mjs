#!/usr/bin/env node
// benchmark-claims-check.mjs — the published benchmark numbers must equal the
// measured ones.
//
// Vitruvius reports two adversarial measurements in the README, evidence guide,
// website, and working note: the n=1 corpus and the later majority-of-3
// certification. Nothing recomputed those numbers against their scorers, so a
// future run could leave a public claim silently wrong or mix the two corpora.
// This closes that gap.
//
// Design constraints, both learned the hard way in the session that added it:
//
// 1. The numbers here are DERIVED FROM THE SCORER at run time. A check that
//    hardcoded "75%" would be the stale copy it exists to catch, and would
//    pass forever while the docs and reality diverged.
//
// 2. Only a line that actually publishes the canonical four-figure claim is
//    checked. A line that merely says "20 adversarial cases", or "the
//    adversarial suite", is not a claim and must not be asked for numbers.
//    An earlier version keyed on the word "adversarial" alone and demanded all
//    four figures from 16 lines that publish none, which is a check that
//    cries wolf and gets switched off.
//
//    Critically, the pattern matches the four figures as one ordered run
//    (accuracy, false approvals, false blocks, conservative overcalls). The
//    pressure suite publishes its own "one false approval" in the same
//    sentence, and notes/VITRUVIUS.md also publishes a "75% routing rank-1
//    floor" nearby. Matching the whole run at once is what keeps three
//    different measurements from being compared against each other.
//
// Usage: node scripts/benchmark-claims-check.mjs [--json]

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { scoreBenchmark, scoreMajority } from "./benchmark-scoring.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const DOCS = ["README.md", "notes/VITRUVIUS.md", "docs/EVIDENCE.md", "site/index.html", "site/about.html"];
const MAJORITY_DOCS = new Set(["README.md", "docs/EVIDENCE.md", "site/index.html", "site/about.html"]);

// A count in either wording: "1" or "one", "0" or "zero". This must be a
// CAPTURING group — it is repeated three times in CLAIM and its matches are
// the three counts. As a non-capturing group, m[2..4] came back undefined.
const N = "(\\d+|one|zero|two|three|four|five)";
const NUM = { one: 1, zero: 0, two: 2, three: 3, four: 4, five: 5 };
function toNumber(raw) {
  if (/^\d+$/.test(raw)) return Number(raw);
  return NUM[raw.toLowerCase()] ?? null;
}

// The canonical claim: accuracy, then the three counts, in order, with flexible
// connectors between them. Matched as one run so a stray percentage or a
// pressure-suite false-approval count elsewhere in the sentence cannot be
// spliced in.
const CLAIM = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*%[^.]{0,80}?${N}\\s+false\\s+approval[^.]{0,80}?${N}\\s+false\\s+blocks?` +
    `[^.]{0,80}?${N}\\s+conservative\\s+overcalls?`,
  "i",
);

// The later majority-of-3 measurement is a different claim from the single-run
// corpus. It must be labelled in the prose and checked against its own run
// directories, never against the n=1 scorer.
const MAJORITY_CLAIM = new RegExp(
  `majority(?:-of-3|\\s+of\\s+(?:3|three))[^.]{0,120}?(\\d+(?:\\.\\d+)?)\\s*%` +
    `[^.]{0,80}?${N}\\s+false\\s+approval[^.]{0,80}?${N}\\s+false\\s+blocks?` +
    `[^.]{0,80}?${N}\\s+conservative\\s+overcalls?`,
  "i",
);

// A line that names the adversarial benchmark but does not publish the full
// four-figure run is a PARTIAL claim: it tells a reader a number without the
// context that makes it honest.
const PARTIAL_ACCURACY = /adversarial[^.]{0,120}?(\d+(?:\.\d+)?)\s*%/i;

function measure() {
  const report = scoreBenchmark({
    casesDir: join(REPO_ROOT, "tasks", "benchmark", "cases"),
    resultsDir: join(REPO_ROOT, "tasks", "benchmark", "results"),
  });
  const { total, scored, correct, falseApprovals, falseBlocks, conservativeOvercalls } = report.summary;
  return {
    accuracy: scored === 0 ? 0 : Number(((correct / scored) * 100).toFixed(1)),
    correct,
    scored,
    total,
    falseApprovals,
    falseBlocks,
    conservativeOvercalls,
    integrityErrors: report.errors,
  };
}

function measureMajority() {
  const report = scoreMajority({
    casesDir: join(REPO_ROOT, "tasks", "benchmark", "cases"),
    runDirs: [1, 2, 3].map((run) => join(REPO_ROOT, "tasks", "benchmark", `results-cert-r${run}`)),
  });
  const { scored, majorityCorrect, majorityFalseApprovals, majorityFalseBlocks } = report.summary;
  // certify-report.mjs counts both PARTIAL->BLOCKED and BLOCKED->PARTIAL as
  // conservative overcalls. scoreMajority's scalar field covers only the first,
  // so derive the published total from the per-case classifications.
  const conservativeOvercalls = report.cases.filter((item) =>
    item.error === undefined &&
    !item.correct &&
    !item.falseApproval &&
    !item.falseBlock &&
    (item.conservativeOvercall || (item.majority === "PARTIAL" && item.groundTruth.verdict === "BLOCKED")),
  ).length;
  return {
    accuracy: scored === 0 ? 0 : Number(((majorityCorrect / scored) * 100).toFixed(1)),
    correct: majorityCorrect,
    scored,
    falseApprovals: majorityFalseApprovals,
    falseBlocks: majorityFalseBlocks,
    conservativeOvercalls,
    integrityErrors: report.errors,
  };
}

const truth = measure();
const majorityTruth = measureMajority();
const problems = [];

// A claim cannot be verified against a broken measurement.
if (truth.integrityErrors.length > 0) {
  problems.push(
    `the scorer reports ${truth.integrityErrors.length} integrity error(s), so its numbers are not a ` +
      `valid baseline to compare claims against: ${truth.integrityErrors.join("; ")}`,
  );
}
if (majorityTruth.integrityErrors.length > 0) {
  problems.push(
    `the majority scorer reports ${majorityTruth.integrityErrors.length} integrity error(s), so its numbers are not a ` +
      `valid baseline to compare claims against: ${majorityTruth.integrityErrors.join("; ")}`,
  );
}

const perDoc = [];
let fullClaims = 0;
let majorityClaims = 0;
let figuresChecked = 0;

for (const file of DOCS) {
  const path = join(REPO_ROOT, file);
  if (!existsSync(path)) {
    problems.push(`${file}: does not exist, so its published claims cannot be verified`);
    continue;
  }
  const lines = readFileSync(path, "utf8").split("\n");
  const sites = [];

  lines.forEach((line, i) => {
    const majorityMatch = MAJORITY_CLAIM.exec(line);
    if (majorityMatch) {
      majorityClaims++;
      const claimed = {
        accuracy: Number(majorityMatch[1]),
        falseApprovals: toNumber(majorityMatch[2]),
        falseBlocks: toNumber(majorityMatch[3]),
        conservativeOvercalls: toNumber(majorityMatch[4]),
      };
      sites.push({ line: i + 1, kind: "majority", claimed });
      for (const [field, value] of Object.entries(claimed)) {
        figuresChecked++;
        if (value !== majorityTruth[field]) {
          problems.push(
            `${file}:${i + 1}: publishes majority ${field} = ${value}, but the majority scorer measures ${majorityTruth[field]}`,
          );
        }
      }
      return;
    }
    // A malformed or unlabelled majority line must not be accepted as the
    // single-run claim just because it carries the same four numbers.
    if (/majority/i.test(line)) return;

    const m = CLAIM.exec(line);
    if (m) {
      fullClaims++;
      const claimed = {
        accuracy: Number(m[1]),
        falseApprovals: toNumber(m[2]),
        falseBlocks: toNumber(m[3]),
        conservativeOvercalls: toNumber(m[4]),
      };
      sites.push({ line: i + 1, kind: "full", claimed });
      for (const [field, value] of Object.entries(claimed)) {
        figuresChecked++;
        if (value !== truth[field]) {
          problems.push(
            `${file}:${i + 1}: publishes ${field} = ${value}, but the scorer measures ${truth[field]}`,
          );
        }
      }
      return;
    }

    // Partial: an accuracy figure attributed to the adversarial benchmark with no
    // accompanying false-approval / false-block / overcall counts. That is a
    // score published without the context that makes it honest.
    const p = PARTIAL_ACCURACY.exec(line);
    if (p && /benchmark|correctness|score|run|suite/i.test(line)) {
      sites.push({ line: i + 1, kind: "partial", claimed: { accuracy: Number(p[1]) } });
      figuresChecked++;
      if (Number(p[1]) !== truth.accuracy) {
        problems.push(
          `${file}:${i + 1}: publishes adversarial accuracy = ${p[1]}, but the scorer measures ${truth.accuracy}`,
        );
      }
      problems.push(
        `${file}:${i + 1}: publishes an adversarial accuracy figure without the accompanying ` +
          `false-approval, false-block, and conservative-overcall counts; a score quoted alone reads as ` +
          `better than it is`,
      );
    }
  });

  if (!sites.some((s) => s.kind === "full")) {
    problems.push(`${file}: publishes no full single-run adversarial benchmark claim, so nothing can be verified against it`);
  }
  if (MAJORITY_DOCS.has(file) && !sites.some((s) => s.kind === "majority")) {
    problems.push(`${file}: publishes no labelled majority-of-3 adversarial benchmark claim`);
  }
  perDoc.push({ file, sites });
}

const result = {
  measured: truth,
  majority: majorityTruth,
  documents: perDoc,
  fullClaimSites: fullClaims,
  majorityClaimSites: majorityClaims,
  figuresChecked,
  problems,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else if (problems.length === 0) {
  console.log(
    `PASS: ${figuresChecked} published figures across ${fullClaims} single-run and ` +
      `${majorityClaims} majority claim site(s) in ${perDoc.length} document(s) match the scorers ` +
      `(single ${truth.correct}/${truth.scored} = ${truth.accuracy}%, ` +
      `${truth.falseApprovals} false approval, ${truth.falseBlocks} false blocks, ` +
      `${truth.conservativeOvercalls} conservative overcall; ` +
      `majority ${majorityTruth.correct}/${majorityTruth.scored} = ${majorityTruth.accuracy}%, ` +
      `${majorityTruth.falseApprovals} false approvals, ${majorityTruth.falseBlocks} false blocks, ` +
      `${majorityTruth.conservativeOvercalls} conservative overcalls)`,
  );
} else {
  console.error(`FAIL: ${problems.length} problem(s) with the published benchmark claims:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    `\nMeasured now — single: ${truth.correct}/${truth.scored} = ${truth.accuracy}%, ` +
      `${truth.falseApprovals} false approval, ${truth.falseBlocks} false blocks, ` +
      `${truth.conservativeOvercalls} conservative overcall; ` +
      `majority: ${majorityTruth.correct}/${majorityTruth.scored} = ${majorityTruth.accuracy}%, ` +
      `${majorityTruth.falseApprovals} false approvals, ${majorityTruth.falseBlocks} false blocks, ` +
      `${majorityTruth.conservativeOvercalls} conservative overcalls.`,
  );
}

process.exit(problems.length > 0 ? 1 : 0);
