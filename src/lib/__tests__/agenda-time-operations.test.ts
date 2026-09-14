import assert from "node:assert/strict";
import test from "node:test";
import { changeAgendaTime } from "@/lib/agenda-time-operations";

const version = "2026-09-14T10:00:00.000Z";
const actor = { id: "admin", role: "ADMIN", isActive: true };
const input = { studentId: "student", expectedUpdatedAt: version, fromDate: "2026-09-14", scope: "ROUTINE", time: "09:30", confirmChange: true };
const now = new Date("2026-09-14T11:00:00Z");

test("recusa professor, aluno, admin inativo e payload invalido antes de acessar banco", async () => {
  let touched = false;
  const options = { store: { $transaction: async () => { touched = true; } } as never, now };
  for (const invalidActor of [{ ...actor, role: "TEACHER" }, { ...actor, role: "STUDENT" }, { ...actor, isActive: false }]) {
    await assert.rejects(changeAgendaTime(invalidActor, input, options), /permissão/);
  }
  await assert.rejects(changeAgendaTime(actor, { ...input, time: "99:00" }, options), /Revise/);
  assert.equal(touched, false);
});

function fixture(conflict = false) {
  const calls: Array<{ name: string; input?: unknown }> = [];
  const tx = {
    $queryRaw: async (...args: unknown[]) => { calls.push({ name: "lock", input: args }); },
    agendaStudent: {
      findUnique: async () => ({ id: "student", name: "Aluno Teste", isActive: true, defaultTime: "08:00", updatedAt: new Date(version) }),
      update: async (input: unknown) => { calls.push({ name: "student", input }); },
    },
    agendaLesson: {
      findMany: async () => [{ id: "lesson", studentId: "student", date: new Date("2026-09-14T12:00:00Z"), time: "08:00", status: "SCHEDULED", isActive: true, isMakeup: false, updatedAt: new Date(version) }],
      updateMany: async (input: unknown) => { calls.push({ name: "lesson", input }); return { count: conflict ? 0 : 1 }; },
    },
    agendaLog: { create: async (input: unknown) => { calls.push({ name: "log", input }); } },
  };
  const store = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx) } as never;
  return { calls, store };
}
test("salva com lock, versao esperada e auditoria do autor sem tocar identidade ou financeiro", async () => {
  const { calls, store } = fixture();
  assert.deepEqual(await changeAgendaTime(actor, input, { store, now }), { count: 1 });
  assert.deepEqual(calls.map(call => call.name), ["lock", "lesson", "student", "log"]);
  assert.deepEqual(calls[1].input, { where: { id: "lesson", updatedAt: new Date(version), isActive: true, status: "SCHEDULED" }, data: { time: "09:30" } });
  const log = calls[3].input as { data: { createdByUserId: string; description: string } };
  assert.equal(log.data.createdByUserId, actor.id);
  assert.match(log.data.description, /08:00 → 09:30/);
});
test("conflito interrompe transacao antes de alterar rotina e registrar sucesso", async () => {
  const { calls, store } = fixture(true);
  await assert.rejects(changeAgendaTime(actor, input, { store, now }), /durante o salvamento/);
  assert.deepEqual(calls.map(call => call.name), ["lock", "lesson"]);
});
