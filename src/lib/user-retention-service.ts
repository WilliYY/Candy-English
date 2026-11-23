import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";

import { anonymizeUserHistoricalReferences } from "@/lib/user-retention-history";
import { getPrisma } from "@/lib/prisma";
import { deleteAvatarImage } from "@/lib/storage";
import {
  ANONYMIZED_USER_NAME,
  buildAnonymizedUserEmail,
  isUserReadyForAnonymization,
} from "@/lib/user-retention";

const userRetentionSelect = {
      anonymizedAt: true,
      avatarPath: true,
      deletedAt: true,
      email: true,
      id: true,
      isActive: true,
      studentProfile: {
        select: {
          agendaStudent: { select: { id: true } },
          convertedStudentPreRegistration: {
            select: {
              convertedAgendaStudentId: true,
              convertedFinancialStudentId: true,
            },
          },
          financialStudent: { select: { id: true } },
          id: true,
        },
      },
      scheduledAnonymizationAt: true,
    } satisfies Prisma.UserSelect;

class AvatarCleanupError extends Error {}

type AnonymizeExpiredUsersOptions = {
  apply?: boolean;
  repairAnonymized?: boolean;
  now?: Date;
};

export async function anonymizeExpiredUsers({
  apply = false,
  repairAnonymized = false,
  now = new Date(),
}: AnonymizeExpiredUsersOptions = {}) {
  const prisma = getPrisma();
  const candidates = await prisma.user.findMany({
    orderBy: { scheduledAnonymizationAt: "asc" },
    select: userRetentionSelect,
    where: {
      ...(repairAnonymized ? {} : { anonymizedAt: null }),
      deletedAt: { not: null },
      isActive: false,
      scheduledAnonymizationAt: { lte: now },
    },
  });

  if (!apply) {
    return {
      anonymized: 0,
      candidates: candidates.length,
      dryRun: true,
    };
  }

  let anonymized = 0;
  let repaired = 0;
  let avatarCleanupFailures = 0;

  for (const candidate of candidates) {
    const replacementPasswordHash = candidate.anonymizedAt
      ? null
      : await hash(randomUUID(), 12);
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.id} FOR UPDATE`;
        const current = await tx.user.findUnique({
          where: { id: candidate.id },
          select: userRetentionSelect,
        });
        if (
          !current || current.isActive ||
          !isUserReadyForAnonymization({ ...current, anonymizedAt: null }, now)
        ) return "SKIPPED";
        const isRepair = Boolean(current.anonymizedAt);
        if (isRepair && !repairAnonymized) return "SKIPPED";

        const reservation = await tx.user.updateMany({
          data: isRepair ? {
            avatarMimeType: null,
            avatarPath: null,
          } : {
            address: null,
            anonymizedAt: now,
            avatarMimeType: null,
            avatarPath: null,
            deletedByName: null,
            deletionReason: null,
            email: buildAnonymizedUserEmail(current.id),
            isActive: false,
            name: ANONYMIZED_USER_NAME,
            passwordHash: replacementPasswordHash ?? await hash(randomUUID(), 12),
            phone: null,
            sessionVersion: { increment: 1 },
          },
          where: {
            anonymizedAt: current.anonymizedAt,
            deletedAt: { not: null },
            id: current.id,
            isActive: false,
            scheduledAnonymizationAt: { lte: now },
          },
        });
        if (reservation.count !== 1) return "SKIPPED";

        // Keep the avatar pointer and eligibility recoverable if file removal fails.
        try {
          await deleteAvatarImage(current.avatarPath);
        } catch {
          throw new AvatarCleanupError();
        }
        if (isRepair) {
          await anonymizeUserHistoricalReferences(tx, current);
          return "REPAIRED";
        }

      await tx.mobileDevice.deleteMany({ where: { userId: current.id } });
      await tx.cattyConversation.deleteMany({ where: { userId: current.id } });
      await tx.cattyMemoryEvent.deleteMany({ where: { userId: current.id } });
      await tx.cattyUserMemory.deleteMany({ where: { userId: current.id } });
      await tx.cattyArtifactEnrichment.deleteMany({
        where: { targetUserId: current.id },
      });
      await tx.cattyUserArtifact.deleteMany({ where: { userId: current.id } });
      await tx.loginAttempt.deleteMany({ where: { email: current.email } });
      await tx.userMfa.deleteMany({ where: { userId: current.id } });

      await tx.studentProfile.updateMany({
        data: {
          birthDate: null,
          gender: null,
          guardianDocument: null,
          motherName: null,
          motherPhone: null,
          notes: null,
          studentPhone: null,
          studentPhoneAlt: null,
        },
        where: { userId: current.id },
      });

      await tx.teacherProfile.updateMany({
        data: { bio: null },
        where: { userId: current.id },
      });

      await tx.studentPreRegistration.updateMany({
        data: {
          address: null,
          birthDate: null,
          city: null,
          email: null,
          englishGoal: "Registro anonimizado",
          estimatedLevel: null,
          fullName: ANONYMIZED_USER_NAME,
          guardianDocument: null,
          guardianName: null,
          guardianPhone: null,
          notes: null,
          phone: ANONYMIZED_USER_NAME,
          phoneNormalized: null,
          secondaryContact: null,
          statusNote: null,
          studentPhone: null,
        },
        where: { convertedUserId: current.id },
      });

      await anonymizeUserHistoricalReferences(tx, current);

        return "ANONYMIZED";
      });
      if (result === "ANONYMIZED") anonymized += 1;
      if (result === "REPAIRED") repaired += 1;
    } catch (error) {
      if (!(error instanceof AvatarCleanupError)) throw error;
      avatarCleanupFailures += 1;
    }
  }

  return {
    anonymized,
    avatarCleanupFailures,
    repaired,
    candidates: candidates.length,
    dryRun: false,
  };
}
