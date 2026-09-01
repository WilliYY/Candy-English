import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import {
  ensureStudentAdministrativeRecords,
  getStudentAdministrativeStartMonth,
} from "../student-administrative-linkage";

test("creates linked finance, monthly snapshots and agenda for a student profile", async () => {
  const payments: Array<Record<string, unknown>> = [];
  const financeLogs: unknown[] = [];
  const agendaLogs: unknown[] = [];
  const agendaCreates: Array<Record<string, unknown>> = [];
  const financeCreates: Array<Record<string, unknown>> = [];
  const tx = {
    $queryRaw: async () => [{ locked: 1 }],
    agendaLog: {
      create: async (input: unknown) => agendaLogs.push(input),
    },
    agendaStudent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        agendaCreates.push(data);
        return { id: "agenda-1" };
      },
      update: async () => undefined,
    },
    financialLog: {
      create: async (input: unknown) => financeLogs.push(input),
    },
    financialPayment: {
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) =>
        payments.push(...data),
    },
    financialStudent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        financeCreates.push(data);
        return {
          ...data,
          address: null,
          amountCents: 0,
          email: "ana@candy.local",
          id: "finance-1",
          installmentsTotal: null,
          name: "Ana Candy",
          paymentDay: 1,
          paymentMethod: "A_DEFINIR",
          phone: "44999999999",
          unit: "DOURADINA",
        };
      },
      update: async () => undefined,
    },
    studentProfile: {
      findUnique: async () => ({
        agendaStudent: null,
        financialStudent: null,
        id: "profile-1",
        studentPhone: "44999999999",
        unit: "DOURADINA",
        user: {
          address: null,
          email: "ana@candy.local",
          name: "Ana Candy",
          phone: null,
          role: "STUDENT",
        },
      }),
    },
  };

  const result = await ensureStudentAdministrativeRecords(
    tx as unknown as Prisma.TransactionClient,
    {
      actorUserId: "admin-1",
      sourceDescription: "teste",
      startMonth: 8,
      studentProfileId: "profile-1",
      year: 2026,
    },
  );

  assert.deepEqual(result, {
    agendaStudentId: "agenda-1",
    createdAgenda: true,
    createdFinancial: true,
    financialStudentId: "finance-1",
  });
  assert.equal(financeCreates[0]?.studentProfileId, "profile-1");
  assert.equal(agendaCreates[0]?.studentProfileId, "profile-1");
  assert.deepEqual(
    payments.map((payment) => payment.month),
    [8, 9, 10, 11, 12],
  );
  assert.equal(payments.every((payment) => payment.snapshotUnit === "DOURADINA"), true);
  assert.equal(financeLogs.length, 1);
  assert.equal(agendaLogs.length, 1);
});

test("reuses existing linked records without creating duplicates", async () => {
  let creates = 0;
  let updates = 0;
  const tx = {
    $queryRaw: async () => [{ locked: 1 }],
    agendaLog: { create: async () => (creates += 1) },
    agendaStudent: {
      create: async () => (creates += 1),
      update: async () => (updates += 1),
    },
    financialLog: { create: async () => (creates += 1) },
    financialPayment: { createMany: async () => (creates += 1) },
    financialStudent: {
      create: async () => (creates += 1),
      update: async () => (updates += 1),
    },
    studentProfile: {
      findUnique: async () => ({
        agendaStudent: { id: "agenda-existing" },
        financialStudent: { id: "finance-existing" },
        id: "profile-1",
        studentPhone: null,
        unit: "IVATE",
        user: {
          address: null,
          email: "aluno@candy.local",
          name: "Aluno Candy",
          phone: null,
          role: "STUDENT",
        },
      }),
    },
  };

  const result = await ensureStudentAdministrativeRecords(
    tx as unknown as Prisma.TransactionClient,
    {
      actorUserId: "admin-1",
      sourceDescription: "teste repetido",
      studentProfileId: "profile-1",
    },
  );

  assert.equal(creates, 0);
  assert.equal(updates, 2);
  assert.deepEqual(result, {
    agendaStudentId: "agenda-existing",
    createdAgenda: false,
    createdFinancial: false,
    financialStudentId: "finance-existing",
  });
});

test("uses Sao Paulo month for the 2026 administrative start", () => {
  assert.equal(
    getStudentAdministrativeStartMonth(
      new Date("2026-08-26T02:30:00.000Z"),
      2026,
    ),
    8,
  );
});
