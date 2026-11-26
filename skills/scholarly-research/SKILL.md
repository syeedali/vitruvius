---
name: scholarly-research
description: >
  Find and verify scholarly and academic sources for an engineering research
  question. Use when the research needs papers, journal articles, preprints,
  conference proceedings, prior art, or citation data — or when the user names
  a paper, arXiv id, DOI, or asks "what does the literature say". Produces a
  validated evidence packet with search provenance, read depth, claim-to-source
  mappings, synthesis, and an explicit handback. Do NOT use for standards/code
  research that has no scholarly layer.
argument-hint: "<topic or paper identifier>"
allowed-tools: Write Edit Bash Read
license: MIT
metadata:
  version: "0.7.0"

---
<!-- VITRUVIUS-COMPILED-SKILL:BEGIN v1 sha256=940f4c57efbe188140b296ce3e5a877ea5ef59e857239c1c815a012716ec7d31 -->

# Scholarly Research

Find academic evidence and make it auditable. This skill produces a validated
evidence packet, not a list of papers and not an unbounded literature report.

## Input Gate

Before searching, name:

- the question and intended decision;
- the scope: `single-paper`, `small-set`, `field`, or `systematic`;
- the artifact or literature boundary;
- the effort budget, or `thorough` when the user has not set one.

Ask one clarifying question only if the ask is too vague to search. See
`references/input-gate.md`.

## Core rules

1. **Every source answers a named question.** Tag it `supports`, `challenges`, or
   `contextual`; drop sources that answer none.
2. **Discovery is not reading.** Record `read_depth` and an exact locator. A
   snippet or abstract cannot support a verified body claim.
3. **Record every search.** Exact query, index, endpoint, date, result count, and
   status. A failed index stays visible after fallback.
4. **Never invent a citation.** A DOI, arXiv id, or URL must have been retrieved.
5. **Absence is bounded.** Keyword coverage cannot verify "no paper does X";
   record the searches and boundary, and use `partial` or `unverified`.
6. **Synthesis is required at the right scale.** A field review is not a
   study-by-study list.
7. **The output must pass the contract.** No packet, no delivery.

Detailed API recipes live in `references/discovery.md`; reading and identity
rules in `references/reading-and-identity.md`; systematic-review accounting in
`references/systematic-review.md`; the packet schema in
`references/evidence-packet.md`.

## Workflow

### 1. Frame the question

Write the question, scope, decision, and non-goals. Choose the smallest scale
that answers it:

- **Single paper:** answer from the section read; do not manufacture a field
  review.
- **Small set (2–5 sources):** compare claims and evidence; consensus and
  disagreement notes are enough.
- **Field/corpus:** consensus, disagreements, trajectories, open questions, and
  source status.
- **Systematic:** all field sections plus records/reports/studies accounting and
  the eligibility decision.

### 2. Plan discovery

Run 2–4 reworded queries per question: synonyms, the method name, and the problem
name. Use more than one index when available. Pick the routing mode from the need:

| Need | Mode | First move |
| --- | --- | --- |
| Map a field | `discover` | OpenAlex title/abstract, then citation sort |
| One known paper | `known-id` | OpenAlex DOI or arXiv id |
| Seminal/adjacent work | `citation-graph` | references and citations from a seed work |
| Keywords miss recent/conceptual work | `semantic` | host web/browser, then Semantic Scholar |
| Full text behind a claim | `full-text` | OA PDF, arXiv HTML/PDF, publisher page |
| Working code/prior art | `code-prior-art` | host web/GitHub, then read at `path:line` |

Record the exact endpoint for every search. A repository is a lead, not a
citation; claims about it belong to `engineering-research` as `repo` evidence.

### 3. Search and record failures

Use structured scholarly APIs before web scraping. Never scrape Google Scholar.
If an index times out, returns 429/5xx, or is blocked, record `partial` or
`blocked` with the reason, then use the next index. A completed zero-result
search is negative coverage, not a failed search.

