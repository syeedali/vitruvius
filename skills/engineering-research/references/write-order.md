# Write Before Dispatch

A downstream consumer — a subagent, verifier, or later stage — must not be
pointed at a file the lead has not finished writing.

## The rule

When a consumer will read a file the lead wrote (a plan, brief, frozen
requirements, script, or source extract), the write must have returned success
in a completed tool call before that consumer is invoked. Do not batch the
write and the consumer call together, and do not substitute inline artifact
text for the on-disk file. A consumer launched early reads a file that does not
exist yet; a report that then cites it claims an artifact that has not landed.
A failed write is `Verification: BLOCKED`, not a clean result.

## Why this is a research rule

On a live run, a model batched a script write and the subagent launch that read
it in the same tool-call turn. The subagent failed to read the script and had
to be retried. The general form is not about scripts: any consumer started
before its input exists turns a missing artifact into a cited one. The fix is
an ordering constraint, not a warning to be careful.

Method ported from src-05, where the same write-success ordering now governs
the `/lit` and `/summarize` workflow scripts. No prompt prose or code was
copied.
