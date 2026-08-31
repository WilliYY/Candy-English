import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("keeps the password action label readable in narrow admin panels", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/components/ava/admin-operations.tsx"),
    "utf8",
  );

  assert.match(
    source,
    /<span className="whitespace-normal break-words text-left leading-4">\s*Acesso e senha/,
  );
  assert.doesNotMatch(
    source,
    /<span className="truncate">\s*Acesso e senha/,
  );
});
