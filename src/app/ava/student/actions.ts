"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
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

function normalizeInteractiveAnswers(
  answers: InteractiveHomeworkAnswerInput["answers"],
  allowedFieldIds: Set<string>,
) {
  return answers
    .filter((answer) => allowedFieldIds.has(answer.fieldId))
    .map((answer) => ({
      fieldId: answer.fieldId,
      value: answer.value,
    }));
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

  const prisma = getPrisma();
  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!studentProfile) {
    return {
      ok: false,
      message: "Perfil de aluno nao encontrado.",
    };
  }

  const homework = await prisma.homework.findUnique({
    where: {
      id: parsed.data.homeworkId,
    },
    select: {
      id: true,
      lesson: {
        select: {
          studentProfileId: true,
        },
      },
      questions: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          prompt: true,
        },
        take: 1,
      },
      status: true,
      submissions: {
        where: {
          studentProfileId: studentProfile.id,
        },
        select: {
          status: true,
        },
        take: 1,
      },
    },
  });

  if (!homework || homework.status !== "PUBLISHED") {
    return {
      ok: false,
      message: "Homework nao encontrada ou indisponivel.",
    };
  }

  if (homework.lesson.studentProfileId !== studentProfile.id) {
    return {
      ok: false,
      message: "Esta homework nao esta vinculada ao seu perfil.",
    };
  }

  const existingSubmission = homework.submissions[0];

  if (existingSubmission?.status === "REVIEWED") {
    return {
      ok: false,
      message: "Esta homework ja foi corrigida e nao pode ser reenviada.",
    };
  }

  const question = homework.questions[0];

  await prisma.homeworkSubmission.upsert({
    where: {
      homeworkId_studentProfileId: {
        homeworkId: homework.id,
        studentProfileId: studentProfile.id,
      },
    },
    create: {
      answers: [
        {
          answer: parsed.data.answer,
          prompt: question?.prompt ?? "Resposta livre",
          questionId: question?.id ?? null,
        },
      ],
      homeworkId: homework.id,
      studentProfileId: studentProfile.id,
    },
    update: {
      answers: [
        {
          answer: parsed.data.answer,
          prompt: question?.prompt ?? "Resposta livre",
          questionId: question?.id ?? null,
        },
      ],
      feedback: null,
      reviewedAt: null,
      reviewedByTeacherProfileId: null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

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
  const studentProfile = await getStudentActor();

  if (!studentProfile) {
    return {
      ok: false,
      message: "Use uma conta de aluno para salvar a homework.",
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

  const prisma = getPrisma();
  const homework = await getInteractiveHomeworkForStudent(
    parsed.data.homeworkId,
    studentProfile.id,
  );

  if (
    !homework ||
    homework.status !== "PUBLISHED" ||
    homework.kind !== "INTERACTIVE"
  ) {
    return {
      ok: false,
      message: "Homework interativa indisponivel.",
    };
  }

  if (homework.lesson.studentProfileId !== studentProfile.id) {
    return {
      ok: false,
      message: "Esta homework nao esta vinculada ao seu perfil.",
    };
  }

  const existingSubmission = homework.submissions[0];

  if (
    existingSubmission?.status === "SUBMITTED" ||
    existingSubmission?.status === "REVIEWED"
  ) {
    return {
      ok: false,
      message: "Esta homework ja foi entregue.",
    };
  }

  const allowedFieldIds = new Set(homework.interactiveFields.map((field) => field.id));
  const answers = normalizeInteractiveAnswers(parsed.data.answers, allowedFieldIds);

  await prisma.homeworkSubmission.upsert({
    where: {
      homeworkId_studentProfileId: {
        homeworkId: homework.id,
        studentProfileId: studentProfile.id,
      },
    },
    create: {
      answers,
      homeworkId: homework.id,
      status: "DRAFT",
      studentProfileId: studentProfile.id,
    },
    update: {
      answers,
      status: "DRAFT",
    },
  });

  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Rascunho salvo.",
  };
}

export async function submitInteractiveHomework(
  input: InteractiveHomeworkAnswerInput,
): Promise<InteractiveHomeworkResult> {
  const studentProfile = await getStudentActor();

  if (!studentProfile) {
    return {
      ok: false,
      message: "Use uma conta de aluno para entregar a homework.",
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

  const prisma = getPrisma();
  const homework = await getInteractiveHomeworkForStudent(
    parsed.data.homeworkId,
    studentProfile.id,
  );

  if (
    !homework ||
    homework.status !== "PUBLISHED" ||
    homework.kind !== "INTERACTIVE"
  ) {
    return {
      ok: false,
      message: "Homework interativa indisponivel.",
    };
  }

  if (homework.lesson.studentProfileId !== studentProfile.id) {
    return {
      ok: false,
      message: "Esta homework nao esta vinculada ao seu perfil.",
    };
  }

  const existingSubmission = homework.submissions[0];

  if (existingSubmission?.status === "REVIEWED") {
    return {
      ok: false,
      message: "Esta homework ja foi corrigida.",
    };
  }

  const allowedFieldIds = new Set(homework.interactiveFields.map((field) => field.id));
  const answers = normalizeInteractiveAnswers(parsed.data.answers, allowedFieldIds);
  const answerMap = new Map(answers.map((answer) => [answer.fieldId, answer.value]));
  const hasMissingRequired = homework.interactiveFields.some((field) => {
    if (!field.required) {
      return false;
    }

    const value = answerMap.get(field.id) ?? "";
    return field.type === "CHECKBOX" ? value !== "true" : !value.trim();
  });

  if (hasMissingRequired) {
    return {
      errors: { answers: "Preencha os campos obrigatorios antes de entregar." },
      ok: false,
      message: "Preencha os campos obrigatorios antes de entregar.",
    };
  }

  await prisma.homeworkSubmission.upsert({
    where: {
      homeworkId_studentProfileId: {
        homeworkId: homework.id,
        studentProfileId: studentProfile.id,
      },
    },
    create: {
      answers,
      homeworkId: homework.id,
      status: "SUBMITTED",
      studentProfileId: studentProfile.id,
    },
    update: {
      answers,
      feedback: null,
      reviewedAt: null,
      reviewedByTeacherProfileId: null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Homework entregue com sucesso.",
  };
}

export async function reopenInteractiveHomeworkDraft(
  input: { homeworkId: string },
): Promise<InteractiveHomeworkResult> {
  const studentProfile = await getStudentActor();

  if (!studentProfile) {
    return {
      ok: false,
      message: "Use uma conta de aluno para refazer a homework.",
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

  if (
    !homework ||
    homework.status !== "PUBLISHED" ||
    homework.kind !== "INTERACTIVE" ||
    homework.lesson.studentProfileId !== studentProfile.id ||
    existingSubmission?.status !== "SUBMITTED"
  ) {
    return {
      ok: false,
      message: "Esta homework nao pode ser reaberta.",
    };
  }

  await prisma.homeworkSubmission.update({
    where: {
      id: existingSubmission.id,
    },
    data: {
      status: "DRAFT",
    },
  });

  revalidatePath("/ava/student");
  revalidatePath("/ava/teacher");

  return {
    ok: true,
    message: "Homework reaberta para edicao.",
  };
}
