import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { productInvoiceSettlementSchema } from "../validations/sales";
import { adminAgendaMakeupSchema } from "../validations/admin-users";

const source = readFileSync(new URL("../../app/ava/admin/actions.ts", import.meta.url), "utf8");
const oldVersion = "2026-11-01T10:00:00.000Z";
function load(name: string, end: string, dependencies: Record<string, unknown>) {
  const context = { exports: {}, Date, AdminFinanceRuleError: Error, revalidatePath: () => {}, fieldErrors: () => ({}), requireAdmin: async () => ({ user: { id: "admin" } }), ...dependencies };
  runInNewContext(ts.transpileModule(source.slice(source.indexOf("export async function " + name + "("), source.indexOf("export async function " + end + "(")), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return (context.exports as Record<string, (input: unknown) => Promise<{ ok: boolean }>>)[name];
}
function invoiceFixture(race = false) {
  let row = { id: "sale", buyerUserId: "buyer", buyerStudentProfileId: null, financialPaymentId: null, invoiceMonth: 11, invoiceYear: 2026, settlementType: "MONTHLY_INVOICE", status: "COMPLETED", paidAt: new Date(), totalCents: 500, updatedAt: new Date(oldVersion) };
  let logs = 0;
  const tx = {
    user: { findFirst: async () => ({ id: "buyer", role: "TEACHER", name: "Fixture" }) },
    sale: {
      findMany: async () => [row],
      updateMany: async ({ where, data }: { where: { OR: { id: string; updatedAt: Date }[] }; data: { paidAt: Date | null } }) => {
        if (race) row = { ...row, updatedAt: new Date(row.updatedAt.getTime() + 1) };
        if (!where.OR.some((expected) => expected.id === row.id && expected.updatedAt.getTime() === row.updatedAt.getTime())) return { count: 0 };
        row = { ...row, paidAt: data.paidAt!, updatedAt: new Date(row.updatedAt.getTime() + 1) };
        return { count: 1 };
      },
    },
    financialLog: { create: async () => { logs++; } },
  };
  const action = load("settleProductInvoice", "createFinancialExpense", { productInvoiceSettlementSchema, getPrisma: () => ({ $transaction: async (callback: (tx: unknown) => unknown) => callback(tx) }) });
  const input = { buyerUserId: "buyer", month: 11, year: 2026, saleIds: ["sale"], expectedVersions: { sale: oldVersion }, isPaid: false };
  return { action, input, row: () => row, logs: () => logs };
}
test("product invoice rejects the first screen after paid, reopened and paid again", async () => {
  const state = invoiceFixture();
  assert.equal((await state.action(state.input)).ok, true);
  assert.equal((await state.action({ ...state.input, isPaid: true, expectedVersions: { sale: state.row().updatedAt.toISOString() } })).ok, true);
  assert.equal((await state.action(state.input)).ok, false);
  assert.ok(state.row().paidAt);
  assert.equal(state.logs(), 2);
});
test("product invoice compares the version again at the atomic write", async () => {
  const state = invoiceFixture(true);
  assert.equal((await state.action(state.input)).ok, false);
  assert.ok(state.row().paidAt);
  assert.equal(state.logs(), 0);
});
test("product invoice requires exactly one version for every selected sale", () => {
  const { input } = invoiceFixture();
  for (const expectedVersions of [undefined, {}, { sale: oldVersion, extra: oldVersion }, { sale: "invalid" }]) {
    assert.equal(productInvoiceSettlementSchema.safeParse({ ...input, expectedVersions }).success, false);
  }
});
function makeupFixture() {
  const rows: { date: Date; time: string; isActive: boolean }[] = [];
  let logs = 0;
  let queue = Promise.resolve();
  const tx = {
    $queryRaw: async () => [],
    agendaLesson: {
      findUnique: async () => ({ id: "original", isActive: true, isMakeup: false, student: { id: "student", name: "Fixture", isActive: true } }),
      findFirst: async () => rows.find((row) => row.isActive) ?? null,
      update: async () => ({}),
      create: async ({ data }: { data: { date: Date; time: string; isActive: boolean } }) => { rows.push(data); return { id: "makeup" }; },
    },
    agendaLog: { create: async () => { logs++; } },
  };
  const action = load("createAgendaMakeup", "removeAgendaStudentFromMonth", {
    adminAgendaMakeupSchema,
    getAgendaDateParts: (date: Date) => ({ month: date.getUTCMonth() + 1, year: date.getUTCFullYear(), weekday: date.getUTCDay() }),
    getPrisma: () => ({ $transaction: (callback: (tx: unknown) => Promise<unknown>) => { const result = queue.then(() => callback(tx)); queue = result.then(() => undefined, () => undefined); return result; } }),
  });
  return { action, rows, logs: () => logs, input: { lessonId: "original", date: "2026-11-25", time: "10:00" } };
}
test("web makeup replays and concurrent requests create one active occurrence and log", async () => {
  const state = makeupFixture();
  const results = await Promise.all([state.action(state.input), state.action(state.input)]);
  assert.ok(results.every((result) => result.ok));
  assert.equal(state.rows.length, 1);
  assert.equal(state.logs(), 1);
  assert.equal((await state.action({ ...state.input, time: "11:00" })).ok, false);
  state.rows[0].isActive = false;
  assert.equal((await state.action({ ...state.input, time: "11:00" })).ok, true);
  assert.equal(state.rows.filter((row) => row.isActive).length, 1);
  assert.equal(state.logs(), 2);
});
