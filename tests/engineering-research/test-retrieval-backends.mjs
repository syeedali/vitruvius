/**
 * The keyless-backend policy is a doc invariant: a discovery run must know
 * which sources need no credentials, how to rotate them, and when a degraded
 * result is partial coverage rather than a negative finding. Interface facts
 * and the operating rule are ported from src-11; no code or prose was copied.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const text = readFileSync(join(root, "references", "retrieval-and-reading.md"), "utf8");

assert.match(text, /### Keyless search backends/, "declares the keyless backend layer");
for (const endpoint of [
  "https://mcp.parallel.ai/mcp",
  "https://api.keenable.ai/v1/search/public",
  "https://mcp.exa.ai/mcp",
]) {
  assert.ok(text.includes(endpoint), `names the keyless endpoint ${endpoint}`);
}
assert.match(text, /Do not send credentials or cookies/, "no credentials go to a keyless backend");
assert.match(text, /\*\*Rotation and reserves\.\*\*/, "declares rotation and reserves");
assert.match(
  text,
  /promote one in priority\s+order on a failure, a 429/,
  "a reserve is promoted on failure or throttling",
);
assert.match(text, /disagreement is a\s+finding/, "one bad lane is not averaged into consensus");
assert.match(text, /degraded.*underfilled.*partial/is, "a degraded search is partial coverage");

console.log("PASS: retrieval reference carries keyless backends, rotation, and partial-coverage rules");
