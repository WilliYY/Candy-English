"use server";

import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath, saveHomeworkAsset } from "@/lib/storage";
import {
  createInteractiveHomeworkSchema,
  createInteractiveLessonSchema,
  createLessonSchema,
  deleteInteractiveHomeworkSchema,
  homeworkSubmissionIdSchema,
  saveInteractiveHomeworkFieldsSchema,
  reviewSubmissionSchema,
  type CreateInteractiveHomeworkInput,
  type CreateInteractiveLessonInput,
  type CreateLessonInput,
  type DeleteInteractiveHomeworkInput,
  type HomeworkSubmissionIdInput,
  type ReviewSubmissionInput,
  type SaveInteractiveHomeworkFieldsInput,
} from "@/lib/validations/learning";

type ActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

type InteractiveAssetFormErrors = Partial<
  Record<
    keyof CreateInteractiveHomeworkInput | keyof CreateInteractiveLessonInput | "asset",
    string
  >
>;

type FormActionResult = {
  errors?: InteractiveAssetFormErrors;
  homeworkId?: string;
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

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function withOptimizationMessage(baseMessage: string, optimizationMessage: string | null) {
  return optimizationMessage ? `${baseMessage} ${optimizationMessage}` : baseMessage;
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

export async function createInteractiveHomework(
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar homeworks.",
    };
  }

  const parsed = createInteractiveHomeworkSchema.safeParse({
    dueDate: formText(formData, "dueDate"),
    instructions: formText(formData, "instructions"),
    studentProfileId: formText(formData, "studentProfileId"),
    teacherProfileId: formText(formData, "teacherProfileId"),
    title: formText(formData, "title"),
  });

  if (!parsed.success) {
    return {
      errors: fieldErrors<CreateInteractiveHomeworkInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da homework interativa.",
    };
  }

  const asset = formData.get("asset");

  if (!(asset instanceof File)) {
    return {
      errors: { asset: "Envie o arquivo exportado do Canva." },
      ok: false,
      message: "Envie o arquivo da homework.",
    };
  }

  const prisma = getPrisma();
  const data = parsed.data;
  const teacherProfileId = actor.isAdmin
    ? data.teacherProfileId
    : actor.teacherProfileId;

  if (!teacherProfileId) {
    return {
      errors: { teacherProfileId: "Selecione uma teacher." },
      ok: false,
      message: "Selecione uma teacher para criar a homework.",
    };
  }

  const [teacher, student] = await Promise.all([
    prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { id: true },
    }),
    prisma.studentProfile.findUnique({
      where: { id: data.studentProfileId },
      select: { id: true },
    }),
  ]);

  if (!teacher) {
    return {
      errors: { teacherProfileId: "Teacher nao encontrada." },
      ok: false,
      message: "Teacher nao encontrada.",
    };
  }

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
          studentProfileId: student.id,
          teacherProfileId,
        },
      },
      select: { id: true },
    });

    if (!assignment) {
      return {
        errors: {
          studentProfileId: "Aluno nao esta vinculado a sua area teacher.",
        },
        ok: false,
        message: "Voce so pode criar homework para alunos vinculados a voce.",
      };
    }
  }

  let savedAsset: Awaited<ReturnType<typeof saveHomeworkAsset>>;

  try {
    savedAsset = await saveHomeworkAsset(asset);
  } catch (error) {
    return {
      errors: {
        asset: error instanceof Error ? error.message : "Arquivo invalido.",
      },
      ok: false,
      message: "Nao foi possivel salvar o arquivo da homework.",
    };
  }

  const homework = await prisma.$transaction(async (tx) => {
    if (actor.isAdmin) {
      await tx.studentTeacherAssignment.upsert({
        where: {
          teacherProfileId_studentProfileId: {
            studentProfileId: student.id,
            teacherProfileId,
          },
        },
        create: {
          studentProfileId: student.id,
          teacherProfileId,
        },
        update: {},
      });
    }

    const lesson = await tx.lesson.create({
      data: {
        description:
          data.instructions ??
          "Aula criada automaticamente para homework interativo.",
        studentProfileId: student.id,
        teacherProfileId,
        title: `Homework - ${data.title}`,
      },
      select: { id: true },
    });

    return tx.homework.create({
      data: {
        assetFileName: savedAsset.originalName,
        assetMimeType: savedAsset.mimeType,
        assetPageCount: savedAsset.pageCount,
        assetSizeBytes: savedAsset.sizeBytes,
        assetStoragePath: savedAsset.relativePath,
        dueDate: data.dueDate,
        fieldDetectionSource: "manual",
        instructions: data.instructions,
        kind: "INTERACTIVE",
        lessonId: lesson.id,
        teacherProfileId,
        title: data.title,
        questions: {
          create: {
            prompt: "Complete a atividade interativa no arquivo anexado.",
          },
        },
      },
      select: { id: true },
    });
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    homeworkId: homework.id,
    ok: true,
    message: withOptimizationMessage(
      "Homework interativa criada. Desenhe as areas no PDF e salve.",
      savedAsset.optimizationMessage,
    ),
  };
}

