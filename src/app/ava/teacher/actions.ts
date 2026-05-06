"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  createHomeworkSchema,
  createLessonSchema,
  reviewSubmissionSchema,
  type CreateHomeworkInput,
  type CreateLessonInput,
  type ReviewSubmissionInput,
} from "@/lib/validations/learning";

type ActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
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

async function getTeacherActor() {
  const session = await auth();

  if (!isRole(session?.user?.role)) {
    return null;
  }

  if (session.user.role === "ADMIN") {
    return {
      isAdmin: true,
      role: session.user.role,
      teacherProfileId: null,
      userId: session.user.id,
    };
  }

  if (session.user.role !== "TEACHER") {
    return null;
  }

  const prisma = getPrisma();
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!teacherProfile) {
    return null;
  }

  return {
    isAdmin: false,
    role: session.user.role,
    teacherProfileId: teacherProfile.id,
    userId: session.user.id,
  };
}

export async function createLesson(
  input: CreateLessonInput,
): Promise<ActionResult<CreateLessonInput>> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar aulas.",
    };
  }

  const parsed = createLessonSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CreateLessonInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da aula.",
    };
  }

  const prisma = getPrisma();
  const data = parsed.data;
  const teacherProfileId = actor.isAdmin
    ? data.teacherProfileId
    : actor.teacherProfileId;

  if (!teacherProfileId || teacherProfileId !== data.teacherProfileId) {
    return {
      ok: false,
      message: "Teacher invalida para esta aula.",
    };
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
    select: { id: true },
  });

  if (!teacher) {
    return {
      errors: { teacherProfileId: "Teacher nao encontrada." },
      ok: false,
      message: "Teacher nao encontrada.",
    };
  }

  if (data.studentProfileId) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: data.studentProfileId },
      select: { id: true },
    });

    if (!student) {
      return {
        errors: { studentProfileId: "Aluno nao encontrado." },
        ok: false,
        message: "Aluno nao encontrado.",
      };
    }

    if (!actor.isAdmin) {
      const assignment = await prisma.studentTeacherAssignment.findUnique({
        where: {
          teacherProfileId_studentProfileId: {
            studentProfileId: data.studentProfileId,
            teacherProfileId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!assignment) {
        return {
          errors: {
            studentProfileId: "Aluno nao esta vinculado a sua area teacher.",
          },
          ok: false,
          message: "Voce so pode criar aulas para alunos vinculados a voce.",
        };
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.create({
      data: {
        description: data.description,
        scheduledAt: data.scheduledAt,
        studentProfileId: data.studentProfileId,
        teacherProfileId,
        title: data.title,
      },
    });

    if (data.studentProfileId && actor.isAdmin) {
      await tx.studentTeacherAssignment.upsert({
        where: {
          teacherProfileId_studentProfileId: {
            studentProfileId: data.studentProfileId,
            teacherProfileId,
          },
        },
        create: {
          studentProfileId: data.studentProfileId,
          teacherProfileId,
        },
        update: {},
      });
    }

    if (data.materialTitle || data.materialContent || data.materialUrl) {
      await tx.lessonMaterial.create({
        data: {
          content: data.materialContent,
          lessonId: lesson.id,
          title: data.materialTitle ?? "Material da aula",
          type: data.materialUrl ? "LINK" : "TEXT",
          url: data.materialUrl,
        },
      });
    }

    if (data.vocabularyTerm && data.vocabularyTranslation) {
      await tx.vocabularyItem.create({
        data: {
          example: data.vocabularyExample,
          lessonId: lesson.id,
          term: data.vocabularyTerm,
          translation: data.vocabularyTranslation,
        },
      });
    }
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Aula criada com sucesso.",
  };
}

export async function createHomework(
  input: CreateHomeworkInput,
): Promise<ActionResult<CreateHomeworkInput>> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar homeworks.",
    };
  }

  const parsed = createHomeworkSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CreateHomeworkInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da homework.",
    };
  }

  const prisma = getPrisma();
  const data = parsed.data;
  const lesson = await prisma.lesson.findUnique({
    where: { id: data.lessonId },
    select: {
      id: true,
      teacherProfileId: true,
    },
  });

  if (!lesson) {
    return {
      errors: { lessonId: "Aula nao encontrada." },
      ok: false,
      message: "Aula nao encontrada.",
    };
  }

  if (!actor.isAdmin && lesson.teacherProfileId !== actor.teacherProfileId) {
    return {
      ok: false,
      message: "Voce so pode criar homework para suas aulas.",
    };
  }

  await prisma.homework.create({
    data: {
      dueDate: data.dueDate,
      instructions: data.instructions,
      lessonId: lesson.id,
      teacherProfileId: lesson.teacherProfileId,
      title: data.title,
      questions: {
        create: {
          expectedAnswer: data.expectedAnswer,
          prompt: data.questionPrompt,
        },
      },
    },
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Homework criada com sucesso.",
  };
}

export async function reviewHomeworkSubmission(
  input: ReviewSubmissionInput,
): Promise<ActionResult<ReviewSubmissionInput>> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para corrigir homeworks.",
    };
  }

  const parsed = reviewSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<ReviewSubmissionInput>(parsed.error.issues),
      ok: false,
      message: "Revise o feedback.",
    };
  }

  const prisma = getPrisma();
  const submission = await prisma.homeworkSubmission.findUnique({
    where: { id: parsed.data.submissionId },
    select: {
      homework: {
        select: {
          teacherProfileId: true,
        },
      },
      id: true,
    },
  });

  if (!submission) {
    return {
      ok: false,
      message: "Resposta nao encontrada.",
    };
  }

  if (
    !actor.isAdmin &&
    submission.homework.teacherProfileId !== actor.teacherProfileId
  ) {
    return {
      ok: false,
      message: "Voce so pode corrigir respostas das suas aulas.",
    };
  }

  await prisma.homeworkSubmission.update({
    where: { id: submission.id },
    data: {
      feedback: parsed.data.feedback,
      reviewedAt: new Date(),
      reviewedByTeacherProfileId: actor.isAdmin
        ? submission.homework.teacherProfileId
        : actor.teacherProfileId,
      status: "REVIEWED",
    },
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Feedback enviado com sucesso.",
  };
}
