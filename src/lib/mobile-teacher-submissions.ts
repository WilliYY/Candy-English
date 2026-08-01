import type { Prisma } from "@/generated/prisma/client";
import { readTextHomeworkAnswer } from "@/lib/homework-submission-service";
import { readInteractiveAnswers } from "@/lib/interactive-homework-service";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_FIELDS = 120;
const MAX_QUESTIONS = 50;
const MAX_QUEUE_ITEMS = 100;
const MAX_RESPONSE_CHARS = 1_000_000;

const expectedVersionSchema = z.object({
  expectedReviewedAt: z
    .string()
    .datetime()
    .nullable()
    .transform((value) => (value ? new Date(value) : null)),
  expectedStatus: z.enum(["REVIEWED", "SUBMITTED"]),
  expectedSubmittedAt: z.string().datetime().transform((value) => new Date(value)),
  operationId: z.string().uuid("Operacao invalida."),
});

const reviewInputSchema = expectedVersionSchema
  .extend({
    feedback: z
      .string()
      .trim()
      .min(2, "Escreva um feedback para o aluno.")
      .max(6000, "O feedback pode ter no maximo 6000 caracteres."),
  })
  .strict();

const redoInputSchema = expectedVersionSchema
  .extend({
    feedback: z
      .string()
      .trim()
      .max(6000, "O feedback pode ter no maximo 6000 caracteres.")
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  .strict();

const detailSelect = {
  answers: true,
  feedback: true,
  homework: {
    select: {
      id: true,
      instructions: true,
      interactiveFields: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          placeholder: true,
          sortOrder: true,
          type: true,
        },
        take: MAX_FIELDS + 1,
      },
      kind: true,
      lesson: { select: { title: true } },
      questions: {
        orderBy: { sortOrder: "asc" },
        select: { expectedAnswer: true, id: true, prompt: true },
        take: MAX_QUESTIONS + 1,
      },
      teacherProfileId: true,
      title: true,
    },
  },
  id: true,
  reviewedAt: true,
  status: true,
  studentProfile: {
    select: {
      id: true,
      level: true,
      user: { select: { name: true } },
    },
  },
  submittedAt: true,
  teacherAnnotations: true,
} satisfies Prisma.HomeworkSubmissionSelect;

type SubmissionDetailRow = Prisma.HomeworkSubmissionGetPayload<{
  select: typeof detailSelect;
}>;

export type MobileTeacherSubmissionStore = Pick<
  ReturnType<typeof getPrisma>,
  "$transaction" | "homeworkSubmission" | "teacherProfile"
>;

type ServiceOptions = {
  acquireLock?: typeof acquireTransactionAdvisoryLock;
  store?: MobileTeacherSubmissionStore;
};

type FailureReason =
  | "CONFLICT"
  | "INVALID"
  | "LIMIT_EXCEEDED"
  | "NOT_FOUND"
  | "OPERATION_CONFLICT"
  | "PROFILE_NOT_FOUND"
  | "STATE_FORBIDDEN";

type MutationResult = {
  data?: {
    feedback: string | null;
    replayed: boolean;
    reviewedAt: string | null;
    status: "RETURNED" | "REVIEWED" | "SUBMITTED";
    submissionId: string;
    submittedAt: string;
  };
  errors?: Record<string, string>;
  message: string;
  ok: boolean;
  reason?: FailureReason;
};

export type MobileTeacherSubmissionDetail = {
  answers: {
    id: string;
    label: string;
    type:
      | "CHECKBOX"
      | "DRAWING"
      | "LISTENING"
      | "LONG_TEXT"
      | "SHORT_TEXT"
      | "TEXT"
      | "TINY_TEXT";
    value: string;
  }[];
  feedback: string | null;
  hasAnnotations: boolean;
  homework: {
    id: string;
    instructions: string | null;
    kind: "INTERACTIVE" | "TEXT";
    lessonTitle: string;
    questions: {
      expectedAnswer: string | null;
      id: string;
      prompt: string;
    }[];
    title: string;
  };
  id: string;
  reviewedAt: string | null;
  status: "RETURNED" | "REVIEWED" | "SUBMITTED";
  student: { id: string; level: string | null; name: string };
  submittedAt: string;
};

function validationErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[issue.path.join(".") || "form"] ??= issue.message;
  }
  return errors;
}

