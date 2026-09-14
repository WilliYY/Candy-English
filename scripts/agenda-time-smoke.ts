import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { changeAgendaTime } from "../src/lib/agenda-time-operations";

// Clona apenas estrutura; nenhum dado real é lido ou alterado.
if (!process.argv.includes("--isolated-schema")) throw new Error("Use --isolated-schema");
const schema = `agenda_time_test_${randomUUID().replaceAll("-", "")}`;
assert.match(schema, /^agenda_time_test_[a-f\d]{32}$/);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}`, max: 6 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
const now = new Date("2026-09-14T11:00:00Z");
const actor = { id: "synthetic-admin", role: "ADMIN", isActive: true };
let checks = 0;
const pass = (label: string) => { checks++; console.log(`PASS ${label}`); };
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  assert.equal((await pool.query("SELECT current_schema() AS name")).rows[0].name, schema);
  for (const table of ["AgendaStudent", "AgendaLesson", "AgendaLog"]) {
    await pool.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  }
  const student = await prisma.agendaStudent.create({ data: { name: "Synthetic agenda student", unit: "IVATE", isActive: true, defaultTime: "08:00", weekdayMask: 2 } });
  const base = { studentId: student.id, year: 2026, month: 9, weekday: 1, time: "08:00" };
  const rows = await Promise.all([
    { id: "past", day: 13, status: "SCHEDULED" as const },
    { id: "today", day: 14, status: "SCHEDULED" as const },
    { id: "next", day: 21, status: "SCHEDULED" as const },
    { id: "attended", day: 15, status: "ATTENDED" as const },
    { id: "missed", day: 16, status: "MISSED" as const },
    { id: "makeup", day: 17, status: "MAKEUP_SCHEDULED" as const, isMakeup: true },
    { id: "inactive", day: 18, status: "SCHEDULED" as const, isActive: false },
  ].map(({ day, ...extra }) => prisma.agendaLesson.create({ data: { ...base, date: new Date(`2026-09-${day}T12:00:00Z`), ...extra } })));
  const input = { studentId: student.id, expectedUpdatedAt: student.updatedAt.toISOString(), fromDate: "2026-09-14", scope: "ROUTINE" as const, time: "09:30", confirmChange: true as const };
  const options = { store: prisma, now };
  const result = await changeAgendaTime(actor, input, options);
  assert.equal(result.count, 2);
  for (const row of rows) {
    const updated = await prisma.agendaLesson.findUniqueOrThrow({ where: { id: row.id } });
    if (["today", "next"].includes(row.id)) assert.equal(updated.time, "09:30");
    else assert.deepEqual(updated, row);
  }
  pass("rotina grava somente previstas futuras e preserva integralmente historico");
  const log = await prisma.agendaLog.findFirstOrThrow();
  assert.equal(log.createdByUserId, actor.id);
  assert.match(log.description, /08:00 → 09:30/);
  pass("auditoria guarda autor e horarios anterior e novo");
  await assert.rejects(changeAgendaTime(actor, input, options), /mudou em outra tela/);
  assert.equal(await prisma.agendaLog.count(), 1);
  pass("repeticao desatualizada nao duplica efeito ou log");
  const current = await prisma.agendaStudent.findUniqueOrThrow({ where: { id: student.id } });
  const today = await prisma.agendaLesson.findUniqueOrThrow({ where: { id: "today" } });
  await changeAgendaTime(actor, { ...input, expectedUpdatedAt: current.updatedAt.toISOString(), expectedLessonUpdatedAt: today.updatedAt.toISOString(), lessonId: today.id, scope: "LESSON", time: "10:00" }, options);
  assert.equal((await prisma.agendaStudent.findUniqueOrThrow({ where: { id: student.id } })).defaultTime, "09:30");
  assert.equal((await prisma.agendaLesson.findUniqueOrThrow({ where: { id: "next" } })).time, "09:30");
  pass("edicao individual nao muda rotina nem outras aulas");
  const before = await prisma.agendaStudent.findUniqueOrThrow({ where: { id: student.id } });
  const concurrent = await Promise.allSettled(["11:00", "12:00"].map(time => changeAgendaTime(actor, { ...input, expectedUpdatedAt: before.updatedAt.toISOString(), time }, options)));
  assert.equal(concurrent.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter(item => item.status === "rejected").length, 1);
  const pair = await prisma.agendaLesson.findMany({ where: { id: { in: ["today", "next"] } } });
  assert.equal(pair[0].time, pair[1].time);
  pass("concorrencia real salva uma rotina inteira e rejeita outra");

  // Simula falha no segundo UPDATE para provar rollback do primeiro e do log.
  await pool.query(`CREATE FUNCTION "${schema}".reject_second() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = 'next' AND NEW.time = '13:00' THEN RAISE EXCEPTION 'SYNTHETIC_ROLLBACK_TEST'; END IF; RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER reject_second BEFORE UPDATE ON "${schema}"."AgendaLesson" FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_second()`);
  const rollbackBefore = await prisma.agendaStudent.findUniqueOrThrow({ where: { id: student.id } });
  const logCount = await prisma.agendaLog.count();
  await assert.rejects(changeAgendaTime(actor, { ...input, expectedUpdatedAt: rollbackBefore.updatedAt.toISOString(), time: "13:00" }, options));
  assert.deepEqual(await prisma.agendaStudent.findUniqueOrThrow({ where: { id: student.id } }), rollbackBefore);
  const after = await prisma.agendaLesson.findMany({ where: { id: { in: ["today", "next"] } } });
  assert.deepEqual(after.map(row => row.time), pair.map(row => row.time));
  assert.equal(await prisma.agendaLog.count(), logCount);
  pass("falha intermediaria reverte todas as gravacoes");
  await assert.rejects(changeAgendaTime({ ...actor, role: "TEACHER" }, input, options), /permissão/);
  pass("professor nao pode alterar agenda");
  console.log(`${checks} verificacoes reais em schema isolado; zero dados reais alterados.`);
} finally {
  await prisma.$disconnect();
  await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
  console.log("Schema temporario removido.");
}
