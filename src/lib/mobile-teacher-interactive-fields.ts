import type { Prisma } from "@/generated/prisma/client";
import {
  HOMEWORK_FIELD_TYPES,
  normalizeListeningSentence,
} from "@/lib/interactive-homework-fields";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_FIELDS = 120;
const MAX_PAGES = 20;

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

const fieldSchema = z
  .object({
    height: z.number().min(1).max(100),
    id: z.string().trim().min(1).max(80).nullable(),
    label: nullableText(80),
    page: z.number().int().min(1).max(MAX_PAGES),
    placeholder: nullableText(2000),
    required: z.boolean(),
    type: z.enum(HOMEWORK_FIELD_TYPES),
    width: z.number().min(1).max(100),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })
  .strict();

const updateSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime().transform((value) => new Date(value)),
    fields: z.array(fieldSchema).max(MAX_FIELDS),
    operationId: z.string().uuid("Operacao invalida."),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.fields.flatMap((field) => (field.id ? [field.id] : []));
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "Nao repita o mesmo campo.",
        path: ["fields"],
      });
    }
  });

const editorSelect = {
  _count: { select: { submissions: true } },
  assetFileName: true,
  assetPageCount: true,
  fieldDetectionSource: true,
  id: true,
  interactiveFields: {
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
    take: MAX_FIELDS + 1,
  },
  kind: true,
  lastMobileOperationId: true,
  title: true,
  updatedAt: true,
} satisfies Prisma.HomeworkSelect;

type EditorRow = Prisma.HomeworkGetPayload<{ select: typeof editorSelect }>;

export type MobileTeacherInteractiveFieldStore = Pick<
  ReturnType<typeof getPrisma>,
  "$transaction" | "homework" | "teacherProfile"
>;

type Options = { store?: MobileTeacherInteractiveFieldStore };
export type MobileTeacherInteractiveFieldFailureReason =
  | "CONFLICT"
  | "FIELDS_LOCKED"
  | "INVALID"
  | "LIMIT_EXCEEDED"
  | "NOT_FOUND"
  | "OPERATION_CONFLICT"
  | "PROFILE_NOT_FOUND";
type Reason = MobileTeacherInteractiveFieldFailureReason;

type SavedField = EditorRow["interactiveFields"][number];

export type MobileTeacherInteractiveFieldEditor = {
  assetFileName: string | null;
  fields: SavedField[];
  hasSubmissions: boolean;
  homeworkId: string;
  pageCount: number;
  title: string;
  updatedAt: string;
};

type Result = {
  data?: MobileTeacherInteractiveFieldEditor & { replayed?: boolean };
  errors?: Record<string, string>;
  message: string;
  ok: boolean;
  reason?: Reason;
};

function validationErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[issue.path.join(".") || "form"] ??= issue.message;
  }
  return errors;
}

function failure(reason: Reason, message: string, errors?: Record<string, string>): Result {
  return { errors, message, ok: false, reason };
}