function failure(
  reason: FailureReason,
  message: string,
  errors?: Record<string, string>,
): MutationResult {
  return { errors, message, ok: false, reason };
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function reviewOperationKey(operationId: string) {
  return `submission:review:${operationId}`;
}

function redoOperationKey(operationId: string) {
  return `submission:redo:${operationId}`;
}

function datesMatch(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

async function getTeacherProfileId(
  store: MobileTeacherSubmissionStore,
  userId: string,
) {
  const profile = await store.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

function mutationSuccess(
  submission: {
    feedback: string | null;
    id: string;
    reviewedAt: Date | null;
    status: string;
    submittedAt: Date;
  },
  message: string,
  replayed: boolean,
): MutationResult {
  if (
    submission.status !== "RETURNED" &&
    submission.status !== "REVIEWED" &&
    submission.status !== "SUBMITTED"
  ) {
    throw new Error("Estado de entrega inesperado apos a correcao.");
  }

  return {
    data: {
      feedback: submission.feedback,
      replayed,
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      status: submission.status,
      submissionId: submission.id,
      submittedAt: submission.submittedAt.toISOString(),
    },
    message,
    ok: true,
  };
}

function answerLabel(
  field: SubmissionDetailRow["homework"]["interactiveFields"][number],
  index: number,
) {
  if (field.label?.trim()) return field.label.trim();
  if (field.type !== "LISTENING" && field.placeholder?.trim()) {
    return field.placeholder.trim();
  }
  return `Campo ${index + 1}`;
}

function normalizeDetail(row: SubmissionDetailRow): MobileTeacherSubmissionDetail | null {
  if (
    row.homework.questions.length > MAX_QUESTIONS ||
    row.homework.interactiveFields.length > MAX_FIELDS
  ) {
    return null;
  }

  const interactiveAnswers =
    row.homework.kind === "INTERACTIVE" ? readInteractiveAnswers(row.answers) : [];
  if (
    interactiveAnswers.length > 80 ||
    interactiveAnswers.some((answer) => answer.value.length > 50_000)
  ) {
    return null;
  }

  const answers =
    row.homework.kind === "TEXT"
      ? [
          {
            id: "text-answer",
            label: row.homework.questions[0]?.prompt ?? "Resposta do aluno",
            type: "TEXT" as const,
            value: readTextHomeworkAnswer(row.answers),
          },
        ]
      : interactiveAnswers.map((answer) => {
          const index = row.homework.interactiveFields.findIndex(
            (field) => field.id === answer.fieldId,
          );
          const field = row.homework.interactiveFields[index];
          return {
            id: answer.fieldId,
            label: field ? answerLabel(field, index) : "Campo removido",
            type: field?.type ?? ("TEXT" as const),
            value: answer.value,
          };
        });

  if (
    answers.length > 80 ||
    answers.reduce((total, answer) => total + answer.value.length, 0) >
      MAX_RESPONSE_CHARS
  ) {
    return null;
  }

  return {
    answers,
    feedback: row.feedback,
    hasAnnotations: row.teacherAnnotations !== null,
    homework: {
      id: row.homework.id,
      instructions: row.homework.instructions,
      kind: row.homework.kind,
      lessonTitle: row.homework.lesson.title,
      questions: row.homework.questions,
      title: row.homework.title,
    },
    id: row.id,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    status: row.status as "RETURNED" | "REVIEWED" | "SUBMITTED",
    student: {
      id: row.studentProfile.id,
      level: row.studentProfile.level,
      name: row.studentProfile.user.name,
    },
    submittedAt: row.submittedAt.toISOString(),
  };
}

export async function getMobileTeacherSubmissionQueue(
  userId: string,
  options: ServiceOptions = {},
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

  const rows = await store.homeworkSubmission.findMany({
    where: {
      homework: { teacherProfileId },
      status: { not: "DRAFT" },
    },
    orderBy: { submittedAt: "desc" },
    take: MAX_QUEUE_ITEMS + 1,
    select: {
      feedback: true,
      homework: {
        select: {
          id: true,
          kind: true,
          lesson: { select: { title: true } },
          title: true,
        },
      },
      id: true,
      reviewedAt: true,
      status: true,
      studentProfile: {
        select: {
          id: true,
          level: true,
          user: { select: { name: true } },
        },
      },
      submittedAt: true,
    },
  });
  const hasMore = rows.length > MAX_QUEUE_ITEMS;

  return {
    data: {
      hasMore,
      submissions: rows.slice(0, MAX_QUEUE_ITEMS).map((row) => ({
        feedbackPresent: Boolean(row.feedback),
        homeworkId: row.homework.id,
        homeworkKind: row.homework.kind,
        homeworkTitle: row.homework.title,
        id: row.id,
        lessonTitle: row.homework.lesson.title,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        status: row.status as "RETURNED" | "REVIEWED" | "SUBMITTED",
        studentLevel: row.studentProfile.level,
        studentName: row.studentProfile.user.name,
        submittedAt: row.submittedAt.toISOString(),
      })),
    },
    message: "Entregas carregadas.",
    ok: true as const,
  };
}

export async function getMobileTeacherSubmissionDetail(
  userId: string,
  submissionId: string,
  options: ServiceOptions = {},
): Promise<{
  data?: MobileTeacherSubmissionDetail;
  message: string;
  ok: boolean;
  reason?: FailureReason;
}> {
  if (!z.string().trim().min(1).max(80).safeParse(submissionId).success) {
    return { message: "Entrega invalida.", ok: false, reason: "INVALID" };
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

  const row: SubmissionDetailRow | null = await store.homeworkSubmission.findFirst({
    where: {
      homework: { teacherProfileId },
      id: submissionId,
      status: { not: "DRAFT" },
    },
    select: detailSelect,
  });
  if (!row) {
    return { message: "Entrega nao encontrada.", ok: false, reason: "NOT_FOUND" };
  }
  const data = normalizeDetail(row);
  if (!data) {
    return {
      message: "Esta entrega excede o limite seguro do aplicativo.",
      ok: false,
      reason: "LIMIT_EXCEEDED",
    };
  }
  return { data, message: "Entrega carregada.", ok: true };
}

export async function reviewMobileTeacherSubmission(
  userId: string,
  submissionId: string,
  rawInput: unknown,
  options: ServiceOptions = {},
): Promise<MutationResult> {
  const parsed = reviewInputSchema.safeParse(rawInput);
  if (!parsed.success || !z.string().trim().min(1).max(80).safeParse(submissionId).success) {
    return failure(
      "INVALID",
      "Revise o feedback.",
      parsed.success ? undefined : validationErrors(parsed.error),
    );
  }
  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);
  if (!teacherProfileId) {
    return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }
  const data = parsed.data;
  const operationId = reviewOperationKey(data.operationId);
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;

  try {
    const result = await store.$transaction(async (tx) => {
      const current = await tx.homeworkSubmission.findFirst({
        where: { homework: { teacherProfileId }, id: submissionId },
        select: {
          feedback: true,
          homeworkId: true,
          id: true,
          lastMobileReviewOperationId: true,
          reviewedAt: true,
          status: true,
          studentProfileId: true,
          submittedAt: true,
        },
      });
      if (!current) return { kind: "not-found" as const };
      await acquireLock(
        tx,
        `homework-submission:${current.homeworkId}:${current.studentProfileId}`,
      );
      const locked = await tx.homeworkSubmission.findUnique({
        where: { id: current.id },
        select: {
          feedback: true,
          id: true,
          lastMobileReviewOperationId: true,
          reviewedAt: true,
          status: true,
          submittedAt: true,
        },
      });
      if (!locked) return { kind: "not-found" as const };
      if (locked.lastMobileReviewOperationId === operationId) {
        return { kind: "replay" as const, submission: locked };
      }
      if (
        locked.status !== data.expectedStatus ||
        locked.submittedAt.getTime() !== data.expectedSubmittedAt.getTime() ||
        !datesMatch(locked.reviewedAt, data.expectedReviewedAt)
      ) {
        return { kind: "conflict" as const };
      }
      if (locked.status !== "SUBMITTED" && locked.status !== "REVIEWED") {
        return { kind: "state-forbidden" as const };
      }

      const reviewed = await tx.homeworkSubmission.update({
        where: { id: locked.id },
        data: {
          feedback: data.feedback,
          lastMobileRedoOperationId: null,
          lastMobileReviewOperationId: operationId,
          reviewedAt: new Date(),
          reviewedByTeacherProfileId: teacherProfileId,
          status: "REVIEWED",
        },
        select: {
          feedback: true,
          id: true,
          reviewedAt: true,
          status: true,
          submittedAt: true,
        },
      });
      return { kind: "reviewed" as const, submission: reviewed };
    });

    if (result.kind === "not-found") {
      return failure("NOT_FOUND", "Entrega nao encontrada.");
    }
    if (result.kind === "conflict") {
      return failure(
        "CONFLICT",
        "O aluno reenviou ou outra correcao mudou esta entrega. Recarregue antes de salvar.",
      );
    }
    if (result.kind === "state-forbidden") {
      return failure("STATE_FORBIDDEN", "Esta entrega nao esta pronta para correcao.");
    }
    return mutationSuccess(
      result.submission,
      result.kind === "replay"
        ? "Feedback ja enviado anteriormente."
        : "Feedback enviado com sucesso.",
      result.kind === "replay",
    );
  } catch (error) {
    if (isUniqueConflict(error)) {
      const replay = await store.homeworkSubmission.findUnique({
        where: { lastMobileReviewOperationId: operationId },
        select: {
          feedback: true,
          homework: { select: { teacherProfileId: true } },
          id: true,
          reviewedAt: true,
          status: true,
          submittedAt: true,
        },
      });
      if (replay?.homework.teacherProfileId === teacherProfileId && replay.id === submissionId) {
        return mutationSuccess(replay, "Feedback ja enviado anteriormente.", true);
      }
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    throw error;
  }
}

export async function redoMobileTeacherSubmission(
  userId: string,
  submissionId: string,
  rawInput: unknown,
  options: ServiceOptions = {},
): Promise<MutationResult> {
  const parsed = redoInputSchema.safeParse(rawInput);
  if (!parsed.success || !z.string().trim().min(1).max(80).safeParse(submissionId).success) {
    return failure(
      "INVALID",
      "Revise a liberacao da nova tentativa.",
      parsed.success ? undefined : validationErrors(parsed.error),
    );
  }
  const store = options.store ?? getPrisma();
  const teacherProfileId = await getTeacherProfileId(store, userId);
  if (!teacherProfileId) {
    return failure("PROFILE_NOT_FOUND", "Perfil de teacher nao encontrado.");
  }
  const data = parsed.data;
  const operationId = redoOperationKey(data.operationId);
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;

  try {
    const result = await store.$transaction(async (tx) => {
      const current = await tx.homeworkSubmission.findFirst({
        where: { homework: { teacherProfileId }, id: submissionId },
        select: {
          feedback: true,
          homeworkId: true,
          id: true,
          lastMobileRedoOperationId: true,
          reviewedAt: true,
          status: true,
          studentProfileId: true,
          submittedAt: true,
        },
      });
      if (!current) return { kind: "not-found" as const };
      await acquireLock(
        tx,
        `homework-submission:${current.homeworkId}:${current.studentProfileId}`,
      );
      const locked = await tx.homeworkSubmission.findUnique({
        where: { id: current.id },
        select: {
          feedback: true,
          id: true,
          lastMobileRedoOperationId: true,
          reviewedAt: true,
          status: true,
          submittedAt: true,
        },
      });
      if (!locked) return { kind: "not-found" as const };
      if (locked.lastMobileRedoOperationId === operationId) {
        return { kind: "replay" as const, submission: locked };
      }
      if (
        locked.status !== data.expectedStatus ||
        locked.submittedAt.getTime() !== data.expectedSubmittedAt.getTime() ||
        !datesMatch(locked.reviewedAt, data.expectedReviewedAt)
      ) {
        return { kind: "conflict" as const };
      }
      if (locked.status !== "SUBMITTED" && locked.status !== "REVIEWED") {
        return { kind: "state-forbidden" as const };
      }

      const returned = await tx.homeworkSubmission.update({
        where: { id: locked.id },
        data: {
          feedback: data.feedback ?? locked.feedback ?? null,
          lastMobileRedoOperationId: operationId,
          lastMobileReviewOperationId: null,
          reviewedAt: null,
          reviewedByTeacherProfileId: null,
          status: "RETURNED",
        },
        select: {
          feedback: true,
          id: true,
          reviewedAt: true,
          status: true,
          submittedAt: true,
        },
      });
      return { kind: "returned" as const, submission: returned };
    });

    if (result.kind === "not-found") {
      return failure("NOT_FOUND", "Entrega nao encontrada.");
    }
    if (result.kind === "conflict") {
      return failure(
        "CONFLICT",
        "O aluno reenviou ou outra correcao mudou esta entrega. Recarregue antes de liberar.",
      );
    }
    if (result.kind === "state-forbidden") {
      return failure("STATE_FORBIDDEN", "Esta entrega nao pode ser devolvida agora.");
    }
    return mutationSuccess(
      result.submission,
      result.kind === "replay"
        ? "Nova tentativa ja liberada anteriormente."
        : "Nova tentativa liberada com sucesso.",
      result.kind === "replay",
    );
  } catch (error) {
    if (isUniqueConflict(error)) {
      const replay = await store.homeworkSubmission.findUnique({
        where: { lastMobileRedoOperationId: operationId },
        select: {
          feedback: true,
          homework: { select: { teacherProfileId: true } },
          id: true,
          reviewedAt: true,
          status: true,
          submittedAt: true,
        },
      });
      if (replay?.homework.teacherProfileId === teacherProfileId && replay.id === submissionId) {
        return mutationSuccess(replay, "Nova tentativa ja liberada anteriormente.", true);
      }
      return failure("OPERATION_CONFLICT", "Esta operacao ja foi usada.");
    }
    throw error;
  }
}
