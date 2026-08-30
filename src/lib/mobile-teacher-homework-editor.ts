import { unlink } from "node:fs/promises";

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getStaffStudentSelectionWhere } from "@/lib/staff-student-access";
import { getStoragePath } from "@/lib/storage";
import { z } from "zod";

const MAX_QUESTIONS = 50;
const MAX_STUDENTS = 50;

const nullableText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullable()
    .transform((value) => (value ? value : null));

const nullableDate = z
  .string()
  .datetime({ message: "Informe uma data valida." })
  .nullable()
  .transform((value) => (value ? new Date(value) : null));

const questionInputSchema = z
  .object({
    expectedAnswer: nullableText(
      1000,
      "A resposta esperada pode ter no maximo 1000 caracteres.",
    ),
    prompt: z
      .string()
      .trim()
      .min(3, "A pergunta precisa ter pelo menos 3 caracteres.")
      .max(1000, "A pergunta pode ter no maximo 1000 caracteres."),
  })
  .strict();

const studentProfileIdsSchema = z
  .array(z.string().trim().min(1).max(80))
  .min(1, "Selecione pelo menos um aluno.")
  .max(MAX_STUDENTS, `Selecione no maximo ${MAX_STUDENTS} alunos.`)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Nao repita alunos na mesma tarefa.",
  });

const homeworkFieldsSchema = z.object({
  dueDate: nullableDate,
  instructions: nullableText(
    2000,
    "As instrucoes podem ter no maximo 2000 caracteres.",
  ),
  lessonId: z.string().trim().min(1).max(80),
  questions: z
    .array(questionInputSchema)
    .max(MAX_QUESTIONS, `Use no maximo ${MAX_QUESTIONS} perguntas.`),
  status: z.enum(["ARCHIVED", "DRAFT", "PUBLISHED"]),
  studentProfileIds: studentProfileIdsSchema,
  title: z
    .string()
    .trim()
    .min(3, "O titulo precisa ter pelo menos 3 caracteres.")
    .max(160, "O titulo pode ter no maximo 160 caracteres."),
});

const createHomeworkSchema = homeworkFieldsSchema
  .extend({ operationId: z.string().uuid("Operacao invalida.") })
  .strict()
  .superRefine((value, context) => {
    if (value.questions.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Adicione pelo menos uma pergunta.",
        path: ["questions"],
      });
    }
  });

const updateHomeworkSchema = homeworkFieldsSchema
  .extend({
    expectedUpdatedAt: z
      .string()
      .datetime({ message: "Versao da tarefa invalida." })
      .transform((value) => new Date(value)),
    operationId: z.string().uuid("Operacao invalida."),
  })
  .strict();

const duplicateHomeworkSchema = z
  .object({
    operationId: z.string().uuid("Operacao invalida."),
    studentProfileIds: studentProfileIdsSchema,
  })
  .strict();

const deleteHomeworkSchema = z
  .object({
    expectedUpdatedAt: z
      .string()
      .datetime({ message: "Versao da tarefa invalida." })
      .transform((value) => new Date(value)),
    operationId: z.string().uuid("Operacao invalida."),
  })
  .strict();

type HomeworkInput = z.output<typeof homeworkFieldsSchema>;

const editorHomeworkSelect = {
  _count: { select: { interactiveFields: true, submissions: true } },
  assetFileName: true,
  dueDate: true,
  id: true,
  instructions: true,
  kind: true,
  lesson: { select: { studentProfileId: true } },
  lessonId: true,
  questions: {
    orderBy: { sortOrder: "asc" },
    select: { expectedAnswer: true, id: true, prompt: true },
    take: MAX_QUESTIONS + 1,
  },
  status: true,
  studentAssignments: {
    orderBy: { studentProfileId: "asc" },
    select: { studentProfileId: true },
    take: MAX_STUDENTS + 1,
  },
  title: true,
  updatedAt: true,
} satisfies Prisma.HomeworkSelect;

const duplicateHomeworkSelect = {
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
    orderBy: { sortOrder: "asc" },
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
      status: true,
      studentProfileId: true,
      title: true,
    },
  },
  questions: {
    orderBy: { sortOrder: "asc" },
    select: { expectedAnswer: true, prompt: true, sortOrder: true },
  },
  status: true,
  studentAssignments: { select: { studentProfileId: true } },
  teacherProfileId: true,
  title: true,
} satisfies Prisma.HomeworkSelect;

