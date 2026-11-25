# Commands

Vitruvius installs 27 slash commands into supported coding-agent hosts. Most
runs should start with `/vitruvius` or `/engineering-research`; use a specialized
skill when you know the job you need done.

## Core entry points

| Command | Use it for |
| --- | --- |
| `/vitruvius <discipline or research question>` | Let Vitruvius choose the discipline or workflow and run the shared method. |
| `/engineering-research <question or artifact>` | Run the shared method directly: plan, gather, synthesize, verify, deliver. Add `--deep`, `--quick`, `--turns N`, or `--budget N` when needed. |

## Discipline skills

Each discipline uses the same research loop with a source-routing table and
evidence landscape for that field.

| Command | Use it for |
| --- | --- |
| `/mechanical <question>` | Machine design, thermal systems, fluids, materials, manufacturing. |
| `/software <question>` | Architecture, frameworks, protocols, security, benchmarks, codebases. |
| `/civil <question>` | Buildings, bridges, steel, concrete, geotechnics, loads. |
| `/electrical <question>` | Power, electronics, controls, signal integrity, EMC. |
| `/architectural <question>` | Building science, envelopes, materials, codes, environmental performance. |

## Workflow skills

| Command | Use it for |
| --- | --- |
| `/gap-analysis <discipline> <sub-topic>` | Find and triangulate a literature gap. |
| `/evidence-ranking <question or sources>` | Rank evidence by quality and applicability. |
| `/verifier <claim or calculation>` | Independently check a claim against authoritative sources. |
| `/design-alternatives <problem and constraints>` | Compare three or more approaches with scored trade-offs. |
| `/fmea-brainstorm <system>` | Identify failure modes with severity, occurrence, detection, and RPN. |
| `/hypothesis-generation <observation>` | Freeze rival hypotheses with evidence boundaries and discriminating tests. |
| `/peer-review <artifact>` | Produce severity-graded review findings and a revision plan. |
| `/compare <items>` | Build a source-grounded comparison matrix. |
| `/review <artifact>` | Run an adversarial internal critique. |
| `/audit <paper, spec, or design>` | Compare claims against implementation or as-built evidence. |
| `/summarize <document>` | Extract a faithful structured digest with numbers, units, and caveats. |
| `/research-to-post <paper or repo>` | Draft two or three hook posts and a copy-first HTML card. |
| `/eli5 <topic>` | Explain an engineering concept in plain language. |
| `/simplified-technical-english <text>` | Rewrite and check technical writing against ASD-STE100 rules. |
| `/artifact-reading <file>` | Read PDFs, drawings, specifications, and code with anchored extraction. |
| `/scholarly-research <topic or identifier>` | Find academic evidence and synthesize consensus, disagreements, trajectories, and source status. |
| `/standards-lookup <standard> <section or topic>` | Retrieve a specific provision with edition, section, and provenance. |
| `/habit` | Capture explicit research preferences for human approval; never silently changes memory. |
| `/vitruvius-help` | Show the command card and shared method inside the host. |

## Application skill

| Command | Use it for |
| --- | --- |
| `/proposal --posting <path> --cv <path>` | Build a targeted research proposal from a posting, CV, optional statement, and optional voice sample. Local text intake is executable; PDF, URL, and image inputs require recorded extraction or transcription. |

## Examples

```text
/civil "Does this beam connection satisfy the governing shear check?"
/engineering-research "Compare these two control strategies against the acceptance criteria."
/verifier "The thermal model predicts a 12 C temperature rise."
/standards-lookup AISC 360 shear connection
/audit docs/design.md src/
/scholarly-research "FRP-to-concrete bond durability"
```

Commands are the interface. The output is the point: a decision-first brief,
an evidence trail, an explicit statement of uncertainty, and a next action.
