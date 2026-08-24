"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getNextTimeClockEntryType } from "@/lib/time-clock-domain";
import {
  timeClockEntryCorrectionSchema,
  timeClockManualEntrySchema,
  timeClockProfileCreateSchema,
  timeClockProfileStatusSchema,
  timeClockPunchSchema,
  type TimeClockEntryCorrectionInput,
  type TimeClockManualEntryInput,
  type TimeClockProfileCreateInput,
  type TimeClockProfileStatusInput,
  type TimeClockPunchInput,
} from "@/lib/validations/time-clock";

export type TimeClockActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

class TimeClockRuleError extends Error {}

function fieldErrors<TInput extends Record<string, unknown>>(
  issues: { message: string; path: PropertyKey[] }[],
) {
  return issues.reduce<Partial<Record<keyof TInput, string>>>(
    (errors, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        errors[fieldName as keyof TInput] = issue.message;
      }

      return errors;
    },
    {},
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function getAdminUserId() {
  const session = await auth();

  return session?.user?.role === "ADMIN" && session.user.id
    ? session.user.id
    : null;
}

async function getPunchActor() {
  const session = await auth();

  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")
  ) {
    return null;
  }

  const prisma = getPrisma();
  const profile = await prisma.timeClockProfile.findFirst({
    where: { isActive: true, userId: session.user.id },
    select: { id: true },
  });

  return profile
    ? { profileId: profile.id, userId: session.user.id }
    : null;
}

function adminOnlyResult<TInput extends Record<string, unknown>>() {
  return {
    message: "Somente o Admin pode fazer esta alteracao no ponto.",
    ok: false,
  } satisfies TimeClockActionResult<TInput>;
}

function revalidateTimeClock() {
  revalidatePath("/ava/ponto");
  revalidatePath("/ava/escolha");
}

function isAllowedAdministrativeTime(date: Date) {
  const earliest = Date.UTC(2020, 0, 1);
  const latest = Date.now() + 5 * 60_000;

  return date.getTime() >= earliest && date.getTime() <= latest;
}

