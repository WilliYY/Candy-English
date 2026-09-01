import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";

import { getPrisma } from "@/lib/prisma";
import { deleteAvatarImage } from "@/lib/storage";
import {
  ANONYMIZED_USER_NAME,
  buildAnonymizedUserEmail,
  isUserReadyForAnonymization,
} from "@/lib/user-retention";

type AnonymizeExpiredUsersOptions = {
  apply?: boolean;
  now?: Date;
};

export async function anonymizeExpiredUsers({
  apply = false,
  now = new Date(),
}: AnonymizeExpiredUsersOptions = {}) {
  const prisma = getPrisma();
  const candidates = await prisma.user.findMany({
    orderBy: { scheduledAnonymizationAt: "asc" },
    select: {
      anonymizedAt: true,
      avatarPath: true,
      deletedAt: true,
      email: true,
      id: true,
      studentProfile: {
        select: {
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
    },
    where: {
      anonymizedAt: null,
      deletedAt: { not: null },
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
  let avatarCleanupFailures = 0;

  for (const candidate of candidates) {
    if (!isUserReadyForAnonymization(candidate, now)) {
      continue;
    }

    try {
      await deleteAvatarImage(candidate.avatarPath);
    } catch {
      avatarCleanupFailures += 1;
      continue;
    }

    const replacementPasswordHash = await hash(randomUUID(), 12);
    const result = await prisma.$transaction(async (tx) => {
      await tx.mobileDevice.deleteMany({ where: { userId: candidate.id } });
      await tx.cattyConversation.deleteMany({ where: { userId: candidate.id } });
      await tx.cattyMemoryEvent.deleteMany({ where: { userId: candidate.id } });
      await tx.cattyUserMemory.deleteMany({ where: { userId: candidate.id } });
      await tx.cattyArtifactEnrichment.deleteMany({
        where: { targetUserId: candidate.id },
      });
      await tx.cattyUserArtifact.deleteMany({ where: { userId: candidate.id } });
      await tx.loginAttempt.deleteMany({ where: { email: candidate.email } });
      await tx.userMfa.deleteMany({ where: { userId: candidate.id } });

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
        where: { userId: candidate.id },
      });

      await tx.teacherProfile.updateMany({
        data: { bio: null },
        where: { userId: candidate.id },
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
        where: { convertedUserId: candidate.id },
      });

      const financialStudentId =
        candidate.studentProfile?.financialStudent?.id ??
        candidate.studentProfile?.convertedStudentPreRegistration
          ?.convertedFinancialStudentId;

      if (financialStudentId) {
        await tx.financialStudent.update({
          data: {
            address: null,
            cpf: null,
            email: null,
            name: ANONYMIZED_USER_NAME,
            phone: null,
          },
          where: { id: financialStudentId },
        });
        await tx.financialPayment.updateMany({
          data: {
            note: null,
            snapshotAddress: null,
            snapshotCpf: null,
            snapshotEmail: null,
            snapshotName: ANONYMIZED_USER_NAME,
            snapshotPhone: null,
          },
          where: { studentId: financialStudentId },
        });
      }

      const agendaStudentId =
        candidate.studentProfile?.convertedStudentPreRegistration
          ?.convertedAgendaStudentId;

      if (agendaStudentId) {
        await tx.agendaStudent.update({
          data: {
            isActive: false,
            name: ANONYMIZED_USER_NAME,
            notes: null,
            phone: null,
          },
          where: { id: agendaStudentId },
        });
        await tx.agendaLesson.updateMany({
          data: { notes: null },
          where: { studentId: agendaStudentId },
        });
      }

      if (candidate.studentProfile) {
        await tx.sale.updateMany({
          data: {
            buyerNameSnapshot: ANONYMIZED_USER_NAME,
            note: null,
          },
          where: { buyerStudentProfileId: candidate.studentProfile.id },
        });
      }

      return tx.user.updateMany({
        data: {
          address: null,
          anonymizedAt: now,
          avatarMimeType: null,
          avatarPath: null,
          deletedByName: null,
          deletionReason: null,
          email: buildAnonymizedUserEmail(candidate.id),
          isActive: false,
          name: ANONYMIZED_USER_NAME,
          passwordHash: replacementPasswordHash,
          phone: null,
          sessionVersion: { increment: 1 },
        },
        where: {
          anonymizedAt: null,
          deletedAt: { not: null },
          id: candidate.id,
          scheduledAnonymizationAt: { lte: now },
        },
      });
    });

    if (result.count !== 1) {
      continue;
    }

    anonymized += 1;
  }

  return {
    anonymized,
    avatarCleanupFailures,
    candidates: candidates.length,
    dryRun: false,
  };
}
