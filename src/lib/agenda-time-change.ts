import { z } from "zod";

export const agendaTimeChangeSchema = z.object({
  studentId: z.string().trim().min(1).max(200),
  expectedUpdatedAt: z.string().datetime(),
  lessonId: z.string().trim().min(1).max(200).optional(),
  expectedLessonUpdatedAt: z.string().datetime().optional(),
  fromDate: z.string().date().startsWith("2026-"),
  scope: z.enum(["LESSON", "ROUTINE"]),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  confirmChange: z.literal(true),
}).strict().superRefine((value, ctx) => {
  if (value.scope === "LESSON" && (!value.lessonId || !value.expectedLessonUpdatedAt)) {
    ctx.addIssue({ code: "custom", path: ["lessonId"], message: "Atualize a aula antes de editar." });
  }
});

export type AgendaTimeChangeInput = z.infer<typeof agendaTimeChangeSchema>;
export type AgendaTimeLesson = {
  id: string; studentId: string; date: Date; time: string; status: string;
  isActive: boolean; isMakeup: boolean; updatedAt: Date;
};
type Student = { id: string; isActive: boolean; defaultTime: string | null; updatedAt: Date };

export class AgendaTimeChangeError extends Error {}

export function agendaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

export function planAgendaTimeChange<T extends AgendaTimeLesson>(student: Student, allLessons: T[], input: AgendaTimeChangeInput, now: Date) {
  if (!student.isActive || student.id !== input.studentId) {
    throw new AgendaTimeChangeError("Aluno inativo ou não encontrado na agenda.");
  }
  if (student.updatedAt.toISOString() !== input.expectedUpdatedAt) {
    throw new AgendaTimeChangeError("A rotina mudou em outra tela. Atualize a agenda e tente novamente.");
  }
  const today = agendaDateKey(now);
  const fromDate = input.fromDate > today ? input.fromDate : today;
  const active = allLessons.filter(row => row.isActive && row.studentId === student.id);
  const canChange = (row: AgendaTimeLesson) => {
    const day = agendaDateKey(row.date);
    return day.startsWith("2026-") && day >= fromDate && ["SCHEDULED", "MAKEUP_SCHEDULED"].includes(row.status);
  };
  const targets = input.scope === "LESSON"
    ? active.filter(row => row.id === input.lessonId)
    : active.filter(row => !row.isMakeup && row.status === "SCHEDULED" && canChange(row));

  if (input.scope === "LESSON" && (targets.length !== 1 || !canChange(targets[0]))) {
    throw new AgendaTimeChangeError("Só é possível mudar aulas previstas de hoje em diante, sem presença ou falta registrada.");
  }
  if (input.scope === "LESSON" && targets[0].updatedAt.toISOString() !== input.expectedLessonUpdatedAt) {
    throw new AgendaTimeChangeError("Esta aula mudou em outra tela. Atualize a agenda e tente novamente.");
  }
  if (!targets.length) throw new AgendaTimeChangeError("Não há aulas previstas para alterar neste período.");

  const targetIds = new Set(targets.map(row => row.id));
  const occupied = new Set(active.filter(row => !targetIds.has(row.id)).map(row => `${agendaDateKey(row.date)}|${row.time}`));
  for (const row of targets) {
    const key = `${agendaDateKey(row.date)}|${input.time}`;
    if (occupied.has(key)) throw new AgendaTimeChangeError("O aluno já tem outra aula neste dia e horário. Revise a agenda.");
    occupied.add(key);
  }
  return {
    fromDate,
    lessons: targets.filter(row => row.time !== input.time),
    updateDefault: input.scope === "ROUTINE" && student.defaultTime !== input.time,
  };
}
