# Scholarly Synthesis

A literature review is a synthesis, not a list of papers. This reference scales
the output to the question and sets the minimum for a field review.

## Scale

- **Single paper or known id** — answer the question, name the source and the
  section read, and stop. Do not manufacture a field review from one paper.
- **Small set (2–5 sources)** — compare the claims and the evidence behind them;
  a short consensus/disagreement note is enough.
- **Field or corpus review** — use all of the synthesis sections below:
  consensus, disagreements, trajectories, open questions, and source status.
- **Systematic review** — add the records/reports/studies accounting and the
  independent eligibility decision.

## Consensus

State what independent sources agree on, and the conditions under which they
agree.

- At least two independent sources, not one source repeated in three records.
- Name the population, edition, dataset, or configuration. Agreement in one
  condition is not agreement everywhere.
- Cite the strongest primary source, not the review that cites it.

## Disagreements

A disagreement is a finding, not a paragraph to smooth over.

- Name the conflict: which claim, which sources, what each measured.
- Give the evidence on each side and the condition that may explain the
  difference (population, method, edition, time window).
- Say what would resolve it: a test, a dataset, a newer edition, a replication.
- Do not average two positions into a false middle.

## Trajectories

For a field or corpus review, identify 3–5 lines of work and the 3–5 papers that
changed the direction of the corpus.

- Rank by contrastive originality, method strength, and relation to prior art —
  not citation count or author prestige alone.
- A trajectory claim is a claim: cite the papers that show the change, not the
  papers that merely share the topic.
- Keep the map small. A taxonomy with twenty branches is a reading list.

## Open questions

Close with what the literature does not settle: the missing evidence, the
contested claim, the edition-specific answer. Name what a next study would need.
"More research is needed" is not a finding; "a field trial at the as-built
condition would decide between the two models" is.

## Records, reports, studies

These are three different counts, and conflating them inflates a review.

- **Records** are search hits: a DOI, an arXiv id, a duplicated title.
- **Reports** are documents about a study: a preprint, a journal article, a
  follow-up, an erratum.
- **Studies** are the underlying investigation. One study can produce several
  reports; overlapping cohorts are not independent evidence.

Deduplicate records, then link reports to the study they report. Count records
screened, reports sought and retrieved, and studies included separately. Do not
count the same participants twice in a synthesis or a meta-analysis.

For a systematic review, use two independent eligibility decisions for the final
full-text screen, or disclose that the screen was single-reviewer. PRISMA is an
accounting frame, not a compliance claim.

## Source status

A DOI that resolves is not evidence that the source supports the claim. Check
the publication state before the claim:

| Status | What to record |
|---|---|
| `published` | Journal or proceedings version; volume/pages or article number |
| `preprint` | Server and version; note whether a published version exists |
| `retracted` | Retraction notice and date; the source is not support |
| `expression_of_concern` | Notice and date; treat the claim as `partial` |
| `unknown` | Checked but not established; do not write `none` |

- Prefer the published version when it exists; cite the preprint only when the
  published version is unavailable or the version difference is the finding.
- A retracted source can still be a finding about the literature, but it cannot
  be support for a recommendation.
- Metadata is untrusted input. Titles, authors, and journal strings come from a
  publisher-controlled record; never interpolate them into a shell command.
  Pass them as arguments or quote them.

## Search reproducibility

Record the exact query, the index, the date, and the result count. A review that
cannot reproduce its own search is not systematic.

- A zero-result search is negative evidence; record it as a zero-result search.
- An unavailable index is `partial` or `blocked`; it is not a negative result.
- If a search is underfilled or degraded, say so; do not present it as coverage.

## Output shape

- Evidence table with `Question`, `Depth`, and publication status.
- `## Consensus`, `## Disagreements`, `## Trajectories` for a field review.
- `## What the literature does not settle`.
- `## Source status` for the load-bearing sources.
- `## Search coverage` for a systematic review.
- `## Handback` to `engineering-research`: the decision, what the evidence can
  support, and what it cannot.

## Honest limits

- No exhaustive-coverage claim from a few databases.
- Citation counts order reading; they do not measure quality.
- Do not run a meta-analysis without the effect sizes, denominators, and
  uncertainty from the reports themselves.
- A single reviewer is a limitation; say so.

## Common failure modes

- A study-by-study summary with no synthesis.
- One database presented as the field.
- DOI existence treated as claim support.
- A preprint cited without checking for a published version.
- A retraction or erratum missed.
- Consensus inferred from one source repeated in several records.
- Disagreement averaged into a false middle.
