import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { validate, validateCatalogCoverage } from "../../scripts/e1-model-run.mjs";
import { makeTempDir, removeTempDir } from "../_support/temp-dir.mjs";

// The E1 model-run record layer: a record must be evidence, not a claim.
// Each failure mode below is one way a manifest could overstate the count.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

const CASES = {
  schema: "vitruvius-e1-cases.v1",
  cases: [
    {
      skill: "audit",
      prompt: "Audit this against its spec.",
      expectations: [
        { id: "E1", statement: "Names the mismatch." },
        { id: "E2", statement: "States what was checked." },
      ],
    },
  ],
};

function fixture({ output = "The audit found a 3-versus-5 mismatch.\n", gradeOverrides = {}, runOverrides = {} } = {}) {
  const dir = makeTempDir("vitruvius-e1-runs-");
  mkdirSync(join(dir, "out"), { recursive: true });
  writeFileSync(join(dir, "out", "audit.md"), output);
  const run = {
    skill: "audit",
    run_id: "run-1",
    date: "2026-11-08",
    fresh: true,
    agent: "general",
    session_id: "ses_fixture0000000000000000000",
    prompt: CASES.cases[0].prompt,
    prompt_sha256: sha256(CASES.cases[0].prompt),
    output: { path: "out/audit.md", sha256: sha256(output), bytes: Buffer.byteLength(output, "utf8") },
    grade: {
      status: "PASS",
      expectations: [
        { id: "E1", statement: "Names the mismatch.", passed: true, evidence: "States 3 versus 5." },
        { id: "E2", statement: "States what was checked.", passed: true, evidence: "Compares spec to code." },
      ],
      ...gradeOverrides,
    },
    blind_grade: {
      session_id: "ses_fixtureblind00000000000000",
      status: "PASS",
      expectations: [
        { id: "E1", statement: "Names the mismatch.", passed: true, evidence: "The audit says 3 vs 5." },
        { id: "E2", statement: "States what was checked.", passed: true, evidence: "It names the code comparison." },
      ],
    },
    agreement: "agree",
    ...runOverrides,
  };
  return { dir, runs: { schema: "vitruvius-e1-runs.v1", runs: [run] } };
}

function run(overrides, mutate) {
  const { dir, runs } = fixture(overrides);
  try {
    if (mutate) mutate(runs.runs[0], dir);
    return validate(CASES, runs, dir);
  } finally {
    removeTempDir(dir);
  }
}

// --- 1. A complete record validates --------------------------------------
{
  const result = run();
  assert.deepEqual(result.problems, [], `a complete record must pass:\n${result.problems.join("\n")}`);
  assert.deepEqual(result.records, ["audit"]);
}

// --- 2. A tampered output hash is refused --------------------------------
{
  const result = run({}, (r) => { r.output.sha256 = "0".repeat(64); });
  assert.ok(result.problems.some((p) => /output sha256 mismatch/.test(p)), "a changed answer must be caught");
  assert.equal(result.records.length, 0);
}

// --- 3. A byte count that does not match is refused ----------------------
{
  const result = run({}, (r) => { r.output.bytes += 1; });
  assert.ok(result.problems.some((p) => /output bytes mismatch/.test(p)));
}

// --- 4. PASS with a failed expectation is contradictory ------------------
{
  const result = run({}, (r) => { r.grade.expectations[0].passed = false; });
  assert.ok(result.problems.some((p) => /PASS with 1\/2 passed/.test(p)), "the status must agree with the grades");
}

// --- 5. An expectation with no evidence is refused -----------------------
{
  const result = run({}, (r) => { r.grade.expectations[0].evidence = "  "; });
  assert.ok(result.problems.some((p) => /has no evidence/.test(p)));
}

// --- 6. An ungraded expectation is refused -------------------------------
{
  const result = run({}, (r) => { r.grade.expectations.pop(); });
  assert.ok(result.problems.some((p) => /grades 1 expectation\(s\), case has 2/.test(p)));
  assert.ok(result.problems.some((p) => /leaves E2 ungraded/.test(p)));
}

// --- 7. A prompt that differs from the case is refused -------------------
{
  const result = run({}, (r) => { r.prompt = "A different prompt"; });
  assert.ok(result.problems.some((p) => /prompt differs from the case/.test(p)));
}

// --- 8. A non-fresh (non-blind) run is refused ---------------------------
{
  const result = run({}, (r) => { r.fresh = false; });
  assert.ok(result.problems.some((p) => /must be fresh/.test(p)));
}

// --- 9. Duplicate records for one skill are refused ----------------------
{
  const result = run({}, (_r, dir) => {
    const runs = { schema: "vitruvius-e1-runs.v1", runs: [] };
    // Rebuild through validate directly: two valid records for the same skill.
    const one = fixture();
    try {
      runs.runs = [one.runs.runs[0], structuredClone(one.runs.runs[0])];
      const result2 = validate(CASES, runs, one.dir);
      assert.ok(result2.problems.some((p) => /duplicate record for skill/.test(p)));
    } finally {
      removeTempDir(one.dir);
    }
  });
  assert.ok(Array.isArray(result.problems));
}

