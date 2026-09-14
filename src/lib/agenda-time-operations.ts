import { getPrisma } from "@/lib/prisma";
import { AgendaTimeChangeError, agendaTimeChangeSchema, planAgendaTimeChange } from "@/lib/agenda-time-change";

type Actor = { id: string; role: string; isActive: boolean };
type Store = Pick<ReturnType<typeof getPrisma>, "$transaction">;

export async function changeAgendaTime(actor: Actor, input: unknown, options: { store?: Store; now?: Date } = {}) {
  if (actor.role !== "ADMIN" || !actor.isActive) {
    throw new AgendaTimeChangeError("Você não tem permissão para editar a agenda.");
  }
  const parsed = agendaTimeChangeSchema.safeParse(input);
  if (!parsed.success) throw new AgendaTimeChangeError("Revise o horário e confirme a alteração.");
  const data = parsed.data;
  return (options.store ?? getPrisma()).$transaction(async tx => {
    // Serializa a edição com a ficha de rotina existente, que atualiza esta mesma linha.
    await tx.$queryRaw`SELECT "id" FROM "AgendaStudent" WHERE "id" = ${data.studentId} FOR UPDATE`;
    const student = await tx.agendaStudent.findUnique({ where: { id: data.studentId } });
    if (!student) throw new AgendaTimeChangeError("Aluno não encontrado na agenda.");
    const lessons = await tx.agendaLesson.findMany({
      where: { studentId: student.id, year: 2026, isActive: true },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: { id: true, studentId: true, date: true, time: true, status: true, isActive: true, isMakeup: true, updatedAt: true },
    });
    const plan = planAgendaTimeChange(student, lessons, data, options.now ?? new Date());
    for (const lesson of plan.lessons) {
      const result = await tx.agendaLesson.updateMany({
        where: { id: lesson.id, updatedAt: lesson.updatedAt, isActive: true, status: lesson.status },
        data: { time: data.time },
      });
      if (result.count !== 1) {
        throw new AgendaTimeChangeError("Uma aula foi alterada durante o salvamento. Atualize a agenda e tente novamente.");
      }
    }
    if (plan.updateDefault || plan.lessons.length) {
      await tx.agendaStudent.update({
        where: { id: student.id },
        data: { ...(plan.updateDefault ? { defaultTime: data.time } : {}), updatedAt: new Date() },
      });
    }
    if (plan.lessons.length || plan.updateDefault) {
      const previous = [...new Set(plan.lessons.map(row => row.time))].join(", ") || student.defaultTime || "sem horário";
      await tx.agendaLog.create({ data: {
        action: data.scope === "LESSON" ? "UPDATE_LESSON_TIME" : "UPDATE_ROUTINE_TIME",
        createdByUserId: actor.id,
        studentId: student.id,
        lessonId: data.scope === "LESSON" ? data.lessonId : null,
        description: `Horário de ${student.name}: ${previous} → ${data.time}. ${plan.lessons.length} aula(s); ${data.scope === "LESSON" ? "somente esta aula" : `rotina a partir de ${plan.fromDate}`}. Presenças, faltas e histórico preservados.`,
      } });
    }
    return { count: plan.lessons.length };
  });
}
