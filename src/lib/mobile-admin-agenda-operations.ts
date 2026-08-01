import type { Prisma } from "@/generated/prisma/client";
import {
  getMobileAgendaDateParts,
  mobileAdminAgendaLessonSelect,
  safeMobileAgendaText,
  safeNullableMobileAgendaText,
  serializeMobileAdminAgendaLesson,
} from "@/lib/mobile-admin-agenda";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const lessonIdSchema = z.string().trim().min(1).max(200);
const attendanceInputSchema = z
  .object({
    confirmChange: z.literal(true),
    expectedUpdatedAt: z.string().datetime(),
    operationId: z.string().uuid(),
    status: z.enum(["SCHEDULED", "ATTENDED", "MISSED"]),
  })
  .strict();
const makeupInputSchema = z
  .object({
    confirmCreate: z.literal(true),
    date: z.string().date(),
    expectedUpdatedAt: z.string().datetime(),
    notes: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .transform((value) => value || null),
    operationId: z.string().uuid(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict();

const lessonOperationSelect = {
  ...mobileAdminAgendaLessonSelect,
  createdByMobileOperationId: true,
  isActive: true,
  lastMobileOperationId: true,
  makeupForLessonId: true,
  studentId: true,
  weekday: true,
} satisfies Prisma.AgendaLessonSelect;
const historySelect = {
  action: true,
  createdAt: true,
  createdByUser: { select: { name: true } },
  description: true,
  id: true,
  lessonId: true,
} satisfies Prisma.AgendaLogSelect;

type LessonOperationRow = Prisma.AgendaLessonGetPayload<{
  select: typeof lessonOperationSelect;
}>;
type HistoryRow = Prisma.AgendaLogGetPayload<{ select: typeof historySelect }>;

export type MobileAdminAgendaOperationsStore = Pick<
  ReturnType<typeof getPrisma>,
  "$transaction" | "agendaLesson" | "agendaLog"
>;

type Options = {
  acquireLock?: (
    tx: Prisma.TransactionClient,
    key: string,
  ) => Promise<void>;
  store?: MobileAdminAgendaOperationsStore;
};

export class MobileAdminAgendaOperationsError extends Error {
  constructor(
    public readonly code:
      | "EDIT_CONFLICT"
      | "INVALID_INPUT"
      | "LESSON_NOT_FOUND"
      | "MAKEUP_EXISTS"
      | "MAKEUP_SOURCE_INVALID"
      | "OPERATION_REUSED"
      | "ROLE_FORBIDDEN"
      | "WRITE_CONFLICT",
  ) {
    super(code);
    this.name = "MobileAdminAgendaOperationsError";
  }
}

function requireAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminAgendaOperationsError("ROLE_FORBIDDEN");
  }
}

function serializeHistory(row: HistoryRow) {
  return {
    action: safeMobileAgendaText(row.action, 80),
    actorName: safeNullableMobileAgendaText(
      row.createdByUser?.name ?? null,
      120,
    ),
    createdAt: row.createdAt.toISOString(),
    description: safeMobileAgendaText(row.description, 500),
    id: row.id,
    lessonId: row.lessonId,
  };
}

function serializeLesson(row: LessonOperationRow) {
  return serializeMobileAdminAgendaLesson(row);
}

function parseLessonId(value: unknown) {
  const parsed = lessonIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new MobileAdminAgendaOperationsError("INVALID_INPUT");
  }
  return parsed.data;
}

export async function getMobileAdminAgendaLesson(
  actor: MobileAuthUser,
  lessonId: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const id = parseLessonId(lessonId);
  const store = options.store ?? getPrisma();
  const lesson = await store.agendaLesson.findUnique({
    select: lessonOperationSelect,
    where: { id },
  });
  if (!lesson || !lesson.isActive) {
    throw new MobileAdminAgendaOperationsError("LESSON_NOT_FOUND");
  }
  const history = await store.agendaLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: historySelect,
    take: 100,
    where: {
      OR: [{ studentId: lesson.studentId }, { lessonId: lesson.id }],
    },
  });
  return {
    history: history.map(serializeHistory),
    lesson: serializeLesson(lesson),
  };
}

function attendanceStatus(
  row: LessonOperationRow,
  requested: "SCHEDULED" | "ATTENDED" | "MISSED",
) {
  if (!row.isMakeup) return requested;
  if (requested === "ATTENDED") return "MAKEUP_ATTENDED" as const;
  if (requested === "SCHEDULED") return "MAKEUP_SCHEDULED" as const;
  return requested;
}