type EditorHomeworkRow = Prisma.HomeworkGetPayload<{
  select: typeof editorHomeworkSelect;
}>;

type DuplicateHomeworkRow = Prisma.HomeworkGetPayload<{
  select: typeof duplicateHomeworkSelect;
}>;

export type MobileTeacherHomeworkEditorStore = Pick<
  ReturnType<typeof getPrisma>,
  | "$transaction"
  | "homework"
  | "homeworkQuestion"
  | "homeworkStudentAssignment"
  | "lesson"
  | "mobileTeacherHomeworkDeletion"
  | "studentProfile"
  | "teacherProfile"
>;

type EditorOptions = {
  removeAsset?: (relativePath: string) => Promise<void>;
  store?: MobileTeacherHomeworkEditorStore;
};

export type MobileTeacherHomeworkFailureReason =
  | "ASSIGNMENTS_LOCKED"
  | "CONFLICT"
  | "INVALID"
  | "LIMIT_EXCEEDED"
  | "NOT_FOUND"
  | "OPERATION_CONFLICT"
  | "PROFILE_NOT_FOUND"
  | "STUDENT_FORBIDDEN";

type MutationResult = {
  data?: {
    homeworkId: string;
    replayed: boolean;
    updatedAt?: string;
  };
  errors?: Record<string, string>;
  message: string;
  ok: boolean;
  reason?: MobileTeacherHomeworkFailureReason;
};

type DuplicateResult = {
  data?: {
    createdCount: number;
    homeworkIds: string[];
    replayed: boolean;
    skippedCount: number;
  };
  errors?: Record<string, string>;
  message: string;
  ok: boolean;
  reason?: MobileTeacherHomeworkFailureReason;
};

export type MobileTeacherHomeworkEditor = {
  assetFileName: string | null;
  dueDate: string | null;
  hasSubmissions: boolean;
  id: string;
  instructions: string | null;
  interactiveFieldCount: number;
  kind: "INTERACTIVE" | "TEXT";
  lessonId: string;
  questions: {
    expectedAnswer: string | null;
    id: string;
    prompt: string;
  }[];
  status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  studentProfileIds: string[];
  title: string;
  updatedAt: string;
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
  reason: MobileTeacherHomeworkFailureReason,
  message: string,
  errors?: Record<string, string>,
): MutationResult {
  return { errors, message, ok: false, reason };
}

function duplicateFailure(
  reason: MobileTeacherHomeworkFailureReason,
  message: string,
  errors?: Record<string, string>,
): DuplicateResult {
  return { errors, message, ok: false, reason };
}

function operationKey(action: "create" | "delete" | "update", id: string) {
  return `homework:${action}:${id}`;
}

