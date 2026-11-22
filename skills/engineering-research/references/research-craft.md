# Research Craft

Correctness is the first half of a research output. This is the second: making
the report specific to the question, the artifact, and the decision it serves.
A verified report can still be interchangeable.

## The failure this fixes

A model writes the choice that fits the widest range of inputs. In a report,
that is the modal report: broad background, balanced findings, generic
recommendations, and a call for further work. It is often true. It is also
often not about the system in front of you.

Removing false claims is not enough. A report that is clean but could be about
any project is the next template. The test is the **swap test**: replace the
system, standard, or domain with another one. If the report still reads true,
it is a template. Push the specificity into the summary, the evidence anchors,
and the one exhibit that carries the decision.

## Direction: five lines before searching

Write these in `outputs/.plans/<slug>.md`. Derive them from the decision and
the artifact, not from the topic's trend.

- **Question.** The decision this report informs, and for whom, in one plain
  sentence.
- **Claim.** The one thing this run establishes, stated so it could be wrong.
  If it establishes nothing, say that.
- **World.** The evidence landscape that gives the report its vocabulary:
  standard edition, artifact commit, dataset version, jurisdiction.
- **Moments.** The one or two exhibits that carry the decision: a re-derived
  calculation, a comparison matrix, a failure-mode table, a measured command.
- **Signature.** One detail only this run can have: a measured command and
  result, a resolving `path:line` anchor, a search-boundary table, a
  cost-of-being-wrong column.

Banned direction words: **comprehensive, rigorous, thorough, balanced,
nuanced, evidence-based, in-depth, holistic, robust**. They describe every
report. Replace them with coverage you can name.

Illustrative shape, not evidence:

- Question: decide whether the as-built member passes the governing check.
- Claim: the as-built section falls below the governing minimum.
- World: the pinned edition, the as-built survey, and the applicable load case.
- Moments: the check calculation and the as-built vs design table.
- Signature: the measured command that produced the section properties.

## Signs of research slop

Audit one line per sign, with the location. These are the recurring defaults,
not a complete taxonomy.

### Direction and scope

- The title names a topic, not a finding.
- The summary restates the question instead of answering it.
- "Comprehensive", "thorough", or "in-depth" promises coverage that no
  boundary states.
- No non-goals; the report tries to cover everything and commits to nothing.

### Claims and evidence

- Unspecified authority: "studies show", "best practice suggests", "experts
  agree".
- Citation laundering: a secondary source presented as if the primary was
  read.
- False precision: more digits than the source supports.
- Hedge and confidence disagree: "clearly" on an inference, "possibly" on a
  direct read.
