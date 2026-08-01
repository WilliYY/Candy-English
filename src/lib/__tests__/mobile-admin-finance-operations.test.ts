import assert from "node:assert/strict";
import test from "node:test";

import {
  createMobileAdminFinanceExpense,
  getMobileAdminFinanceActivity,
  MobileAdminFinanceOperationsError,
  updateMobileAdminFinancePayment,
} from "../mobile-admin-finance-operations";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};
const expectedUpdatedAt = "2026-08-11T12:00:00.000Z";
const operationId = "11111111-1111-4111-8111-111111111111";
const operationKey = `admin-finance:payment:${operationId}`;

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    isActive: true,
    isPaid: false,
    lastMobileOperationId: null,
    month: 8,
    note: null,
    paidAt: null,
    snapshotAmountCents: 35_000,
    snapshotInstallmentNumber: 1,
    snapshotInstallmentsTotal: 12,
    snapshotName: "Ana Candy",
    snapshotPaymentDay: 10,
    snapshotPaymentMethod: "PIX",
    snapshotUnit: "IVATE" as const,
    studentId: "student-1",
    updatedAt: new Date(expectedUpdatedAt),
    year: 2026,
    ...overrides,
  };
}

test("rejects non-admin finance activity before reading expenses or logs", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminFinanceActivity(
        { ...admin, role: "TEACHER" },
        { month: 8, unit: "ALL", year: 2026 },
        {
          store: {
            financialExpense: {
              findMany: async () => (touched = true, []),
            },
            financialLog: { findMany: async () => (touched = true, []) },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminFinanceOperationsError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(touched, false);
});

test("returns safe expenses and recent global logs", async () => {
  const activity = await getMobileAdminFinanceActivity(
    admin,
    { month: 8, unit: "IVATE", year: 2026 },
    {
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: {
        financialExpense: {
          findMany: async () => [
            {
              actorName: "Williany",
              amountCents: 12_500,
              createdAt: new Date("2026-08-10T12:00:00.000Z"),
              id: "expense-1",
              itemName: "Material escolar",
              note: null,
              purchasedAt: new Date("2026-08-10T00:00:00.000Z"),
              unit: "IVATE" as const,
              updatedAt: new Date("2026-08-10T12:00:00.000Z"),
            },
          ],
        },
        financialLog: {
          findMany: async () => [
            {
              action: "STATUS",
              createdAt: new Date("2026-08-11T12:00:00.000Z"),
              description: "Status marcado como pago: Ana Candy.",
              id: "log-1",
              student: { name: "Ana Candy" },
            },
          ],
        },
      } as never,
    },
  );

  assert.deepEqual(activity.expenseSummary, { count: 1, totalCents: 12_500 });
  assert.equal(activity.expenses[0]?.itemName, "Material escolar");
  assert.equal(activity.logs[0]?.studentName, "Ana Candy");
  assert.equal(activity.logsScope, "GLOBAL_RECENT");
  assert.equal("createdByUserId" in activity.expenses[0]!, false);
});

test("replays a completed payment operation before checking stale updatedAt", async () => {
  let updated = false;
  let logged = false;
  const replayed = payment({
    isPaid: true,
    lastMobileOperationId: operationKey,
    paidAt: new Date("2026-08-12T12:00:00.000Z"),
    updatedAt: new Date("2026-08-12T12:00:00.000Z"),
  });
  const result = await updateMobileAdminFinancePayment(
    admin,
    "payment-1",
    {
      confirmChange: true,
      expectedUpdatedAt,
      isPaid: true,
      note: null,
      operationId,
    },
    {
      acquireLock: async () => undefined,
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            financialLog: { create: async () => (logged = true) },
            financialPayment: {
              findUnique: async (query: { where: Record<string, unknown> }) =>
                "lastMobileOperationId" in query.where ? replayed : null,
              updateMany: async () => (updated = true, { count: 1 }),
            },
          }),
      } as never,
    },
  );

  assert.equal(result.replayed, true);
  assert.equal(result.payment.isPaid, true);
  assert.equal(updated, false);
  assert.equal(logged, false);
});

