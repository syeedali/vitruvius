# Reading and source identity

Discovery is not reading. Record how much of each source was actually read:
`metadata`, `snippet`, `abstract`, `section`, `full`, `pdf-page`, or `table`.

| Depth | What was read | What it can support |
| --- | --- | --- |
| `metadata` | title or index record | inferred, at most |
| `snippet` | search-result excerpt | inferred, at most |
| `abstract` | abstract only | partial for body claims; verified only for claims about the abstract |
| `section` | one section with a path | verified inside that section |
| `full` | the whole document | verified inside the document |
| `pdf-page` | one page with a locator | verified inside that page |
| `table` | one table with a locator | verified inside that table |

A negative claim is verified only when the relevant scope was read at section,
page, table, or full depth and the searched terms are recorded. An unread portion
is not evidence of absence.

## Full text

- Fetch full text from OpenAlex's `best_oa_location.pdf_url`, arXiv PDF/HTML, or
  the publisher page.
- Prefer HTML/XML when the claim needs only an abstract or section.
- Record title, authors, year, venue, DOI/arXiv id, and the URL actually fetched.
- If full text is paywalled or unreachable, cite metadata and mark access
  `blocked`; never guess at the contents.
- Name the access route actually used: `pdf-parse`, `html`, `abstract`, or
  `metadata`. Never call a source full text when only a summary was seen.

## Open-access PDFs

When a claim needs more than the abstract and only a PDF is available:

```bash
node scripts/extract-pdf.mjs <pdf-path-or-url> --json --delete
```

In a copied-skill install, run
`node <scholarly-research-skill-root>/scripts/extract-pdf.mjs`.

The reader returns `{ source, url, sha256, pages, text, warnings, deleted }` and
stamps `[[page N]]` boundaries. If `pdf-parse` is missing, install it and retry;
do not substitute a model summary. `--delete` removes the binary only after a
usable extraction. A scanned PDF with no text layer stays on disk and its full
text is `blocked`.

Write extracted text to `outputs/.drafts/<slug>-pdf-<n>.md` with source URL,
retrieval date, page count, SHA-256, and the `[[page N]]` markers. That file is
the artifact of record.

## Source identity (exact-first)

Before a source enters the evidence set:

- canonicalize DOI to lowercase `10.xxxx/...`;
- canonicalize arXiv to the bare id and keep the highest version actually read;
- strip URL scheme/host case, tracking parameters, fragments, and trailing slash;
- merge exact duplicates and record `merge_rule` and `discard_reason`;
- never let a semantic near-duplicate proposal delete a source; it is advisory.

### arXiv ids carry a version, and two shapes

`2401.12345v2` is version 2 of `2401.12345`; older papers use forms such as
`hep-th/9901001`. Key the evidence set on the bare id, put the version in
`notes`, and cite the version read. Versioned strings must not become two sources for one work. A disagreement between versions is a finding, not a merge: record the claim `ambiguous`, name both versions, and do not silently prefer the newer one.

## Local focused reading

When `donsetch` is installed, use it to read the section that answers:

```bash
donsetch fetch <url> --toc
donsetch fetch <url> --section sN --must-contain "<term>"
donsetch fetch <pdf-url> --toc
```

Record `read_status` and `content_complete`. An incomplete read makes an absence
check `unverified`; `focus`, `section`, or `outline` is not `full` depth.