export async function updateMobileAdminAgendaAttendance(
  actor: MobileAuthUser,
  lessonId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const id = parseLessonId(lessonId);
  const parsed = attendanceInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminAgendaOperationsError("INVALID_INPUT");
  }
  const store = options.store ?? getPrisma();
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;
  const operationKey = `admin-agenda:attendance:${parsed.data.operationId}`;
  const result = await store.$transaction(async (tx) => {
    await acquireLock(tx, operationKey);
    const prior = await tx.agendaLesson.findUnique({
      select: lessonOperationSelect,
      where: { lastMobileOperationId: operationKey },
    });
    if (prior) {
      if (prior.id !== id) {
        throw new MobileAdminAgendaOperationsError("OPERATION_REUSED");
      }
      return { lesson: prior, replayed: true };
    }

    const current = await tx.agendaLesson.findUnique({
      select: lessonOperationSelect,
      where: { id },
    });
    if (!current || !current.isActive) {
      throw new MobileAdminAgendaOperationsError("LESSON_NOT_FOUND");
    }
    if (current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
      throw new MobileAdminAgendaOperationsError("EDIT_CONFLICT");
    }
    const status = attendanceStatus(current, parsed.data.status);
    const updated = await tx.agendaLesson.updateMany({
      data: { lastMobileOperationId: operationKey, status },
      where: { id: current.id, updatedAt: current.updatedAt },
    });
    if (updated.count !== 1) {
      throw new MobileAdminAgendaOperationsError("WRITE_CONFLICT");
    }
    await tx.agendaLog.create({
      data: {
        action: "ATTENDANCE",
        createdByUserId: actor.id,
        description:
          status === "ATTENDED" || status === "MAKEUP_ATTENDED"
            ? `Presenca confirmada: ${current.student.name}.`
            : status === "MISSED"
              ? `Falta registrada: ${current.student.name}.`
              : `Presenca resetada: ${current.student.name}.`,
        lessonId: current.id,
        studentId: current.studentId,
      },
    });
    const saved = await tx.agendaLesson.findUnique({
      select: lessonOperationSelect,
      where: { id: current.id },
    });
    if (!saved) {
      throw new MobileAdminAgendaOperationsError("WRITE_CONFLICT");
    }
    return { lesson: saved, replayed: false };
  });
  return {
    lesson: serializeLesson(result.lesson),
    message: result.replayed
      ? "Presenca ja atualizada por esta operacao."
      : "Presenca atualizada.",
    replayed: result.replayed,
  };
}

export async function createMobileAdminAgendaMakeup(
  actor: MobileAuthUser,
  lessonId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const id = parseLessonId(lessonId);
  const parsed = makeupInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminAgendaOperationsError("INVALID_INPUT");
  }
  const date = new Date(`${parsed.data.date}T12:00:00.000Z`);
  const dateParts = getMobileAgendaDateParts(date);
  if (dateParts.date !== parsed.data.date) {
    throw new MobileAdminAgendaOperationsError("INVALID_INPUT");
  }
  const store = options.store ?? getPrisma();
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;
  const operationKey = `admin-agenda:makeup:${parsed.data.operationId}`;
  const result = await store.$transaction(async (tx) => {
    await acquireLock(tx, operationKey);
    const prior = await tx.agendaLesson.findUnique({
      select: lessonOperationSelect,
      where: { createdByMobileOperationId: operationKey },
    });
    if (prior) {
      if (prior.makeupForLessonId !== id) {
        throw new MobileAdminAgendaOperationsError("OPERATION_REUSED");
      }
      return { makeupLesson: prior, replayed: true };
    }

    const original = await tx.agendaLesson.findUnique({
      select: lessonOperationSelect,
      where: { id },
    });
    if (!original || !original.isActive) {
      throw new MobileAdminAgendaOperationsError("LESSON_NOT_FOUND");
    }
    if (original.isMakeup) {
      throw new MobileAdminAgendaOperationsError("MAKEUP_SOURCE_INVALID");
    }
    if (original.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
      throw new MobileAdminAgendaOperationsError("EDIT_CONFLICT");
    }
    const existing = await tx.agendaLesson.findFirst({
      select: { id: true },
      where: { isActive: true, makeupForLessonId: original.id },
    });
    if (existing) {
      throw new MobileAdminAgendaOperationsError("MAKEUP_EXISTS");
    }
    const updated = await tx.agendaLesson.updateMany({
      data: { lastMobileOperationId: operationKey, status: "MISSED" },
      where: { id: original.id, updatedAt: original.updatedAt },
    });
    if (updated.count !== 1) {
      throw new MobileAdminAgendaOperationsError("WRITE_CONFLICT");
    }
    const makeupLesson = await tx.agendaLesson.create({
      data: {
        createdByMobileOperationId: operationKey,
        date,
        isActive: true,
        isMakeup: true,
        makeupForLessonId: original.id,
        month: dateParts.month,
        notes: parsed.data.notes,
        status: "MAKEUP_SCHEDULED",
        studentId: original.studentId,
        time: parsed.data.time,
        weekday: date.getUTCDay(),
        year: dateParts.year,
      },
      select: lessonOperationSelect,
    });
    await tx.agendaLog.create({
      data: {
        action: "MAKEUP",
        createdByUserId: actor.id,
        description: `Reposicao criada para ${original.student.name}.`,
        lessonId: makeupLesson.id,
        studentId: original.studentId,
      },
    });
    return { makeupLesson, replayed: false };
  });
  return {
    makeupLesson: serializeLesson(result.makeupLesson),
    message: result.replayed
      ? "Reposicao ja criada por esta operacao."
      : "Reposicao criada.",
    replayed: result.replayed,
  };
}
