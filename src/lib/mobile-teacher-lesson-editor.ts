import type { Prisma } from "@/generated/prisma/client";
import { normalizeExternalMaterialUrl } from "@/lib/mobile-lesson";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const nullableText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullable()
    .transform((value) => (value ? value : null));

const materialInputSchema = z
  .object({
    content: nullableText(
      4000,
      "O conteudo do material pode ter no maximo 4000 caracteres.",
    ),
    title: z
      .string()
      .trim()
      .min(1, "Informe o titulo do material.")
      .max(160, "O titulo do material pode ter no maximo 160 caracteres."),
    type: z.enum(["LINK", "TEXT"]),
    url: nullableText(500, "A URL pode ter no maximo 500 caracteres."),
  })
  .strict()
  .superRefine((material, context) => {
    if (material.type === "TEXT" && !material.content) {
      context.addIssue({
        code: "custom",
        message: "Informe o conteudo do material em texto.",
        path: ["content"],
      });
    }

    if (material.type === "TEXT" && material.url) {
      context.addIssue({
        code: "custom",
        message: "Material em texto nao deve conter URL.",
        path: ["url"],
      });
    }

    if (
      material.type === "LINK" &&
      !normalizeExternalMaterialUrl(material.url)
    ) {
      context.addIssue({
        code: "custom",
        message: "Use um link HTTPS sem usuario ou senha na URL.",
        path: ["url"],
      });
    }
  });

const vocabularyInputSchema = z
  .object({
    example: nullableText(
      500,
      "O exemplo pode ter no maximo 500 caracteres.",
    ),
    term: z
      .string()
      .trim()
      .min(1, "Informe o termo de vocabulario.")
      .max(120, "O termo pode ter no maximo 120 caracteres."),
    translation: z
      .string()
      .trim()
      .min(1, "Informe a traducao.")
      .max(160, "A traducao pode ter no maximo 160 caracteres."),
  })
  .strict();

export const mobileTeacherLessonInputSchema = z
  .object({
    description: nullableText(
      1200,
      "A descricao pode ter no maximo 1200 caracteres.",
    ),
    materials: z.array(materialInputSchema).max(25),
    operationId: z.string().uuid("Operacao invalida."),
    scheduledAt: z.string().datetime().nullable(),
    status: z.enum(["ARCHIVED", "DRAFT", "PUBLISHED"]),
    studentProfileId: nullableText(80, "Selecione um aluno valido."),
    title: z
      .string()
      .trim()
      .min(3, "Informe um titulo com pelo menos 3 caracteres.")
      .max(160, "O titulo pode ter no maximo 160 caracteres."),
    vocabularyItems: z.array(vocabularyInputSchema).max(100),
  })
  .strict();

export const mobileTeacherLessonUpdateInputSchema =
  mobileTeacherLessonInputSchema
    .extend({ expectedUpdatedAt: z.string().datetime() })
    .strict();

export type MobileTeacherLessonInput = z.infer<
  typeof mobileTeacherLessonInputSchema
>;
export type MobileTeacherLessonUpdateInput = z.infer<
  typeof mobileTeacherLessonUpdateInputSchema
>;

const editorLessonSelect = {
  description: true,
  id: true,
  materials: {
    orderBy: { sortOrder: "asc" },
    select: {
      content: true,
      id: true,
      title: true,
      type: true,
      url: true,
    },
    take: 26,
  },
  scheduledAt: true,
  status: true,
  studentProfileId: true,
  title: true,
  updatedAt: true,
  vocabularyItems: {
    orderBy: { sortOrder: "asc" },
    select: {
      example: true,
      id: true,
      term: true,
      translation: true,
    },
    take: 101,
  },
} satisfies Prisma.LessonSelect;

type EditorLessonRow = Prisma.LessonGetPayload<{
  select: typeof editorLessonSelect;
}>;

export type MobileTeacherLessonEditorStore = Pick<
  ReturnType<typeof getPrisma>,
  "lesson" | "studentTeacherAssignment" | "teacherProfile" | "$transaction"
>;

type EditorOptions = {
  store?: MobileTeacherLessonEditorStore;
};

type MutationFailureReason =
  | "CONFLICT"
  | "INVALID"
  | "NOT_FOUND"
  | "OPERATION_CONFLICT"
  | "PROFILE_NOT_FOUND"
  | "STUDENT_FORBIDDEN";

type MutationResult = {
  data?: {
    lessonId: string;
    replayed: boolean;
    updatedAt: string;
  };
  errors?: Record<string, string>;
  message: string;
  ok: boolean;
  reason?: MutationFailureReason;
};

export type MobileTeacherLessonEditor = {
  description: string | null;
  id: string;
  materials: {
    content: string | null;
    title: string;
    type: "LINK" | "TEXT";
    url: string | null;
  }[];
  scheduledAt: string | null;
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  studentProfileId: string | null;
  title: string;
  updatedAt: string;
  vocabularyItems: {
    example: string | null;
    term: string;
    translation: string;
  }[];
};

function validationErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    errors[path] ??= issue.message;
  }

  return errors;
}

function failure(
  reason: MutationFailureReason,
  message: string,
  errors?: Record<string, string>,
): MutationResult {
  return { errors, message, ok: false, reason };
}

async function getTeacherProfileId(
  store: MobileTeacherLessonEditorStore,
  userId: string,
) {
  const profile = await store.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  return profile?.id ?? null;
}

function success(
  lesson: { id: string; updatedAt: Date },
  replayed: boolean,
  message: string,
): MutationResult {
  return {
    data: {
      lessonId: lesson.id,
      replayed,
      updatedAt: lesson.updatedAt.toISOString(),
    },
    message,
    ok: true,
  };
}

function materialData(
  materials: MobileTeacherLessonInput["materials"],
) {
  return materials.map((material, sortOrder) => ({
    content: material.content,
    sortOrder,
    title: material.title,
    type: material.type,
    url:
      material.type === "LINK"
        ? normalizeExternalMaterialUrl(material.url)
        : null,
  }));
}

function vocabularyData(
  vocabularyItems: MobileTeacherLessonInput["vocabularyItems"],
) {
  return vocabularyItems.map((item, sortOrder) => ({
    example: item.example,
    sortOrder,
    term: item.term,
    translation: item.translation,
  }));
}

async function hasStudentAssignment(
  transaction: Prisma.TransactionClient,
  teacherProfileId: string,
  studentProfileId: string,
) {
  const assignment = await transaction.studentTeacherAssignment.findUnique({
    where: {
      teacherProfileId_studentProfileId: {
        studentProfileId,
        teacherProfileId,
      },
    },
    select: { id: true },
  });

  return Boolean(assignment);
}

export async function createMobileTeacherLesson(
  userId: string,
  input: unknown,
  options: EditorOptions = {},
): Promise<MutationResult> {
  const parsed = mobileTeacherLessonInputSchema.safeParse(input);

  if (!parsed.success) {
    return failure(
      "INVALID",
      "Revise os dados da aula.",
      validationErrors(parsed.error),
    );
  }

  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);

  if (!teacherProfileId) {
    return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }

  const data = parsed.data;

  try {
    return await store.$transaction(async (transaction) => {
      const replay = await transaction.lesson.findUnique({
        where: { createdByMobileOperationId: data.operationId },
        select: { id: true, teacherProfileId: true, updatedAt: true },
      });

      if (replay) {
        if (replay.teacherProfileId !== teacherProfileId) {
          return failure(
            "OPERATION_CONFLICT",
            "Esta operacao nao pode ser reutilizada.",
          );
        }

        return success(replay, true, "Aula ja criada anteriormente.");
      }

      if (
        data.studentProfileId &&
        !(await hasStudentAssignment(
          transaction,
          teacherProfileId,
          data.studentProfileId,
        ))
      ) {
        return failure(
          "STUDENT_FORBIDDEN",
          "Voce so pode criar aulas para alunos vinculados.",
          { studentProfileId: "Aluno nao esta vinculado a sua area teacher." },
        );
      }

      const lesson = await transaction.lesson.create({
        data: {
          createdByMobileOperationId: data.operationId,
          description: data.description,
          lastMobileOperationId: data.operationId,
          materials: { create: materialData(data.materials) },
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          status: data.status,
          studentProfileId: data.studentProfileId,
          teacherProfileId,
          title: data.title,
          vocabularyItems: {
            create: vocabularyData(data.vocabularyItems),
          },
        },
        select: { id: true, updatedAt: true },
      });

      return success(lesson, false, "Aula criada com sucesso.");
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await store.lesson.findUnique({
        where: { createdByMobileOperationId: data.operationId },
        select: { id: true, teacherProfileId: true, updatedAt: true },
      });

      if (replay?.teacherProfileId === teacherProfileId) {
        return success(replay, true, "Aula ja criada anteriormente.");
      }
    }

    throw error;
  }
}