test("rejects a stale payment before changing or logging it", async () => {
  let updated = false;
  await assert.rejects(
    () =>
      updateMobileAdminFinancePayment(
        admin,
        "payment-1",
        {
          confirmChange: true,
          expectedUpdatedAt,
          isPaid: true,
          note: null,
          operationId,
        },
        {
          acquireLock: async () => undefined,
          store: {
            $transaction: async (callback: (tx: unknown) => unknown) =>
              callback({
                financialLog: { create: async () => undefined },
                financialPayment: {
                  findUnique: async (query: { where: Record<string, unknown> }) =>
                    "lastMobileOperationId" in query.where
                      ? null
                      : payment({
                          updatedAt: new Date("2026-08-11T13:00:00.000Z"),
                        }),
                  updateMany: async () => (updated = true, { count: 1 }),
                },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminFinanceOperationsError &&
      error.code === "EDIT_CONFLICT",
  );
  assert.equal(updated, false);
});

test("updates one payment atomically and records a safe log", async () => {
  const writes: unknown[] = [];
  let reads = 0;
  const result = await updateMobileAdminFinancePayment(
    admin,
    "payment-1",
    {
      amountCents: 36_000,
      confirmChange: true,
      expectedUpdatedAt,
      isPaid: true,
      note: "Recebido no PIX",
      operationId,
    },
    {
      acquireLock: async () => undefined,
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            financialLog: {
              create: async (query: unknown) => writes.push(query),
            },
            financialPayment: {
              findUnique: async (query: { where: Record<string, unknown> }) => {
                if ("lastMobileOperationId" in query.where) return null;
                reads += 1;
                return reads === 1
                  ? payment()
                  : payment({
                      isPaid: true,
                      lastMobileOperationId: operationKey,
                      note: "Recebido no PIX",
                      paidAt: new Date("2026-08-15T15:00:00.000Z"),
                      snapshotAmountCents: 36_000,
                      updatedAt: new Date("2026-08-15T15:00:00.000Z"),
                    });
              },
              updateMany: async (query: unknown) => {
                writes.push(query);
                return { count: 1 };
              },
            },
          }),
      } as never,
    },
  );

  assert.equal(result.replayed, false);
  assert.equal(result.payment.amountCents, 36_000);
  assert.equal(result.payment.isPaid, true);
  assert.equal("lastMobileOperationId" in result.payment, false);
  assert.equal(writes.length, 2);
  assert.match(JSON.stringify(writes[0]), /lastMobileOperationId/);
  assert.doesNotMatch(JSON.stringify(result), /admin-finance:payment/);
});

test("creates an expense once and reuses the stored result on replay", async () => {
  const createdExpense = {
    actorName: "Williany",
    amountCents: 12_500,
    createdAt: new Date("2026-08-15T15:00:00.000Z"),
    createdByMobileOperationId: `admin-finance:expense:${operationId}`,
    id: "expense-1",
    itemName: "Material escolar",
    note: null,
    purchasedAt: new Date("2026-08-10T00:00:00.000Z"),
    unit: "IVATE" as const,
    updatedAt: new Date("2026-08-15T15:00:00.000Z"),
  };
  let createCount = 0;
  let logCount = 0;
  let storedExpense: typeof createdExpense | null = null;
  const input = {
      actorName: "Williany",
      amountCents: 12_500,
      confirmCreate: true,
      itemName: "Material escolar",
      month: 8,
      note: null,
      operationId,
      purchasedAt: "2026-08-10",
      unit: "IVATE",
      year: 2026,
    } as const;
  const store = {
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        financialExpense: {
          create: async () => {
            createCount += 1;
            storedExpense = createdExpense;
            return createdExpense;
          },
          findUnique: async () => storedExpense,
        },
        financialLog: { create: async () => (logCount += 1) },
      }),
  } as never;
  const create = () =>
    createMobileAdminFinanceExpense(admin, input,
    {
      acquireLock: async () => undefined,
      store,
    });
  const created = await create();
  const replayed = await create();

  assert.equal(created.replayed, false);
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.expense.id, "expense-1");
  assert.equal(createCount, 1);
  assert.equal(logCount, 1);
  assert.equal("createdByMobileOperationId" in replayed.expense, false);
});
