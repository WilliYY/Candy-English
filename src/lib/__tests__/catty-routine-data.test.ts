import assert from "node:assert/strict";
import test from "node:test";
import { getAdminRoutineOverview, type RoutineStore } from "@/lib/catty-whatsapp/routine-data";

const admin = { role: "ADMIN", isActive: true, deletedAt: null };
const now = new Date("2026-09-12T22:00:00Z");

test("Rotina nega outras roles e admin inativo antes de consultar dados", async () => {
  for (const actor of [null, { ...admin, role: "TEACHER" }, { ...admin, role: "STUDENT" }, { ...admin, isActive: false }, { ...admin, deletedAt: now }]) {
    await assert.rejects(getAdminRoutineOverview(actor, undefined, { store: {} as RoutineStore }), /administrador/i);
  }
});

test("Rotina retorna somente projeção administrativa mínima e o dia solicitado", async () => {
  const store = {
    agendaLesson: { findMany: async () => [
      { id: "lesson", date: new Date("2026-09-12T12:00:00Z"), time: "08:00", status: "SCHEDULED", student: { name: "Aluno Exemplo", unit: "IVATE" } },
      { id: "other", date: new Date("2026-09-13T12:00:00Z"), time: "09:00", status: "SCHEDULED", student: { name: "Outro Aluno", unit: "DOURADINA" } },
    ] },
    financialPayment: { findMany: async () => [
      { id: "payment", year: 2026, month: 9, snapshotName: "Aluno Exemplo", snapshotUnit: "IVATE", snapshotAmountCents: 20000, snapshotPaymentDay: 10, snapshotPaymentMethod: "PIX", isPaid: false, snapshotCpf: "should-not-leak" },
    ] },
    sale: { findMany: async () => [] },
    cattyWhatsappChannel: { findUnique: async () => ({ paused: true, lastWorkerAt: now }) },
    cattyWhatsappMessage: { count: async () => 0 },
    cattyWhatsappAudit: { findMany: async () => [{ id: "audit", action: "GROUP_TEST_ACCEPTED", actorUserId: "admin", createdAt: now, contactId: "should-not-leak" }] },
    user: { findMany: async () => [{ id: "admin", name: "Admin Exemplo" }] },
  } as unknown as RoutineStore;
  const result = await getAdminRoutineOverview(admin, "2026-09-12", { store, now, configured: true });
  assert.equal(result.lessons.length, 1);
  assert.equal(result.payments[0].status, "OVERDUE");
  assert.equal(result.audit[0].actor, "Admin Exemplo");
  assert.equal(result.paused, true);
  assert.equal(result.activities.find(r => r.id === "group")?.nextRunAt, null);
  assert.doesNotMatch(JSON.stringify(result), /should-not-leak|snapshotCpf|contactId/);
});
