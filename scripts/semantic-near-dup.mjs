#!/usr/bin/env node
// semantic-near-dup.mjs — propose semantic near-duplicate merges for an
// evidence ledger or a findings list. Advisory-only: proposes merges, never
// deletes evidence or a finding.
//
// Usage:
//   node scripts/semantic-near-dup.mjs <evidence-ledger.json>
//   node scripts/semantic-near-dup.mjs <findings.json>
//
// Output: JSON array of proposed merges, each with:
//   - sources: [id1, id2] or findings: [id1, id2]
//   - reason: string
//   - confidence: "high" | "medium" | "low"
//
// A document carrying both `sources` and `findings` returns an object with both
// proposal arrays. The source mode is unchanged; the findings mode compares the
// claim text of `{ id, claim }` records.
//
// Pattern reference: references/semantic-near-duplicate-matching.md
// (advisory-only rule, type-normalizer families, confidence tiers)

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Type-normalizer: canonicalize equivalent labels to a single type.
// Stolen from src-04's dedup type-normalizer pattern.
const TYPE_NORMALIZER = {
  // RCE family
  "remote code execution": "rce",
  "rce": "rce",
  "command injection": "rce",
  "cmd injection": "rce",
  "os command injection": "rce",
  // SQLi family
  "sql injection": "sqli",
  "sqli": "sqli",
  "sql": "sqli",
  // XSS family
  "cross-site scripting": "xss",
  "xss": "xss",
  // CSRF family
  "cross-site request forgery": "csrf",
  "csrf": "csrf",
  // IDOR family
  "insecure direct object reference": "idor",
  "idor": "idor",
  // SSRF family
  "server-side request forgery": "ssrf",
  "ssrf": "ssrf",
  // XXE family
  "xml external entity": "xxe",
  "xxe": "xxe",
  // Path traversal family
  "path traversal": "path-traversal",
  "directory traversal": "path-traversal",
  "lfi": "path-traversal",
  "local file inclusion": "path-traversal",
};

function normalizeType(type) {
  const key = type.toLowerCase().trim();
  return TYPE_NORMALIZER[key] || key;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function extractDoi(text) {
  const match = text.match(/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function extractArxivId(text) {
  const match = text.match(/arxiv:(\d{4}\.\d{4,5})/i);
  return match ? match[1] : null;
}

function proposeMerges(ledger) {
  const proposals = [];
  const sources = ledger.sources || [];

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];

      // Skip if already merged
      if (a.merged_into || b.merged_into) continue;

      // Check DOI match (high confidence)
      const doiA = extractDoi(a.locator || "");
      const doiB = extractDoi(b.locator || "");
      if (doiA && doiB && doiA === doiB) {
        proposals.push({
          sources: [a.id, b.id],
          reason: `Same DOI: ${doiA}`,
          confidence: "high",
        });
        continue;
      }

      // Check arXiv ID match (high confidence)
      const arxivA = extractArxivId(a.locator || "");
      const arxivB = extractArxivId(b.locator || "");
      if (arxivA && arxivB && arxivA === arxivB) {
        proposals.push({
          sources: [a.id, b.id],
          reason: `Same arXiv ID: ${arxivA}`,
          confidence: "high",
        });
        continue;
      }

      // Check title match (medium confidence)
      const titleA = normalizeTitle(a.title || "");
      const titleB = normalizeTitle(b.title || "");
      if (titleA && titleB && titleA === titleB) {
        proposals.push({
          sources: [a.id, b.id],
          reason: `Same title: "${a.title}"`,
          confidence: "medium",
        });
        continue;
      }

      // Check type + locator match (medium confidence)
      const typeA = normalizeType(a.type || "");
      const typeB = normalizeType(b.type || "");
      if (typeA === typeB && a.locator === b.locator && a.locator) {
        proposals.push({
          sources: [a.id, b.id],
          reason: `Same type (${typeA}) and locator: ${a.locator}`,
          confidence: "medium",
        });
        continue;
      }
    }
  }

  return proposals;
}

// --- findings --------------------------------------------------------------
// The same near-duplicate question applies to a report's findings: one issue
// paraphrased in the summary, the body, and the recommendations is one finding,
// not three. This mode is advisory, like the source mode: it proposes merges
// and never deletes a finding.
const FINDING_STOP = new Set(
  "a an and are as at be been by can could does do for from has have if in into is it its may might must not of on or should than that the their them then there these this to was were will with would".split(
    " ",
  ),
);

function findingText(finding) {
  return String(finding.claim ?? finding.text ?? finding.title ?? finding.finding ?? "").trim();
}

function findingTokens(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !FINDING_STOP.has(token)),
  );
}

function jaccard(a, b) {
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function proposeFindingMerges(findings) {
  const proposals = [];
  for (let i = 0; i < findings.length; i++) {
    for (let j = i + 1; j < findings.length; j++) {
      const a = findings[i];
      const b = findings[j];
      if (a.merged_into || b.merged_into) continue;
      const textA = findingText(a);
      const textB = findingText(b);
      const tokensA = findingTokens(textA);
      const tokensB = findingTokens(textB);
      if (tokensA.size < 6 || tokensB.size < 6) continue;
      const score = jaccard(tokensA, tokensB);
      if (score < 0.72) continue;
      proposals.push({
        findings: [a.id, b.id],
        reason: `Overlapping claim terms (${(score * 100).toFixed(0)}% shared)`,
        confidence: score >= 0.9 ? "high" : "medium",
      });
    }
  }
  return proposals;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: node scripts/semantic-near-dup.mjs <evidence-ledger-or-findings.json>");
  process.exit(1);
}

const ledgerPath = args[0];
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
const findings = Array.isArray(ledger.findings) ? ledger.findings : null;
const sourceProposals = Array.isArray(ledger.sources) ? proposeMerges(ledger) : null;
const findingProposals = findings ? proposeFindingMerges(findings) : null;

if (sourceProposals && findingProposals) {
  console.log(JSON.stringify({ sources: sourceProposals, findings: findingProposals }, null, 2));
  console.log(
    `\n${sourceProposals.length} source merge proposal(s); ${findingProposals.length} finding merge proposal(s)`,
  );
} else if (findingProposals) {
  console.log(JSON.stringify(findingProposals, null, 2));
  console.log(`\n${findingProposals.length} finding merge proposal(s) found`);
} else {
  console.log(JSON.stringify(sourceProposals ?? [], null, 2));
  console.log(`\n${(sourceProposals ?? []).length} merge proposal(s) found`);
}
