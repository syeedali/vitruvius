import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { makeTempDir, removeTempDir } from "../_support/temp-dir.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  validateScholarlyEvidence,
  validateScholarlyMarkdown,
} from "../../scripts/scholarly-evidence-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const validator = join(root, "scripts", "scholarly-evidence-contract.mjs");

function packet() {
  return {
    schema: "scholarly-evidence.v1",
    question: "Which methods rank evidence with retraction status?",
    scope: "field",
    searches: [
      {
        id: "Q1",
        question: "Which methods rank evidence with retraction status?",
        index: "openalex",
        endpoint: "https://api.openalex.org/works?search=retraction%20ranking&per-page=20",
        query: "retraction ranking",
        searched_on: "2026-11-26",
        status: "completed",
        returned: 2,
        screened: 2,
        included_source_ids: ["SRC1", "SRC2"],
      },
      {
        id: "Q2",
        question: "Which methods rank evidence with retraction status?",
        index: "semantic-scholar",
        endpoint: "https://api.semanticscholar.org/graph/v1/paper/search?query=retraction%20ranking",
        query: "retraction ranking",
        searched_on: "2026-11-26",
        status: "partial",
        returned: 0,
        screened: 0,
        included_source_ids: [],
        notes: "HTTP 429 on the shared keyless pool; OpenAlex answered instead.",
      },
    ],
    sources: [
      {
        id: "SRC1",
        title: "Retraction-aware evidence ranking",
        year: 2024,
        venue: "Journal of Research Methods",
        doi: "10.1000/example-retraction-ranking",
        publication_status: "published",
        read_depth: "section",
        locator: "§3.2",
        access: "read",
        relation: "supports",
        questions: ["Which methods rank evidence with retraction status?"],
      },
      {
        id: "SRC2",
        title: "A benchmark for unreliable-source propagation",
        year: 2025,
        venue: "Proceedings of Example",
        arxiv: "2401.12345v2",
        publication_status: "preprint",
        read_depth: "pdf-page",
        locator: "p. 412",
        access: "read",
        relation: "challenges",
        questions: ["Which methods rank evidence with retraction status?"],
      },
    ],
    claims: [
      {
        id: "C1",
        kind: "result",
        text: "The benchmark evaluates retraction status at ranking time.",
        status: "verified",
        support: [
          { source_id: "SRC1", locator: "§3.2", relation: "supports", status: "verified" },
        ],
      },
      {
        id: "C2",
        kind: "absence",
        text: "No included source evaluates transitive contamination at rank time.",
        status: "partial",
        support: [],
        search_ids: ["Q1", "Q2"],
        boundary: "Two indexes and three reworded queries; Semantic Scholar was rate-limited.",
      },
    ],
    synthesis: {
      consensus: [
        {
          claim: "Retraction status belongs in the evidence ranking input.",
          source_ids: ["SRC1", "SRC2"],
          conditions: "For DOI-indexed journal and proceedings records.",
        },
      ],
      disagreements: [
        {
          claim: "Whether citation context should change the retraction weight.",
          sides: [
            { position: "Use the citing claim's dependence on the retracted source.", source_ids: ["SRC1"] },
            { position: "Use a fixed status penalty independent of citation context.", source_ids: ["SRC2"] },
          ],
          resolution: "A benchmark that holds the underlying evidence set fixed and varies only the weighting rule.",
        },
      ],
      trajectories: [
        {
          name: "From status flags to propagation-aware ranking",
          source_ids: ["SRC1", "SRC2"],
          change: "The unit of analysis moved from the retracted paper to the citing claim.",
        },
      ],
      open_questions: ["No included source tests ranking under expressions of concern."],
      source_status: [
        { source_id: "SRC1", status: "published", checked_on: "2026-11-26" },
        { source_id: "SRC2", status: "preprint", checked_on: "2026-11-26", note: "No published version found." },
      ],
    },
    handback: {
      decision: "Choose whether the ranking input is status-only or propagation-aware.",
      can_support: "A comparison of status-only and propagation-aware ranking inputs.",
      cannot_support: "A final weighting function or an expression-of-concern policy.",
    },
  };
}

