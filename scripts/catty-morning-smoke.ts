import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.argv.includes("--isolated-schema")) throw new Error("Use --isolated-schema");
const schema = `catty_morning_test_${randomUUID().replaceAll("-", "")}`;
assert.match(schema, /^catty_morning_test_[a-f\d]{32}$/);
const database = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const connection = await database.connect();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 8 });
const store = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("REAL_NETWORK_FORBIDDEN_IN_CATTY_AUDIT"); };
let checks = 0;
function pass(label: string) { checks++; console.log(`PASS ${label}`); }
try {
  await connection.query(`CREATE SCHEMA "${schema}"`);
  await connection.query(`SET search_path TO "${schema}"`);
  for (const file of ["20260911140000_catty_whatsapp", "20260917130000_catty_morning"]) {
    const sql = await readFile(new URL(`../prisma/migrations/${file}/migration.sql`, import.meta.url), "utf8");
    assert.ok(!sql.includes("public."));
    await connection.query(sql);
  }
  await connection.query('CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "role" TEXT, "isActive" BOOLEAN, "deletedAt" TIMESTAMP(3))');
  await connection.query('INSERT INTO "User" VALUES ($1,$2,true,null)', ["audit-admin", "ADMIN"]);
  const { configureMorningRoutine } = await import("../src/lib/catty-whatsapp/morning-admin");
  const { runMorningWorker } = await import("../src/lib/catty-whatsapp/morning-worker");
  const { MORNING_ID, morningContext } = await import("../src/lib/catty-whatsapp/morning-domain");
  const { decrypt } = await import("../src/lib/catty-whatsapp/crypto");
  const { TransportError } = await import("../src/lib/catty-whatsapp/transport");
  const config = { encryptionKey: randomBytes(32).toString("hex"), webhookSecret: randomBytes(32).toString("hex"), workerSecret: randomBytes(32).toString("hex"), apiKey: randomBytes(32).toString("hex"), baseUrl: "http://blocked.invalid", instance: "fixture" };
  let now = new Date();
  let sent = 0, generated = 0;
  const transport = {
    state: async () => "open" as const,
    groups: async () => [{ id: "123450000000@g.us", subject: "Interno" }],
    sendGroup: async (jid: string, text: string) => { assert.equal(jid, "123450000000@g.us"); assert.match(text, /Thursday|Friday|Saturday|Sunday|Monday|Tuesday|Wednesday/); sent++; return `synthetic-${sent}`; },
  };
  const generate = async () => { generated++; return `Good morning! It's ${morningContext(now).weekday}! ☀️\nHope your day feels a little lighter. Take a break when you need one!`; };
  const options = () => ({ store, config, transport, now, lateToday: true });
  const dependencies = () => ({ store, transport, now: () => now, generate });
  const version = async () => (await store.cattyMorningRoutine.findUnique({ where: { id: MORNING_ID } }))?.updatedAt.toISOString() ?? null;
  async function configure(enabled: boolean, lateToday = true) {
    return configureMorningRoutine("audit-admin", { enabled, expectedVersion: await version(), confirm: true }, { ...options(), lateToday });
  }
  async function reset() {
    now = new Date(); sent = 0; generated = 0;
    await store.cattyMorningRun.deleteMany();
    await connection.query('UPDATE "User" SET "role" = $1, "isActive" = true, "deletedAt" = null', ["ADMIN"]);
    await store.cattyWhatsappChannel.update({ where: { id: "main" }, data: { paused: true, lastWorkerAt: now } });
    await configure(true);
  }
  await reset();
  assert.equal((await store.cattyWhatsappChannel.findUniqueOrThrow({ where: { id: "main" } })).paused, true);
  assert.ok((await store.cattyMorningRoutine.findUniqueOrThrow({ where: { id: MORNING_ID } })).startsAt > now);
  pass("activation preserves private pause and starts at next morning");
  await Promise.all(Array.from({ length: 6 }, () => runMorningWorker(config, dependencies())));
  assert.equal(sent, 1); assert.equal(generated, 1); assert.equal(await store.cattyMorningRun.count(), 1);
  const first = (await store.cattyMorningRun.findFirst())!;
  assert.equal(first.status, "SENT");
  assert.ok(first.replyCiphertext && !first.replyCiphertext.includes("Good morning"));
  assert.match(decrypt(first.replyCiphertext!, `morning-reply:${first.id}`, config.encryptionKey), /Good morning/);
  await configure(true); await runMorningWorker(config, dependencies()); assert.equal(sent, 1);
  pass("concurrent workers, repeated activation and late request send at most once; encrypted history");

  await assert.rejects(configureMorningRoutine("audit-admin", { enabled: false, expectedVersion: null, confirm: true }, options()), /mudou/);
  pass("stale admin form cannot change a newer routine");
  for (const role of ["TEACHER", "STUDENT"]) {
    await connection.query('UPDATE "User" SET "role" = $1', [role]);
    await assert.rejects(configure(false), /administrador/);
  }
  await reset();
  await runMorningWorker(config, { ...dependencies(), generate: async () => { await configure(false); return generate(); } });
  assert.equal(sent, 0); assert.equal((await store.cattyMorningRun.findFirst())?.status, "CANCELED");
  pass("other roles denied and pause during generation stops delivery");
  await reset();
  await runMorningWorker(config, { ...dependencies(), generate: async () => { await connection.query('UPDATE "User" SET "isActive" = false'); return generate(); } });
  assert.equal(sent, 0); assert.equal((await store.cattyMorningRun.findFirst())?.status, "CANCELED");
  pass("author deactivation during generation stops delivery");
  await reset();
  await runMorningWorker(config, { ...dependencies(), transport: { ...transport, groups: async () => [{ id: "123459999999@g.us", subject: "Interno" }] } });
  assert.equal(sent, 0); assert.equal(generated, 0);
  pass("same group name with different identity cannot receive messages");
  await reset();
  await runMorningWorker(config, { ...dependencies(), transport: { ...transport, sendGroup: async () => { sent++; throw new TransportError("TRANSPORT_UNAVAILABLE", true); } } });
  await runMorningWorker(config, dependencies());
  assert.equal(sent, 1); assert.equal((await store.cattyMorningRun.findFirst())?.status, "UNCERTAIN");
  pass("uncertain delivery never retried");
  await reset();
  await runMorningWorker(config, { ...dependencies(), generate: async () => { throw new Error("synthetic provider unavailable"); } });
  await runMorningWorker(config, dependencies());
  assert.equal(sent, 0); assert.equal((await store.cattyMorningRun.findFirst())?.status, "FAILED");
  pass("generation failure sends no fallback or retry loop");
  await reset();
  await configure(true, false);
  await runMorningWorker(config, dependencies()); assert.equal(sent, 0);
  pass("normal activation never creates an implicit late/backlog send");
  await reset();
  await runMorningWorker(config, { ...dependencies(), generate: async () => { now = new Date(now.getTime() + 31 * 60_000); return generate(); } });
  assert.equal(sent, 0);
  pass("expired explicit late permission is checked again before send");
  await reset();
  await runMorningWorker(config, dependencies());
  await store.cattyMorningRun.updateMany({ data: { status: "SENDING", expiresAt: new Date(now.getTime() - 1) } });
  sent = 0; await runMorningWorker(config, dependencies());
  assert.equal(sent, 0); assert.equal((await store.cattyMorningRun.findFirst())?.status, "UNCERTAIN");
  pass("interrupted sending reservation stays uncertain after restart");
  await store.cattyMorningRun.updateMany({ data: { createdAt: new Date(now.getTime() - 46 * 86_400_000), dateKey: "2020-01-01" } });
  await configure(false); await runMorningWorker(config, dependencies());
  assert.equal(await store.cattyMorningRun.count(), 0);
  pass("45-day history cleaned while routine paused");
  console.log(`${checks} integration checks passed; zero real WhatsApp or AI requests.`);
} finally {
  globalThis.fetch = originalFetch;
  await store.$disconnect(); await pool.end().catch(() => {});
  await connection.query("RESET search_path");
  await connection.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  connection.release(); await database.end();
  console.log("Temporary schema removed.");
}
