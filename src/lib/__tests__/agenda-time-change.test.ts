import assert from "node:assert/strict";
import { test } from "node:test";
import { agendaTimeChangeSchema, planAgendaTimeChange } from "@/lib/agenda-time-change";

const version = "2026-09-14T10:00:00.000Z";
const student = { id: "student", isActive: true, defaultTime: "08:00", updatedAt: new Date(version) };
const lesson = (id: string, day: number, extra = {}) => ({
  id, studentId: "student", date: new Date(`2026-09-${day}T12:00:00Z`),
  time: "08:00", status: "SCHEDULED", isActive: true, isMakeup: false,
  updatedAt: new Date(version), ...extra,
});
const input = {
  studentId: "student", expectedUpdatedAt: version, fromDate: "2026-09-14",
  scope: "ROUTINE" as const, time: "09:30", confirmChange: true as const,
};
const now = new Date("2026-09-14T11:00:00Z");

test("rotina altera somente futuras previstas; preserva presencas, faltas, reposicoes e inativas", () => {
  const rows = [lesson("past", 13), lesson("today", 14), lesson("future", 21),
    lesson("attended", 15, { status: "ATTENDED" }), lesson("missed", 16, { status: "MISSED" }),
    lesson("makeup", 17, { isMakeup: true, status: "MAKEUP_SCHEDULED" }),
    lesson("inactive", 18, { isActive: false })];
  const plan = planAgendaTimeChange(student, rows, input, now);
  assert.deepEqual(plan.lessons.map(row => row.id), ["today", "future"]);
  assert.equal(plan.updateDefault, true);
  assert.equal(rows[1].time, "08:00");
});

test("somente esta aula nao muda rotina nem outras ocorrencias", () => {
  const plan = planAgendaTimeChange(student, [lesson("one", 14), lesson("two", 21)], {
    ...input, scope: "LESSON", lessonId: "one", expectedLessonUpdatedAt: version,
  }, now);
  assert.deepEqual(plan.lessons.map(row => row.id), ["one"]);
  assert.equal(plan.updateDefault, false);
});

test("reposicao pode mudar so seu horario, sem mudar aula original", () => {
  const plan = planAgendaTimeChange(student, [lesson("makeup", 14, { isMakeup: true, status: "MAKEUP_SCHEDULED" })], {
    ...input, scope: "LESSON", lessonId: "makeup", expectedLessonUpdatedAt: version,
  }, now);
  assert.equal(plan.lessons.length, 1);
});

test("recusa passado, presenca registrada, aluno inativo e versao desatualizada", () => {
  for (const row of [lesson("one", 13), lesson("one", 14, { status: "ATTENDED" })]) {
    assert.throws(() => planAgendaTimeChange(student, [row], { ...input, scope: "LESSON", lessonId: "one", expectedLessonUpdatedAt: version }, now));
  }
  assert.throws(() => planAgendaTimeChange({ ...student, isActive: false }, [lesson("one", 14)], input, now));
  assert.throws(() => planAgendaTimeChange(student, [lesson("one", 14)], { ...input, expectedUpdatedAt: "2026-09-13T10:00:00.000Z" }, now));
});

test("recusa horario duplicado do mesmo aluno; nada e alterado parcialmente", () => {
  assert.throws(() => planAgendaTimeChange(student, [lesson("one", 14), lesson("two", 14, { time: "09:30", isMakeup: true })], input, now), /horário/);
});

test("usa hoje em Sao Paulo e respeita inicio futuro e limite de 2026", () => {
  const plan = planAgendaTimeChange(student, [lesson("one", 14), lesson("two", 21)], { ...input, fromDate: "2026-09-20" }, now);
  assert.deepEqual(plan.lessons.map(row => row.id), ["two"]);
  assert.throws(() => planAgendaTimeChange(student, [lesson("one", 14)], input, new Date("2027-01-01T12:00:00Z")));
});

test("validacao rejeita horario invalido, dados extras e falta de confirmacao ou versao", () => {
  assert.equal(agendaTimeChangeSchema.safeParse(input).success, true);
  for (const invalid of [{ ...input, time: "25:00" }, { ...input, confirmChange: false }, { ...input, expectedUpdatedAt: "" }, { ...input, role: "ADMIN" }, { ...input, scope: "LESSON" }]) {
    assert.equal(agendaTimeChangeSchema.safeParse(invalid).success, false);
  }
});