function duplicateOperationKey(operationId: string, studentProfileId: string) {
  return `homework:duplicate:${operationId}:${studentProfileId}`;
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function getTeacherProfileId(
  store: MobileTeacherHomeworkEditorStore,
  userId: string,
) {
  const profile = await store.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

async function validateOwnedLesson(
  store: MobileTeacherHomeworkEditorStore,
  teacherProfileId: string,
  lessonId: string,
) {
  return store.lesson.findFirst({
    where: { id: lessonId, teacherProfileId },
    select: { id: true },
  });
}

async function validateActiveStudents(
  store: MobileTeacherHomeworkEditorStore,
  studentProfileIds: string[],
) {
  const students = await store.studentProfile.findMany({
    where: {
      ...getStaffStudentSelectionWhere(),
      id: { in: studentProfileIds },
    },
    select: { id: true },
  });
  return new Set(students.map((student) => student.id));
}

function questionsData(questions: HomeworkInput["questions"]) {
  return questions.map((question, sortOrder) => ({
    expectedAnswer: question.expectedAnswer,
    prompt: question.prompt,
    sortOrder,
  }));
}

function assignmentsData(
  studentProfileIds: string[],
  teacherProfileId: string,
) {
  return studentProfileIds.map((studentProfileId) => ({
    assignedByTeacherProfileId: teacherProfileId,
    studentProfileId,
  }));
}

function mutationSuccess(
  homework: { id: string; updatedAt: Date },
  message: string,
  replayed: boolean,
): MutationResult {
  return {
    data: {
      homeworkId: homework.id,
      replayed,
      updatedAt: homework.updatedAt.toISOString(),
    },
    message,
    ok: true,
  };
}

function sameStudents(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((studentId) => rightSet.has(studentId));
}

export async function createMobileTeacherHomework(
  userId: string,
  rawInput: unknown,
  options: EditorOptions = {},
): Promise<MutationResult> {
  const parsed = createHomeworkSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure(
      "INVALID",
      "Revise os dados da tarefa.",
      validationErrors(parsed.error),
    );
  }

  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);
  if (!teacherProfileId) {
    return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }

  const data = parsed.data;
  const createKey = operationKey("create", data.operationId);

  try {
    const result = await store.$transaction(async (tx) => {
      const replay = await tx.homework.findUnique({
        where: { createdByMobileOperationId: createKey },
        select: { id: true, teacherProfileId: true, updatedAt: true },
      });
      if (replay) {
        return replay.teacherProfileId === teacherProfileId
          ? { kind: "replay" as const, homework: replay }
          : { kind: "operation-conflict" as const };
      }

      const lesson = await validateOwnedLesson(tx, teacherProfileId, data.lessonId);
      if (!lesson) return { kind: "lesson-not-found" as const };

      const activeStudents = await validateActiveStudents(tx, data.studentProfileIds);
      if (activeStudents.size !== data.studentProfileIds.length) {
        return { kind: "student-forbidden" as const };
      }

      const homework = await tx.homework.create({
        data: {
          createdByMobileOperationId: createKey,
          dueDate: data.dueDate,
          instructions: data.instructions,
          kind: "TEXT",
          lessonId: data.lessonId,
          questions: { create: questionsData(data.questions) },
          status: data.status,
          studentAssignments: {
            create: assignmentsData(data.studentProfileIds, teacherProfileId),
          },
          teacherProfileId,
          title: data.title,
        },
        select: { id: true, teacherProfileId: true, updatedAt: true },
      });
      return { kind: "created" as const, homework };
    });

    if (result.kind === "operation-conflict") {
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    if (result.kind === "lesson-not-found") {
      return failure("NOT_FOUND", "Aula nao encontrada.");
    }
    if (result.kind === "student-forbidden") {
        return failure(
          "STUDENT_FORBIDDEN",
          "Selecione somente alunos ativos.",
        );
    }

    return mutationSuccess(
      result.homework,
      result.kind === "replay"
        ? "Tarefa ja criada anteriormente."
        : "Tarefa criada com sucesso.",
      result.kind === "replay",
    );
  } catch (error) {
    if (isUniqueConflict(error)) {
      const replay = await store.homework.findUnique({
        where: { createdByMobileOperationId: createKey },
        select: { id: true, teacherProfileId: true, updatedAt: true },
      });
      if (replay?.teacherProfileId === teacherProfileId) {
        return mutationSuccess(replay, "Tarefa ja criada anteriormente.", true);
      }
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    throw error;
  }
}

export async function updateMobileTeacherHomework(
  userId: string,
  homeworkId: string,
  rawInput: unknown,
  options: EditorOptions = {},
): Promise<MutationResult> {
  const parsed = updateHomeworkSchema.safeParse(rawInput);
  if (!parsed.success || !z.string().trim().min(1).max(80).safeParse(homeworkId).success) {
    return failure(
      "INVALID",
      "Revise os dados da tarefa.",
      parsed.success ? undefined : validationErrors(parsed.error),
    );
  }

  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);
  if (!teacherProfileId) {
    return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }

  const data = parsed.data;
  const updateKey = operationKey("update", data.operationId);

  try {
    const result = await store.$transaction(async (tx) => {
      const homework = await tx.homework.findFirst({
        where: { id: homeworkId, teacherProfileId },
        select: {
          _count: { select: { submissions: true } },
          id: true,
          kind: true,
          lastMobileOperationId: true,
          lesson: { select: { studentProfileId: true } },
          studentAssignments: { select: { studentProfileId: true } },
          updatedAt: true,
        },
      });
      if (!homework) return { kind: "not-found" as const };
      if (homework.lastMobileOperationId === updateKey) {
        return { kind: "replay" as const, homework };
      }
      if (homework.updatedAt.getTime() !== data.expectedUpdatedAt.getTime()) {
        return { kind: "conflict" as const };
      }

      const lesson = await validateOwnedLesson(tx, teacherProfileId, data.lessonId);
      if (!lesson) return { kind: "lesson-not-found" as const };

      const activeStudents = await validateActiveStudents(tx, data.studentProfileIds);
      if (activeStudents.size !== data.studentProfileIds.length) {
        return { kind: "student-forbidden" as const };
      }

      const assignedStudents = homework.studentAssignments.map(
        (assignment) => assignment.studentProfileId,
      );
      const currentStudents =
        assignedStudents.length > 0
          ? assignedStudents
          : homework.lesson.studentProfileId
            ? [homework.lesson.studentProfileId]
            : [];
      const assignmentsChanged = !sameStudents(
        currentStudents,
        data.studentProfileIds,
      );
      if (homework._count.submissions > 0 && assignmentsChanged) {
        return { kind: "assignments-locked" as const };
      }
      if (homework.kind === "TEXT" && data.questions.length === 0) {
        return { kind: "questions-required" as const };
      }

      const updated = await tx.homework.updateMany({
        where: {
          id: homework.id,
          teacherProfileId,
          updatedAt: data.expectedUpdatedAt,
        },
        data: {
          dueDate: data.dueDate,
          instructions: data.instructions,
          lastMobileOperationId: updateKey,
          lessonId: data.lessonId,
          status: data.status,
          title: data.title,
        },
      });
      if (updated.count !== 1) return { kind: "conflict" as const };

      if (homework.kind === "TEXT") {
        await tx.homeworkQuestion.deleteMany({ where: { homeworkId } });
        await tx.homeworkQuestion.createMany({
          data: questionsData(data.questions).map((question) => ({
            ...question,
            homeworkId,
          })),
        });
      }

      if (assignmentsChanged) {
        await tx.homeworkStudentAssignment.deleteMany({ where: { homeworkId } });
        await tx.homeworkStudentAssignment.createMany({
          data: assignmentsData(data.studentProfileIds, teacherProfileId).map(
            (assignment) => ({ ...assignment, homeworkId }),
          ),
        });
      }

      const confirmed = await tx.homework.findUnique({
        where: { id: homework.id },
        select: { id: true, updatedAt: true },
      });
      if (!confirmed) return { kind: "not-found" as const };
      return { kind: "updated" as const, homework: confirmed };
    });

    if (result.kind === "not-found" || result.kind === "lesson-not-found") {
      return failure("NOT_FOUND", "Tarefa ou aula nao encontrada.");
    }
    if (result.kind === "conflict") {
      return failure(
        "CONFLICT",
        "Esta tarefa mudou no site ou em outro aparelho. Recarregue antes de salvar.",
      );
    }
    if (result.kind === "student-forbidden") {
        return failure(
          "STUDENT_FORBIDDEN",
          "Selecione somente alunos ativos.",
        );
    }
    if (result.kind === "assignments-locked") {
      return failure(
        "ASSIGNMENTS_LOCKED",
        "Os alunos nao podem ser alterados porque ja existem entregas.",
      );
    }
    if (result.kind === "questions-required") {
      return failure("INVALID", "Adicione pelo menos uma pergunta.");
    }

    return mutationSuccess(
      result.homework,
      result.kind === "replay"
        ? "Alteracao ja salva anteriormente."
        : "Tarefa atualizada com sucesso.",
      result.kind === "replay",
    );
  } catch (error) {
    if (isUniqueConflict(error)) {
      const replay = await store.homework.findUnique({
        where: { lastMobileOperationId: updateKey },
        select: { id: true, teacherProfileId: true, updatedAt: true },
      });
      if (replay?.teacherProfileId === teacherProfileId && replay.id === homeworkId) {
        return mutationSuccess(replay, "Alteracao ja salva anteriormente.", true);
      }
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    throw error;
  }
}

export async function getMobileTeacherHomeworkEditor(
  userId: string,
  homeworkId: string,
  options: EditorOptions = {},
): Promise<{
  data?: MobileTeacherHomeworkEditor;
  message: string;
  ok: boolean;
  reason?: MobileTeacherHomeworkFailureReason;
}> {
  if (!z.string().trim().min(1).max(80).safeParse(homeworkId).success) {
    return { message: "Tarefa invalida.", ok: false, reason: "INVALID" };
  }

  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);
  if (!teacherProfileId) {
    return {
      message: "Perfil de teacher nao encontrado.",
      ok: false,
      reason: "PROFILE_NOT_FOUND",
    };
  }

  const homework: EditorHomeworkRow | null = await store.homework.findFirst({
    where: { id: homeworkId, teacherProfileId },
    select: editorHomeworkSelect,
  });
  if (!homework) {
    return { message: "Tarefa nao encontrada.", ok: false, reason: "NOT_FOUND" };
  }
  if (
    homework.questions.length > MAX_QUESTIONS ||
    homework.studentAssignments.length > MAX_STUDENTS
  ) {
    return {
      message: "Esta tarefa excede o limite seguro do editor movel.",
      ok: false,
      reason: "LIMIT_EXCEEDED",
    };
  }
  const assignedStudentIds = homework.studentAssignments.map(
    (assignment) => assignment.studentProfileId,
  );

  return {
    data: {
      assetFileName: homework.assetFileName,
      dueDate: homework.dueDate?.toISOString() ?? null,
      hasSubmissions: homework._count.submissions > 0,
      id: homework.id,
      instructions: homework.instructions,
      interactiveFieldCount: homework._count.interactiveFields,
      kind: homework.kind,
      lessonId: homework.lessonId,
      questions: homework.questions,
      status: homework.status,
      studentProfileIds: assignedStudentIds.length
        ? assignedStudentIds
        : homework.lesson.studentProfileId
          ? [homework.lesson.studentProfileId]
          : [],
      title: homework.title,
      updatedAt: homework.updatedAt.toISOString(),
    },
    message: "Tarefa carregada.",
    ok: true,
  };
}

export async function getMobileTeacherHomeworkOptions(
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

  const [lessons, students] = await Promise.all([
    store.lesson.findMany({
      where: { teacherProfileId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        studentProfileId: true,
        title: true,
      },
    }),
    store.studentProfile.findMany({
      where: getStaffStudentSelectionWhere(),
      orderBy: { user: { name: "asc" } },
      take: 100,
      select: {
        id: true,
        level: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  return {
    data: {
      lessons,
      students: students.map((student) => ({
        id: student.id,
        level: student.level,
        name: student.user.name,
      })),
    },
    message: "Opcoes carregadas.",
    ok: true as const,
  };
}

export async function duplicateMobileTeacherHomework(
  userId: string,
  homeworkId: string,
  rawInput: unknown,
  options: EditorOptions = {},
): Promise<DuplicateResult> {
  const parsed = duplicateHomeworkSchema.safeParse(rawInput);
  if (!parsed.success || !z.string().trim().min(1).max(80).safeParse(homeworkId).success) {
    return duplicateFailure(
      "INVALID",
      "Revise os alunos selecionados.",
      parsed.success ? undefined : validationErrors(parsed.error),
    );
  }

  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);
  if (!teacherProfileId) {
    return duplicateFailure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }

  const source: DuplicateHomeworkRow | null = await store.homework.findFirst({
    where: { id: homeworkId, teacherProfileId },
    select: duplicateHomeworkSelect,
  });
  if (!source) {
    return duplicateFailure("NOT_FOUND", "Tarefa nao encontrada.");
  }
  if (source.fieldDetectionSource === "lesson-manual") {
    return duplicateFailure(
      "INVALID",
      "Aulas interativas nao podem ser duplicadas como homework.",
    );
  }

  const targetStudentIds = parsed.data.studentProfileIds.filter(
    (studentId) =>
      studentId !== source.lesson.studentProfileId &&
      !source.studentAssignments.some(
        (assignment) => assignment.studentProfileId === studentId,
      ),
  );
  if (targetStudentIds.length === 0) {
    return duplicateFailure("INVALID", "Selecione pelo menos outro aluno.");
  }

  const activeStudents = await validateActiveStudents(store, targetStudentIds);
  if (activeStudents.size !== targetStudentIds.length) {
    return duplicateFailure(
      "STUDENT_FORBIDDEN",
      "Selecione somente alunos ativos.",
    );
  }

  try {
    const duplicated = await store.$transaction(async (tx) => {
      const homeworkIds: string[] = [];
      let createdCount = 0;
      let skippedCount = 0;

      for (const studentProfileId of targetStudentIds) {
        const createKey = duplicateOperationKey(
          parsed.data.operationId,
          studentProfileId,
        );
        const replay = await tx.homework.findUnique({
          where: { createdByMobileOperationId: createKey },
          select: {
            id: true,
            replicatedFromHomeworkId: true,
            teacherProfileId: true,
          },
        });
        if (replay) {
          if (
            replay.teacherProfileId !== teacherProfileId ||
            replay.replicatedFromHomeworkId !== source.id
          ) {
            return { kind: "operation-conflict" as const };
          }
          homeworkIds.push(replay.id);
          skippedCount += 1;
          continue;
        }

        const existing = await tx.homework.findFirst({
          where: {
            replicatedFromHomeworkId: source.id,
            teacherProfileId,
            lesson: { studentProfileId },
          },
          select: { id: true },
        });
        if (existing) {
          homeworkIds.push(existing.id);
          skippedCount += 1;
          continue;
        }

        const lesson = await tx.lesson.create({
          data: {
            description: source.lesson.description,
            scheduledAt: source.lesson.scheduledAt,
            status: source.lesson.status,
            studentProfileId,
            teacherProfileId,
            title: source.lesson.title,
          },
          select: { id: true },
        });
        const homework = await tx.homework.create({
          data: {
            assetFileName: source.assetFileName,
            assetMimeType: source.assetMimeType,
            assetPageCount: source.assetPageCount,
            assetSizeBytes: source.assetSizeBytes,
            assetStoragePath: source.assetStoragePath,
            createdByMobileOperationId: createKey,
            dueDate: source.dueDate,
            fieldDetectionSource: source.fieldDetectionSource,
            instructions: source.instructions,
            interactiveFields:
              source.interactiveFields.length > 0
                ? { create: source.interactiveFields }
                : undefined,
            kind: source.kind,
            lessonId: lesson.id,
            questions:
              source.questions.length > 0
                ? { create: source.questions }
                : undefined,
            replicatedFromHomeworkId: source.id,
            status: source.status,
            studentAssignments: {
              create: {
                assignedByTeacherProfileId: teacherProfileId,
                studentProfileId,
              },
            },
            teacherProfileId,
            title: source.title,
          },
          select: { id: true },
        });
        homeworkIds.push(homework.id);
        createdCount += 1;
      }

      return {
        createdCount,
        homeworkIds,
        kind: "success" as const,
        skippedCount,
      };
    });

    if (duplicated.kind === "operation-conflict") {
      return duplicateFailure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    return {
      data: {
        createdCount: duplicated.createdCount,
        homeworkIds: duplicated.homeworkIds,
        replayed: duplicated.createdCount === 0,
        skippedCount: duplicated.skippedCount,
      },
      message:
        duplicated.createdCount > 0
          ? `${duplicated.createdCount} tarefa(s) duplicada(s) com sucesso.`
          : "As tarefas selecionadas ja estavam duplicadas.",
      ok: true,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      const replays = await Promise.all(
        targetStudentIds.map((studentProfileId) =>
          store.homework.findUnique({
            where: {
              createdByMobileOperationId: duplicateOperationKey(
                parsed.data.operationId,
                studentProfileId,
              ),
            },
            select: {
              id: true,
              replicatedFromHomeworkId: true,
              teacherProfileId: true,
            },
          }),
        ),
      );
      if (
        replays.every(
          (replay) =>
            replay?.teacherProfileId === teacherProfileId &&
            replay.replicatedFromHomeworkId === source.id,
        )
      ) {
        return {
          data: {
            createdCount: 0,
            homeworkIds: replays.map((replay) => replay!.id),
            replayed: true,
            skippedCount: replays.length,
          },
          message: "As tarefas selecionadas ja estavam duplicadas.",
          ok: true,
        };
      }
      return duplicateFailure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    throw error;
  }
}

export async function deleteMobileTeacherHomework(
  userId: string,
  homeworkId: string,
  rawInput: unknown,
  options: EditorOptions = {},
): Promise<MutationResult> {
  const parsed = deleteHomeworkSchema.safeParse(rawInput);
  if (!parsed.success || !z.string().trim().min(1).max(80).safeParse(homeworkId).success) {
    return failure(
      "INVALID",
      "Solicitacao de exclusao invalida.",
      parsed.success ? undefined : validationErrors(parsed.error),
    );
  }

  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);
  if (!teacherProfileId) {
    return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }

  const deleteKey = operationKey("delete", parsed.data.operationId);
  const existingDeletion = await store.mobileTeacherHomeworkDeletion.findUnique({
    where: { operationId: deleteKey },
    select: { homeworkId: true, teacherProfileId: true },
  });
  if (existingDeletion) {
    if (
      existingDeletion.teacherProfileId === teacherProfileId &&
      existingDeletion.homeworkId === homeworkId
    ) {
      return {
        data: { homeworkId, replayed: true },
        message: "Tarefa ja excluida anteriormente.",
        ok: true,
      };
    }
    return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
  }

  try {
    const deleted = await store.$transaction(async (tx) => {
      const replay = await tx.mobileTeacherHomeworkDeletion.findUnique({
        where: { operationId: deleteKey },
        select: { homeworkId: true, teacherProfileId: true },
      });
      if (replay) {
        return replay.teacherProfileId === teacherProfileId &&
          replay.homeworkId === homeworkId
          ? { assetStoragePath: null, kind: "replay" as const }
          : { assetStoragePath: null, kind: "operation-conflict" as const };
      }

      const homework = await tx.homework.findFirst({
        where: { id: homeworkId, teacherProfileId },
        select: {
          assetStoragePath: true,
          fieldDetectionSource: true,
          id: true,
          lesson: {
            select: {
              _count: {
                select: { homeworks: true, materials: true, vocabularyItems: true },
              },
              id: true,
              title: true,
            },
          },
          updatedAt: true,
        },
      });
      if (!homework) return { assetStoragePath: null, kind: "not-found" as const };
      if (homework.updatedAt.getTime() !== parsed.data.expectedUpdatedAt.getTime()) {
        return { assetStoragePath: null, kind: "conflict" as const };
      }

      const shouldDeleteInternalLesson =
        (homework.lesson.title.startsWith("Homework - ") ||
          homework.fieldDetectionSource === "lesson-manual") &&
        homework.lesson._count.homeworks === 1 &&
        homework.lesson._count.materials === 0 &&
        homework.lesson._count.vocabularyItems === 0;

      await tx.homework.delete({ where: { id: homework.id } });
      if (shouldDeleteInternalLesson) {
        await tx.lesson.delete({ where: { id: homework.lesson.id } });
      }
      await tx.mobileTeacherHomeworkDeletion.create({
        data: {
          homeworkId,
          operationId: deleteKey,
          teacherProfileId,
        },
      });
      return {
        assetStoragePath: homework.assetStoragePath,
        kind: "deleted" as const,
      };
    });

    if (deleted.kind === "not-found") {
      return failure("NOT_FOUND", "Tarefa nao encontrada.");
    }
    if (deleted.kind === "conflict") {
      return failure(
        "CONFLICT",
        "Esta tarefa mudou no site ou em outro aparelho. Recarregue antes de excluir.",
      );
    }
    if (deleted.kind === "operation-conflict") {
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }

    if (deleted.assetStoragePath) {
      const remainingReferences = await store.homework.count({
        where: { assetStoragePath: deleted.assetStoragePath },
      });
      if (remainingReferences === 0) {
        const removeAsset =
          options.removeAsset ??
          (async (relativePath: string) => {
            await unlink(getStoragePath(relativePath)).catch(() => undefined);
          });
        await removeAsset(deleted.assetStoragePath);
      }
    }

    return {
      data: { homeworkId, replayed: deleted.kind === "replay" },
      message:
        deleted.kind === "replay"
          ? "Tarefa ja excluida anteriormente."
          : "Tarefa excluida com sucesso.",
      ok: true,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      const replay = await store.mobileTeacherHomeworkDeletion.findUnique({
        where: { operationId: deleteKey },
        select: { homeworkId: true, teacherProfileId: true },
      });
      if (replay?.teacherProfileId === teacherProfileId && replay.homeworkId === homeworkId) {
        return {
          data: { homeworkId, replayed: true },
          message: "Tarefa ja excluida anteriormente.",
          ok: true,
        };
      }
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    throw error;
  }
}
