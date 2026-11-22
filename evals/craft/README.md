# Craft Eval

The craft pass has two layers. The deterministic layer runs in `npm test`; the
judgment layer needs a blind model review and is on demand.

## Deterministic layer

`tests/artifacts/test-check-output-quality.mjs` runs the craft audit against
three fixture shapes:

- a heavy-slop report that must fire;
- a light-slop report that must report only its signs;
- a good report that must stay quiet.

The audit itself is:

```bash
node scripts/check-output-quality.mjs <file> --craft
node scripts/check-output-quality.mjs <file> --craft --strict
```

Without `--strict` it is advisory and exits 0. With `--strict` it exits 1 when
any sign is found. The default output-quality checks are unchanged.

## Judgment layer

A blind judge receives the original report and the rewritten report, with no
author reasoning, and scores both on three axes:

| Axis | Question |
|------|----------|
| Specificity | Could this report be about another system without changing a claim? |
| Decision usefulness | Does it name the decision, the answer, and the evidence behind it? |
| Template resistance | Would the swap test fail, or would the report still read true about another project? |

Run each case with and without the craft pass. Pin the model and host version
in the record. Do not claim an improvement without a baseline; a rewrite that
scores the same as the original is a failed craft pass.

## Cases

`cases.json` defines three shapes. The fixtures are illustrative; a real run
uses its own verified report. The expected behavior is the point:

- **Heavy slop** — fire and improve.
- **Light slop** — polish only; keep the structure and evidence.
- **No slop** — stay quiet; no rewrite.

The last case is the precision check. A craft pass that always fires is a house
style, not a craft pass.
