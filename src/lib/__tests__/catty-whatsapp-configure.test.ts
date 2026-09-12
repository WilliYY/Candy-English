import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const script = resolve("scripts/configure-catty-whatsapp.mjs");
function fixture(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "catty-config-test-"));
  try { fn(dir); } finally { assert.ok(basename(dir).startsWith("catty-config-test-")); rmSync(dir, { recursive: true, force: true }); }
}
test("provisiona somente segredos próprios, preserva env e não imprime valores", () => fixture(dir => {
  const original = 'UNRELATED_SETTING="preserve-this"\nCATTY_WHATSAPP_ENABLED="false"\n';
  writeFileSync(join(dir, ".env"), original);
  const run = () => spawnSync(process.execPath, [script, "--apply"], { cwd: dir, encoding: "utf8" });
  const first = run(); assert.equal(first.status, 0, first.stderr);
  const configured = readFileSync(join(dir, ".env"), "utf8");
  assert.ok(configured.includes('UNRELATED_SETTING="preserve-this"'));
  const values = [...configured.matchAll(/^[A-Z_]+="([a-f\d]{64})"$/gm)].map(match => match[1]);
  assert.equal(new Set(values).size, 5);
  for (const value of values) assert.ok(!first.stdout.includes(value) && !first.stderr.includes(value));
  const backup = readdirSync(dir).find(name => name.startsWith(".env.catty-before-"))!;
  assert.equal(readFileSync(join(dir, backup), "utf8"), original);
  assert.equal(run().status, 0); assert.equal(readFileSync(join(dir, ".env"), "utf8"), configured);
}));
test("provisionamento rejeita configuração inválida sem sobrescrever env", () => {
  for (const content of ['CATTY_WHATSAPP_ENCRYPTION_KEY="invalid"\n', 'CATTY_WHATSAPP_WORKER_SECRET=""\nCATTY_WHATSAPP_WORKER_SECRET=""\n', 'COMPOSE_FILE="another.yml"\n']) fixture(dir => {
    writeFileSync(join(dir, ".env"), content);
    const result = spawnSync(process.execPath, [script, "--apply"], { cwd: dir, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(join(dir, ".env"), "utf8"), content);
    assert.deepEqual(readdirSync(dir), [".env"]);
  });
});
test("provisionamento exige opção explícita de escrita", () => fixture(dir => {
  writeFileSync(join(dir, ".env"), "UNCHANGED=true\n");
  assert.notEqual(spawnSync(process.execPath, [script], { cwd: dir }).status, 0);
  assert.equal(readFileSync(join(dir, ".env"), "utf8"), "UNCHANGED=true\n");
}));
