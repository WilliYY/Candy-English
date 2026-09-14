import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("footer preserves the complete logo aspect ratio without a clipped animation", () => {
  const source = readFileSync(path.join(process.cwd(), "src/components/site/site-footer.tsx"), "utf8");
  assert.match(source, /animated=\{false\}/);
  assert.match(source, /aspect-\[720\/315\]/);
  assert.match(source, /group-hover:scale-100/);
  assert.doesNotMatch(source, /h-\[5\.25rem\]|max-w-\[280px\] overflow-hidden/);
});