OpenAlex is the primary keyless discovery route. Semantic Scholar enriches and
crosswalks DOI/arXiv identifiers; arXiv resolves known preprints; alphaXiv adds
fast arXiv discovery; Crossref settles DOI metadata; Unpaywall resolves lawful
OA copies; OpenCitations adds DOI citation edges. Full recipes and limits are in
`references/discovery.md`.

### 4. Read before synthesis

For each candidate that survives screening:

1. canonicalize its identifier and merge exact duplicates;
2. record publication status: `published`, `preprint`, `retracted`,
   `expression_of_concern`, or `unknown`;
3. record `read_depth`, exact locator, access state, relation, and the question
   it answers;
4. read the section/page/table that carries the load-bearing claim;
5. keep contradictory evidence.

Use `scripts/extract-pdf.mjs` for page-anchored PDF text and
`scripts/resolve-oa.mjs` before downloading. A paywall or missing text layer is
`blocked`, never guessed. Source identity and arXiv version rules are in
`references/reading-and-identity.md`.

### 5. Build the evidence packet

Create `outputs/.drafts/<slug>-scholarly.md`. Its final fenced `json` block is a
`scholarly-evidence.v1` packet with:

- `searches`: every attempt, including failures and zero-result searches;
- `sources`: stable identity, publication status, read depth, locator, access,
  relation, and named questions;
- `claims`: kind, status, and exact claim-to-source support mappings;
- `synthesis`: consensus, disagreements, trajectories, open questions, and
  source status;
- `coverage`: required for systematic reviews;
- `handback`: the decision, what the evidence supports, and what it cannot.

The full schema and examples are in `references/evidence-packet.md`.

### 6. Validate and hand back

Run:

```bash
node scripts/scholarly-evidence-contract.mjs outputs/.drafts/<slug>-scholarly.md
```

In a copied-skill install, run the repository command or copy the validator with
the skill. If validation fails, repair the packet or lower the claim status; do
not delete the finding to make the gate pass.

`scholarly-research` returns evidence. `engineering-research` owns the final
decision, recommendations, and any claim about the user's codebase. If the user
invoked this skill directly, give the evidence handback and point to
`/engineering-research` for the final report.

## Read-depth contract

Discovery is not reading. Record the depth and locator actually read, and cap
every claim at that depth. The shared ladder and absence boundary are in
`references/retrieval-and-reading.md`.

## Read-before-synthesis gate

No verified body claim may rest on `metadata`, `snippet`, or `abstract` depth.
Verified support requires `section`, `full`, `pdf-page`, or `table` depth with
`access: read` and an exact locator.

A retracted source cannot support a verified recommendation. An expression of
concern caps the claim at `partial`. An absence claim is never `verified` from
keyword/index coverage; name the searches and boundary and use `partial` or
`unverified`.

## Synthesis contract

A field review separates consensus (independent sources agreeing under named
conditions), disagreements (the evidence on each side and what would resolve
them), trajectories (the lines of work and papers that changed direction), open
questions, and source status. A single-paper lookup answers the question and
omits the field sections; a small set compares claims directly. The full
contract is `references/scholarly-synthesis.md`.

## Output contract

The Markdown evidence table includes `Question` and `Depth` columns. It carries
at least one section/page/table locator and these headings:

```markdown
## Consensus
## Disagreements
## Trajectories          # field or systematic review
## Source status         # field or systematic review
## What the literature does not settle
## Handback
## Search coverage       # systematic review
```

A single-paper lookup may omit the field-review sections, but it still names
the section read and what remains unsettled. A field review may not.

## Scope and Boundaries

- This skill produces evidence, not a report. It finds and verifies academic
  sources; it does not produce final designs, implementation guidance, or the
  final research deliverable.
- It does not assert facts about a local codebase without a `repo` mandate from
  `engineering-research`.
- Paywalled, scanned, truncated, or unreachable full text stays `blocked` or
  `partial`; a model summary is not a substitute.
- **Research-only, not for final engineering sign-off.** A qualified engineer
  must review any design application.
- Evidence quality: see `references/evidence-quality-tiers.md`.
