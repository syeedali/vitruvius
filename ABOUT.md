# About Vitruvius

## Mission

Make engineering research auditable.

A research answer is only useful when another person can see what was read,
what was inferred, what was blocked, and which evidence supports the decision.
Vitruvius makes those boundaries part of the output instead of leaving them in
the agent's head.

## What it is

Vitruvius is an open-source toolkit for coding agents that runs a disciplined
research workflow over engineering questions and artifacts. It provides:

- **Commands** for research, verification, standards lookup, literature review,
  comparison, review, audit, and design analysis;
- **Five discipline skills** that route questions to the right evidence:
  mechanical, software, civil, electrical, and architectural;
- **A multi-agent method** with researcher, writer, verifier, reviewer,
  goal-checker, arbiter, and habit roles;
- **Deterministic validators** that check provenance, source read depth,
  artifact anchors, negative coverage, and final delivery.

It installs into Claude Code, OpenCode, Codex, Cursor, Pi, and other
Agent Skills hosts. It is a method and a set of tools, not a hosted service.

## The problem it solves

A general-purpose research assistant can produce a fluent summary that is
impossible to audit. It may cite a title it never opened, infer a code value
from memory, or call an absence "not found" after reading one snippet.

Vitruvius treats those as failures of the research process, not writing style.
It requires the run to:

1. **Read the source.** Record whether the agent read metadata, a snippet, an
   abstract, a section, a page, a table, or the full document. A snippet cannot
   support a verified claim.
2. **Ground the claim.** A repository finding must point at real bytes through
   a hash-pinned `path:line` anchor. A verified absence claim must name the
   symbol it denies, and the anchored line must not declare that symbol.
3. **Show uncertainty.** Use `verified`, `partial`, `blocked`, `unverified`, or
   `inferred` deliberately. Missing evidence stays visible.
4. **Verify independently.** A blind verifier checks the claimed conclusion
   against the gathered evidence. The author does not grade their own work.
5. **Land on a decision.** Every finding names what it changes, what to measure,
   what to defer, or why it is background. A report that only summarizes papers
   is not finished.

## What a run produces

A normal engineering research run leaves three linked artifacts:

| Artifact | Purpose |
| --- | --- |
| `outputs/<slug>.md` | Decision-first brief with findings, evidence, limits, and next action |
| `outputs/<slug>.provenance.md` | What was checked, how, and what remains unverified |
| `outputs/<slug>-problem-anchor.json` | Hash-pinned binding between findings, artifacts, decisions, and negative coverage |

Runs may also leave an `evidence.v1` ledger and a `run.v1` log under `.runs/`.
The files are designed to be opened and checked, not merely cited as proof that
the agent worked.

## Who it is for

- Engineers who need an evidence-backed answer to a design, code, standards, or
  failure question.
- Researchers who need a literature review with consensus, disagreements,
  trajectories, and source status.
- Technical leads who need an independent check before acting on an
  AI-generated conclusion.
- Teams that want the research process to survive handoff, review, and later
  re-verification.

## What it is not

Vitruvius is **not**:

- a licensed engineer, a code-compliance certificate, or final engineering
  sign-off;
- a CAD, BIM, simulation, or general calculation engine;
- a replacement for reading a governing standard or inspecting the physical
  system;
- a guarantee that the model will always be right;
- a system that silently trains on your work or creates hidden cross-project
  memory.

It is research-only. Its job is to make the evidence and the limits of a
conclusion visible so a qualified person can decide.

## Why the name

Vitruvius is named after Marcus Vitruvius Pollio, whose *De Architectura*
treated architecture, engineering, machines, and materials as connected fields.
The name reflects the project's premise: good engineering decisions come from
joining evidence across sources without losing the thread back to each one.

## Status

Vitruvius is MIT-licensed and under active development. The verifier has a
checked-in adversarial benchmark, deterministic contract tests, and published
weaknesses. Those results are evidence about the system, not certification of
it. See [docs/EVIDENCE.md](docs/EVIDENCE.md) for the current measurements and
their limits.
