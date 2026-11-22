import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { validateEvidenceLedger } from "../../skills/engineering-research/scripts/evidence-ledger.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const hash = (path) => createHash("sha256").update(readFileSync(join(repoRoot, path))).digest("hex");

// --- Trust-boundary negative tests (src-01 idea-only) -----------------------
// src-01 has no worktree; these patterns extend existing fixtures where a new
// boundary appears. Each test asserts that a path-escape or hash-mismatch
// is refused by the evidence ledger contract.

function validLedger() {
  return {
    schema: "evidence.v1",
    run_id: "11111111-1111-4111-8111-111111111111",
    question: "Trust-boundary fixture test",
    sources: [
      {
        id: "SRC-001",
        title: "Boundary fixture",
        locator: "fixture.md#L1",
        artifact_path: "evals/fixtures/c1/supported-evidence/requirement.md",
        sha256: hash("evals/fixtures/c1/supported-evidence/requirement.md"),
        accessed_on: "2026-09-25",
        status: "verified",
      },
    ],
    searches: [
      {
        id: "SEARCH-001",
        query: "boundary",
        boundary: "local fixture",
        searched_on: "2026-09-25",
        status: "completed",
        screened_count: 1,
        result_source_ids: ["SRC-001"],
      },
    ],
    claims: [
      {
        id: "CLAIM-001",
        text: "The fixture supports the boundary.",
        status: "verified",
        coverage_status: "covered",
        support: [
          { source_id: "SRC-001", locator: "requirement.md#L1", relation: "supports", status: "verified" },
        ],
      },
    ],
    coverage: {
      negative: [{ id: "NEG-001", search_id: "SEARCH-001", claim_ids: [], status: "documented", note: "No contradictory boundary found." }],
      ambiguous: [],
    },
  };
}

function clone() {
  return structuredClone(validLedger());
}

function errorsFor(mutator) {
  const value = clone();
  mutator(value);
  return validateEvidenceLedger(value, { repoRoot }).errors;
}

// Path escape attempts must be refused.
assert.match(
  errorsFor((v) => { v.sources[0].artifact_path = "evals/fixtures/c1/supported-evidence/../../../etc/passwd"; }).join("\n"),
  /confined regular file/i
);
assert.match(
  errorsFor((v) => { v.sources[0].artifact_path = "evals/fixtures/c1/supported-evidence/..\\..\\..\\etc\\passwd"; }).join("\n"),
  /confined regular file/i
);

// Hash mismatch must be refused.
assert.match(
  errorsFor((v) => { v.sources[0].sha256 = "0".repeat(64); }).join("\n"),
  /sha256 must match artifact_path bytes/i
);

// Non-existent artifact must be refused (path confinement check fires first).
assert.match(
  errorsFor((v) => { v.sources[0].artifact_path = "evals/fixtures/c1/supported-evidence/nonexistent.md"; }).join("\n"),
  /confined regular file/i
);

// Directory traversal via .. must be refused.
assert.match(
  errorsFor((v) => { v.sources[0].artifact_path = "evals/fixtures/c1/supported-evidence/../.."; }).join("\n"),
  /confined regular file/i
);

// --- content trust: instruction-like source text is data -------------------
// The trust boundary is not only path escape. A retrieved page can address the
// agent directly; the detector must flag it, and a normal source must stay
// quiet. The rules live in references/content-trust.md.
const contentTrust = join(repoRoot, "scripts", "content-trust.mjs");
const malicious = join(repoRoot, "evals", "content-trust", "fixtures", "malicious.md");
const benign = join(repoRoot, "evals", "content-trust", "fixtures", "benign.md");

const flagged = spawnSync(process.execPath, [contentTrust, malicious], { encoding: "utf8" });
assert.equal(flagged.status, 0, `content-trust must run: ${flagged.stderr}`);
const flaggedReport = JSON.parse(flagged.stdout);
for (const kind of [
  "ignore-previous",
  "authority-address",
  "citation-suppression",
  "output-only",
  "fake-closing-tag",
]) {
  assert.ok(
    flaggedReport.findings.some((finding) => finding.kind === kind),
    `content-trust must report ${kind}: ${flagged.stdout}`,
  );
}

const clean = spawnSync(process.execPath, [contentTrust, benign], { encoding: "utf8" });
assert.equal(clean.status, 0, `content-trust must run: ${clean.stderr}`);
const cleanReport = JSON.parse(clean.stdout);
assert.equal(cleanReport.count, 0, `a normal source must stay clean: ${clean.stdout}`);

const strict = spawnSync(process.execPath, [contentTrust, malicious, "--strict"], { encoding: "utf8" });
assert.equal(strict.status, 1, "strict mode must fail on an instruction-like source");

console.log("PASS: trust-boundary negative tests refuse path escape, hash mismatch, and instruction-like source text");