export async function updateMobileTeacherLesson(
  userId: string,
  lessonId: string,
  input: unknown,
  options: EditorOptions = {},
): Promise<MutationResult> {
  const parsed = mobileTeacherLessonUpdateInputSchema.safeParse(input);

  if (!parsed.success) {
    return failure(
      "INVALID",
      "Revise os dados da aula.",
      validationErrors(parsed.error),
    );
  }

  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);

  if (!teacherProfileId) {
    return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }

  const data = parsed.data;
  try {
    return await store.$transaction(async (transaction) => {
    const current = await transaction.lesson.findFirst({
      where: { id: lessonId, teacherProfileId },
      select: { id: true, lastMobileOperationId: true, updatedAt: true },
    });

    if (!current) {
      return failure("NOT_FOUND", "Aula nao encontrada ou indisponivel.");
    }

    if (current.lastMobileOperationId === data.operationId) {
      return success(current, true, "Alteracoes ja salvas anteriormente.");
    }

    if (current.updatedAt.toISOString() !== data.expectedUpdatedAt) {
      return failure(
        "CONFLICT",
        "Esta aula foi alterada em outro lugar. Recarregue antes de salvar.",
      );
    }

    if (
      data.studentProfileId &&
      !(await hasStudentAssignment(
        transaction,
        teacherProfileId,
        data.studentProfileId,
      ))
    ) {
      return failure(
        "STUDENT_FORBIDDEN",
        "Voce so pode usar alunos vinculados.",
        { studentProfileId: "Aluno nao esta vinculado a sua area teacher." },
      );
    }

    const updated = await transaction.lesson.updateMany({
      where: {
        id: lessonId,
        teacherProfileId,
        updatedAt: new Date(data.expectedUpdatedAt),
      },
      data: {
        description: data.description,
        lastMobileOperationId: data.operationId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.status,
        studentProfileId: data.studentProfileId,
        title: data.title,
      },
    });

    if (updated.count !== 1) {
      return failure(
        "CONFLICT",
        "Esta aula foi alterada em outro lugar. Recarregue antes de salvar.",
      );
    }

    await transaction.lessonMaterial.deleteMany({ where: { lessonId } });
    await transaction.vocabularyItem.deleteMany({ where: { lessonId } });

    if (data.materials.length > 0) {
      await transaction.lessonMaterial.createMany({
        data: materialData(data.materials).map((material) => ({
          ...material,
          lessonId,
        })),
      });
    }

    if (data.vocabularyItems.length > 0) {
      await transaction.vocabularyItem.createMany({
        data: vocabularyData(data.vocabularyItems).map((item) => ({
          ...item,
          lessonId,
        })),
      });
    }

    const lesson = await transaction.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, updatedAt: true },
    });

    if (!lesson) {
      return failure("NOT_FOUND", "Aula nao encontrada ou indisponivel.");
    }

      return success(lesson, false, "Aula atualizada com sucesso.");
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return failure(
        "OPERATION_CONFLICT",
        "Esta operacao nao pode ser reutilizada.",
      );
    }

    throw error;
  }
}

function toEditorLesson(lesson: EditorLessonRow): MobileTeacherLessonEditor {
  return {
    description: lesson.description,
    id: lesson.id,
    materials: lesson.materials.map((material) => ({
      content: material.content,
      title: material.title,
      type: material.type,
      url:
        material.type === "LINK"
          ? normalizeExternalMaterialUrl(material.url)
          : null,
    })),
    scheduledAt: lesson.scheduledAt?.toISOString() ?? null,
    status: lesson.status,
    studentProfileId: lesson.studentProfileId,
    title: lesson.title,
    updatedAt: lesson.updatedAt.toISOString(),
    vocabularyItems: lesson.vocabularyItems.map((item) => ({
      example: item.example,
      term: item.term,
      translation: item.translation,
    })),
  };
}

export async function getMobileTeacherLessonEditor(
  userId: string,
  lessonId: string,
  options: EditorOptions = {},
) {
  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);

  if (!teacherProfileId) {
    return {
      message: "Perfil de teacher nao encontrado.",
      ok: false as const,
      reason: "PROFILE_NOT_FOUND" as const,
    };
  }

  const lesson = await store.lesson.findFirst({
    where: { id: lessonId, teacherProfileId },
    select: editorLessonSelect,
  });

  if (!lesson) {
    return {
      message: "Aula nao encontrada ou indisponivel.",
      ok: false as const,
      reason: "NOT_FOUND" as const,
    };
  }

  if (lesson.materials.length > 25 || lesson.vocabularyItems.length > 100) {
    return {
      message:
        "Esta aula possui mais itens do que o editor movel suporta com seguranca.",
      ok: false as const,
      reason: "LIMIT_EXCEEDED" as const,
    };
  }

  return {
    data: toEditorLesson(lesson),
    message: "Editor da aula carregado.",
    ok: true as const,
  };
}

export async function getMobileTeacherLessonOptions(
  userId: string,
  options: EditorOptions = {},
) {
  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);

  if (!teacherProfileId) {
    return {
      message: "Perfil de teacher nao encontrado.",
      ok: false as const,
      reason: "PROFILE_NOT_FOUND" as const,
    };
  }

  const assignments = await store.studentTeacherAssignment.findMany({
    where: { teacherProfileId },
    orderBy: { studentProfile: { user: { name: "asc" } } },
    take: 100,
    select: {
      studentProfile: {
        select: {
          id: true,
          level: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  return {
    data: {
      students: assignments.map(({ studentProfile }) => ({
        id: studentProfile.id,
        level: studentProfile.level,
        name: studentProfile.user.name,
      })),
    },
    message: "Opcoes da aula carregadas.",
    ok: true as const,
  };
}
