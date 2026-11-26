# Scholarly evidence packet

`scholarly-research` does not finish at a list of papers. It writes a
human-readable handback with a machine-checkable `scholarly-evidence.v1` JSON
packet at the end.

## Artifact

Write the handback to:

```text
outputs/.drafts/<slug>-scholarly.md
```

The Markdown carries the evidence table and synthesis sections. The final fenced
`json` block carries the packet. Validate either form with:

```bash
node scripts/scholarly-evidence-contract.mjs outputs/.drafts/<slug>-scholarly.md
node scripts/scholarly-evidence-contract.mjs outputs/.drafts/<slug>-scholarly-evidence.json
```

In a copied-skill install, run
`node <scholarly-research-skill-root>/scripts/scholarly-evidence-contract.mjs` if
that helper is copied with the skill; the repository command is the canonical
entry point.

## Root fields

| Field | Meaning |
| --- | --- |
| `schema` | exactly `scholarly-evidence.v1` |
| `question` | the named research question |
| `scope` | `single-paper`, `small-set`, `field`, or `systematic` |
| `searches` | every query/index attempt, including failed and zero-result searches |
| `sources` | deduplicated works with identifiers, publication status, and read depth |
| `claims` | claim-to-source mappings with status and exact locators |
| `synthesis` | consensus, disagreements, trajectories, open questions, and source status |
| `coverage` | required for systematic reviews: records/reports/studies and reviewer status |
| `handback` | the decision, what the evidence supports, and what it cannot support |

## Searches

Each search records `id`, `question`, `index`, full `endpoint`, exact `query`,
`searched_on`, `status`, `returned`, `screened`, and `included_source_ids`.
`partial` and `blocked` searches require `notes`; a completed zero-result search
is valid negative coverage, not a failed search.

## Sources

Each source records stable identity (`doi`, `arxiv`, or `url`), title, year,
venue, publication status, `read_depth`, exact `locator`, access state, relation
to the question, and the questions it answers.

A source at `metadata`, `snippet`, or `abstract` depth cannot support a verified
body claim. Verified support requires `section`, `full`, `pdf-page`, or `table`
depth with `access: read`.

## Claims

Each claim records `kind`, text, status, and support mappings. A verified claim
needs at least one verified support mapping whose source was read at section or
page depth. A retracted source or expression of concern cannot provide verified
support.

Absence claims are never `verified` from keyword or index coverage. Record them
as `partial` or `unverified`, name the searches they rest on, and state the
search boundary. This is the guard against "no paper does X" after one database
returned no exact phrase.

## Synthesis

- **Consensus** needs two independent source IDs and the conditions under which
  they agree.
- **Disagreements** need at least two positions, source IDs for each, and what
  would resolve the conflict.
- **Trajectories** name the line of work, the sources that show the change, and
  what changed.
- **Open questions** are required even for a single paper: say what the evidence
  does not settle.
- **Source status** entries must agree with each source's publication status and
  record the check date.

A `field` review requires all five synthesis arrays to be non-empty. A
`small-set` review requires consensus, disagreements, and open questions. A
`systematic` review additionally requires coverage accounting.

## Handback

The Markdown must contain these headings:

```markdown
## Consensus
## Disagreements
## Trajectories          # field or systematic review
## Source status         # field or systematic review
## What the literature does not settle
## Handback
## Search coverage       # systematic review
```

The evidence table must include `Question` and `Depth` columns. The document
must carry at least one section, page, table, or `path:line` locator. A list of
DOIs without read locators is discovery output, not a verified evidence packet.