// --- 8b. A missing independent grade is refused -------------------------
{
  const result = run({}, (r) => { delete r.blind_grade; });
  assert.ok(result.problems.some((p) => /blind_grade\.status|blind_grade\.session_id/.test(p)));
}

// --- 9b. Agreement must match the two grades ----------------------------
{
  const result = run({}, (r) => {
    r.blind_grade.expectations[0].passed = false;
    r.blind_grade.status = "PARTIAL";
  });
  assert.ok(result.problems.some((p) => /agreement "agree" does not match/.test(p)));
  assert.ok(result.problems.some((p) => /needs a note/.test(p)));
}

// --- 9c. A recorded disagreement with a note is valid -------------------
{
  const result = run({}, (r) => {
    r.blind_grade.expectations[0].passed = false;
    r.blind_grade.status = "PARTIAL";
    r.agreement = "disagree";
    r.disagreement_note = "E1";
  });
  assert.deepEqual(result.problems, [], `a documented disagreement must validate:\n${result.problems.join("\n")}`);
}

// --- 9d. Public catalog coverage is derived from the records ---------------
{
  const catalog = {
    schema: "vitruvius-e1.v1",
    model_run_coverage: { status: "complete", complete: true, scope: "Every skill has a record." },
  };
  const runs = { schema: "vitruvius-e1-runs.v1", runs: [{ skill: "audit" }, { skill: "verifier" }] };
  const complete = validateCatalogCoverage(catalog, runs, ["audit", "verifier"]);
  assert.deepEqual(complete.problems, [], `a complete catalog must agree:\n${complete.problems.join("\n")}`);
  assert.equal(complete.complete, true);

  const missing = validateCatalogCoverage(catalog, { ...runs, runs: [{ skill: "audit" }] }, ["audit", "verifier"]);
  assert.equal(missing.complete, false, "a missing record must make coverage incomplete");
  assert.ok(missing.problems.some((p) => /model_run_coverage\.complete=true/.test(p)));
  assert.ok(missing.problems.some((p) => /no record for skill verifier/.test(p)));

  const stalePilot = validateCatalogCoverage(
    {
      schema: "vitruvius-e1.v1",
      model_run_coverage: { status: "pilot", complete: false, scope: "Broader 27-skill coverage remains open." },
    },
    runs,
    ["audit", "verifier"],
  );
  assert.equal(stalePilot.complete, true, "complete records must overrule a stale pilot status");
  assert.ok(stalePilot.problems.some((p) => /model_run_coverage\.status=pilot/.test(p)));
  assert.ok(stalePilot.problems.some((p) => /broader coverage remains open/.test(p)));
}

// --- 10. The checked-in state is coherent --------------------------------
{
  const cases = JSON.parse(readFileSync(join(repoRoot, "evals", "e1-cases.json"), "utf8"));
  const runs = JSON.parse(readFileSync(join(repoRoot, "evals", "e1-runs", "manifest.json"), "utf8"));
  const result = validate(cases, runs, repoRoot);
  assert.deepEqual(result.problems, [], `the real record layer must validate:\n${result.problems.join("\n")}`);
  assert.equal(result.cases, 27, "the case catalog must cover every skill");
  const scholarlyCase = cases.cases.find((entry) => entry.skill === "scholarly-research");
  assert.equal(scholarlyCase.expectations.length, 4, "the scholarly case must grade provenance, depth, and synthesis");
  const scholarlyRun = runs.runs.find((entry) => entry.skill === "scholarly-research");
  assert.equal(scholarlyRun.grade.status, "PARTIAL", "the fixed shallow output must not keep its old PASS");
  assert.equal(scholarlyRun.blind_grade.status, "PARTIAL", "the independent regrade must agree on the shallow output");
  assert.match(scholarlyRun.historical_regrade?.note ?? "", /no model rerun/, "the regrade must disclose that the output is historical");
  const manifest = JSON.parse(readFileSync(join(repoRoot, "skills", "e1-suite-manifest.json"), "utf8"));
  assert.equal(
    manifest.model_run_recorded,
    result.records.length,
    "model_run_recorded must equal the number of valid records",
  );
  const catalog = JSON.parse(readFileSync(join(repoRoot, "evals", "catalog.json"), "utf8"));
  const coverage = validateCatalogCoverage(catalog, runs, cases.cases.map((entry) => entry.skill));
  assert.deepEqual(coverage.problems, [], `the public catalog must match derived coverage:\n${coverage.problems.join("\n")}`);
  assert.equal(coverage.complete, true, "the checked-in catalog must report complete coverage");
  const gate = spawnSync(process.execPath, [join(repoRoot, "scripts", "e1-coverage.mjs")], { encoding: "utf8" });
  assert.equal(gate.status, 0, `the coverage gate must pass:\n${gate.stdout}${gate.stderr}`);
  assert.match(gate.stdout, /E1 MODEL-RUN COVERAGE:\s+complete/, "the gate must actually check the public model-run coverage");
}

console.log("PASS: E1 model-run records are evidence — hashes, grades, evidence, and the derived count all fail closed");
