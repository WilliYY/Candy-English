import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// All DDL/data stay in this unique schema. No real contacts, sessions or sends.
if (!process.argv.includes("--isolated-schema")) throw new Error("Use --isolated-schema to acknowledge temporary DDL");
const schema = `catty_wa_test_${randomUUID().replaceAll("-", "")}`;
assert.match(schema, /^catty_wa_test_[a-f\d]{32}$/);
const database = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const connection = await database.connect();
const testPool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 8 });
const prisma = new PrismaClient({ adapter: new PrismaPg(testPool, { schema }) });
const globals = globalThis as typeof globalThis & { prisma?: PrismaClient; prismaPool?: Pool };
globals.prisma = prisma;
globals.prismaPool = testPool;
process.env.CATTY_WHATSAPP_ENABLED = "true";
for (const name of ["CATTY_WHATSAPP_ENCRYPTION_KEY", "CATTY_WHATSAPP_WEBHOOK_SECRET", "CATTY_WHATSAPP_WORKER_SECRET", "CATTY_EVOLUTION_API_KEY"]) process.env[name] = randomBytes(32).toString("hex");
// Accidental network access fails even if a test forgets dependency injection.
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("REAL_NETWORK_FORBIDDEN_IN_CATTY_AUDIT"); };
let checks = 0;
function pass(label: string) { checks++; console.log(`PASS ${label}`); }
try {
  await connection.query(`CREATE SCHEMA "${schema}"`);
  await connection.query(`SET search_path TO "${schema}"`);
  const migration = await readFile(new URL("../prisma/migrations/20260911140000_catty_whatsapp/migration.sql", import.meta.url), "utf8");
  assert.ok(!migration.includes("public."), "Migration must not target public schema");
  await connection.query(migration);
  await connection.query('CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "role" TEXT, "isActive" BOOLEAN, "deletedAt" TIMESTAMP(3))');
  await connection.query('INSERT INTO "User" VALUES ($1,$2,true,null)', ["audit-admin", "ADMIN"]);
  const { getWhatsappConfig } = await import("../src/lib/catty-whatsapp/config");
  const { receiveWhatsapp } = await import("../src/lib/catty-whatsapp/store");
  const { runWhatsappWorker } = await import("../src/lib/catty-whatsapp/worker");
  const { encrypt, decrypt, phoneHash } = await import("../src/lib/catty-whatsapp/crypto");
  const { EvolutionTransport } = await import("../src/lib/catty-whatsapp/transport");
  const { manageWhatsapp } = await import("../src/lib/catty-whatsapp/admin");
  const config = getWhatsappConfig()!;
  const phone = "5511000000000"; // Synthetic fixture, never transmitted.
  const hash = phoneHash(phone, config.encryptionKey);
  const contact = await prisma.cattyWhatsappContact.create({ data: { name: "Audit synthetic contact", phoneHash: hash, phoneCiphertext: encrypt(phone, `phone:${hash}`, config.encryptionKey), phoneMask: "fixture", authorized: true, consentAt: new Date(Date.now() - 60_000), createdByUserId: "audit-admin" } });
  function event(id: string, text = "Hello Catty", timestamp = Date.now() / 1000) { return { event: "messages.upsert", instance: config.instance, data: { key: { id, fromMe: false, remoteJid: `${phone}@s.whatsapp.net` }, messageTimestamp: Math.floor(timestamp), message: { conversation: text } } }; }
  let sent = 0;
  const transport = new EvolutionTransport(config, async () => { sent++; return Response.json({ key: { id: `synthetic-${sent}` } }); });
  const reply = async () => "Hello! Vamos praticar.";
  async function reset() {
    await prisma.cattyWhatsappMessage.deleteMany();
    await prisma.cattyWhatsappChannel.update({ where: { id: "main" }, data: { paused: false, workerToken: null, workerLeaseUntil: null, lastWorkerAt: new Date() } });
    await prisma.cattyWhatsappContact.update({ where: { id: contact.id }, data: { authorized: true, optedOutAt: null, consentAt: new Date(Date.now() - 60_000) } });
    sent = 0;
  }
  assert.equal(await receiveWhatsapp(event("paused"), config), "ignored");
  assert.equal(await prisma.cattyWhatsappMessage.count(), 0); pass("default paused");
  await reset();
  await Promise.all(Array.from({ length: 8 }, () => receiveWhatsapp(event("duplicate"), config)));
  assert.equal(await prisma.cattyWhatsappMessage.count(), 1);
  await Promise.all(Array.from({ length: 4 }, () => runWhatsappWorker(config, { transport, reply })));
  assert.equal(sent, 1); assert.equal((await prisma.cattyWhatsappMessage.findFirst())?.status, "SENT"); pass("concurrent dedup and workers send once");
  const row = (await prisma.cattyWhatsappMessage.findFirst())!;
  assert.equal(decrypt(row.inputCiphertext!, `input:${row.id}`, config.encryptionKey), "Hello Catty");
  assert.ok(!row.inputCiphertext!.includes("Hello")); pass("encrypted content");
  await reset();
  await receiveWhatsapp(event("block-during-ai"), config);
  await runWhatsappWorker(config, { transport, reply: async () => { await receiveWhatsapp(event("stop", "SAIR"), config); return "never sent"; } });
  assert.equal(sent, 0); assert.equal((await prisma.cattyWhatsappContact.findUniqueOrThrow({ where: { id: contact.id } })).authorized, false); pass("optout during generation stops send");
  await reset();
  await receiveWhatsapp(event("pause-during-ai"), config);
  await runWhatsappWorker(config, { transport, reply: async () => { await manageWhatsapp("audit-admin", "pause", undefined); return "never sent"; } });
  assert.equal(sent, 0); pass("pause during generation stops send");
  await reset();
  await receiveWhatsapp(event("expired"), config);
  await prisma.cattyWhatsappMessage.updateMany({ data: { expiresAt: new Date(Date.now() - 1) } });
  await runWhatsappWorker(config, { transport, reply }); assert.equal(sent, 0); pass("expired queue never sends");
  await reset();
  await receiveWhatsapp(event("uncertain"), config);
  await runWhatsappWorker(config, { transport: new EvolutionTransport(config, async () => { sent++; throw new Error("timeout"); }), reply });
  await runWhatsappWorker(config, { transport, reply });
  assert.equal(sent, 1); assert.equal((await prisma.cattyWhatsappMessage.findFirst())?.status, "UNCERTAIN"); pass("timeout never automatically retries");
  await reset();
  await receiveWhatsapp(event("interrupted-send"), config);
  await prisma.cattyWhatsappMessage.updateMany({ data: { status: "SENDING" } });
  await runWhatsappWorker(config, { transport, reply }); assert.equal(sent, 0);
  assert.equal((await prisma.cattyWhatsappMessage.findFirst())?.status, "UNCERTAIN"); pass("interrupted send stays uncertain");
  await reset();
  await Promise.all(Array.from({ length: 15 }, (_, n) => receiveWhatsapp(event(`rate-${n}`), config)));
  assert.equal(await prisma.cattyWhatsappMessage.count(), 10); pass("atomic contact rate limit");
  await reset();
  const command = { contactId: contact.id, text: "Test manual", confirmed: true, operationId: randomUUID() };
  await Promise.all([manageWhatsapp("audit-admin", "send", command), manageWhatsapp("audit-admin", "send", command)]);
  assert.equal(await prisma.cattyWhatsappMessage.count(), 1); pass("manual operation idempotency");
  await connection.query('UPDATE "User" SET "isActive" = false WHERE "id" = $1', ["audit-admin"]);
  await assert.rejects(manageWhatsapp("audit-admin", "send", command), /permissão/);
  await runWhatsappWorker(config, { transport, reply }); assert.equal(sent, 0); pass("deactivated admin cannot send pending manual message");
  await connection.query('UPDATE "User" SET "isActive" = true WHERE "id" = $1', ["audit-admin"]);
  await reset();
  await receiveWhatsapp(event("retention"), config);
  await prisma.cattyWhatsappMessage.updateMany({ data: { contentExpiresAt: new Date(Date.now() - 1), expiresAt: new Date(Date.now() - 1) } });
  await runWhatsappWorker(config, { transport, reply });
  assert.equal((await prisma.cattyWhatsappMessage.findFirst())?.inputCiphertext, null);
  await prisma.cattyWhatsappMessage.updateMany({ data: { createdAt: new Date(Date.now() - 31 * 86_400_000) } });
  await runWhatsappWorker(config, { transport, reply }); assert.equal(await prisma.cattyWhatsappMessage.count(), 0); pass("content and metadata retention");
  await reset();
  const oldStop = event("old-optout", "SAIR", (Date.now() - 30_000) / 1000);
  await receiveWhatsapp(oldStop, config);
  await prisma.cattyWhatsappContact.update({ where: { id: contact.id }, data: { authorized: true, optedOutAt: null, consentAt: new Date(Date.now() - 1000) } });
  await receiveWhatsapp(oldStop, config);
  assert.equal((await prisma.cattyWhatsappContact.findUniqueOrThrow({ where: { id: contact.id } })).authorized, true); pass("old optout cannot revoke renewed consent");
  await reset();
  await receiveWhatsapp(event("stale-owner"), config);
  await runWhatsappWorker(config, { transport, reply: async () => {
    await prisma.cattyWhatsappChannel.update({ where: { id: "main" }, data: { workerToken: "new-owner", workerLeaseUntil: new Date(Date.now() + 120_000) } });
    throw new Error("late failure from old owner");
  } });
  assert.equal((await prisma.cattyWhatsappMessage.findFirst())?.status, "PROCESSING"); pass("stale worker cannot overwrite new lease");
  console.log(`${checks} isolated integration checks passed; zero real messages.`);
} finally {
  globalThis.fetch = originalFetch;
  await prisma.$disconnect();
  await testPool.end().catch(() => {});
  await connection.query("RESET search_path");
  await connection.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  connection.release();
  await database.end();
  delete globals.prisma; delete globals.prismaPool;
  console.log("Temporary schema removed.");
}
