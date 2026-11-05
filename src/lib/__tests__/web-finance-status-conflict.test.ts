import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import { hasCompleteFinancialRegistration } from "../financial-completeness";
import { adminFinanceStatusSchema } from "../validations/admin-users";

const loadedVersion = "2026-11-01T10:00:00.000Z";
const newerVersion = "2026-11-01T11:00:00.000Z";
const source = readFileSync(new URL("../../app/ava/admin/actions.ts", import.meta.url), "utf8");
const actionSource = source.slice(
  source.indexOf("export async function toggleFinancialPaymentStatus("),
  source.indexOf("export async function deleteFinancialStudent("),
);
const input = { expectedUpdatedAt: loadedVersion, isPaid: false, studentId: "student-1", month: 11, year: 2026 };

function fixture(options: { stale?: boolean; race?: boolean; missing?: boolean; inactive?: boolean; noSession?: boolean } = {}) {
  let row = options.missing ? null : {
    id: "payment-1", isPaid: true, isActive: !options.inactive,
    paidAt: new Date("2026-11-01T09:00:00Z"),
    updatedAt: new Date(options.stale ? newerVersion : loadedVersion),
    snapshotAmountCents: 30000, snapshotPaymentDay: 10, snapshotPaymentMethod: "PIX",
  };
  let logs = 0;
  const payment = {
    findUnique: async () => row,
    upsert: async ({ update }: { update: Record<string, unknown> }) => {
      row = { ...row!, ...update }; return row;
    },
    updateMany: async ({ where, data }: { where: { updatedAt: Date }; data: Record<string, unknown> }) => {
      if (options.race && row) row = { ...row, updatedAt: new Date(newerVersion) };
      if (!row || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
      row = { ...row, ...data, updatedAt: new Date(row.updatedAt.getTime() + 1) };
      return { count: 1 };
    },
  };
  const store = {
    financialStudent: { findUnique: async () => ({ id: "student-1", name: "Fixture", amountCents: 30000, paymentDay: 10, paymentMethod: "PIX" }) },
    financialPayment: payment,
    $transaction: async (callback: (tx: unknown) => unknown) => callback({
      $queryRaw: async () => [], financialPayment: payment,
      financialLog: { create: async () => { logs++; } },
    }),
  };
  const context = {
    exports: {}, Date,
    requireAdmin: async () => options.noSession ? null : ({ user: { id: "admin-1" } }),
    adminFinanceStatusSchema, getPrisma: () => store, hasCompleteFinancialRegistration,
    revalidatePath: () => {}, fieldErrors: () => ({}),
    buildFinancialPaymentSnapshot: () => ({}), getFinancialInstallmentNumber: () => null,
  };
  runInNewContext(ts.transpileModule(actionSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const action = (context.exports as { toggleFinancialPaymentStatus: (input: unknown) => Promise<{ ok: boolean }> }).toggleFinancialPaymentStatus;
  return { action, row: () => row, logs: () => logs };
}

test("stale web undo preserves a payment received again by another operator", async () => {
  const state = fixture({ stale: true });
  assert.equal((await state.action(input)).ok, false);
  assert.equal(state.row()?.isPaid, true);
  assert.equal(state.row()?.paidAt?.toISOString(), "2026-11-01T09:00:00.000Z");
  assert.equal(state.logs(), 0);
});

test("web payment status checks the version at the write as well", async () => {
  const state = fixture({ race: true });
  assert.equal((await state.action(input)).ok, false);
  assert.equal(state.row()?.isPaid, true);
  assert.equal(state.logs(), 0);
});

test("current web undo changes only the status and records one audit entry", async () => {
  const state = fixture();
  assert.equal((await state.action(input)).ok, true);
  assert.equal(state.row()?.isPaid, false);
  assert.equal(state.row()?.paidAt, null);
  assert.equal(state.row()?.snapshotAmountCents, 30000);
  assert.equal(state.logs(), 1);
  assert.equal((await state.action(input)).ok, false);
  assert.equal(state.logs(), 1);
});

test("web can receive the reopened payment using its new version", async () => {
  const state = fixture();
  assert.equal((await state.action(input)).ok, true);
  assert.equal((await state.action({ ...input, isPaid: true, expectedUpdatedAt: state.row()!.updatedAt.toISOString() })).ok, true);
  assert.equal(state.row()?.isPaid, true);
  assert.ok(state.row()?.paidAt);
  assert.equal(state.row()?.snapshotAmountCents, 30000);
  assert.equal(state.logs(), 2);
});

test("removed and inactive payments cannot be recreated or paid by stale web buttons", async () => {
  for (const options of [{ missing: true }, { inactive: true }]) {
    const state = fixture(options);
    assert.equal((await state.action(input)).ok, false);
    assert.equal(state.logs(), 0);
  }
});

test("web payment status requires a session and the loaded version", async () => {
  assert.equal((await fixture({ noSession: true }).action(input)).ok, false);
  for (const expectedUpdatedAt of [undefined, "invalid"]) {
    const state = fixture();
    assert.equal((await state.action({ ...input, expectedUpdatedAt })).ok, false);
    assert.equal(state.row()?.isPaid, true);
    assert.equal(state.logs(), 0);
  }
});

test("web status button submits the version displayed when it was opened", async () => {
  const panel = readFileSync(new URL("../../components/ava/admin-finance-panel.tsx", import.meta.url), "utf8");
  const start = panel.indexOf("function FinanceStatusButton(");
  const body = panel.slice(start, panel.indexOf("  return (", start)) + "  return handleClick;\n}";
  let pending: Promise<unknown> = Promise.resolve();
  let submitted: Record<string, unknown> | undefined;
  const context = {
    useRouter: () => ({ refresh: () => {} }), useState: () => [null, () => {}],
    useTransition: () => [false, (callback: () => Promise<unknown>) => { pending = callback(); }],
    toggleFinancialPaymentStatus: async (value: Record<string, unknown>) => { submitted = value; return { ok: false, message: "conflict" }; },
  };
  runInNewContext(ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  (context as unknown as { FinanceStatusButton: (props: unknown) => () => void }).FinanceStatusButton({
    expectedUpdatedAt: loadedVersion, isPaid: true, month: 11, studentId: "student-1",
  })();
  await pending;
  assert.equal(submitted?.expectedUpdatedAt, loadedVersion);
  assert.equal(submitted?.isPaid, false);
});
