# Discovery routes

Use structured scholarly APIs before web scraping. Google Scholar has no
official API, blocks automated browsers with captchas, and its scrapers violate
its terms; do not scrape it.

## 1. OpenAlex — primary, keyless

```http
GET https://api.openalex.org/works?search=<terms>&per-page=20&select=id,display_name,publication_year,publication_date,cited_by_count,doi,open_access,best_oa_location,authorships
```

- Sort by citations with `&sort=cited_by_count:desc`.
- Filter by year or open access with
  `&filter=publication_year:2019-2024,open_access.is_oa:true`.
- Resolve one DOI with `/works/doi:<doi>`.
- Use `best_oa_location.pdf_url` for open-access full text.
- For narrow engineering topics, prefer `title_and_abstract.search`; reserve
  `fulltext.search` for broad surveys where lower precision is acceptable.

## 2. Semantic Scholar — enrichment, keyless

```http
GET https://api.semanticscholar.org/graph/v1/paper/search?query=<terms>&limit=20&fields=title,year,abstract,externalIds,openAccessPdf,citationCount
GET https://api.semanticscholar.org/graph/v1/paper/DOI:<doi>?fields=...
GET https://api.semanticscholar.org/graph/v1/paper/{id}/citations?fields=title,year
```

**Rate-limit policy.** A 429 is different with and without `SEMANTIC_SCHOLAR_API_KEY`:

| Situation | Action |
| --- | --- |
| 429 with a key | Retry up to six attempts; wait 1, 2, 4, 8, 15, 15 seconds. Honor numeric `Retry-After`, including `Retry-After: 0`, capped at 15 seconds. |
| 429 without a key | Two attempts total, then OpenAlex. The shared pool does not reward long backoff. |
| 403 with a key | Do not retry; report the rejected key and use OpenAlex meanwhile. |
| Other non-429 | Do not retry; surface the error. |
| Timeout, 429, or 5xx | Treat the index as unavailable, answer from another index, and disclose the fallback. |

`Retry-After` HTTP-date form is not handled; treat it as absent. Record both
attempts and name the index that produced the metadata. A fallback never erases the failure: keep the 429 or timeout as `status: partial` with its reason.

## 3. arXiv — resolve a known preprint id

```http
GET https://export.arxiv.org/api/query?id_list=<comma-separated ids>&max_results=<n>
GET https://export.arxiv.org/api/query?search_query=all:<topic>&max_results=20
```

arXiv is lexical and ranks concept queries poorly. Use it to resolve a known id
or a narrow preprint-shaped question, not as the primary topic index.

- Serialise requests: one every three seconds; retry a 429 once after the same
  wait.
- Budget about 25 seconds per request; a timeout is `partial`.
- Keep the version suffix in the citation (`arXiv:1706.03762v5`).
- Batch id lookups; `max_results` caps at 100.
- If OpenAlex 404s a new preprint, strip the `10.48550/arXiv.` prefix and resolve
  the bare arXiv id. If arXiv times out, try Semantic Scholar's `arXiv:<id>`
  route. Record the miss and the substitution.

## 4. alphaXiv — fast arXiv discovery

```http
GET https://api.alphaxiv.org/search/v2/paper/fast?q=<query>&includePrivate=false
```

Returns title, link, paper id, and snippet. Full-text paper Q&A requires an
alphaXiv account through its MCP server or CLI; do not imply keyless access to
that layer.

## 5. Host web/browser

Use for vendor docs, standards bodies, recent news, and concepts the keyword
indexes miss. It is not the primary paper index. Never point a browser at
`scholar.google.com`.

## 6. Crossref — metadata of record

```http
GET https://api.crossref.org/works/<doi>
GET https://api.crossref.org/works?query.bibliographic=<terms>&rows=5&select=DOI,title,issued
```

Layers 6–8 are resolution and enrichment for a work already identified; they are
not discovery ranking.

- Use Crossref to settle title/year/venue disputes and fetch the reference list.
- Send a real `mailto=` address in the User-Agent for the polite pool.
- Do not use citation count as a relevance ranking.

## 7. Unpaywall — lawful open-access resolution

```http
GET https://api.unpaywall.org/v2/<doi>?email=<real address>
```

- Run `scripts/resolve-oa.mjs` rather than transcribing the response.
- `is_oa: true` does not promise a PDF; use the landing page when
  `url_for_pdf` is null.
- `is_oa: false` is a paywall finding. A missing email, network failure, non-200,
  or 422 is a failed resolution, not proof that no free copy exists.
- The email is a contact address, not a credential.

## 8. OpenCitations — open citation edges

```http
GET https://api.opencitations.net/index/v1/references/<doi>
GET https://api.opencitations.net/index/v1/citations/<doi>
```

- Prefer `references`; a heavily cited work's `citations` payload can run to tens of megabytes.
- Bound the request and mark a truncated read `partial`.
- COCI misses preprints and works without DOIs; a gap is unverified coverage,
  not "nothing cites it."

## What each index is actually good for

| Index | Use it for | Do not use it for |
| --- | --- | --- |
| OpenAlex | topic discovery, citation counts, OA links, DOI crosswalk | paywalled full text |
| Semantic Scholar | relevance ranking, citation graph, DOI/arXiv crosswalk | bulk paging on the shared pool |
| arXiv | resolving a known preprint id and version | primary topic discovery |
| alphaXiv | fast arXiv keyword discovery; authenticated full-text Q&A | primary citation metadata |
| Host web/browser | vendor docs, standards, recent work, code at source | primary paper index |
| Crossref | DOI metadata, reference list, printed-citation lookup | discovery ranking |
| Unpaywall | licensed free-copy resolution before download | discovery or proving a work exists |
| OpenCitations | DOI citation edges | citation counts or works without DOIs |

When indexes disagree, record both and mark the claim `ambiguous`; never average
citation counts or silently keep the higher one.

## Routing modes

| Need | Mode | Start | Then |
| --- | --- | --- | --- |
| Map a field | `discover` | OpenAlex title/abstract | citation sort; 2–4 reworded queries |
| One known paper | `known-id` | OpenAlex DOI or arXiv id | Semantic Scholar for citation count |
| Seminal/adjacent work | `citation-graph` | OpenAlex references/citations | Semantic Scholar or COCI edges |
| Keywords miss recent/conceptual work | `semantic` | host web/browser | Semantic Scholar relevance |
| Full text behind a claim | `full-text` | OA PDF, arXiv HTML/PDF | page-anchored reader |
| Working code/prior art | `code-prior-art` | host web/GitHub search | read repo at `path:line` |

Run 2–4 reworded queries per question. Record the exact endpoint, including query
parameters, in the search record. A repository is a lead, not a citation; verify
claims about it at source and mark them `repo` for `engineering-research`.
