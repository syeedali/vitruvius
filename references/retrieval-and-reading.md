# Retrieval and Reading

Discovery is not reading. A search result, abstract, or snippet is a pointer to
evidence, not evidence. This contract sets the minimum read depth for a claim
and gives the optional local backend that makes focused reading practical.

## Read-depth ladder

| Depth | What was read | A claim can be |
|---|---|---|
| `metadata` | title/index record only | `inferred`, at most |
| `snippet` | search-result excerpt | `inferred`, at most |
| `abstract` | abstract only | `partial` for body claims; `verified` only for claims about the abstract |
| `section` | one section or subsection, with a section path | `verified` inside that section; `partial` outside it |
| `full` | the full document | `verified` inside the document |
| `pdf-page` | one page, with a page locator | `verified` inside that page |
| `table` | one table, with a table locator | `verified` inside that table |

The rule: **a claim is capped by the depth of the source it rests on.** A
snippet cannot support `verified`. A source at `metadata` or `snippet` depth is
recorded `unverified` or `inferred`, even when the excerpt looks conclusive.

## Absence is not a snippet miss

A negative claim ("we did not find X") is `verified` only when the relevant
scope was read at `section`, `full`, `pdf-page`, or `table` depth and the
searched terms are recorded. If only a snippet or an unread portion was
checked, the negative claim is `unverified`. Record the boundary: what was
searched, what was read, and what was not reached. An unread portion is not
evidence of absence.

## Query intent

Match the search shape to the question. One query style for every question is
why broad surveys return broad sources.

| Question shape | First move | Backend hint |
|---|---|---|
| Paper or prior art | OpenAlex or Semantic Scholar; then read the PDF section | `--intent paper --read 1` |
| Code or API behavior | Official docs and source; exact identifiers | `--intent code` |
| Error or failure | Quote the exact error; search the identifier, not the paraphrase | `--intent code` |
| Docs or site behavior | Map the site before reading pages | `crawl --mode map --topic` |
| Comparison | One query per side; keep the source sets separate | `--query-variant` |
| Entity or product | Official site, registry, and primary announcement | `--intent entity` |

If a search returns weak or stale results, inspect the source census or the
explain view before adding more queries: `donsetch search --sources` or
`donsetch search --explain "<query>"`.

### Keyless search backends

Three discovery backends need no key, cookie, or account. Record which one
answered; a keyless source is still a source and still needs its read depth.

| Backend | Endpoint shape | Interface facts |
|---|---|---|
| Parallel MCP | `https://mcp.parallel.ai/mcp` | JSON-RPC Streamable HTTP; initialise a session once, then reuse it |
| Keenable | `https://api.keenable.ai/v1/search/public` | One stateless POST; a low remaining-quota header means back off |
| Exa MCP | `https://mcp.exa.ai/mcp` | One stateless `web_search_exa` call; returns title, URL, date, highlights |

Each exposes an opt-out and a URL deny rule. Do not send credentials or cookies
to any of them, and honour a configured denial.

**Rotation and reserves.** Rotate the active wave across healthy keyless
backends so no single service sees every query. Keep unused reserves that spend
zero requests while the active lanes are healthy, and promote one in priority
order on a failure, a 429, or an off-query result. Do not average one bad lane
into a false consensus or degrade a good lane because of it: disagreement is a
finding. Record `degraded` or `underfilled` searches as partial coverage, not
as a negative result.

Interface facts and the operating rule are ported from src-11; no code or
prose was copied.

## Optional local backend: DonSeTch

If `donsetch` is installed and visible in the session, use it as the reading
tool. It keeps search, fetch, and crawl local, returns focused sections, and
reports whether the content is complete. It is optional; the host's web tools
use the same read-depth contract.

Install and register it once (MCP example; the CLI works without MCP):

```bash
npm install -g donsetch
donsetch doctor
```

```json
{
  "mcpServers": {
    "donsetch": { "command": "donsetch", "args": ["mcp", "--supervised"] }
  }
}
```

Discovery:

```bash
donsetch search "<query>" --intent paper --read 1 --max-results 5
donsetch search "<query>" --intent code
donsetch search "<query>" --query-variant "<alternative>"
```

Read:

```bash
donsetch fetch <url> --toc                 # headings and sN IDs
donsetch fetch <url> --section sN          # one section and its subsections
donsetch fetch <url> --focus "<question>"  # best passages first
donsetch fetch <url> --must-contain "<term>"
donsetch fetch <url> --links               # citation URLs
donsetch fetch <url> --offset <n>          # continue where the read stopped
```

PDF:

```bash
donsetch fetch <pdf-url> --toc
donsetch fetch <pdf-url> --section sN
donsetch fetch <pdf-url> --must-contain "<term>"
```

It fuses text and rendered pixels for reading order, tables, and forms. Treat
uncertain OCR output as `partial`.

Docs and sites:

```bash
donsetch crawl <docs-url> --mode map --topic <topic>
donsetch crawl plan <docs-url> --topic <topic> --max-pages 10
donsetch crawl <docs-url> --topic <topic> --max-pages 10
donsetch crawl get pN --section sN
donsetch crawl diff <docs-url> --refresh
```

Read the `[meta]` line before using the content: `ok`, `content_ok`,
`content_complete`, `read_status`, `next_offset`, `code`, `next_action`. If
`content_complete` is false, an absence check is `unverified`, not "not found."
If `read_status` is `partial`, `focus`, `section`, or `outline`, record that
depth, not `full`. If `content_ok` is false, the response is not the target
content (a wall, shell, or error page); do not cite it.

Search `confidence` is retrieval agreement, not fact verification. `degraded`
or `underfilled` means the result set is incomplete; record the search as
`partial`, not as a negative result.

## When DonSeTch is absent

Use the host's web search, fetch, or browser tools. Apply the same ladder:

- A snippet-only result is `snippet` depth.
- A page read without isolating a section is `full` depth; a page read with a
  section path is `section` depth.
- A truncated page is `partial`; record the continuation boundary.
- A PDF table recovered from rendered pixels can be wrong. Check the page image
  or mark the table `partial`.

## What goes in the source record

In `evidence.v1`, set `read_depth` on the source and put the section or page in
`locator`:

- `locator: "RFC 9110 §15.5.5"`, `read_depth: "section"`
- `locator: "ACI 318-19 §20.3, p. 412"`, `read_depth: "pdf-page"`
- `locator: "OpenAlex W123"`, `read_depth: "metadata"`, `status: "inferred"`

A source at `metadata` or `snippet` depth cannot support a `verified` claim; the
ledger validator refuses that combination.

## Honest limits

- DonSeTch's own comparison reports weaker search relevance than a paid search
  API. Use a search provider alongside it when available. Its strength here is
  focused reading and evidence completeness, not universal search ranking.
- A focused read is not a full read. If the claim depends on a passage outside
  the section, read that section or mark the claim `partial`.
- A crawl digest and a section read are evidence of what that view contained,
  not proof that the rest of the site is silent. Record the boundary.