function operationKey(operationId: string) {
  return `homework:fields:${operationId}`;
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function minimums(type: (typeof HOMEWORK_FIELD_TYPES)[number]) {
  if (type === "CHECKBOX" || type === "TINY_TEXT") {
    return { height: 1, width: 1 };
  }
  if (type === "SHORT_TEXT") return { height: 1.2, width: 3 };
  if (type === "DRAWING") return { height: 6, width: 8 };
  if (type === "LISTENING") return { height: 1.6, width: 4 };
  return { height: 4, width: 8 };
}

function normalizedField(field: z.output<typeof fieldSchema>, index: number) {
  const size = minimums(field.type);
  const x = Math.min(field.x, 100 - size.width);
  const y = Math.min(field.y, 100 - size.height);
  return {
    height: Math.max(size.height, Math.min(field.height, 100 - y)),
    label: field.label,
    page: field.page,
    placeholder:
      field.type === "LISTENING"
        ? normalizeListeningSentence(field.placeholder ?? "") || null
        : field.placeholder,
    required: field.type === "LISTENING" ? false : field.required,
    sortOrder: index,
    type: field.type,
    width: Math.max(size.width, Math.min(field.width, 100 - x)),
    x,
    y,
  };
}

async function teacherProfileId(
  store: MobileTeacherInteractiveFieldStore,
  userId: string,
) {
  const profile = await store.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

function normalizeEditor(row: EditorRow): MobileTeacherInteractiveFieldEditor | null {
  if (row.interactiveFields.length > MAX_FIELDS) return null;
  return {
    assetFileName: row.assetFileName,
    fields: row.interactiveFields,
    hasSubmissions: row._count.submissions > 0,
    homeworkId: row.id,
    pageCount: Math.max(1, Math.min(row.assetPageCount, MAX_PAGES)),
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getMobileTeacherInteractiveFields(
  userId: string,
  homeworkId: string,
  options: Options = {},
): Promise<Result> {
  if (!z.string().trim().min(1).max(80).safeParse(homeworkId).success) {
    return failure("INVALID", "Tarefa invalida.");
  }
  const store = options.store ?? getPrisma();
  const profileId = await teacherProfileId(store, userId);
  if (!profileId) return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");

  const row: EditorRow | null = await store.homework.findFirst({
    where: { id: homeworkId, kind: "INTERACTIVE", teacherProfileId: profileId },
    select: editorSelect,
  });
  if (!row) return failure("NOT_FOUND", "Tarefa interativa nao encontrada.");
  const data = normalizeEditor(row);
  if (!data) {
    return failure(
      "LIMIT_EXCEEDED",
      "Esta tarefa excede o limite seguro do editor movel.",
    );
  }
  return { data, message: "Campos carregados.", ok: true };
}

export async function updateMobileTeacherInteractiveFields(
  userId: string,
  homeworkId: string,
  rawInput: unknown,
  options: Options = {},
): Promise<Result> {
  const parsed = updateSchema.safeParse(rawInput);
  if (!parsed.success || !z.string().trim().min(1).max(80).safeParse(homeworkId).success) {
    return failure(
      "INVALID",
      "Revise os campos interativos.",
      parsed.success ? undefined : validationErrors(parsed.error),
    );
  }
  const store = options.store ?? getPrisma();
  const profileId = await teacherProfileId(store, userId);
  if (!profileId) return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  const data = parsed.data;
  const updateKey = operationKey(data.operationId);

  try {
    const result = await store.$transaction(async (tx) => {
      await acquireTransactionAdvisoryLock(
        tx,
        `homework-structure:${homeworkId}`,
      );
      const homework = await tx.homework.findFirst({
        where: { id: homeworkId, teacherProfileId: profileId },
        select: editorSelect,
      });
      if (!homework || homework.kind !== "INTERACTIVE") {
        return { kind: "not-found" as const };
      }
      if (homework.lastMobileOperationId === updateKey) {
        return { homework, kind: "replay" as const };
      }
      if (homework.updatedAt.getTime() !== data.expectedUpdatedAt.getTime()) {
        return { kind: "conflict" as const };
      }
      if (homework._count.submissions > 0) return { kind: "locked" as const };
      if (data.fields.some((field) => field.page > homework.assetPageCount)) {
        return { kind: "invalid-page" as const };
      }

      const existingIds = new Set(homework.interactiveFields.map((field) => field.id));
      const retainedIds = data.fields.flatMap((field) => (field.id ? [field.id] : []));
      if (retainedIds.some((id) => !existingIds.has(id))) {
        return { kind: "conflict" as const };
      }

      const changed = await tx.homework.updateMany({
        where: {
          id: homework.id,
          teacherProfileId: profileId,
          updatedAt: data.expectedUpdatedAt,
        },
        data: {
          fieldDetectionSource:
            homework.fieldDetectionSource === "lesson-manual" ? "lesson-manual" : "manual",
          lastMobileOperationId: updateKey,
        },
      });
      if (changed.count !== 1) return { kind: "conflict" as const };

      await tx.homeworkInteractiveField.deleteMany({
        where:
          retainedIds.length > 0
            ? { homeworkId: homework.id, id: { notIn: retainedIds } }
            : { homeworkId: homework.id },
      });
      for (const [index, field] of data.fields.entries()) {
        const normalized = normalizedField(field, index);
        if (field.id) {
          await tx.homeworkInteractiveField.update({
            where: { id: field.id },
            data: normalized,
          });
        } else {
          await tx.homeworkInteractiveField.create({
            data: { ...normalized, homeworkId: homework.id },
          });
        }
      }

      const confirmed = await tx.homework.findUnique({
        where: { id: homework.id },
        select: editorSelect,
      });
      if (!confirmed) return { kind: "not-found" as const };
      return { homework: confirmed, kind: "updated" as const };
    });

    if (result.kind === "not-found") {
      return failure("NOT_FOUND", "Tarefa interativa nao encontrada.");
    }
    if (result.kind === "conflict") {
      return failure(
        "CONFLICT",
        "Os campos mudaram no site ou em outro aparelho. Recarregue antes de salvar.",
      );
    }
    if (result.kind === "locked") {
      return failure(
        "FIELDS_LOCKED",
        "Os campos nao podem ser alterados porque ja existem entregas.",
      );
    }
    if (result.kind === "invalid-page") {
      return failure("INVALID", "Selecione somente paginas existentes no arquivo.");
    }
    const editor = normalizeEditor(result.homework);
    if (!editor) return failure("LIMIT_EXCEEDED", "A confirmacao excedeu o limite seguro.");
    return {
      data: { ...editor, replayed: result.kind === "replay" },
      message:
        result.kind === "replay"
          ? "Campos ja salvos anteriormente."
          : `${editor.fields.length} campo(s) salvos com sucesso.`,
      ok: true,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      const replay = await store.homework.findUnique({
        where: { lastMobileOperationId: updateKey },
        select: { ...editorSelect, teacherProfileId: true },
      });
      if (replay?.teacherProfileId === profileId && replay.id === homeworkId) {
        const editor = normalizeEditor(replay);
        if (editor) {
          return {
            data: { ...editor, replayed: true },
            message: "Campos ja salvos anteriormente.",
            ok: true,
          };
        }
      }
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    throw error;
  }
}
