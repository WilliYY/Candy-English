import type { Prisma } from "@/generated/prisma/client";
import { ANONYMIZED_USER_NAME } from "@/lib/user-retention";

type HistoricalUser = {
  id: string;
  studentProfile: {
    id: string;
    agendaStudent: { id: string } | null;
    financialStudent: { id: string } | null;
    convertedStudentPreRegistration: {
      convertedAgendaStudentId: string | null;
      convertedFinancialStudentId: string | null;
    } | null;
  } | null;
};

export async function anonymizeUserHistoricalReferences(
  tx: Prisma.TransactionClient,
  candidate: HistoricalUser,
) {
  const profile = candidate.studentProfile;
  const registration = profile?.convertedStudentPreRegistration;
  const financialIds = [...new Set([
    profile?.financialStudent?.id,
    registration?.convertedFinancialStudentId,
  ].filter((id): id is string => Boolean(id)))];
  if (financialIds.length) {
    await tx.financialStudent.updateMany({
      data: { address: null, cpf: null, email: null, name: ANONYMIZED_USER_NAME, phone: null },
      where: { id: { in: financialIds } },
    });
    await tx.financialPayment.updateMany({
      data: { note: null, snapshotAddress: null, snapshotCpf: null, snapshotEmail: null, snapshotName: ANONYMIZED_USER_NAME, snapshotPhone: null },
      where: { studentId: { in: financialIds } },
    });
  }
  const agendaIds = [...new Set([
    profile?.agendaStudent?.id,
    registration?.convertedAgendaStudentId,
  ].filter((id): id is string => Boolean(id)))];
  if (agendaIds.length) {
    await tx.agendaStudent.updateMany({
      data: { isActive: false, name: ANONYMIZED_USER_NAME, notes: null, phone: null },
      where: { id: { in: agendaIds } },
    });
    await tx.agendaLesson.updateMany({
      data: { notes: null },
      where: { studentId: { in: agendaIds } },
    });
  }
  await tx.sale.updateMany({
    data: { buyerNameSnapshot: ANONYMIZED_USER_NAME, note: null },
    where: {
      OR: [
        { buyerUserId: candidate.id },
        ...(profile ? [{ buyerStudentProfileId: profile.id }] : []),
      ],
    },
  });
}