- Selective comparison: only the side that supports the recommendation.
- A generic truth that survives the swap test ("further validation is
  needed").
- "Verified" used as decoration; the status is not tied to a read.
- A negative claim with no search boundary.

### Finding architecture

- Equal weight: every finding gets the same space, so none leads.
- A finding with no landing site: no change, measure, defer, or product
  decision.
- A recommendation any project could receive: add tests, monitor, document.
- The same finding paraphrased in the summary, body, and recommendations.
- The decisive exhibit is buried in an appendix or a paragraph.
- Symmetric both-sides-ism that never commits to a decision rule.

### Copy

- "This report provides a comprehensive overview..."
- Staged openers: "Let's dive in", "Here's what you need to know".
- Hype: seamless, cutting-edge, paradigm-shifting, game-changing, unlock,
  revolutionize.
- Chat residue: "I hope this helps", "Let me know if".
- Bold-label bullets with a vague line after each label.
- Nominalizations that hide the actor: "it was determined that" instead of who
  determined it.

### Presentation

- Tables whose columns do not support a decision.
- A chart with no lead, no units, or a different colour for every series.
- A quotation dumped without interpretation, or paraphrased instead of quoted.
- Callouts, badges, and "key takeaway" boxes that repeat the body.
- Headings that are labels ("Analysis") rather than findings.
- Mixed number formats, missing units, or a precision the source does not
  have.

### Process

- A multi-agent survey for a narrow lookup.
- One search and a confident answer for a complex question.
- Re-running the verifier until it passes.
- Padding findings, sources, or recommendations to a count.
- A plan written and never updated.
- A measured improvement with no baseline.

## Triage: how much to change

Read the audit before editing.

- **Heavy slop**: many signs across claims, structure, and copy. Run the six
  passes.
- **Light slop**: a mostly good report with a few signs. Polish only; keep the
  structure, evidence, and voice.
- **No slop**: say so. At most two or three small refinements, with exact
  locations. Do not rewrite a good report to make it different.

"No craft findings" is a valid result. A pass that always changes something is
not a craft pass; it is a house style.

## The six passes

Finish a pass across the whole report before starting the next. Earlier passes
change what later passes should do.

### 1. Anchor

- Re-read the question, the decision, the artifact, and the non-goals.
- Check that the title and summary answer the question, not the topic.
- Remove claims that belong to a different question.
- Re-run the swap test on the summary.

### 2. Claims

- For each load-bearing claim, name the source and location that supports it.
- Match the hedge to the evidence; mark `verified`, `partial`, `blocked`, or
  `unverified` honestly.
- Remove generic truths that survive the swap test.
- Keep one decisive claim or exhibit; demote the rest to support.

### 3. Architecture

- Name the lead finding or exhibit. It carries the decision; everything else
  supports it.
- Give every finding a landing site: change, measure, defer, product-decision,
  or background.
- Collapse duplicates across the summary, body, and recommendations. One
  finding, one place, one action. For a mechanical check, write the finding
  claims as `{ "findings": [{ "id": "F1", "claim": "..." }] }` and run
  `node scripts/semantic-near-dup.mjs <file>`; it proposes merges and never
  deletes a finding.
- Size sections by decision importance, not by template.

### 4. Copy

- Title and summary: what this run establishes, for whom, in plain words.
- Headings: findings, not labels.
- Remove staged openers, chat residue, hype, and borrowed authority.
- Keep labels short; no exclamation marks; no trailing periods on labels.

### 5. Presentation

- Keep one lead exhibit. Draw it with care; make the rest quiet.
- Tables: every column supports a decision. Remove decorative columns.
- Charts: one accent, units, a lead series, a readable scale.
- Numbers: one format, units, sign conventions, edition/version pins.
- Quotations: exact, then interpreted in a separate sentence.

### 6. Prose

- Apply the tells below.
- Preserve every fact, name, number, date, quote, citation, and status label.
- Read the report aloud, or read the rendered file end to end. A validator is
  not a reader.

## Prose tells

Strongest first. Mark every instance, then rewrite the paragraph around its
point.

1. **Not-X-but-Y.** "Not just a parser, but a contract." State the positive
   claim; keep the contrast only when the reader believes the negative half.
2. **One-line closer.** A paragraph that repeats the previous point for
   emphasis. Cut it unless it adds a fact or consequence.
3. **Staged opener.** "Let's dive in", "Here's what you need to know", "In this
   report, we will". Start with the point.
4. **Hype word.** Seamless, cutting-edge, paradigm-shifting, game-changing,
   unlock, revolutionize, delve. Say what the thing does.
5. **Borrowed authority.** "Studies show", "experts agree", "best practice".
   Name the study, the expert, or the section, or drop the appeal.
6. **Chat residue.** "I hope this helps", "Let me know if you need anything
   else". Remove it.
7. **Re-explaining the reader.** Background the reader already has, or the
   question restated before the answer. Start where the reader is.
8. **Bold-label bullets.** A bold label followed by a vague line, repeated down
   the page. Write the claim as a sentence.
9. **Hedge mismatch.** "Clearly" on an inference; "possibly" on a direct read.
   Match the hedge to the evidence.
10. **Hidden actor.** "It was determined that" instead of "the verifier
    determined that". Name the actor or use the active voice.
11. **Forced triad.** Three examples because three sounds complete. Use the
    number the evidence supports.
12. **Vague quantifier.** "Several", "many", "some". Count it or drop the
    number.

## Claim preservation

The craft pass may change how the report says it, never what it claims.

- Every number, unit, sign convention, citation, quotation, status label, and
  negative finding survives unchanged.
- If a sentence needs a specific detail the report does not have, fetch it or
  leave the sentence plain. Do not invent it to make the prose sound specific.
- If a change would alter meaning, stop: go back to the evidence step, fix the
  claim, and re-verify. A changed number is a verification event, not a style
  edit.
- Run the deterministic craft audit before and after:
  `node scripts/check-output-quality.mjs <file> --craft`. In strict mode, it
  fails on the mechanical signs; the judgment calls stay with the reader.

## Meaningful output

A clean report that only summarizes sources is still not a result.

- The lead finding carries at least one primary-source excerpt with a section
  or page locator.
- The report has one concrete deliverable: a decision, calculation, table,
  checklist, or recommendation with an owner and condition.
- A literature review names the strongest primary source and what it does not
  settle; it does not stop at "more research is needed."
- A literature review names consensus, disagreements, and trajectories; a
  study-by-study summary is not a synthesis.
- A claim supported only by a snippet or abstract is `partial`, not `verified`.

A meaningful answer names the choice, the condition, and the next action: "use
the section-level provision; if the measured value is below the stated minimum,
the member fails and the design changes" is a result. "Several factors affect
the result" is a summary.

## Checklist

- [ ] The five-line direction is in the plan and the report follows it.
- [ ] The summary names the decision and the answer in the first three
      sentences.
- [ ] One lead finding or exhibit carries the decision; the rest supports it.
- [ ] Every finding has a landing site; no finding is repeated as a paraphrase.
- [ ] Every load-bearing claim names a source and location, or is marked
      `partial`, `blocked`, or `unverified`.
- [ ] No unspecified authority, citation laundering, or false precision.
- [ ] Headings are findings, not labels.
- [ ] Tables and charts support a decision; one lead exhibit; units and formats
      are consistent.
- [ ] No hype, staged openers, chat residue, or one-line closers.
- [ ] Every sentence adds something the reader did not already have.
- [ ] Every number, citation, quotation, status, and negative finding is
      unchanged.
- [ ] The lead finding carries a primary-source excerpt at section or page
      depth, and the report has one concrete deliverable.
- [ ] The swap test fails: the report would not read true about another system.
- [ ] If the audit was empty, the report was left alone.

## Measurement

The deterministic layer runs in `npm test` through
`tests/artifacts/test-check-output-quality.mjs`: a heavy-slop fixture must fire,
a light-slop fixture must report only its signs, and a good report must stay
quiet.

The judgment layer is a blind review. Three cases:

1. **Heavy slop** — the pass must fire, and the report must improve.
2. **Light slop** — the pass must polish only, keeping the structure and
   evidence.
3. **No slop** — the pass must leave the report alone.

A blind judge scores each case 1-5 on **specificity** (could this be about
another system?), **decision usefulness** (does it name the decision and the
evidence?), and **template resistance** (would the swap test pass?). Run with
and without the craft pass, pin the model and host version, and record the
numbers. Do not claim an improvement without a baseline.

## What not to craft

- Quoted provisions, code, data, exact numbers, citations, verification labels,
  negative findings, and provenance facts. These are the product.
- Procedures, warnings, and cautions: those go through Simplified Technical
  English, not this pass.
- A good report. "No craft findings" is a result, not a failure to find
  something.
- Decoration. Do not replace removed hype with a new house style, a new
  template, or a new badge.