export async function registerTimeClockPunch(
  input: TimeClockPunchInput,
): Promise<TimeClockActionResult<TimeClockPunchInput>> {
  const actor = await getPunchActor();

  if (!actor) {
    return {
      message: "Seu acesso ao ponto nao esta ativo.",
      ok: false,
    };
  }

  const parsed = timeClockPunchSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<TimeClockPunchInput>(parsed.error.issues),
      message: "Revise os dados da batida.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  let replayed = false;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.timeClockEntry.findUnique({
        where: { operationId: parsed.data.operationId },
        select: { profileId: true, recordedByUserId: true },
      });

      if (existing) {
        if (
          existing.profileId !== actor.profileId ||
          existing.recordedByUserId !== actor.userId
        ) {
          throw new TimeClockRuleError(
            "Identificador de batida indisponivel.",
          );
        }

        replayed = true;
        return;
      }

      const lockedProfiles = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "TimeClockProfile"
        WHERE "id" = ${actor.profileId} AND "isActive" = true
        FOR UPDATE
      `;

      if (lockedProfiles.length !== 1) {
        throw new TimeClockRuleError("Seu acesso ao ponto foi desativado.");
      }

      const existingAfterLock = await tx.timeClockEntry.findUnique({
        where: { operationId: parsed.data.operationId },
        select: { profileId: true, recordedByUserId: true },
      });

      if (existingAfterLock) {
        if (
          existingAfterLock.profileId !== actor.profileId ||
          existingAfterLock.recordedByUserId !== actor.userId
        ) {
          throw new TimeClockRuleError(
            "Identificador de batida indisponivel.",
          );
        }

        replayed = true;
        return;
      }

      const lastEntry = await tx.timeClockEntry.findFirst({
        where: { profileId: actor.profileId },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        select: { type: true },
      });
      const expectedType = getNextTimeClockEntryType(lastEntry?.type);

      if (parsed.data.type !== expectedType) {
        throw new TimeClockRuleError(
          expectedType === "ENTRY"
            ? "A proxima batida deve ser uma entrada. Atualize a tela."
            : "A proxima batida deve ser uma saida. Atualize a tela.",
        );
      }

      await tx.timeClockEntry.create({
        data: {
          justification: parsed.data.justification,
          occurredAt: new Date(),
          operationId: parsed.data.operationId,
          profileId: actor.profileId,
          recordedByUserId: actor.userId,
          source: "SELF",
          type: parsed.data.type,
        },
      });
    });
  } catch (error) {
    if (error instanceof TimeClockRuleError) {
      return { message: error.message, ok: false };
    }

    if (isUniqueConstraintError(error)) {
      const existing = await prisma.timeClockEntry.findUnique({
        where: { operationId: parsed.data.operationId },
        select: { profileId: true, recordedByUserId: true },
      });

      if (
        existing?.profileId === actor.profileId &&
        existing.recordedByUserId === actor.userId
      ) {
        replayed = true;
      } else {
        return { message: "Nao foi possivel registrar a batida.", ok: false };
      }
    } else {
      return { message: "Nao foi possivel registrar a batida.", ok: false };
    }
  }

  revalidateTimeClock();

  return {
    message: replayed
      ? "Esta batida ja havia sido registrada."
      : parsed.data.type === "ENTRY"
        ? "Entrada registrada."
        : "Saida registrada.",
    ok: true,
  };
}

export async function createTimeClockProfile(
  input: TimeClockProfileCreateInput,
): Promise<TimeClockActionResult<TimeClockProfileCreateInput>> {
  const adminUserId = await getAdminUserId();

  if (!adminUserId) {
    return adminOnlyResult();
  }

  const parsed = timeClockProfileCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<TimeClockProfileCreateInput>(parsed.error.issues),
      message: "Selecione uma pessoa valida.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      isActive: true,
      role: { in: ["ADMIN", "TEACHER"] },
    },
    select: { id: true },
  });

  if (!user) {
    return {
      errors: { userId: "Usuario inativo ou sem perfil de equipe." },
      message: "Nao foi possivel habilitar esta pessoa.",
      ok: false,
    };
  }

  try {
    await prisma.timeClockProfile.upsert({
      where: { userId: user.id },
      create: {
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        userId: user.id,
      },
      update: {
        isActive: true,
        updatedByUserId: adminUserId,
      },
    });
  } catch {
    return {
      message: "Nao foi possivel habilitar a pessoa. Tente novamente.",
      ok: false,
    };
  }

  revalidateTimeClock();

  return { message: "Pessoa habilitada no ponto.", ok: true };
}

export async function updateTimeClockProfileStatus(
  input: TimeClockProfileStatusInput,
): Promise<TimeClockActionResult<TimeClockProfileStatusInput>> {
  const adminUserId = await getAdminUserId();

  if (!adminUserId) {
    return adminOnlyResult();
  }

  const parsed = timeClockProfileStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<TimeClockProfileStatusInput>(parsed.error.issues),
      message: "Revise a pessoa selecionada.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  let updated: { count: number };

  try {
    updated = await prisma.timeClockProfile.updateMany({
      where: { id: parsed.data.profileId },
      data: {
        isActive: parsed.data.isActive,
        updatedByUserId: adminUserId,
      },
    });
  } catch {
    return {
      message: "Nao foi possivel alterar o acesso ao ponto.",
      ok: false,
    };
  }

  if (updated.count !== 1) {
    return { message: "Perfil de ponto nao encontrado.", ok: false };
  }

  revalidateTimeClock();

  return {
    message: parsed.data.isActive
      ? "Acesso ao ponto reativado."
      : "Acesso ao ponto desativado; o historico foi preservado.",
    ok: true,
  };
}

export async function createManualTimeClockEntry(
  input: TimeClockManualEntryInput,
): Promise<TimeClockActionResult<TimeClockManualEntryInput>> {
  const adminUserId = await getAdminUserId();

  if (!adminUserId) {
    return adminOnlyResult();
  }

  const parsed = timeClockManualEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<TimeClockManualEntryInput>(parsed.error.issues),
      message: "Revise a batida manual.",
      ok: false,
    };
  }

  const occurredAt = new Date(parsed.data.occurredAt);

  if (!isAllowedAdministrativeTime(occurredAt)) {
    return {
      errors: { occurredAt: "Use um horario entre 2020 e o momento atual." },
      message: "Horario manual fora do periodo permitido.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  const profile = await prisma.timeClockProfile.findUnique({
    where: { id: parsed.data.profileId },
    select: { id: true },
  });

  if (!profile) {
    return { message: "Perfil de ponto nao encontrado.", ok: false };
  }

  try {
    await prisma.timeClockEntry.create({
      data: {
        justification: parsed.data.justification,
        occurredAt,
        profileId: profile.id,
        recordedByUserId: adminUserId,
        source: "ADMIN",
        type: parsed.data.type,
      },
    });
  } catch {
    return {
      message: "Nao foi possivel adicionar a batida manual.",
      ok: false,
    };
  }

  revalidateTimeClock();

  return { message: "Batida manual adicionada.", ok: true };
}

export async function correctTimeClockEntry(
  input: TimeClockEntryCorrectionInput,
): Promise<TimeClockActionResult<TimeClockEntryCorrectionInput>> {
  const adminUserId = await getAdminUserId();

  if (!adminUserId) {
    return adminOnlyResult();
  }

  const parsed = timeClockEntryCorrectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<TimeClockEntryCorrectionInput>(parsed.error.issues),
      message: "Revise a correcao da batida.",
      ok: false,
    };
  }

  const occurredAt = new Date(parsed.data.occurredAt);

  if (!isAllowedAdministrativeTime(occurredAt)) {
    return {
      errors: { occurredAt: "Use um horario entre 2020 e o momento atual." },
      message: "Horario corrigido fora do periodo permitido.",
      ok: false,
    };
  }

  const prisma = getPrisma();

  try {
    await prisma.$transaction(async (tx) => {
      const lockedEntries = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "TimeClockEntry"
        WHERE "id" = ${parsed.data.entryId}
        FOR UPDATE
      `;

      if (lockedEntries.length !== 1) {
        throw new TimeClockRuleError("Batida nao encontrada.");
      }

      const entry = await tx.timeClockEntry.findUnique({
        where: { id: parsed.data.entryId },
        select: {
          justification: true,
          occurredAt: true,
          type: true,
          updatedAt: true,
        },
      });

      if (
        !entry ||
        entry.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt
      ) {
        throw new TimeClockRuleError(
          "A batida mudou enquanto estava aberta. Atualize antes de corrigir.",
        );
      }

      await tx.timeClockEntryRevision.create({
        data: {
          changedByUserId: adminUserId,
          correctionReason: parsed.data.correctionReason,
          entryId: parsed.data.entryId,
          previousJustification: entry.justification,
          previousOccurredAt: entry.occurredAt,
          previousType: entry.type,
          previousUpdatedAt: entry.updatedAt,
        },
      });

      await tx.timeClockEntry.update({
        where: { id: parsed.data.entryId },
        data: {
          correctedAt: new Date(),
          correctedByUserId: adminUserId,
          justification: parsed.data.justification,
          occurredAt,
          type: parsed.data.type,
        },
      });
    });
  } catch (error) {
    if (error instanceof TimeClockRuleError) {
      return { message: error.message, ok: false };
    }

    return {
      message: "Nao foi possivel corrigir a batida. O registro foi preservado.",
      ok: false,
    };
  }

  revalidateTimeClock();

  return { message: "Batida corrigida e revisao preservada.", ok: true };
}
