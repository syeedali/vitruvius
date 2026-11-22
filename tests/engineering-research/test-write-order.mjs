/**
 * The write-before-dispatch rule is a doc invariant, so it gets a runnable gate.
 *
 * A subagent launched in the same tool-call batch as the write that creates its
 * input reads a file that does not exist yet, and a report that then cites it
 * claims an artifact that has not landed. SKILL.md carries the short pointer;
 * the reference carries the full rule. This test makes deleting either half
 * fail the suite. Pattern ported from src-05.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skill = readFileSync(join(root, "skills", "engineering-research", "SKILL.md"), "utf8");
const rule = readFileSync(
  join(root, "skills", "engineering-research", "references", "write-order.md"),
  "utf8",
);

assert.match(skill, /waits for the write to return success/, "SKILL.md carries the write-order pointer");
assert.match(skill, /references\/write-order\.md/, "SKILL.md points at the full rule");
assert.match(rule, /## The rule/, "the reference carries the full rule");
assert.match(
  rule,
  /returned success\s+in a completed tool call before that consumer is invoked/,
  "the write must complete before the consumer runs",
);
assert.match(rule, /Do not batch the\s+write and the consumer call together/, "no same-batch dispatch");
assert.match(rule, /inline artifact\s+text/, "inline text cannot replace the on-disk file");
assert.match(rule, /failed write is `Verification: BLOCKED`/, "a failed write is not a clean result");

const version = skill.match(/version:\s*"(\d+)\.(\d+)\.(\d+)"/);
assert.ok(version, "engineering-research has a version");
assert.ok(
  Number(version[1]) > 0 || (Number(version[2]) >= 7 && Number(version[3]) >= 2),
  `engineering-research version is 0.7.2+ with the write-order rule (got ${version[1]}.${version[2]}.${version[3]})`,
);

console.log("PASS: engineering-research requires a completed write before a consumer is dispatched");
