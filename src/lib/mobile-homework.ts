import {
  canStudentAccessHomework,
  readTextHomeworkAnswer,
} from "@/lib/homework-submission-service";
import { getPrisma } from "@/lib/prisma";

type HomeworkResult<T = undefined> = {
  data?: T;
  message: string;
  ok: boolean;
};

async function getStudentProfileId(userId: string) {
  const profile = await getPrisma().studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function getMobileStudentHomework(
  userId: string,
  homeworkId: string,
): Promise<HomeworkResult<Record<string, unknown>>> {
  const studentProfileId = await getStudentProfileId(userId);

  if (!studentProfileId) {
    return { message: "Perfil de aluno não encontrado.", ok: false };
  }

  const homework = await getPrisma().homework.findUnique({
    where: { id: homeworkId },
    select: {
      dueDate: true,
      id: true,
      instructions: true,
      interactiveFields: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          required: true,
          type: true,
        },
      },
      kind: true,
      lesson: { select: { studentProfileId: true, title: true } },
      questions: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, prompt: true },
      },
      status: true,
      studentAssignments: {
        where: { studentProfileId },
        select: { studentProfileId: true },
        take: 1,
      },
      submissions: {
        where: { studentProfileId },
        take: 1,
        select: {
          answers: true,
          feedback: true,
          reviewedAt: true,
          status: true,
        },
      },
      title: true,
    },
  });

  if (
    !homework ||
    homework.status !== "PUBLISHED" ||
    !canStudentAccessHomework(homework, studentProfileId)
  ) {
    return {
      message: "Homework não encontrada ou indisponível.",
      ok: false,
    };
  }

  const submission = homework.submissions[0];

  return {
    data: {
      answer:
        homework.kind === "TEXT" && submission
          ? readTextHomeworkAnswer(submission.answers)
          : "",
      canSubmit: submission?.status !== "REVIEWED",
      dueDate: homework.dueDate?.toISOString() ?? null,
      feedback: submission?.feedback ?? null,
      id: homework.id,
      instructions: homework.instructions,
      interactiveFields: homework.interactiveFields,
      kind: homework.kind,
      lessonTitle: homework.lesson.title,
      questions: homework.questions,
      reviewedAt: submission?.reviewedAt?.toISOString() ?? null,
      status: homework.status,
      submissionStatus: submission?.status ?? null,
      title: homework.title,
    },
    message: "Homework carregada.",
    ok: true,
  };
}
