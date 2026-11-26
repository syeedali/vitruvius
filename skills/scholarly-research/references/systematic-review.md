# Systematic-review coverage

When the user asks for a systematic, scoping, or exhaustive review, the counts
are part of the answer. Record them at each stage so "we looked" is distinct
from "we looked everywhere."

| Stage | What to record |
| --- | --- |
| Identification | exact queries and indexes, with the number of records each returned |
| Screening | how many records were excluded, and the stated criterion |
| Included | the sources that survive into the evidence table |

## Records, reports, studies

**Records vs studies.** These are different counts:

- **Records** are search hits: a DOI, arXiv id, or duplicated title.
- **Reports are not studies.** Reports are documents about a study: preprint,
  journal article, follow-up, erratum.
- **Studies** are the underlying investigation. One study can produce several
  reports; overlapping cohorts are not independent evidence.

Deduplicate records, link reports to their study, and count records screened,
reports sought/retrieved, and studies included separately. Do not count the same
participants twice. **Removed is not the same as not found:** an excluded record
is a screening decision; a zero-result search is negative coverage.

For a systematic review, use two independent eligibility decisions for the
final full-text screen, or disclose that the screen was single-reviewer.
PRISMA is an accounting frame, not a compliance claim: adopt the flow and say
the counts describe this run rather than certifying a standard.

## Reproducibility

Record exact query, index, date, endpoint, and result count. A zero-result search
is negative coverage; an unavailable index is `partial` or `blocked`. An
underfilled or degraded search is not coverage.

## Output

Add `## Search coverage` with identification, screening, and included counts and
the record-vs-study basis. The fenced evidence packet carries the same numbers in
`coverage`; the validator requires it for `scope: systematic`.
