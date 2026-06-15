"use server";

import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath, saveHomeworkAsset } from "@/lib/storage";
import {
  normalizeListeningSentence,
  type InteractiveHomeworkFieldType,
} from "@/lib/interactive-homework-fields";
import {
  createInteractiveHomeworkSchema,
  createInteractiveLessonSchema,
  createLessonSchema,
  deleteInteractiveHomeworkSchema,
  homeworkSubmissionIdSchema,
  replicateInteractiveHomeworkSchema,
  saveInteractiveHomeworkFieldsSchema,
  reviewSubmissionSchema,
  type CreateInteractiveHomeworkInput,
  type CreateInteractiveLessonInput,
  type CreateLessonInput,
  type DeleteInteractiveHomeworkInput,
  type HomeworkSubmissionIdInput,
  type ReplicateInteractiveHomeworkInput,
  type ReviewSubmissionInput,
  type SaveInteractiveHomeworkFieldsInput,
  type SaveInteractiveHomeworkFieldsOutput,
} from "@/lib/validations/learning";

type ActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

type SavedInteractiveHomeworkField = {
  height: number;
  id: string;
  label: string | null;
  page: number;
  placeholder: string | null;
  required: boolean;
  sortOrder: number;
  type: InteractiveHomeworkFieldType;
  width: number;
  x: number;
  y: number;
};

type SaveInteractiveHomeworkFieldsResult =
  ActionResult<SaveInteractiveHomeworkFieldsInput> & {
    expectedCount?: number;
    fields?: SavedInteractiveHomeworkField[];
    savedCount?: number;
  };

type InteractiveAssetFormErrors = Partial<
  Record<
    keyof CreateInteractiveHomeworkInput | keyof CreateInteractiveLessonInput | "asset",
    string
  >
>;

