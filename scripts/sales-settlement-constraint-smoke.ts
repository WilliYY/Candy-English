import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

// All writes/DDL target a session-local temporary table. No customer rows are read.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const candidateOnly = process.argv.includes("--candidate-only");
const upPath = "../prisma/migrations/20260910150000_allow_monthly_invoice_settlement/migration.sql";
const downPath = "./sql/rollback-monthly-invoice-settlement.sql";
const paidAt = "2026-09-10T12:00:00Z";
const cases: { name: string; values: unknown[]; valid: boolean }[] = [
  { name: "monthly pending", values: ["MONTHLY_INVOICE", null, 2026, 9, null], valid: true },
  { name: "monthly paid", values: ["MONTHLY_INVOICE", null, 2026, 9, paidAt], valid: true },
  { name: "monthly without year", values: ["MONTHLY_INVOICE", null, null, 9, null], valid: false },
  { name: "monthly without month", values: ["MONTHLY_INVOICE", null, 2026, null, paidAt], valid: false },
  { name: "monthly with method", values: ["MONTHLY_INVOICE", "PIX", 2026, 9, paidAt], valid: false },
  { name: "paid now", values: ["PAID_NOW", "PIX", null, null, paidAt], valid: true },
  { name: "paid now without date", values: ["PAID_NOW", "PIX", null, null, null], valid: false },
  { name: "paid now without method", values: ["PAID_NOW", null, null, null, paidAt], valid: false },
  { name: "paid now with year", values: ["PAID_NOW", "PIX", 2026, null, paidAt], valid: false },
  { name: "paid now with month", values: ["PAID_NOW", "PIX", null, 9, paidAt], valid: false },
];
const insert = 'INSERT INTO pg_temp."Sale" VALUES ($1, $2, $3, $4, $5)';

async function checkCases(label: string, monthlyPaid = true) {
  for (const test of cases) {
    await client.query("BEGIN");
    try {
      let errorCode: string | undefined;
      try { await client.query(insert, test.values); }
      catch (error) { errorCode = (error as { code?: string }).code; }
      const valid = test.name === "monthly paid" ? monthlyPaid : test.valid;
      assert.equal(errorCode, valid ? undefined : "23514", `${label}: ${test.name}`);
    } finally { await client.query("ROLLBACK"); }
  }
  console.log(`${label}: ${cases.length} constraint cases passed`);
}

async function temporarySql(path: string) {
  const sql = await readFile(new URL(path, import.meta.url), "utf8");
  assert.ok(sql.includes('public."Sale"'), "SQL must have explicit production target");
  return sql.replaceAll('public."Sale"', 'pg_temp."Sale"');
}

try {
  const installed = await client.query<{ definition: string }>(`
    SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid = 'public."Sale"'::regclass AND conname = 'Sale_settlement_check' AND convalidated
  `);
  assert.equal(installed.rowCount, 1, "Installed settlement constraint must be validated");
  await client.query(`CREATE TEMP TABLE "Sale" AS
    SELECT "settlementType", "paymentMethod", "invoiceYear", "invoiceMonth", "paidAt"
    FROM public."Sale" WITH NO DATA`);
  await client.query(`ALTER TABLE pg_temp."Sale" ADD CONSTRAINT "Sale_settlement_check" ${installed.rows[0].definition}`);
  if (!candidateOnly) await checkCases("Installed database");

  const up = await temporarySql(upPath);
  const down = await temporarySql(downPath);
  await client.query(up);
  await checkCases("Candidate migration");
  await client.query(down);
  await checkCases("Rollback on compatible data", false);
  await client.query(up);
  await client.query(insert, cases[1].values);
  await assert.rejects(client.query(down), (error: unknown) => (error as { code?: string }).code === "23514");
  await client.query("ROLLBACK");
  const preserved = await client.query('SELECT count(*)::int AS count FROM pg_temp."Sale" WHERE "paidAt" IS NOT NULL');
  assert.equal(preserved.rows[0].count, 1, "Rollback must not unpay or delete a monthly sale");
  await checkCases("Rejected rollback preserves expanded constraint");
  console.log("Guarded rollback preserved paid fixture. No production records changed.");
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  client.release(true); // Closing the connection also removes its temporary table.
  await pool.end();
}
