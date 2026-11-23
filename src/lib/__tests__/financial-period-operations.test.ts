import assert from "node:assert/strict";
import test from "node:test";
import { listFinancialPeriodCandidates, openFinancialPeriod } from "../financial-period-operations";

function fixture(options: { inactive?: boolean; installments?: number; previousNumber?: number; duplicate?: boolean; ended?: boolean } = {}) {
  const student = { id: "student", name: "Fixture", amountCents: 25000, paymentDay: 10, paymentMethod: "PIX", unit: "IVATE", installmentsTotal: options.installments ?? null, phone: null, cpf: null, email: null, address: null, studentProfile: { user: { role: "STUDENT", isActive: !options.inactive } } };
  const prior = { id: "december", year: 2026, month: 12, isActive: !options.ended, isPaid: true, snapshotInstallmentNumber: options.previousNumber ?? null, snapshotInstallmentsTotal: student.installmentsTotal };
  let created: Record<string, unknown> | null = null;
  let logs = 0;
  let queue = Promise.resolve();
  const tx = {
    user: { findFirst: async () => ({ id: "admin" }) },
    $queryRaw: async () => [],
    financialStudent: { findUnique: async () => student },
    financialPayment: {
      findUnique: async () => created,
      findFirst: async ({ where }: { where: Record<string, unknown> }) => Object.hasOwn(where, "snapshotInstallmentNumber") ? (options.duplicate ? prior : null) : prior,
      create: async ({ data }: { data: Record<string, unknown> }) => { created = { ...data, id: "january" }; return created; },
    },
    financialLog: { create: async () => { logs++; } },
  };
  const store = { $transaction: (callback: (tx: unknown) => Promise<unknown>) => { const result = queue.then(() => callback(tx)); queue = result.then(() => undefined, () => undefined); return result; } };
  return { store: store as never, student, prior, created: () => created, logs: () => logs };
}
const input = { studentId: "student", year: 2027, month: 1, confirmCreate: true };
test("explicit January opening preserves paid December and is idempotent under concurrency", async () => {
  const state = fixture();
  const results = await Promise.all([openFinancialPeriod("admin", input, state), openFinancialPeriod("admin", input, state)]);
  assert.deepEqual(results.map((result) => result.created), [true, false]);
  assert.equal(state.created()?.year, 2027);
  assert.equal(state.created()?.month, 1);
  assert.equal(state.created()?.isPaid, false);
  assert.equal(state.created()?.snapshotAmountCents, 25000);
  assert.equal(state.prior.isPaid, true);
  assert.equal(state.logs(), 1);
});
test("January is also opened when December is pending without changing December", async () => {
  const state = fixture();
  state.prior.isPaid = false;
  await openFinancialPeriod("admin", input, state);
  assert.equal(state.prior.isPaid, false);
  assert.equal(state.logs(), 1);
});
test("finite plans continue their next installment across the year", async () => {
  const state = fixture({ installments: 12, previousNumber: 8 });
  await openFinancialPeriod("admin", input, state);
  assert.equal(state.created()?.snapshotInstallmentNumber, 9);
});
test("opening never repeats installments or revives inactive and completed plans", async () => {
  for (const options of [{ installments: 12, previousNumber: 12 }, { installments: 12, previousNumber: 8, duplicate: true }, { inactive: true }, { ended: true }]) {
    const state = fixture(options);
    await assert.rejects(openFinancialPeriod("admin", input, state));
    assert.equal(state.created(), null);
    assert.equal(state.logs(), 0);
  }
});
test("opening requires explicit confirmation and an active admin account", async () => {
  const state = fixture();
  await assert.rejects(openFinancialPeriod("admin", { ...input, confirmCreate: false }, state));
  const store = { $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({ user: { findFirst: async () => null } }) };
  await assert.rejects(openFinancialPeriod("inactive-admin", input, { store: store as never }));
  assert.equal(state.created(), null);
});

test("candidate list scopes unit and period, limits rows and returns no financial or personal details", async () => {
  let query: Record<string, unknown> | undefined;
  const store = {
    user: { findFirst: async () => ({ id: "admin" }) },
    financialStudent: { findMany: async (value: Record<string, unknown>) => {
      query = value;
      return [{ id: "student", name: "Fixture", unit: "IVATE", amountCents: 25000, paymentDay: 10, paymentMethod: "PIX", installmentsTotal: null, payments: [] }];
    } },
  };
  const result = await listFinancialPeriodCandidates("admin", { year: 2027, month: 1, unit: "IVATE", limit: 1 }, { store: store as never });
  assert.deepEqual(result, { students: [{ id: "student", name: "Fixture", unit: "IVATE" }], nextCursor: null });
  assert.equal(query?.take, 2);
  const where = query?.where as Record<string, unknown>;
  assert.equal(where.unit, "IVATE");
  assert.deepEqual(where.payments, { none: { year: 2027, month: 1 } });
  await assert.rejects(listFinancialPeriodCandidates("admin", { year: 2027, month: 1, limit: 101 }, { store: store as never }));
});
