/**
 * The write-before-dispatch rule is a doc invariant, so it gets a runnable gate.
 *
 * A subagent launched in the same tool-call batch as the write that creates its
 * input reads a file that does not exist yet, and a report that then cites it
 * claims an artifact that has not landed. The rule lives in SKILL.md; this test
 * makes deleting or softening it fail the suite. Pattern ported from src-05,
 * where the same ordering is enforced for /lit and /summarize workflow scripts.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skill = readFileSync(join(root, "skills", "engineering-research", "SKILL.md"), "utf8");

assert.match(skill, /### Write Before Dispatch/, "the write-order section exists");
assert.match(
  skill,
  /returned success in a completed tool call before that consumer is invoked/,
  "the write must complete before the consumer runs",
);
assert.match(skill, /Do not batch the write and the consumer call together/, "no same-batch dispatch");
assert.match(skill, /inline artifact text/, "inline text cannot replace the on-disk file");
assert.match(skill, /failed write is `Verification: BLOCKED`/, "a failed write is not a clean result");

const version = skill.match(/version:\s*"(\d+)\.(\d+)\.(\d+)"/);
assert.ok(version, "engineering-research has a version");
assert.ok(
  Number(version[1]) > 0 || (Number(version[2]) >= 7 && Number(version[3]) >= 1),
  `engineering-research version is 0.7.1+ with the write-order rule (got ${version[1]}.${version[2]}.${version[3]})`,
);

console.log("PASS: engineering-research requires a completed write before a consumer is dispatched");
