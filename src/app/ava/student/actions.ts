"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { submitStudentTextHomework } from "@/lib/homework-submission-service";
import {
  saveStudentInteractiveHomeworkDraft,
  submitStudentInteractiveHomework,
} from "@/lib/interactive-homework-service";
import {
  interactiveHomeworkAnswerSchema,
  submitHomeworkSchema,
  type InteractiveHomeworkAnswerInput,
  type SubmitHomeworkInput,
} from "@/lib/validations/learning";

export type SubmitHomeworkResult = {
  errors?: Partial<Record<keyof SubmitHomeworkInput, string>>;
  message: string;
  ok: boolean;
};

export type InteractiveHomeworkResult = {
  errors?: Partial<Record<keyof InteractiveHomeworkAnswerInput, string>>;
  message: string;
  ok: boolean;
};

function fieldErrors<TInput extends Record<string, unknown>>(
  issues: { message: string; path: PropertyKey[] }[],
) {
  return issues.reduce<Partial<Record<keyof TInput, string>>>(
    (accumulator, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        accumulator[fieldName as keyof TInput] = issue.message;
      }

      return accumulator;
    },
    {},
  );
}

async function getStudentActor() {
  const session = await auth();

  if (!isRole(session?.user?.role)) {
    return null;
  }

  if (session.user.role !== "STUDENT") {
    return null;
  }

  const prisma = getPrisma();
  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  return studentProfile;
}

async function getInteractiveHomeworkForStudent(
  homeworkId: string,
  studentProfileId: string,
) {
  const prisma = getPrisma();

  return prisma.homework.findUnique({
    where: {
      id: homeworkId,
    },
    select: {
      id: true,
      fieldDetectionSource: true,
      interactiveFields: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          required: true,
          type: true,
        },
      },
      kind: true,
      lesson: {
        select: {
          studentProfileId: true,
        },
      },
      status: true,
      submissions: {
        where: {
          studentProfileId,
        },
        select: {
          id: true,
          status: true,
        },
        take: 1,
      },
    },
  });
}

function interactiveEntityLabel(homework: {
  fieldDetectionSource: string | null;
}) {
  return homework.fieldDetectionSource === "lesson-manual"
    ? "aula"
    : "homework";
}

function canStudentAccessHomework(
  homework: {
    lesson: {
      studentProfileId: string | null;
    };
  },
  studentProfileId: string,
) {
  return homework.lesson.studentProfileId === studentProfileId;
}

function isInteractiveLessonEntity(homework: {
  fieldDetectionSource: string | null;
}) {
  return homework.fieldDetectionSource === "lesson-manual";
}

export async function submitHomework(
  input: SubmitHomeworkInput,
): Promise<SubmitHomeworkResult> {
  const session = await auth();

  if (!isRole(session?.user?.role)) {
    return {
      ok: false,
      message: "Entre no AVA para enviar a homework.",
    };
  }

  if (session.user.role !== "STUDENT") {
    return {
      ok: false,
      message: "Use uma conta de aluno para enviar respostas.",
    };
  }

  const parsed = submitHomeworkSchema.safeParse(input);

  if (!parsed.success) {
    const errors = parsed.error.issues.reduce<
      Partial<Record<keyof SubmitHomeworkInput, string>>
    >((accumulator, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        accumulator[fieldName as keyof SubmitHomeworkInput] = issue.message;
      }

      return accumulator;
    }, {});

    return {
      errors,
      ok: false,
      message: "Revise sua resposta.",
    };
  }

  const result = await submitStudentTextHomework(
    session.user.id,
    parsed.data.homeworkId,
    parsed.data.answer,
  );

  if (!result.ok) {
    return result;
  }

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");

  return {
    ok: true,
    message: "Homework enviada com sucesso.",
  };
}

export async function saveInteractiveHomeworkDraft(
  input: InteractiveHomeworkAnswerInput,
): Promise<InteractiveHomeworkResult> {
  const session = await auth();

  if (session?.user?.role !== "STUDENT") {
    return {
      ok: false,
      message: "Use uma conta de aluno para salvar a atividade.",
    };
  }

  const parsed = interactiveHomeworkAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<InteractiveHomeworkAnswerInput>(parsed.error.issues),
      ok: false,
      message: "Revise suas respostas.",
    };
  }

  return saveStudentInteractiveHomeworkDraft(session.user.id, parsed.data);
}

export async function submitInteractiveHomework(
  input: InteractiveHomeworkAnswerInput,
): Promise<InteractiveHomeworkResult> {
  const session = await auth();

  if (session?.user?.role !== "STUDENT") {
    return {
      ok: false,
      message: "Use uma conta de aluno para entregar a atividade.",
    };
  }

  const parsed = interactiveHomeworkAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<InteractiveHomeworkAnswerInput>(parsed.error.issues),
      ok: false,
      message: "Revise suas respostas.",
    };
  }

  const result = await submitStudentInteractiveHomework(
    session.user.id,
    parsed.data,
  );

  if (!result.ok) {
    return result;
  }

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/admin");

  return result;
}

export async function reopenInteractiveHomeworkDraft(input: {
  homeworkId: string;
}): Promise<InteractiveHomeworkResult> {
  const studentProfile = await getStudentActor();

  if (!studentProfile) {
    return {
      ok: false,
      message: "Use uma conta de aluno para refazer a atividade.",
    };
  }

  const parsed = interactiveHomeworkAnswerSchema
    .pick({ homeworkId: true })
    .safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Homework invalida.",
    };
  }

  const prisma = getPrisma();
  const homework = await getInteractiveHomeworkForStudent(
    parsed.data.homeworkId,
    studentProfile.id,
  );
  const existingSubmission = homework?.submissions[0];
  const entityLabel = homework ? interactiveEntityLabel(homework) : "atividade";
  const isLessonEntity = homework ? isInteractiveLessonEntity(homework) : false;

  if (
    !homework ||
    homework.status !== "PUBLISHED" ||
    homework.kind !== "INTERACTIVE" ||
    !canStudentAccessHomework(homework, studentProfile.id) ||
    existingSubmission?.status !== "SUBMITTED"
  ) {
    return {
      ok: false,
      message: `Esta ${entityLabel} nao pode ser reaberta.`,
    };
  }

  const reopened = await prisma.$transaction(async (tx) => {
    await acquireTransactionAdvisoryLock(
      tx,
      `homework-submission:${homework.id}:${studentProfile.id}`,
    );

    const currentSubmission = await tx.homeworkSubmission.findUnique({
      where: {
        id: existingSubmission.id,
      },
      select: {
        status: true,
      },
    });

    if (currentSubmission?.status !== "SUBMITTED") {
      return false;
    }

    await tx.homeworkSubmission.update({
      where: {
        id: existingSubmission.id,
      },
      data: {
        status: "DRAFT",
      },
    });

    return true;
  });

  if (!reopened) {
    return {
      ok: false,
      message: `Esta ${entityLabel} nao pode ser reaberta.`,
    };
  }

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");

  return {
    ok: true,
    message: isLessonEntity
      ? "Aula reaberta para edicao."
      : "Homework reaberta para edicao.",
  };
}
