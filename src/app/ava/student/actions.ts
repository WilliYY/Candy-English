"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  submitHomeworkSchema,
  type SubmitHomeworkInput,
} from "@/lib/validations/learning";

export type SubmitHomeworkResult = {
  errors?: Partial<Record<keyof SubmitHomeworkInput, string>>;
  message: string;
  ok: boolean;
};

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