export async function createInteractiveLesson(
  formData: FormData,
): Promise<FormActionResult> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar aulas.",
    };
  }

  const parsed = createInteractiveLessonSchema.safeParse({
    instructions: formText(formData, "instructions"),
    scheduledAt: formText(formData, "scheduledAt"),
    studentProfileId: formText(formData, "studentProfileId"),
    teacherProfileId: formText(formData, "teacherProfileId"),
    title: formText(formData, "title"),
  });

  if (!parsed.success) {
    return {
      errors: fieldErrors<CreateInteractiveLessonInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da aula interativa.",
    };
  }

  const asset = formData.get("asset");

  if (!(asset instanceof File)) {
    return {
      errors: { asset: "Envie o arquivo exportado do Canva." },
      ok: false,
      message: "Envie o arquivo da aula.",
    };
  }

  const prisma = getPrisma();
  const data = parsed.data;
  const teacherProfileId = actor.isAdmin
    ? data.teacherProfileId
    : actor.teacherProfileId;

  if (!teacherProfileId) {
    return {
      errors: { teacherProfileId: "Selecione uma teacher." },
      ok: false,
      message: "Selecione uma teacher para criar a aula.",
    };
  }

  const [teacher, student] = await Promise.all([
    prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { id: true },
    }),
    prisma.studentProfile.findUnique({
      where: { id: data.studentProfileId },
      select: { id: true },
    }),
  ]);

  if (!teacher) {
    return {
      errors: { teacherProfileId: "Teacher nao encontrada." },
      ok: false,
      message: "Teacher nao encontrada.",
    };
  }

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
          studentProfileId: student.id,
          teacherProfileId,
        },
      },
      select: { id: true },
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

  let savedAsset: Awaited<ReturnType<typeof saveHomeworkAsset>>;

  try {
    savedAsset = await saveHomeworkAsset(asset);
  } catch (error) {
    return {
      errors: {
        asset: error instanceof Error ? error.message : "Arquivo invalido.",
      },
      ok: false,
      message: "Nao foi possivel salvar o arquivo da aula.",
    };
  }

  const homework = await prisma.$transaction(async (tx) => {
    if (actor.isAdmin) {
      await tx.studentTeacherAssignment.upsert({
        where: {
          teacherProfileId_studentProfileId: {
            studentProfileId: student.id,
            teacherProfileId,
          },
        },
        create: {
          studentProfileId: student.id,
          teacherProfileId,
        },
        update: {},
      });
    }

    const lesson = await tx.lesson.create({
      data: {
        description: data.instructions,
        scheduledAt: data.scheduledAt,
        studentProfileId: student.id,
        teacherProfileId,
        title: data.title,
      },
      select: { id: true },
    });

    return tx.homework.create({
      data: {
        assetFileName: savedAsset.originalName,
        assetMimeType: savedAsset.mimeType,
        assetPageCount: savedAsset.pageCount,
        assetSizeBytes: savedAsset.sizeBytes,
        assetStoragePath: savedAsset.relativePath,
        fieldDetectionSource: "lesson-manual",
        instructions: data.instructions,
        kind: "INTERACTIVE",
        lessonId: lesson.id,
        teacherProfileId,
        title: data.title,
        questions: {
          create: {
            prompt: "Complete a atividade interativa da aula.",
          },
        },
      },
      select: { id: true },
    });
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    homeworkId: homework.id,
    ok: true,
    message: withOptimizationMessage(
      "Aula interativa criada. Desenhe as areas no PDF e salve.",
      savedAsset.optimizationMessage,
    ),
  };
}