type FormActionResult = {
  createdCount?: number;
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

function formTextArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function getFormStudentProfileIds(formData: FormData) {
  const selectedIds = formTextArray(formData, "studentProfileIds");
  const legacyStudentId = formText(formData, "studentProfileId").trim();

  return selectedIds.length > 0
    ? selectedIds
    : legacyStudentId
      ? [legacyStudentId]
      : [];
}

function withOptimizationMessage(baseMessage: string, optimizationMessage: string | null) {
  return optimizationMessage ? `${baseMessage} ${optimizationMessage}` : baseMessage;
}

function getInteractiveFieldMinimums(type: string) {
  if (type === "CHECKBOX") {
    return { height: 1, width: 1 };
  }

  if (type === "TINY_TEXT") {
    return { height: 1, width: 1 };
  }

  if (type === "SHORT_TEXT") {
    return { height: 1.2, width: 3 };
  }

  if (type === "DRAWING") {
    return { height: 6, width: 8 };
  }

  if (type === "LISTENING") {
    return { height: 1.6, width: 4 };
  }

  return { height: 4, width: 8 };
}

function isPersistedInteractiveFieldId(
  id: string | undefined,
  existingIds: Set<string>,
) {
  return Boolean(id && existingIds.has(id));
}

function normalizeInteractiveFieldForSave(
  field: SaveInteractiveHomeworkFieldsOutput["fields"][number],
  index: number,
) {
  const minimums = getInteractiveFieldMinimums(field.type);
  const x = Math.min(field.x, 100 - minimums.width);
  const y = Math.min(field.y, 100 - minimums.height);
  const width = Math.max(minimums.width, Math.min(field.width, 100 - x));
  const height = Math.max(minimums.height, Math.min(field.height, 100 - y));

  return {
    height,
    label: field.label,
    page: field.page,
    placeholder:
      field.type === "LISTENING"
        ? normalizeListeningSentence(field.placeholder ?? "")
        : field.placeholder,
    required: field.type === "LISTENING" ? false : field.required,
    sortOrder: index,
    type: field.type,
    width,
    x,
    y,
  };
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
    studentProfileIds: getFormStudentProfileIds(formData),
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

  const studentProfileIds = data.studentProfileIds;
  const [teacher, students] = await Promise.all([
    prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { id: true },
    }),
    prisma.studentProfile.findMany({
      where: { id: { in: studentProfileIds } },
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

  if (students.length !== studentProfileIds.length) {
    return {
      errors: { studentProfileIds: "Um ou mais alunos nao foram encontrados." },
      ok: false,
      message: "Um ou mais alunos nao foram encontrados.",
    };
  }

  const studentsById = new Map(students.map((student) => [student.id, student]));
  const orderedStudents = studentProfileIds.map((id) => studentsById.get(id)!);

  if (!actor.isAdmin) {
    const assignments = await prisma.studentTeacherAssignment.findMany({
      where: {
        studentProfileId: { in: studentProfileIds },
        teacherProfileId,
      },
      select: { studentProfileId: true },
    });
    const assignedStudentIds = new Set(
      assignments.map((assignment) => assignment.studentProfileId),
    );

    if (assignedStudentIds.size !== studentProfileIds.length) {
      return {
        errors: {
          studentProfileIds:
            "Um ou mais alunos nao estao vinculados a sua area teacher.",
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

  const homeworks = await prisma.$transaction(async (tx) => {
    const createdHomeworks: { id: string }[] = [];

    for (const student of orderedStudents) {
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

      const homework = await tx.homework.create({
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

      createdHomeworks.push(homework);
    }

    return createdHomeworks;
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    createdCount: homeworks.length,
    homeworkId: homeworks[0]?.id,
    ok: true,
    message: withOptimizationMessage(
      homeworks.length === 1
        ? "Homework interativa criada. Desenhe as areas no PDF e salve."
        : `${homeworks.length} homeworks interativas criadas. Desenhe as areas no PDF e salve.`,
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
    studentProfileIds: getFormStudentProfileIds(formData),
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

  const studentProfileIds = data.studentProfileIds;
  const [teacher, students] = await Promise.all([
    prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { id: true },
    }),
    prisma.studentProfile.findMany({
      where: { id: { in: studentProfileIds } },
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

  if (students.length !== studentProfileIds.length) {
    return {
      errors: { studentProfileIds: "Um ou mais alunos nao foram encontrados." },
      ok: false,
      message: "Um ou mais alunos nao foram encontrados.",
    };
  }

  const studentsById = new Map(students.map((student) => [student.id, student]));
  const orderedStudents = studentProfileIds.map((id) => studentsById.get(id)!);

  if (!actor.isAdmin) {
    const assignments = await prisma.studentTeacherAssignment.findMany({
      where: {
        studentProfileId: { in: studentProfileIds },
        teacherProfileId,
      },
      select: { studentProfileId: true },
    });
    const assignedStudentIds = new Set(
      assignments.map((assignment) => assignment.studentProfileId),
    );

    if (assignedStudentIds.size !== studentProfileIds.length) {
      return {
        errors: {
          studentProfileIds:
            "Um ou mais alunos nao estao vinculados a sua area teacher.",
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

  const homeworks = await prisma.$transaction(async (tx) => {
    const createdHomeworks: { id: string }[] = [];

    for (const student of orderedStudents) {
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

      const homework = await tx.homework.create({
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

      createdHomeworks.push(homework);
    }

    return createdHomeworks;
  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    createdCount: homeworks.length,
    homeworkId: homeworks[0]?.id,
    ok: true,
    message: withOptimizationMessage(
      homeworks.length === 1
        ? "Aula interativa criada. Desenhe as areas no PDF e salve."
        : `${homeworks.length} aulas interativas criadas. Desenhe as areas no PDF e salve.`,
      savedAsset.optimizationMessage,
    ),
  };
}

export async function saveInteractiveHomeworkFields(
  input: SaveInteractiveHomeworkFieldsInput,
): Promise<SaveInteractiveHomeworkFieldsResult> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar homeworks.",
    };
  }

  const parsed = saveInteractiveHomeworkFieldsSchema.safeParse(input);

  if (!parsed.success) {
    const errors = fieldErrors<SaveInteractiveHomeworkFieldsInput>(
      parsed.error.issues,
    );

    return {
      errors,
      ok: false,
      message: errors.fields ?? "Revise os campos da homework.",
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

  const expectedCount = parsed.data.fields.length;
  let savedFields: SavedInteractiveHomeworkField[];

  try {
    savedFields = await prisma.$transaction(async (tx) => {
      const existingFields = await tx.homeworkInteractiveField.findMany({
        where: { homeworkId: homework.id },
        select: { id: true },
      });
      const existingIds = new Set(existingFields.map((field) => field.id));
      const retainedIds = parsed.data.fields
        .map((field) => field.id)
        .filter((id): id is string =>
          isPersistedInteractiveFieldId(id, existingIds),
        );

      await tx.homeworkInteractiveField.deleteMany({
        where:
          retainedIds.length > 0
            ? {
                homeworkId: homework.id,
                id: { notIn: retainedIds },
              }
            : { homeworkId: homework.id },
      });

      for (const [index, field] of parsed.data.fields.entries()) {
        const data = normalizeInteractiveFieldForSave(field, index);

        if (isPersistedInteractiveFieldId(field.id, existingIds)) {
          await tx.homeworkInteractiveField.update({
            where: { id: field.id },
            data,
          });
          continue;
        }

        await tx.homeworkInteractiveField.create({
          data: {
            ...data,
            homeworkId: homework.id,
          },
        });
      }

      await tx.homework.update({
        where: { id: homework.id },
        data: {
          fieldDetectionSource:
            homework.fieldDetectionSource === "lesson-manual"
              ? "lesson-manual"
              : "manual",
        },
      });

      const confirmedCount = await tx.homeworkInteractiveField.count({
        where: { homeworkId: homework.id },
      });

      if (confirmedCount !== expectedCount) {
        throw new Error(
          `Interactive homework field count mismatch: expected ${expectedCount}, saved ${confirmedCount}.`,
        );
      }

      return tx.homeworkInteractiveField.findMany({
        where: { homeworkId: homework.id },
        orderBy: { sortOrder: "asc" },
        select: {
          height: true,
          id: true,
          label: true,
          page: true,
          placeholder: true,
          required: true,
          sortOrder: true,
          type: true,
          width: true,
          x: true,
          y: true,
        },
      });
    });
  } catch (error) {
    console.error("Failed to save interactive homework fields", {
      error,
      expectedCount,
      homeworkId: homework.id,
    });

    return {
      expectedCount,
      ok: false,
      message:
        "Erro ao salvar areas. As alteracoes nao foram confirmadas; tente salvar novamente antes de sair.",
      savedCount: 0,
    };
  }

  if (savedFields.length !== expectedCount) {
    return {
      expectedCount,
      fields: savedFields,
      ok: false,
      message: `${savedFields.length} de ${expectedCount} areas foram salvas. Revise antes de sair e tente salvar novamente.`,
      savedCount: savedFields.length,
    };
  }

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    expectedCount,
    fields: savedFields,
    ok: true,
    message: `${savedFields.length} area(s) salvas com sucesso.`,
    savedCount: savedFields.length,
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
    const remainingAssetReferences = await prisma.homework.count({
      where: { assetStoragePath: homework.assetStoragePath },
    });

    if (remainingAssetReferences === 0) {
      await unlink(getStoragePath(homework.assetStoragePath)).catch(
        () => undefined,
      );
    }
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

export async function replicateInteractiveHomeworkForStudent(
  input: ReplicateInteractiveHomeworkInput,
): Promise<ActionResult<ReplicateInteractiveHomeworkInput>> {
  const actor = await getTeacherActor();

  if (!actor) {
    return {
      ok: false,
      message: "Voce nao tem permissao para replicar homeworks.",
    };
  }

  const parsed = replicateInteractiveHomeworkSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<ReplicateInteractiveHomeworkInput>(
        parsed.error.issues,
      ),
      ok: false,
      message: "Selecione uma homework e pelo menos um aluno.",
    };
  }

  const prisma = getPrisma();
  const selectedStudentProfileIds = parsed.data.studentProfileIds;
  const homework = await prisma.homework.findUnique({
    where: { id: parsed.data.homeworkId },
    select: {
      assetFileName: true,
      assetMimeType: true,
      assetPageCount: true,
      assetSizeBytes: true,
      assetStoragePath: true,
      dueDate: true,
      fieldDetectionSource: true,
      id: true,
      instructions: true,
      interactiveFields: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          height: true,
          label: true,
          page: true,
          placeholder: true,
          required: true,
          sortOrder: true,
          type: true,
          width: true,
          x: true,
          y: true,
        },
      },
      kind: true,
      lesson: {
        select: {
          description: true,
          scheduledAt: true,
          studentProfileId: true,
          status: true,
          title: true,
        },
      },
      questions: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          expectedAnswer: true,
          prompt: true,
          sortOrder: true,
        },
      },
      homeworkReplicas: {
        select: {
          id: true,
          lesson: {
            select: {
              studentProfileId: true,
            },
          },
        },
      },
      status: true,
      teacherProfileId: true,
      title: true,
    },
  });

  if (!homework || homework.kind !== "INTERACTIVE") {
    return {
      ok: false,
      message: "Homework interativa nao encontrada.",
    };
  }

  if (homework.fieldDetectionSource === "lesson-manual") {
    return {
      ok: false,
      message:
        "Replicacao fica disponivel apenas em homeworks, nao em aulas interativas.",
    };
  }

  if (!actor.isAdmin && homework.teacherProfileId !== actor.teacherProfileId) {
    return {
      ok: false,
      message: "Voce so pode replicar homeworks das suas aulas.",
    };
  }

  const targetStudentProfileIds = selectedStudentProfileIds.filter(
    (studentProfileId) => studentProfileId !== homework.lesson.studentProfileId,
  );

  if (targetStudentProfileIds.length === 0) {
    return {
      ok: false,
      message: "Os alunos selecionados ja incluem apenas o aluno principal.",
    };
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      id: { in: targetStudentProfileIds },
      user: {
        isActive: true,
        role: "STUDENT",
      },
    },
    select: {
      id: true,
      user: {
        select: {
          isActive: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (students.length !== targetStudentProfileIds.length) {
    return {
      errors: {
        studentProfileIds: "Um ou mais alunos nao foram encontrados ou estao inativos.",
      },
      ok: false,
      message: "Um ou mais alunos nao foram encontrados ou estao inativos.",
    };
  }

  const studentsById = new Map(students.map((student) => [student.id, student]));
  const orderedStudents = targetStudentProfileIds.map(
    (studentProfileId) => studentsById.get(studentProfileId)!,
  );

  if (!actor.isAdmin) {
    const teacherProfileId = actor.teacherProfileId;

    if (!teacherProfileId) {
      return {
        ok: false,
        message: "Perfil de teacher nao encontrado.",
      };
    }

    const assignments = await prisma.studentTeacherAssignment.findMany({
      where: {
        studentProfileId: { in: targetStudentProfileIds },
        teacherProfileId,
      },
      select: { studentProfileId: true },
    });
    const assignedStudentIds = new Set(
      assignments.map((assignment) => assignment.studentProfileId),
    );

    if (assignedStudentIds.size !== targetStudentProfileIds.length) {
      return {
        errors: {
          studentProfileIds:
            "Um ou mais alunos nao estao vinculados a sua area teacher.",
        },
        ok: false,
        message: "Um ou mais alunos nao estao vinculados a sua area teacher.",
      };
    }
  }

  const replicatedStudentIds = new Set(
    homework.homeworkReplicas
      .map((replica) => replica.lesson.studentProfileId)
      .filter((studentProfileId): studentProfileId is string =>
        Boolean(studentProfileId),
      ),
  );
  const alreadyReplicatedStudents = orderedStudents.filter((student) =>
    replicatedStudentIds.has(student.id),
  );
  const studentsToCreate = orderedStudents.filter(
    (student) => !replicatedStudentIds.has(student.id),
  );

  await prisma.$transaction(async (tx) => {
    if (alreadyReplicatedStudents.length > 0) {
      await tx.homeworkStudentAssignment.deleteMany({
        where: {
          homeworkId: homework.id,
          studentProfileId: {
            in: alreadyReplicatedStudents.map((student) => student.id),
          },
        },
      });
    }

    for (const student of studentsToCreate) {
      if (actor.isAdmin) {
        await tx.studentTeacherAssignment.upsert({
          where: {
            teacherProfileId_studentProfileId: {
              studentProfileId: student.id,
              teacherProfileId: homework.teacherProfileId,
            },
          },
          create: {
            studentProfileId: student.id,
            teacherProfileId: homework.teacherProfileId,
          },
          update: {},
        });
      }

      const lesson = await tx.lesson.create({
        data: {
          description:
            homework.lesson.description ??
            homework.instructions ??
            "Aula criada automaticamente por replica de homework.",
          scheduledAt: homework.lesson.scheduledAt,
          status: homework.lesson.status,
          studentProfileId: student.id,
          teacherProfileId: homework.teacherProfileId,
          title: homework.lesson.title,
        },
        select: { id: true },
      });

      await tx.homework.create({
        data: {
          assetFileName: homework.assetFileName,
          assetMimeType: homework.assetMimeType,
          assetPageCount: homework.assetPageCount,
          assetSizeBytes: homework.assetSizeBytes,
          assetStoragePath: homework.assetStoragePath,
          dueDate: homework.dueDate,
          fieldDetectionSource: homework.fieldDetectionSource,
          instructions: homework.instructions,
          kind: homework.kind,
          lessonId: lesson.id,
          replicatedFromHomeworkId: homework.id,
          status: homework.status,
          teacherProfileId: homework.teacherProfileId,
          title: homework.title,
          ...(homework.questions.length > 0
            ? {
                questions: {
                  createMany: {
                    data: homework.questions.map((question) => ({
                      expectedAnswer: question.expectedAnswer,
                      prompt: question.prompt,
                      sortOrder: question.sortOrder,
                    })),
                  },
                },
              }
            : {}),
          ...(homework.interactiveFields.length > 0
            ? {
                interactiveFields: {
                  createMany: {
                    data: homework.interactiveFields.map((field) => ({
                      height: field.height,
                      label: field.label,
                      page: field.page,
                      placeholder: field.placeholder,
                      required: field.required,
                      sortOrder: field.sortOrder,
                      type: field.type,
                      width: field.width,
                      x: field.x,
                      y: field.y,
                    })),
                  },
                },
              }
            : {}),
        },
      });

      await tx.homeworkStudentAssignment.deleteMany({
        where: {
          homeworkId: homework.id,
          studentProfileId: student.id,
        },
      });
    }

  });

  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message:
      studentsToCreate.length === 0
        ? alreadyReplicatedStudents.length === 1
          ? `Replica para ${alreadyReplicatedStudents[0].user.name} ja existe.`
          : `${alreadyReplicatedStudents.length} replicas ja existiam.`
        : alreadyReplicatedStudents.length > 0
          ? `${studentsToCreate.length} replica(s) criada(s). ${alreadyReplicatedStudents.length} ja existia(m).`
          : studentsToCreate.length === 1
            ? `Replica criada para ${studentsToCreate[0].user.name}.`
            : `${studentsToCreate.length} replicas criadas.`,
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
