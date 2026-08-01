import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileAdminFinance,
  MobileAdminFinanceError,
} from "../mobile-admin-finance";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};

const payments = [
  {
    id: "payment-overdue",
    isActive: true,
    isPaid: false,
    month: 8,
    note: "Lembrar responsavel",
    paidAt: null,
    snapshotAmountCents: 35_000,
    snapshotInstallmentNumber: 1,
    snapshotInstallmentsTotal: 12,
    snapshotName: "Ana Candy",
    snapshotPaymentDay: 10,
    snapshotPaymentMethod: "PIX",
    snapshotUnit: "IVATE" as const,
    studentId: "student-1",
    updatedAt: new Date("2026-08-11T12:00:00.000Z"),
    year: 2026,
  },
  {
    id: "payment-paid",
    isActive: true,
    isPaid: true,
    month: 8,
    note: null,
    paidAt: new Date("2026-08-05T13:00:00.000Z"),
    snapshotAmountCents: 40_000,
    snapshotInstallmentNumber: 2,
    snapshotInstallmentsTotal: 12,
    snapshotName: "Bruna Candy",
    snapshotPaymentDay: 8,
    snapshotPaymentMethod: "CARTAO",
    snapshotUnit: "DOURADINA" as const,
    studentId: "student-2",
    updatedAt: new Date("2026-08-05T13:00:00.000Z"),
    year: 2026,
  },
  {
    id: "payment-incomplete",
    isActive: true,
    isPaid: false,
    month: 8,
    note: "Completar cadastro",
    paidAt: null,
    snapshotAmountCents: 0,
    snapshotInstallmentNumber: null,
    snapshotInstallmentsTotal: null,
    snapshotName: "Carla Candy",
    snapshotPaymentDay: 1,
    snapshotPaymentMethod: "A_DEFINIR",
    snapshotUnit: "IVATE" as const,
    studentId: "student-3",
    updatedAt: new Date("2026-08-02T12:00:00.000Z"),
    year: 2026,
  },
];

function store(rows = payments) {
  return {
    financialPayment: {
      findMany: async () => rows,
    },
  };
}

test("rejects non-admin finance access before querying payment data", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminFinance(
        { ...admin, role: "TEACHER" },
        { month: 8, year: 2026 },
        {
          store: {
            financialPayment: {
              findMany: async () => (touched = true, payments),
            },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminFinanceError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(touched, false);
});

test("returns unit summaries and safe monthly rows without private snapshots", async () => {
  let query: Record<string, unknown> | undefined;
  const finance = await getMobileAdminFinance(
    admin,
    { limit: 25, month: 8, status: "ALL", unit: "IVATE", year: 2026 },
    {
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: {
        financialPayment: {
          findMany: async (input: Record<string, unknown>) => {
            query = input;
            return payments;
          },
        },
      } as never,
    },
  );

  assert.deepEqual(finance.period, { month: 8, year: 2026 });
  assert.deepEqual(finance.scopeSummary, {
    incompleteCount: 1,
    overdueCents: 35_000,
    overdueCount: 1,
    paidCents: 0,
    paidCount: 0,
    pendingCents: 35_000,
    pendingCount: 1,
    studentsCount: 2,
    totalCents: 35_000,
  });
  assert.deepEqual(
    finance.unitSummaries.map((summary) => [
      summary.unit,
      summary.studentsCount,
      summary.paidCents,
    ]),
    [
      ["IVATE", 2, 0],
      ["DOURADINA", 1, 40_000],
    ],
  );
  assert.deepEqual(
    finance.items.map((item) => [item.id, item.status]),
    [
      ["payment-incomplete", "INCOMPLETE"],
      ["payment-overdue", "OVERDUE"],
    ],
  );
  assert.equal(finance.total, 2);
  assert.equal("snapshotCpf" in finance.items[0]!, false);
  assert.equal("snapshotAddress" in finance.items[0]!, false);
  assert.deepEqual(query?.where, { isActive: true, month: 8, year: 2026 });
  assert.equal(
    "snapshotCpf" in (query?.select as Record<string, unknown>),
    false,
  );
});

test("filters paid rows, searches names and paginates with a stable cursor", async () => {
  const first = await getMobileAdminFinance(
    admin,
    {
      limit: 1,
      month: 8,
      query: "candy",
      status: "ALL",
      unit: "ALL",
      year: 2026,
    },
    {
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: store() as never,
    },
  );
  assert.equal(first.items.length, 1);
  assert.equal(first.nextCursor, first.items[0]?.id);

  const second = await getMobileAdminFinance(
    admin,
    {
      cursor: first.nextCursor ?? undefined,
      limit: 1,
      month: 8,
      query: "candy",
      status: "ALL",
      unit: "ALL",
      year: 2026,
    },
    {
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: store() as never,
    },
  );
  assert.deepEqual(second.items.map((item) => item.name), ["Bruna Candy"]);

  const paid = await getMobileAdminFinance(
    admin,
    {
      limit: 10,
      month: 8,
      query: "bruna",
      status: "PAID",
      unit: "ALL",
      year: 2026,
    },
    {
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: store() as never,
    },
  );
  assert.deepEqual(
    paid.items.map((item) => item.name),
    ["Bruna Candy"],
  );
  assert.equal(paid.total, 1);
});

test("rejects unknown finance filters before querying the database", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminFinance(
        admin,
        { month: 8, onlinePayment: true, year: 2026 },
        {
          store: {
            financialPayment: {
              findMany: async () => (touched = true, payments),
            },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminFinanceError &&
      error.code === "INVALID_QUERY",
  );
  assert.equal(touched, false);
});