export async function saveInteractiveHomeworkFields(
  input: SaveInteractiveHomeworkFieldsInput,
): Promise<ActionResult<SaveInteractiveHomeworkFieldsInput>> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar homeworks.",
    };
  }

  const parsed = saveInteractiveHomeworkFieldsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<SaveInteractiveHomeworkFieldsInput>(
        parsed.error.issues,
      ),
      ok: false,
      message: "Revise os campos da homework.",
    };
  }

  const prisma = getPrisma();
  const homework = await prisma.homework.findUnique({
    where: { id: parsed.data.homeworkId },
    select: {
      fieldDetectionSource: true,
      id: true,
      kind: true,
      teacherProfileId: true,
    },
  });

  if (!homework || homework.kind !== "INTERACTIVE") {
    return {
      ok: false,
      message: "Homework interativa nao encontrada.",
    };
  }

  if (!actor.isAdmin && homework.teacherProfileId !== actor.teacherProfileId) {
    return {
      ok: false,
      message: "Voce so pode editar homeworks das suas aulas.",
    };
  }

  await prisma.$transaction([
    prisma.homeworkInteractiveField.deleteMany({
      where: { homeworkId: homework.id },
    }),
    prisma.homeworkInteractiveField.createMany({
      data: parsed.data.fields.map((field, index) => {
        const minSize = field.type === "CHECKBOX" ? 2 : 4;
        const x = Math.min(field.x, 100 - minSize);
        const y = Math.min(field.y, 100 - minSize);
        const width = Math.max(minSize, Math.min(field.width, 100 - x));
        const height = Math.max(minSize, Math.min(field.height, 100 - y));

        return {
          height,
          homeworkId: homework.id,
          label: field.label,
          page: field.page,
          placeholder: field.placeholder,
          required: field.required,
          sortOrder: index,
          type: field.type,
          width,
          x,
          y,
        };
      }),
    }),
    prisma.homework.update({
      where: { id: homework.id },
      data: {
        fieldDetectionSource:
          homework.fieldDetectionSource === "lesson-manual"
            ? "lesson-manual"
            : "manual",
      },
    }),
  ]);

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Campos da homework salvos.",
  };
}

export async function deleteInteractiveHomework(
  input: DeleteInteractiveHomeworkInput,
): Promise<ActionResult<DeleteInteractiveHomeworkInput>> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para excluir homeworks.",
    };
  }

  const parsed = deleteInteractiveHomeworkSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<DeleteInteractiveHomeworkInput>(parsed.error.issues),
      ok: false,
      message: "Homework invalida.",
    };
  }

  const prisma = getPrisma();
  const homework = await prisma.homework.findUnique({
    where: { id: parsed.data.homeworkId },
    select: {
      assetStoragePath: true,
      fieldDetectionSource: true,
      id: true,
      kind: true,
      lesson: {
        select: {
          _count: {
            select: {
              homeworks: true,
              materials: true,
              vocabularyItems: true,
            },
          },
          id: true,
          title: true,
        },
      },
      teacherProfileId: true,
    },
  });

  if (!homework || homework.kind !== "INTERACTIVE") {
    return {
      ok: false,
      message: "Homework interativa nao encontrada.",
    };
  }

  if (!actor.isAdmin && homework.teacherProfileId !== actor.teacherProfileId) {
    return {
      ok: false,
      message: "Voce so pode excluir homeworks das suas aulas.",
    };
  }

  const isInteractiveLesson =
    homework.fieldDetectionSource === "lesson-manual";
  const shouldDeleteInternalLesson =
    (homework.lesson.title.startsWith("Homework - ") || isInteractiveLesson) &&
    homework.lesson._count.homeworks === 1 &&
    homework.lesson._count.materials === 0 &&
    homework.lesson._count.vocabularyItems === 0;

  await prisma.$transaction(async (tx) => {
    await tx.homework.delete({
      where: { id: homework.id },
    });

    if (shouldDeleteInternalLesson) {
      await tx.lesson.delete({
        where: { id: homework.lesson.id },
      });
    }
  });

  if (homework.assetStoragePath) {
    await unlink(getStoragePath(homework.assetStoragePath)).catch(() => undefined);
  }

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: isInteractiveLesson
      ? "Aula interativa excluida com sucesso."
      : "Homework excluida com sucesso.",
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

export async function allowHomeworkRedo(
  input: HomeworkSubmissionIdInput,
): Promise<ActionResult<HomeworkSubmissionIdInput>> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para liberar refazer.",
    };
  }

  const parsed = homeworkSubmissionIdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<HomeworkSubmissionIdInput>(parsed.error.issues),
      ok: false,
      message: "Resposta invalida.",
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
      status: true,
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
      message: "Voce so pode liberar homeworks das suas aulas.",
    };
  }

  if (submission.status === "DRAFT") {
    return {
      ok: false,
      message: "O aluno ainda esta editando esta homework.",
    };
  }

  await prisma.homeworkSubmission.update({
    where: { id: submission.id },
    data: {
      reviewedAt: null,
      reviewedByTeacherProfileId: null,
      status: "RETURNED",
    },
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Homework liberada para refazer.",
  };
}
