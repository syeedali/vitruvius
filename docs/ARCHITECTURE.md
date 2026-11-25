# Architecture

Vitruvius is a research method implemented as agent skills, roles, scripts, and
machine-checked artifact contracts. It does not ship its own model or run a
hosted service.

## Components

| Layer | What it contains |
| --- | --- |
| Commands | 27 host-facing slash commands, defined once in `installer/contract.mjs`. |
| Skills | The research workflows and discipline-specific evidence landscapes under `skills/`. |
| Roles | Researcher, writer, verifier, reviewer, arbiter, goal-checker, and habit contracts under `agents/`. |
| References | Detailed rules and source-routing guidance used by the skills. |
| Scripts | Deterministic validators, evidence readers, run ledgers, and installers. |
| Artifacts | Briefs, provenance sidecars, problem-anchor records, evidence ledgers, and run logs written by a run. |

## Run lifecycle

```text
Plan
  -> define the question, artifacts, decisions, and evidence needed
Gather
  -> open sources, record read depth, capture contradictory evidence
Synthesize
  -> write a decision-first brief with one lead finding and anchored claims
Verify
  -> blind verifier checks claims against the gathered evidence
Review
  -> adversarial reviewer finds remaining weaknesses
Goal-check
  -> independent checker re-derives the original ask; default is NOT-DONE
Deliver
  -> final brief plus provenance and problem-anchor records
```

The craft pass runs after verification and before goal-check. It may change how
a report says something, never what it claims.

## Artifacts

| Artifact | Schema or format | Checked by |
| --- | --- | --- |
| Final brief | Markdown | output-quality and artifact-closure checks |
| Provenance sidecar | `.provenance.md` | recursive shape validation across `outputs/` and `papers/`; adjacent final required; closure validator checks hash binding |
| Problem anchor | `vitruvius-problem-anchor.v1` | `scripts/problem-anchor-contract.mjs` |
| Evidence ledger | `evidence.v1` | `skills/engineering-research/scripts/evidence-ledger.mjs` |
| Run log | `run.v1` JSONL | `scripts/log-run.mjs` |

The problem-anchor record is the strongest binding between prose and code: it
pins the artifact bytes, resolves anchors, requires decisions to reach findings,
and rejects the narrow absence-claim contradiction described in
[docs/EVIDENCE.md](EVIDENCE.md).

## Host adapters

`installer/contract.mjs` is the single source of truth for commands. The
installer renders host-native files into `.opencode/`, `.claude/`, `.codex/`,
`.cursor/`, and other supported locations. Generated output is not committed;
role adapters are rendered from `agents/*.md`, so they cannot drift from the
canonical role definitions.

## Extending Vitruvius

Add a capability only when it improves a core research job: discover, read,
rank, verify, synthesize, or provenance. A new skill needs a command entry, a
`SKILL.md` contract, tests under `tests/<skill>/`, documentation in the command
catalog, and a passing full suite.

The README is intentionally a front door, not an inventory of every internal
rule. Detailed behavior belongs in skill references and `docs/`; the public
story belongs in README, ABOUT, COMMANDS, and the site.
