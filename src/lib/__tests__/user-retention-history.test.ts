import assert from "node:assert/strict";
import test from "node:test";

import { anonymizeUserHistoricalReferences } from "../user-retention-history";
import { ANONYMIZED_USER_NAME } from "../user-retention";

test("teacher purchases lose personal snapshots and preserve financial history", async () => {
  const sale = { buyerUserId: "teacher", buyerNameSnapshot: "Fictitious teacher", note: "Private note", totalCents: 1400, paidAt: "2026-01-01" };
  const tx = {
    sale: { updateMany: async ({ where, data }: { where: { OR: object[] }; data: object }) => {
      assert.deepEqual(where.OR, [{ buyerUserId: "teacher" }]);
      Object.assign(sale, data);
    } },
  };
  await anonymizeUserHistoricalReferences(tx as never, { id: "teacher", studentProfile: null });
  assert.equal(sale.buyerNameSnapshot, ANONYMIZED_USER_NAME);
  assert.equal(sale.note, null);
  assert.equal(sale.totalCents, 1400);
  assert.equal(sale.paidAt, "2026-01-01");
});

test("direct and converted agenda links are both anonymized without deleting lessons", async () => {
  const agendas = ["direct", "legacy"].map((id) => ({ id, name: "Fictitious student", phone: "test", notes: "test", isActive: true }));
  const lessons = agendas.map((student) => ({ studentId: student.id, notes: "test", status: "PRESENT" }));
  const tx = {
    agendaStudent: { updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: object }) => {
      for (const row of agendas) if (where.id.in.includes(row.id)) Object.assign(row, data);
    } },
    agendaLesson: { updateMany: async ({ where, data }: { where: { studentId: { in: string[] } }; data: object }) => {
      for (const row of lessons) if (where.studentId.in.includes(row.studentId)) Object.assign(row, data);
    } },
    sale: { updateMany: async () => undefined },
  };
  const candidate = { id: "student", studentProfile: { id: "profile", agendaStudent: { id: "direct" }, financialStudent: null, convertedStudentPreRegistration: { convertedAgendaStudentId: "legacy", convertedFinancialStudentId: null } } };
  await anonymizeUserHistoricalReferences(tx as never, candidate);
  await anonymizeUserHistoricalReferences(tx as never, candidate);
  assert.ok(agendas.every((row) => row.name === ANONYMIZED_USER_NAME && row.phone === null && row.notes === null));
  assert.ok(lessons.every((row) => row.notes === null && row.status === "PRESENT"));
  assert.equal(lessons.length, 2);
});