function markdown(evidence) {
  return [
    "# Retraction-aware ranking: evidence handback",
    "",
    "| Question | Work | Depth | Locator |",
    "| --- | --- | --- | --- |",
    "| Which methods rank evidence with retraction status? | SRC1 | section | §3.2 |",
    "| Which methods rank evidence with retraction status? | SRC2 | pdf-page | p. 412 |",
    "",
    "## Consensus",
    "",
    "Retraction status belongs in the ranking input for DOI-indexed records.",
    "",
    "## Disagreements",
    "",
    "The sources disagree on whether citation context changes the weight.",
    "",
    "## Trajectories",
    "",
    "The field moved from status flags to propagation-aware ranking.",
    "",
    "## Source status",
    "",
    "SRC1 is published; SRC2 is a preprint.",
    "",
    "## What the literature does not settle",
    "",
    "No included source tests expressions of concern.",
    "",
    "## Handback",
    "",
    "Choose status-only or propagation-aware ranking; the evidence cannot select the final weight.",
    "",
    "```json",
    JSON.stringify(evidence, null, 2),
    "```",
    "",
  ].join("\n");
}

function expectInvalid(evidence, pattern) {
  const result = validateScholarlyEvidence(evidence);
  assert.equal(result.valid, false, "fixture must fail");
  assert.ok(result.errors.some((error) => pattern.test(error)), `no error matched ${pattern}\n${result.errors.join("\n")}`);
}

const valid = packet();
assert.deepEqual(validateScholarlyEvidence(valid).errors, [], "a complete field packet must pass");
assert.deepEqual(validateScholarlyMarkdown(markdown(valid)).errors, [], "the matching Markdown handback must pass");

// Verified body claims cannot rest on metadata or abstracts.
{
  const value = structuredClone(valid);
  value.sources[0].read_depth = "abstract";
  expectInvalid(value, /verified but SRC1 was read only at abstract depth/);
}

// Keyword coverage cannot verify an absence claim.
{
  const value = structuredClone(valid);
  value.claims[1].status = "verified";
  expectInvalid(value, /absence claim; keyword or index coverage cannot make it verified/);
}

// A field review without synthesis is the exact shallow-output failure.
{
  const value = structuredClone(valid);
  value.synthesis.consensus = [];
  expectInvalid(value, /synthesis\.consensus cannot be empty/);
}

// A failed index must say why it failed.
{
  const value = structuredClone(valid);
  delete value.searches[1].notes;
  expectInvalid(value, /notes must explain a partial or blocked search/);
}

// Consensus needs independent sources, not one work repeated.
{
  const value = structuredClone(valid);
  value.synthesis.consensus[0].source_ids = ["SRC1", "SRC1"];
  expectInvalid(value, /needs two independent sources/);
}

// Publication status in synthesis must agree with the source record.
{
  const value = structuredClone(valid);
  value.synthesis.source_status[0].status = "preprint";
  expectInvalid(value, /disagrees with sources\.SRC1\.publication_status/);
}

// A retracted source cannot provide verified support.
{
  const value = structuredClone(valid);
  value.sources[0].publication_status = "retracted";
  value.synthesis.source_status[0].status = "retracted";
  expectInvalid(value, /cannot be verified support from a retracted source/);
}

// The checked-in blind run is a negative fixture: it passed the old E1 grade but
// violates the skill's own output contract.
const shallow = readFileSync(join(root, "evals", "e1-runs", "out", "scholarly-research.md"), "utf8");
const shallowResult = validateScholarlyMarkdown(shallow);
assert.equal(shallowResult.valid, false, "the recorded shallow run must fail the new contract");
for (const pattern of [
  /fenced json evidence packet/,
  /missing required heading: ## Consensus/,
  /Question and Depth columns/,
  /no section, page, table, or path:line locator/,
]) {
  assert.ok(shallowResult.errors.some((error) => pattern.test(error)), `shallow output must fail for ${pattern}`);
}

// CLI behavior is part of the contract, not just the pure function.
const tempDir = makeTempDir("vitruvius-scholarly-packet-");
const temp = join(tempDir, "handback.md");
try {
  writeFileSync(temp, markdown(valid), "utf8");
  const pass = spawnSync(process.execPath, [validator, temp], { encoding: "utf8" });
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /PASS: scholarly evidence valid/);
} finally {
  removeTempDir(tempDir);
}

console.log("PASS: scholarly evidence packet enforces read depth, synthesis, source status, and absence boundaries; the recorded shallow run fails");
