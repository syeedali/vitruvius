# Changelog

All notable changes to Vitruvius are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

- docs(readme): replace the 605-line manual with a focused front door and a 250-line cap
- docs(about): publish the mission, principles, audience, and boundaries
- docs(commands): move the full 27-command catalogue out of the README
- docs(evidence): separate measurements, installation, and architecture from the front door
- feat(site): lead with the research promise and add dedicated About and Commands pages
- test(docs): require the public docs and keep README, site, and command contract in parity
- fix(problem-anchor): refuse unverified absence claims anchored to a line that proves presence
- fix(artifacts): validate nested and papers provenance sidecars and refuse orphans
- feat(scholarly-research): synthesize consensus, disagreements, trajectories, and publication status
- feat(scholarly-research): separate records, reports, and studies and disclose single-reviewer screening
- feat(scholarly-research): record read depth and read the section that answers
- feat(engineering-research): cap claims by source read depth and require a primary-source excerpt
- feat(evidence): add the optional `read_depth` source field and refuse verified snippet-only sources
- feat(goal-check): require the craft-pass record before delivery
- feat(trust): flag instruction-like spans in retrieved sources
- feat(baseline): emit the isolated control prompt and refuse a contaminated directory
- feat(engineering-research): add a craft pass that audits template prose, enforces one lead exhibit and finding dedup, and preserves every claim
- feat(evals): add the craft eval shapes and a deterministic fires/stays-quiet pair
- feat(research-to-post): add the best source image to the 2-3 hook copy-first card
- feat(research-to-post): choose a lens and keep the user's own thought before drafting
- feat(research-to-post): add emoji conventions for links and papers

## [0.5.1] - 2026-10-12

- fix(scholarly-research): point at the resolver instead of restating its internals
- refactor(resolve-oa): accept --email= and drop the dead doi fallback
- refactor(entailment): cut untested governance vocabulary and compile one pattern
- refactor(tests): factor the governance fixture into one case builder
- fix(problem-anchor): build the artifact line index once per record


## [0.5.0] - 2026-10-12

- feat(review): require reading the source rather than a summary of it
- feat(scholarly-research): record systematic-review coverage so the counts are auditable
- fix(problem-anchor): refuse a governance claim aimed at the wrong file
- fix(problem-anchor): refuse an action finding that never names its action
- feat(scholarly-research): implement the open-access resolver the skill documents


## [0.4.0] - 2026-10-12

- feat(evidence-ranking): score GRADE certainty and risk of bias beside the tier
- feat(scholarly-research): resolve a known DOI against Crossref, Unpaywall, and OpenCitations


## [0.3.0] - 2026-10-11

- refactor(commit-msg): narrow the quiet git lookup and share the name-status parse
- refactor(tests): extract the shared whitespace matcher to one helper
- refactor(scripts): give the recursive walk a single definition
- fix(simplified-technical-english): make the checker command runnable from a checkout
- feat(scholarly-research): separate an unavailable index from one that missed
- fix(commit-msg): check the staged diff so a skill addition is refused only for a bad edit
- feat(ste): add the ASD-STE100 skill and route instructions through it
- feat(scholarly-research): state what each index can answer, and stop losing failures
- fix(evals): refuse unknown keys on a C1 results manifest
- fix(evidence): refuse placeholder values in a required ledger field
- fix(site): thin the wordmark mark so the figure reads instead of blobbing
- feat(site): fold the catalogue into the home page and mark the logo with the figure
- fix(site): draw the Vitruvian figure as vector instead of cropping the plate
- feat(site): tip the engraved Vitruvian plate into the hero
- fix(site): replace empty skill diamonds with Roman plate numbers
- feat(site): rebuild in the Art Deco system, cut duplicate content
- fix(site): enable Pages from the workflow so a fresh repo can deploy


## [0.2.0] - 2026-10-07

- Initial release.

