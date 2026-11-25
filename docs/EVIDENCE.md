# Evidence and verification

Vitruvius separates a fluent answer from a defensible one. This document is the
technical counterpart to the public promise: what the system checks, what it
records, and what it still cannot prove.

## Read depth

Discovery is not reading. Every source is recorded at the depth actually read:

| Depth | What was read | What it can support |
| --- | --- | --- |
| `metadata` | title or index record | inferred, at most |
| `snippet` | search-result excerpt | inferred, at most |
| `abstract` | abstract only | partial for body claims; verified for claims about the abstract |
| `section` | one section or subsection | verified inside that section |
| `full` | the whole document | verified inside the document |
| `pdf-page` | one page with a locator | verified inside that page |
| `table` | one table with a locator | verified inside that table |

A negative claim is verified only when the relevant scope was read at section,
page, table, or full depth and the searched terms are recorded. An unread portion
is not evidence of absence.

## Grounding

A well-cited literature review can still answer the wrong problem. The
`vitruvius-problem-anchor.v1` record binds a run to the artifacts it studied:

- every artifact is path-confined and hash-pinned;
- every decision reaches a finding;
- every `repo` finding names the artifact it rests on;
- every anchor resolves to a real, non-blank line;
- the final report cites the anchor;
- negative coverage is recorded and visible in the report;
- verified claims carry the high-precision tokens the anchored line carries;
- a verified absence claim names the symbol it denies, and a line that declares
  that symbol cannot support it.

The last rule is deliberately narrow. It catches the common failure where an
absence claim points at a line that proves the thing exists. It does not read
the line as a human would; a misleading comment can still pass, so independent
verification remains required.

Run the check with:

```bash
node scripts/problem-anchor-contract.mjs <problem-anchor.json>
```

## Content trust

Retrieved pages, PDFs, emails, issue threads, and pasted documents are data, not
instructions. Vitruvius quotes instruction-like spans, records their location,
and never lets them change the research question, evidence criteria, citation
list, or output contract.

```bash
node scripts/content-trust.mjs <file>
node scripts/content-trust.mjs <file> --strict
```

The detector is a first pass, not a safety proof. A clean report means no
high-precision pattern matched; it does not mean the source is trustworthy.

## Source policy

Prefer primary standards bodies, code text, vendor documentation, and primary
data over secondary summaries. Academic discovery uses OpenAlex, Semantic
Scholar, arXiv, alphaXiv, and the host's web tools. A paywalled or unreadable
source is marked `blocked`; its contents are never guessed.

The reviewer method is informed by Kim et al., *On the limits and opportunities
of AI reviewers* ([arXiv:2605.20668](https://arxiv.org/abs/2605.20668)). That is
a research input, not evidence that Vitruvius itself is correct.

## Independent verification

The writer does not grade its own work. A blind verifier receives the question,
the evidence, and the claimed conclusion without the author's reasoning chain.
It opens the cited sources and returns PASS, PARTIAL, or BLOCKED with findings.

The verifier is fail-closed:

- a failed or unparseable tool is BLOCKED, not a zero-finding result;
- a machine finding is a candidate until the source is opened and the finding
  is confirmed;
- a repository verdict names the clean, pinned ref it checked;
- any material discrepancy caps the verdict at PARTIAL.

## Measurement

Vitruvius publishes measured results and their weaknesses. Current checked-in
figures are summarized below; re-read the underlying artifacts before using
them for a consequential decision.

| Check | Current result | Limit |
| --- | --- | --- |
| Verifier adversarial benchmark | Latest checked-in run: 80% correct verdicts, 0 false approvals, 0 false blocks, 1 conservative overcall | 20 cases; per-case variance is material |
| PASS scoring controls | 5/5 parser/scorer fixtures | deterministic controls, not independent verifier runs |
| Integrity under persuasion | 4/5 held; one false approval | no false-block guarantee is claimed |
| Skill routing | 28/28 baseline rank-1; 4/4 E1 top-k; 4/4 owner-negative; 10/10 must-not-fire | routing tests, not answer-quality runs |
| Baseline comparison | Runner and scorer tested; 10 cases still unmeasured | needs fresh isolated host sessions |

Sources of record:

- [Benchmark results](../tasks/benchmark/RESULTS.md)
- [Pressure suite](../tasks/benchmark/pressure/README.md)
- [Baseline runner](../evals/baseline/README.md)
- [Routing evaluations](../tests/routing/eval-routing.mjs)
- [E1 catalog](../evals/catalog.json)

## Reproduce

```bash
npm test
node scripts/score-benchmark.mjs tasks/benchmark/results tasks/benchmark/cases
node scripts/score-benchmark.mjs --strict-quality tasks/benchmark/results tasks/benchmark/cases
node scripts/score-benchmark.mjs tasks/benchmark/controls/results tasks/benchmark/controls/cases
```

`npm test` is deterministic and makes no model calls. Live verifier and
fixed-case runs require a configured model and host; their artifacts must be
recorded before a new measurement is claimed.

## What these checks do not prove

- They do not certify a design or replace professional judgment.
- They do not prove every citation supports the exact prose around it.
- They do not make a source authoritative merely because it is readable.
- They do not eliminate model variance.
- They do not turn a partial read into full coverage.

The system's value is not that it removes uncertainty. It makes uncertainty
visible early enough to act on it honestly.
