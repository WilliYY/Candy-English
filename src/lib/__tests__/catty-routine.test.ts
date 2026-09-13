import assert from "node:assert/strict";
import test from "node:test";
import { getSafeAvaCallbackUrl } from "@/lib/ava-callback-url";
import { getRoutinePeriod, getRoutineActivities, getRoutinePaymentStatus, routineAuditLabel } from "@/lib/catty-whatsapp/routine-domain";

test("Rotina usa o dia de São Paulo e valida datas sem normalizar dias inexistentes", () => {
  const period = getRoutinePeriod(undefined, new Date("2026-09-13T01:00:00Z"));
  assert.equal(period.date, "2026-09-12");
  assert.equal(period.month, 9);
  assert.equal(period.year, 2026);
  assert.equal(getRoutinePeriod("2028-02-29").date, "2028-02-29");
  for (const value of ["2026-02-30", "ontem", "2026-13-01", "1800-01-01"]) {
    assert.throws(() => getRoutinePeriod(value));
  }
});

test("Login preserva o destino e a data da Rotina sem aceitar origem externa", () => {
  assert.equal(getSafeAvaCallbackUrl("/ava/rotina?date=2026-09-12"), "/ava/rotina?date=2026-09-12");
  assert.equal(getSafeAvaCallbackUrl("https://example.com/ava/rotina"), "/ava");
});

test("Rotina não inventa agendamentos e distingue pausa de manutenção", () => {
  const rows = getRoutineActivities({ configured: true, paused: true, workerOnline: true });
  assert.equal(rows.find(r => r.id === "replies")?.status, "PAUSED");
  assert.equal(rows.find(r => r.id === "maintenance")?.status, "ACTIVE");
  for (const id of ["lessons", "payments", "group"]) {
    assert.equal(rows.find(r => r.id === id)?.status, "NOT_CONFIGURED");
    assert.equal(rows.find(r => r.id === id)?.nextRunAt, null);
  }
});

test("Rotina não chama um worker offline ou canal sem configuração de ativo", () => {
  assert.equal(getRoutineActivities({ configured: true, paused: false, workerOnline: false })[0].status, "BLOCKED");
  assert.equal(getRoutineActivities({ configured: false, paused: false, workerOnline: true })[0].status, "NOT_CONFIGURED");
  assert.equal(getRoutineActivities({ configured: true, paused: false, workerOnline: true })[0].status, "ACTIVE");
});

test("Mensalidade vence no dia local e respeita cadastro incompleto e pagamento", () => {
  const now = new Date("2026-09-12T23:00:00Z");
  const payment = { year: 2026, month: 9, snapshotPaymentDay: 12, snapshotAmountCents: 20000, snapshotPaymentMethod: "PIX", isPaid: false };
  assert.equal(getRoutinePaymentStatus(payment, now), "PENDING");
  assert.equal(getRoutinePaymentStatus({ ...payment, snapshotPaymentDay: 10 }, now), "OVERDUE");
  assert.equal(getRoutinePaymentStatus({ ...payment, isPaid: true }, now), "PAID");
  assert.equal(getRoutinePaymentStatus({ ...payment, snapshotAmountCents: 0 }, now), "INCOMPLETE");
  assert.equal(getRoutinePaymentStatus({ ...payment, snapshotPaymentMethod: "A_DEFINIR" }, now), "INCOMPLETE");
  assert.equal(getRoutinePaymentStatus({ ...payment, month: 2, snapshotPaymentDay: 31 }, new Date("2026-02-28T20:00:00Z")), "PENDING");
});

test("Auditoria distingue aceite de entrega e não expõe ação desconhecida", () => {
  assert.match(routineAuditLabel("GROUP_TEST_ACCEPTED"), /aceito/i);
  assert.doesNotMatch(routineAuditLabel("GROUP_TEST_ACCEPTED"), /entregue/i);
  assert.equal(routineAuditLabel("arbitrary-secret-text"), "Evento operacional");
  assert.equal(routineAuditLabel("__proto__"), "Evento operacional");
});
