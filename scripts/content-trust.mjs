#!/usr/bin/env node
// content-trust.mjs — flag instruction-like spans in retrieved text.
//
// A web page, PDF, email, issue thread, or pasted document is data. It is not
// allowed to change the research question, the evidence criteria, the citation
// list, or the output contract. This detector is a first pass: it reports
// high-precision patterns, never executes or rewrites the source.
//
// Usage:
//   node scripts/content-trust.mjs <file>
//   node scripts/content-trust.mjs <file> --strict
//
// Output: JSON { schema, file, findings: [{ line, kind, excerpt }], count }.
// Advisory by default; --strict exits 1 when any finding is present.
// Reference: references/content-trust.md

import { readFileSync } from "node:fs";

const PATTERNS = [
  {
    kind: "ignore-previous",
    pattern: /\bignore\s+(?:all\s+|any\s+)?(?:previous|prior|above)\s+instructions?\b/i,
  },
  {
    kind: "disregard-prior",
    pattern: /\bdisregard\s+(?:the\s+)?(?:system|previous|prior|above)\b/i,
  },
  {
    kind: "override-rules",
    pattern: /\boverride\s+(?:the\s+)?(?:system|instructions?|rules)\b/i,
  },
  {
    kind: "authority-address",
    pattern: /(?:^|\s)(?:system|assistant|developer)\s*:/i,
  },
  {
    kind: "role-change",
    pattern: /\byou\s+are\s+now\s+(?:a|an|the)\b/i,
  },
  {
    kind: "citation-suppression",
    pattern: /\b(?:do not|don't|never)\s+cite\b|\bomit\s+(?:the\s+)?(?:sources?|citations?)\b/i,
  },
  {
    kind: "output-only",
    pattern: /\b(?:output|respond|answer)\s+only\b/i,
  },
  {
    kind: "fake-closing-tag",
    pattern: /<\/(?:skill|instructions?|system|prompt)>/i,
  },
  {
    kind: "system-wrapper",
    pattern: /\b(?:BEGIN|END)\s+(?:SYSTEM|INSTRUCTIONS?|PROMPT)\b/i,
  },
];

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const file = args.find((arg) => !arg.startsWith("--"));

if (!file) {
  console.error("usage: node scripts/content-trust.mjs <file> [--strict]");
  process.exit(1);
}

let text;
try {
  text = readFileSync(file, "utf-8");
} catch (error) {
  console.error(`content-trust: cannot read ${file}: ${error.message}`);
  process.exit(2);
}

const findings = [];
for (const [index, line] of text.split("\n").entries()) {
  for (const { kind, pattern } of PATTERNS) {
    if (!pattern.test(line)) continue;
    findings.push({
      line: index + 1,
      kind,
      excerpt: line.trim().slice(0, 160),
    });
  }
}

console.log(
  JSON.stringify(
    {
      schema: "vitruvius-content-trust.v1",
      file,
      findings,
      count: findings.length,
    },
    null,
    2,
  ),
);

if (strict && findings.length > 0) process.exit(1);
