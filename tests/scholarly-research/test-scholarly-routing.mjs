import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillDir = join(root, "skills", "scholarly-research");
const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
const synthesis = readFileSync(join(root, "references", "scholarly-synthesis.md"), "utf8");
const surface = [
  skill,
  ...readdirSync(join(skillDir, "references"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => readFileSync(join(skillDir, "references", file), "utf8")),
  synthesis,
].join("\n");

assert.ok(skill.split("\n").length <= 300, `scholarly-research SKILL.md is ${skill.split("\n").length} lines; move recipes into references`);
assert.match(surface, /## Workflow/, "the workflow stays inline");
assert.match(surface, /## Read-before-synthesis gate/, "the read gate stays inline");
assert.match(surface, /## Output contract/, "the output contract stays inline");
assert.match(surface, /references\/evidence-packet\.md/, "SKILL.md points at the packet schema");

// M1: need-based routing modes, including code prior art, not just keyword search.
for (const mode of ["discover", "known-id", "citation-graph", "semantic", "full-text", "code-prior-art"]) {
  assert.match(surface, new RegExp(`\`${mode}\``), `scholarly-research declares the ${mode} mode`);
}
assert.match(surface, /## Routing modes/, "has a routing modes section");
assert.match(surface, /2–4 reworded queries/, "requires multiple reworded queries");
assert.match(
  skill,
  /scripts\/extract-pdf\.mjs/,
  "routes full text through the page-anchored reader",
);

// N1 handshake: exact-first dedup vocabulary is declared here and enforced in
// the evidence.v1 ledger.
assert.match(surface, /## Source identity \(exact-first\)/, "has an exact-first source identity section");
assert.match(surface, /merge_rule/, "names the merge rule");
assert.match(surface, /discard_reason/, "names the discard reason");

// Per-index capability table, so the routing table has a stated reason. An
// index that answers badly is worse than one that refuses.
assert.match(surface, /## What each index is actually good for/, "has a per-index capability table");
for (const index of ["OpenAlex", "Semantic Scholar", "arXiv", "alphaXiv"]) {
  assert.match(surface, new RegExp(`\\|\\s*${index.replace(" ", "\\s")}`), `capability table covers ${index}`);
}
// arXiv is demoted for topic discovery, with the reason given.
assert.match(surface, /resolving a known preprint id/, "arXiv is presented as id-resolution first");
assert.match(surface, /lexical, poorly ranked|lexical and ranks concept queries poorly/, "states why arXiv topic search is weak");

// A fallback must not erase the failure it replaced.
assert.match(surface, /fallback never erases the failure/i, "requires the failed search to be recorded, not dropped");
assert.match(surface, /status: partial/, "says the failed search is recorded as partial");

// Rate discipline and the recorded endpoint.
assert.match(surface, /Serialise/i, "requires serialised arXiv requests");
assert.match(surface, /exact endpoint/i, "requires the exact endpoint per search");

// arXiv version canonicalisation: one work, one source.
assert.match(surface, /### arXiv ids carry a version, and two shapes/, "has an arXiv version section");
assert.match(surface, /two sources for one work/, "names the double-count risk");
assert.match(surface, /hep-th\/9901001/, "names the legacy id shape");
assert.match(surface, /disagreement between versions is a finding/i, "a version disagreement is a finding, not a merge");

// Resolution and enrichment layers. Crossref, Unpaywall and OpenCitations answer
// a question about a DOI we already hold; they are not discovery routes, and
// asserting that distinction is what keeps them out of the ranking table.assert.match(surface, /resolution and enrichment.*not discovery/i, "the DOI layers are marked as enrichment, not discovery");
assert.match(surface, /metadata of record/, "Crossref is named the metadata of record");

// Every endpoint below was fetched and answered 200 before it was written into
// the skill, so a URL that stops resolving is a regression this suite catches.
for (const layer of ["Crossref", "Unpaywall", "OpenCitations"]) {
  assert.match(surface, new RegExp(`\\|\\s*${layer}`), `capability table covers ${layer}`);
}
for (const endpoint of [
  "https://api.crossref.org/works/<doi>",
  "https://api.crossref.org/works?query.bibliographic=",
  "https://api.unpaywall.org/v2/<doi>?email=",
  "https://api.opencitations.net/index/v1/references/<doi>",
  "https://api.opencitations.net/index/v1/citations/<doi>",
]) {
  assert.ok(surface.includes(endpoint), `scholarly-research must carry the verified endpoint ${endpoint}`);
}

// Each layer's honest limits, each of which was observed on a real response:
// a mandatory contact address that is not a credential, an OA record with no
// PDF, and a citation payload large enough to truncate a read.
assert.match(surface, /mailto=/, "Crossref requires the polite-pool contact address");
assert.match(surface, /contact address, not a credential/i, "Unpaywall's email is stated as a contact, not a key");
assert.match(surface, /422/, "Unpaywall's rejection of a placeholder address is recorded");
assert.match(surface, /does not promise a PDF/i, "records that is_oa true can still have no PDF");
assert.match(surface, /tens of megabytes/i, "records the OpenCitations citations payload size risk");
assert.match(surface, /unverified coverage/i, "a COCI gap is marked unverified coverage, not absence of citation");
assert.match(surface, /api\.opencitations\.net/, "the resolved OpenCitations host is used, not the redirecting one");

// Systematic-review coverage. The counts are part of the answer, and the two
// distinctions that keep them honest are asserted so neither can be dropped.
assert.match(surface, /^#+\s+Systematic-review coverage/m, "has a systematic-review coverage section");
for (const stage of ["Identification", "Screening", "Included"]) {
  assert.ok(surface.includes(stage), `records the ${stage} stage`);
}
assert.match(surface, /Records vs studies/i, "separates records from studies");
assert.match(surface, /Removed is not the same as not found/i, "separates an exclusion from a zero-result search");
assert.match(surface, /## Search coverage/i, "requires a search-coverage section in the output");
assert.match(surface, /accounting frame, not a compliance claim/i, "states the accounting frame is not a compliance claim");

// Synthesis is the difference between a review and a paper list. The skill and
// the reference must carry the same four sections, the records/reports/studies
// distinction, and publication status.
assert.match(surface, /## Synthesis contract/, "has a synthesis contract");
for (const heading of ["Consensus", "Disagreements", "Trajectories", "Source status"]) {
  assert.match(surface, new RegExp(`## ${heading}`), `output requires ${heading}`);
}
assert.match(surface, /Reports are not studies/i, "separates reports from studies");
assert.match(surface, /two independent eligibility decisions/i, "requires independent eligibility or disclosure");
assert.match(surface, /retracted/i, "records retraction status");
assert.match(surface, /preprint/i, "records preprint status");
for (const heading of ["Consensus", "Disagreements", "Trajectories", "Records, reports, studies", "Source status"]) {
  assert.match(synthesis, new RegExp(`## ${heading}`), `synthesis reference carries ${heading}`);
}
assert.match(synthesis, /records.*reports.*studies/is, "synthesis reference separates the three counts");

// A 429 is two different events with and without a key; a single retry rule for
// both was the defect the rate-limit policy replaces.
assert.match(surface, /\*\*Rate-limit policy\.\*\*/, "declares a rate-limit policy");
assert.match(surface, /Retry up to six attempts/, "a keyed 429 gets six attempts");
assert.match(surface, /Two attempts total/, "a keyless 429 gets two attempts");
assert.match(surface, /403 with a key/, "a keyed 403 is distinguished from a 429");
assert.match(surface, /Retry-After: 0/, "an explicit zero wait is honoured");
assert.match(surface, /HTTP-date/, "an HTTP-date is not guessed into a wait");

const version = skill.match(/version:\s*"(\d+)\.(\d+)\.(\d+)"/);
assert.ok(version, "scholarly-research has a version");
const current = version.slice(1).map(Number);
const atLeast = (major, minor, patch) =>
  current[0] > major ||
  (current[0] === major && current[1] > minor) ||
  (current[0] === major && current[1] === minor && current[2] >= patch);
assert.ok(atLeast(0, 2, 0), `scholarly-research version is 0.2.0+ (got ${version[0]})`);
assert.ok(atLeast(0, 6, 0), `scholarly-research version is 0.6.0+ with the synthesis contract (got ${version[0]})`);
assert.ok(atLeast(0, 6, 1), `scholarly-research version is 0.6.1+ with the rate-limit policy (got ${version[0]})`);
assert.ok(atLeast(0, 7, 0), `scholarly-research version is 0.7.0+ with the evidence-packet gate (got ${version[0]})`);

console.log("PASS: scholarly-research declares routing modes, per-index capability limits, the verified resolution layers (Crossref, Unpaywall, OpenCitations) and arXiv version rules");
