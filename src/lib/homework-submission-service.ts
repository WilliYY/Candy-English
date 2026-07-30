import { Prisma } from "@/generated/prisma/client";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";

type HomeworkSubmissionResult = {
  data?: { submittedAt: string };
  message: string;
  ok: boolean;
};

export function readTextHomeworkAnswer(value: Prisma.JsonValue): string {
  if (!Array.isArray(value)) {
    return "";
  }

  const first = value[0];

  if (
    typeof first === "object" &&
    first !== null &&
    "answer" in first &&
    typeof first.answer === "string"
  ) {
    return first.answer;
  }

  return "";
}

export function canStudentAccessHomework(
  homework: {
    lesson: { studentProfileId: string | null };
    studentAssignments: { studentProfileId: string }[];
  },
  studentProfileId: string,
) {
  return (
    homework.lesson.studentProfileId === studentProfileId ||
    homework.studentAssignments.some(
      (assignment) => assignment.studentProfileId === studentProfileId,
    )
  );
}

export async function submitStudentTextHomework(
  userId: string,
  homeworkId: string,
  answer: string,
): Promise<HomeworkSubmissionResult> {
  const prisma = getPrisma();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return { message: "Perfil de aluno não encontrado.", ok: false };
  }

  const studentProfileId = profile.id;
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: {
      id: true,
      kind: true,
      lesson: { select: { studentProfileId: true } },
      questions: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, prompt: true },
        take: 1,
      },
      status: true,
      studentAssignments: {
        where: { studentProfileId },
        select: { studentProfileId: true },
        take: 1,
      },
    },
  });

  if (
    !homework ||
    homework.kind !== "TEXT" ||
    homework.status !== "PUBLISHED" ||
    !canStudentAccessHomework(homework, studentProfileId)
  ) {
    return {
      message: "Homework não encontrada ou indisponível.",
      ok: false,
    };
  }

  const requestedSubmittedAt = new Date();
  const question = homework.questions[0];
  const submittedAt = await prisma.$transaction(async (tx) => {
    await acquireTransactionAdvisoryLock(
      tx,
      `homework-submission:${homework.id}:${studentProfileId}`,
    );
    const current = await tx.homeworkSubmission.findUnique({
      where: {
        homeworkId_studentProfileId: {
          homeworkId: homework.id,
          studentProfileId,
        },
      },
      select: {
        answers: true,
        status: true,
        submittedAt: true,
      },
    });

    if (current?.status === "REVIEWED") {
      return null;
    }

    if (
      current?.status === "SUBMITTED" &&
      readTextHomeworkAnswer(current.answers) === answer
    ) {
      return current.submittedAt;
    }

    const answers = [
      {
        answer,
        prompt: question?.prompt ?? "Resposta livre",
        questionId: question?.id ?? null,
      },
    ];

    await tx.homeworkSubmission.upsert({
      where: {
        homeworkId_studentProfileId: {
          homeworkId: homework.id,
          studentProfileId,
        },
      },
      create: {
        answers,
        homeworkId: homework.id,
        status: "SUBMITTED",
        studentProfileId,
        submittedAt: requestedSubmittedAt,
      },
      update: {
        answers,
        feedback: null,
        reviewedAt: null,
        reviewedByTeacherProfileId: null,
        status: "SUBMITTED",
        submittedAt: requestedSubmittedAt,
        teacherAnnotations: Prisma.DbNull,
      },
    });

    return requestedSubmittedAt;
  });

  if (!submittedAt) {
    return {
      message: "Esta homework já foi corrigida e não pode ser reenviada.",
      ok: false,
    };
  }

  return {
    data: { submittedAt: submittedAt.toISOString() },
    message: "Homework enviada com sucesso.",
    ok: true,
  };
}
