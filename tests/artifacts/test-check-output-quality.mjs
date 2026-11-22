import { strict as assert } from "node:assert";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeTempDir, removeTempDir } from "../_support/temp-dir.mjs";

const repoRoot = join(fileURLToPath(new URL("../..", import.meta.url)));
const validator = join(repoRoot, "scripts", "check-output-quality.mjs");
const root = makeTempDir("vitruvius-output-quality-");

function write(relativePath, text) {
  const path = join(root, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
}

function run() {
  return spawnSync(process.execPath, [validator, root], { encoding: "utf8" });
}

try {
  write("brief-draft.md", "# Draft\n\n[1] A cited claim.\n\n## Sources\n1. Source\n");
  write("claim-verification.md", "# Verification\n\nMACHINE_VERDICT: PASS\n\n## Evidence Trail\n| Claim | Evidence |\n");
  write("research-plan.md", "# Plan\n\n## Key Questions\n- What?\n\n## Evidence Needed\n- Source\n");

  const valid = run();
  assert.equal(valid.status, 0, valid.stderr);

  write("brief-draft.md", "# Draft\n\nAn uncited claim.\n");
  const invalidDraft = run();
  assert.equal(invalidDraft.status, 1);
  assert.match(invalidDraft.stderr, /inline citations|Sources/i);

  // A numbered Sources entry that nothing cites is a reference kept for looks.
  write("brief-draft.md", "# Draft\n\n[1] A cited claim.\n\n## Sources\n1. Source A\n2. Source B\n");
  const uncited = run();
  assert.equal(uncited.status, 1);
  assert.match(uncited.stderr, /\[2\] listed but never cited/);

  write("claim-verification.md", "# Verification\n\nNo machine markers.\n");
  const invalidVerifier = run();
  assert.equal(invalidVerifier.status, 1);
  assert.match(invalidVerifier.stderr, /MACHINE_VERDICT|Evidence Trail/i);

  // --- final deliverables must be grounded in the artifact they study ---
  // A fresh root: the fixtures above are intentionally broken at this point.
  const finalRoot = makeTempDir("vitruvius-output-final-");
  const writeFinal = (name, text) => {
    mkdirSync(join(finalRoot, name, ".."), { recursive: true });
    writeFileSync(join(finalRoot, name), text);
  };
  const runFinal = () => spawnSync(process.execPath, [validator, finalRoot], { encoding: "utf8" });
  const only = (...names) => {
    for (const entry of readdirSync(finalRoot, { withFileTypes: true })) {
      if (entry.isFile() && !names.includes(entry.name)) rmSync(join(finalRoot, entry.name));
    }
  };

  const body = [
    "The initializer fills its host exactly (`packages/solver/src/treemap/squarify.ts:9`).",
    "",
    "## What we did not find",
    "",
    "Searched the reviewed sources for a universal geometric slack factor; not found.",
    "",
    "## Impact vs. evidence",
    "",
    "Keep it. Thin evidence, low cost of being wrong.",
    "",
  ].join("\n");

  // A deliverable is one carrying a GOAL-CHECK or problem-anchor record. A
  // sidecar alone is not enough — every shaped artifact has one.
  writeFinal("treemap-audit.md", `# Treemap audit\n\n${body}`);
  writeFinal("treemap-audit.provenance.md", "# Provenance: treemap audit\n- **Final SHA-256:** `abc`\n");
  writeFinal("treemap-audit-problem-anchor.json", "{}\n");
  const validFinal = runFinal();
  assert.equal(validFinal.status, 0, validFinal.stderr);

  // A repo claim anchored to a bare filename cannot be resolved by a reader.
  writeFinal("treemap-audit.md", `# Audit\n\nSee \`squarify.ts:9\`.\n\n${body}`);
  const bareAnchor = runFinal();
  assert.equal(bareAnchor.status, 1);
  assert.match(bareAnchor.stderr, /bare filename anchor.*squarify\.ts/);
  writeFinal("treemap-audit.md", `# Treemap audit\n\n${body}`);

  // Regression: neither a provenance sidecar nor any of the shaped artifacts
  // that share the outputs tree may be judged as a research report.
  for (const exempt of [
    "lpbf-bracket.md", // FMEA table
    "am-fatigue-methods.md", // evidence ranking
    "joining-alternatives.md", // comparison matrix
    "adhesive-review.md", // severity-graded review
    "treemap-audit.provenance.md", // the sidecar itself
  ]) {
    only("treemap-audit.provenance.md");
    writeFinal(exempt, "# Artifact\n\nNo anchors. No sections. No evidence.\n");
    const result = runFinal();
    assert.equal(result.status, 0, `${exempt} must not be treated as a final research report: ${result.stderr}`);
  }
  only();

  // A report with no machine record is not ours to judge.
  writeFinal("loose-notes.md", "# Notes\n\nNothing anchored, nothing recorded.\n");
  assert.equal(runFinal().status, 0, "files without a machine record are not judged");
  only();

  // A well-cited report that never names the system it is about.
  writeFinal("treemap-audit.md", "# Audit\n\n[1] The literature is broadly favourable.\n\n## Sources\n1. Paper\n");
  writeFinal("treemap-audit.provenance.md", "# Provenance: treemap audit\n- **Final SHA-256:** `abc`\n");
  writeFinal("treemap-audit-goal-check.json", "{}\n");
  const noAnchor = runFinal();
  assert.equal(noAnchor.status, 1);
  assert.match(noAnchor.stderr, /no artifact anchor/);

  // A report grounded in a measured command rather than a file anchor.
  writeFinal(
    "treemap-audit.md",
    `# Audit\n\nRan \`npx vitest run tests/autogrow.test.ts\` -> 13 passed.\n\n${body}`,
  );
  assert.equal(runFinal().status, 0, "a command and its result is a legal anchor");

  // A bare `npm test` with no result is not an anchor (no file anchor either).
  const noFileAnchor = body.replace("`packages/solver/src/treemap/squarify.ts:9`", "the treemap source");
  writeFinal("treemap-audit.md", `# Audit\n\nJust run npm test.\n\n${noFileAnchor}`);
  assert.equal(runFinal().status, 1, "a command with no result is not an anchor");

  // The same line with a result is.
  writeFinal("treemap-audit.md", `# Audit\n\nRan npm test: 0 failed.\n\n${noFileAnchor}`);
  assert.equal(runFinal().status, 0, "a command with a result is an anchor");

  // Silence about what was searched for and not found.
  writeFinal("treemap-audit.md", `# Audit\n\n${body.replace("## What we did not find", "## Notes")}`);
  assert.equal(runFinal().status, 1);

  // A heading with no content is not negative coverage.
  writeFinal(
    "treemap-audit.md",
    `# Audit\n\nAnchor: packages/solver/src/treemap/squarify.ts:9\n\n## What we did not find\n\n## Impact vs. evidence\n\nKeep it: thin evidence, low cost of being wrong either way.\n`,
  );
  const bareHeading = runFinal();
  assert.equal(bareHeading.status, 1, "an empty negative-coverage heading does not satisfy the check");
  assert.match(bareHeading.stderr, /negative-coverage section/);

  // The standard engineering name for the section is accepted, with content.
  writeFinal(
    "treemap-audit.md",
    `# Audit\n\nAnchor: packages/solver/src/treemap/squarify.ts:9\n\n## Open questions\n\nWhether the 3BR room ceiling is product policy rather than a research question.\n\n## Impact vs. evidence\n\nKeep it: thin evidence, low cost of being wrong either way.\n`,
  );
  assert.equal(runFinal().status, 0, "## Open questions counts as negative coverage when it has content");

  // Range citations and case-insensitive headings.
  writeFinal(
    "treemap-audit.md",
    `# Treemap audit\n\n${body.replace("squarify.ts:9", "squarify.ts:9-13").replace("## Impact vs. evidence", "## impact / evidence")}`,
  );
  assert.equal(runFinal().status, 0, "range citations and alternate headings are accepted");

  // Working files in dot-directories are not deliverables.
  writeFinal(".drafts/scratch.md", "no anchors, no sections\n");
  assert.equal(runFinal().status, 0, "dot-directory working files are exempt");

  // --- craft audit: fires on slop, stays quiet on a good report ------------
  const runCraft = (name, strict = true) =>
    spawnSync(
      process.execPath,
      [validator, join(finalRoot, name), "--craft", ...(strict ? ["--strict"] : [])],
      { encoding: "utf8" },
    );

  const goodReport = [
    "# Treemap audit",
    "",
    "The initializer fills its host exactly (`packages/solver/src/treemap/squarify.ts:9`).",
    "",
    "## What we did not find",
    "",
    "Searched the reviewed sources for a universal geometric slack factor; not found.",
    "",
    "## Impact vs. evidence",
    "",
    "Keep it. Thin evidence, low cost of being wrong.",
    "",
  ].join("\n");
  only();
  writeFinal("good-report.md", goodReport);
  const quiet = runCraft("good-report.md");
  assert.equal(quiet.status, 0, `a good report must stay quiet: ${quiet.stdout}${quiet.stderr}`);
  assert.match(quiet.stdout, /no signs/i);

  // A lone informal tell is register, not slop. The audit must leave it alone,
  // matching the judgment-layer leave-it-alone threshold in research-craft.md.
  writeFinal(
    "informal-clean.md",
    [
      "# Treemap audit",
      "",
      "The initializer fills its host exactly. lmk if the numbers look off.",
      "",
      "## What we did not find",
      "",
      "No universal slack factor in the reviewed sources.",
      "",
    ].join("\n"),
  );
  const informal = runCraft("informal-clean.md");
  assert.equal(
    informal.status,
    0,
    `a lone informal tell must stay quiet: ${informal.stdout}${informal.stderr}`,
  );

  const longFinding =
    "The parser drops the parse error and returns null, so a caller cannot tell malformed input from empty input.";
  const slopReport = [
    "# Comprehensive analysis",
    "",
    "This report provides a comprehensive overview of the evidence landscape.",
    "",
    "Let's dive in.",
    "",
    "This is not just a parser but a contract.",
    "",
    "## Findings",
    "",
    longFinding,
    "",
    "## Findings",
    "",
    longFinding,
    "",
    "Further research is needed.",
    "",
    "I hope this helps.",
    "",
    "## Impact vs. evidence",
    "",
    "The retry loop is seamless and cutting-edge.",
    "",
  ].join("\n");
  writeFinal("slop-report.md", slopReport);
  const fires = runCraft("slop-report.md");
  assert.equal(fires.status, 1, "a slop report must fail strict craft mode");
  for (const id of [
    "generic-opener",
    "hype-word",
    "staged-opener",
    "not-x-but-y",
    "duplicate-heading",
    "repeated-sentence",
    "unconditional-further-work",
    "chat-residue",
  ]) {
    assert.match(fires.stdout, new RegExp(`\\[${id}\\]`), `craft audit must report ${id}: ${fires.stdout}`);
  }

  const advisory = runCraft("slop-report.md", false);
  assert.equal(advisory.status, 0, "craft mode is advisory without --strict");
  assert.match(advisory.stdout, /advisory/i);

  writeFinal("light-report.md", "# Audit\n\nThe design is seamless.\n");
  const light = runCraft("light-report.md");
  assert.equal(light.status, 1);
  assert.match(light.stdout, /1 sign/);

  // Frontmatter is metadata, not report prose; a generic description there is
  // not a craft finding in the body.
  writeFinal(
    "frontmatter.md",
    "---\ndescription: A comprehensive overview of the evidence landscape\n---\n\n# Audit\n\nA plain report.\n",
  );
  assert.equal(runCraft("frontmatter.md").status, 0, "frontmatter must not be audited as prose");

  // Directory mode judges final deliverables only, not drafts or loose notes.
  only();
  writeFinal("loose-slop.md", slopReport);
  writeFinal("final-slop.md", slopReport);
  writeFinal("final-slop.provenance.md", "# Provenance\n");
  writeFinal("final-slop-goal-check.json", "{}\n");
  const dirCraft = spawnSync(
    process.execPath,
    [validator, finalRoot, "--craft", "--strict"],
    { encoding: "utf8" },
  );
  assert.equal(dirCraft.status, 1, "directory craft mode must fire on the final deliverable");
  assert.doesNotMatch(
    dirCraft.stdout,
    /loose-slop\.md/,
    "directory craft mode must ignore files without a machine record",
  );
  assert.match(dirCraft.stdout, /final-slop\.md/, "directory craft mode must judge the final deliverable");
  only();

  // The craft eval catalog keeps four shapes explicit: a slop case that must
  // fire, a light case that must polish only, a good case that must stay quiet,
  // and an informal-but-clean case proving a lone tell is not a rewrite. Without
  // the last two the pass can become a house style.
  const craftCases = JSON.parse(
    readFileSync(join(repoRoot, "evals", "craft", "cases.json"), "utf8"),
  );
  assert.deepEqual(
    craftCases.cases.map((entry) => entry.id),
    ["heavy-slop", "light-slop", "no-slop", "informal-clean"],
    "craft eval must keep the four case shapes",
  );
  assert.deepEqual(
    craftCases.cases.map((entry) => entry.expected),
    ["fire", "polish-only", "stay-quiet", "stay-quiet"],
    "craft eval must keep the expected behavior for each shape",
  );

  removeTempDir(finalRoot);
  console.log("PASS: output-quality checks cover citations, machine markers, and final-deliverable grounding");
} finally {
  removeTempDir(root);
}
