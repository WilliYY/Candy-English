import { Prisma } from "@/generated/prisma/client";
import { canSubmitInteractiveHomework } from "@/lib/homework-submission-state";
import { canStudentAccessHomework } from "@/lib/homework-submission-service";
import {
  hasInteractiveHomeworkDrawingContent,
  normalizeTinyTextAnswer,
} from "@/lib/interactive-homework-fields";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import type { InteractiveHomeworkAnswerInput } from "@/lib/validations/learning";

type InteractiveHomeworkResult = {
  data?: {
    status: "DRAFT" | "SUBMITTED";
    submittedAt?: string;
  };
  errors?: { answers?: string };
  message: string;
  ok: boolean;
};

type InteractiveAnswer = {
  fieldId: string;
  value: string;
};

type InteractiveHomeworkContext = NonNullable<
  Awaited<ReturnType<typeof getInteractiveHomeworkContext>>
>;

export function readInteractiveAnswers(
  value: Prisma.JsonValue,
): InteractiveAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((answer) => {
    if (
      typeof answer === "object" &&
      answer !== null &&
      "fieldId" in answer &&
      typeof answer.fieldId === "string" &&
      "value" in answer &&
      typeof answer.value === "string"
    ) {
      return [{ fieldId: answer.fieldId, value: answer.value }];
    }

    return [];
  });
}

function entityLabel(homework: { fieldDetectionSource: string | null }) {
  return homework.fieldDetectionSource === "lesson-manual"
    ? "aula"
    : "homework";
}

function normalizeAnswers(
  input: InteractiveHomeworkAnswerInput["answers"],
  homework: InteractiveHomeworkContext["homework"],
) {
  const inputByField = new Map(
    input.map((answer) => [answer.fieldId, answer.value]),
  );

  return homework.interactiveFields.flatMap((field) => {
    if (field.type === "LISTENING") {
      return [];
    }

    const value = inputByField.get(field.id) ?? "";

    return [
      {
        fieldId: field.id,
        value:
          field.type === "TINY_TEXT"
            ? normalizeTinyTextAnswer(value)
            : value,
      },
    ];
  });
}

function answersAreEqual(
  current: Prisma.JsonValue,
  next: InteractiveAnswer[],
) {
  return JSON.stringify(readInteractiveAnswers(current)) === JSON.stringify(next);
}

async function getInteractiveHomeworkContext(
  userId: string,
  homeworkId: string,
) {
  const prisma = getPrisma();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return null;
  }

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: {
      fieldDetectionSource: true,
      id: true,
      interactiveFields: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          required: true,
          type: true,
        },
      },
      kind: true,
      lesson: { select: { studentProfileId: true } },
      status: true,
      studentAssignments: {
        where: { studentProfileId: profile.id },
        select: { studentProfileId: true },
        take: 1,
      },
      submissions: {
        where: { studentProfileId: profile.id },
        select: {
          answers: true,
          status: true,
          submittedAt: true,
        },
        take: 1,
      },
    },
  });

  if (
    !homework ||
    homework.kind !== "INTERACTIVE" ||
    homework.status !== "PUBLISHED" ||
    !canStudentAccessHomework(homework, profile.id)
  ) {
    return null;
  }

  return { homework, studentProfileId: profile.id };
}

function unavailable(): InteractiveHomeworkResult {
  return {
    message: "Atividade interativa indisponível.",
    ok: false,
  };
}

export async function saveStudentInteractiveHomeworkDraft(
  userId: string,
  input: InteractiveHomeworkAnswerInput,
): Promise<InteractiveHomeworkResult> {
  const context = await getInteractiveHomeworkContext(
    userId,
    input.homeworkId,
  );

  if (!context) {
    return unavailable();
  }

  const { homework, studentProfileId } = context;
  const label = entityLabel(homework);
  const existing = homework.submissions[0];

  if (!canSubmitInteractiveHomework(existing?.status)) {
    return {
      message:
        existing?.status === "REVIEWED"
          ? `Esta ${label} já foi corrigida.`
          : `Esta ${label} já foi entregue.`,
      ok: false,
    };
  }

  const answers = normalizeAnswers(input.answers, homework);
  const saved = await getPrisma().$transaction(async (tx) => {
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
      select: { status: true },
    });

    if (!canSubmitInteractiveHomework(current?.status)) {
      return false;
    }

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
        status: "DRAFT",
        studentProfileId,
      },
      update: {
        answers,
        status: "DRAFT",
      },
    });

    return true;
  });

  if (!saved) {
    return {
      message: `Esta ${label} já foi entregue ou corrigida.`,
      ok: false,
    };
  }

  return {
    data: { status: "DRAFT" },
    message: "Rascunho salvo.",
    ok: true,
  };
}

export async function submitStudentInteractiveHomework(
  userId: string,
  input: InteractiveHomeworkAnswerInput,
): Promise<InteractiveHomeworkResult> {
  const context = await getInteractiveHomeworkContext(
    userId,
    input.homeworkId,
  );

  if (!context) {
    return unavailable();
  }

  const { homework, studentProfileId } = context;
  const label = entityLabel(homework);
  const existing = homework.submissions[0];
  const answers = normalizeAnswers(input.answers, homework);

  if (!canSubmitInteractiveHomework(existing?.status)) {
    if (
      existing?.status === "SUBMITTED" &&
      answersAreEqual(existing.answers, answers)
    ) {
      return {
        data: {
          status: "SUBMITTED",
          submittedAt: existing.submittedAt.toISOString(),
        },
        message:
          label === "aula"
            ? "Aula concluída com sucesso."
            : "Homework entregue com sucesso.",
        ok: true,
      };
    }

    return {
      message:
        existing?.status === "REVIEWED"
          ? `Esta ${label} já foi corrigida.`
          : `Esta ${label} já foi entregue.`,
      ok: false,
    };
  }

  const answerMap = new Map(
    answers.map((answer) => [answer.fieldId, answer.value]),
  );
  const hasMissingRequired = homework.interactiveFields.some((field) => {
    if (!field.required || field.type === "LISTENING") {
      return false;
    }

    const value = answerMap.get(field.id) ?? "";

    if (field.type === "CHECKBOX") {
      return value !== "true";
    }

    if (field.type === "DRAWING") {
      return !hasInteractiveHomeworkDrawingContent(value);
    }

    return !value.trim();
  });

  if (hasMissingRequired) {
    const message =
      label === "aula"
        ? "Preencha os campos obrigatórios antes de concluir."
        : "Preencha os campos obrigatórios antes de entregar.";

    return {
      errors: { answers: message },
      message,
      ok: false,
    };
  }

  const requestedSubmittedAt = new Date();
  const transactionResult = await getPrisma().$transaction(async (tx) => {
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

    if (!canSubmitInteractiveHomework(current?.status)) {
      if (
        current?.status === "SUBMITTED" &&
        answersAreEqual(current.answers, answers)
      ) {
        return { submittedAt: current.submittedAt };
      }

      return null;
    }

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

    return { submittedAt: requestedSubmittedAt };
  });

  if (!transactionResult) {
    return {
      message: `Esta ${label} já foi entregue ou corrigida.`,
      ok: false,
    };
  }

  return {
    data: {
      status: "SUBMITTED",
      submittedAt: transactionResult.submittedAt.toISOString(),
    },
    message:
      label === "aula"
        ? "Aula concluída com sucesso."
        : "Homework entregue com sucesso.",
    ok: true,
  };
}
