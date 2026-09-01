import type { Prisma } from "@/generated/prisma/client";
import { resolveFinancialRegistration } from "@/lib/financial-completeness";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";

export const STUDENT_ADMINISTRATIVE_YEAR = 2026;

type FinancialUnit = "DOURADINA" | "IVATE";

type EnsureStudentAdministrativeRecordsInput = {
  actorUserId: string;
  sourceDescription: string;
  startMonth?: number;
  studentProfileId: string;
  year?: number;
};

const saoPauloYearMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

export function getStudentAdministrativeStartMonth(
  date = new Date(),
  year = STUDENT_ADMINISTRATIVE_YEAR,
) {
  const parts = saoPauloYearMonthFormatter.formatToParts(date);
  const currentYear = Number(
    parts.find((part) => part.type === "year")?.value,
  );
  const currentMonth = Number(
    parts.find((part) => part.type === "month")?.value,
  );

  if (currentYear < year) return 1;
  if (currentYear > year) return 12;

  return Math.min(12, Math.max(1, currentMonth || 1));
}

function buildIncompletePaymentSnapshot(student: {
  address: string | null;
  amountCents: number;
  email: string | null;
  name: string;
  paymentDay: number;
  paymentMethod: string;
  phone: string | null;
  unit: FinancialUnit;
}) {
  return {
    snapshotAddress: student.address,
    snapshotAmountCents: student.amountCents,
    snapshotCpf: null,
    snapshotEmail: student.email,
    snapshotInstallmentNumber: null,
    snapshotInstallmentsTotal: null,
    snapshotName: student.name,
    snapshotPaymentDay: student.paymentDay,
    snapshotPaymentMethod: student.paymentMethod,
    snapshotPhone: student.phone,
    snapshotUnit: student.unit,
  };
}

export async function ensureStudentAdministrativeRecords(
  tx: Prisma.TransactionClient,
  input: EnsureStudentAdministrativeRecordsInput,
) {
  await acquireTransactionAdvisoryLock(
    tx,
    `student-administrative-linkage:${input.studentProfileId}`,
  );

  const profile = await tx.studentProfile.findUnique({
    where: { id: input.studentProfileId },
    select: {
      agendaStudent: { select: { id: true } },
      financialStudent: { select: { id: true } },
      id: true,
      studentPhone: true,
      unit: true,
      user: {
        select: {
          address: true,
          email: true,
          name: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  if (!profile || profile.user.role !== "STUDENT") {
    throw new Error("STUDENT_PROFILE_NOT_FOUND");
  }

  const phone = profile.studentPhone ?? profile.user.phone;
  const year = input.year ?? STUDENT_ADMINISTRATIVE_YEAR;
  const startMonth = Math.min(
    12,
    Math.max(1, input.startMonth ?? getStudentAdministrativeStartMonth()),
  );
  let financialStudentId = profile.financialStudent?.id ?? null;
  let agendaStudentId = profile.agendaStudent?.id ?? null;
  let createdFinancial = false;
  let createdAgenda = false;

  if (financialStudentId) {
    await tx.financialStudent.update({
      where: { id: financialStudentId },
      data: {
        email: profile.user.email,
        name: profile.user.name,
        phone,
        unit: profile.unit,
      },
    });
  } else {
    const incompleteFinance = resolveFinancialRegistration({});
    const financialStudent = await tx.financialStudent.create({
      data: {
        address: profile.user.address,
        amountCents: incompleteFinance.amountCents,
        email: profile.user.email,
        name: profile.user.name,
        paymentDay: incompleteFinance.paymentDay,
        paymentMethod: incompleteFinance.paymentMethod,
        phone,
        studentProfileId: profile.id,
        unit: profile.unit,
      },
    });

    await tx.financialPayment.createMany({
      data: Array.from({ length: 13 - startMonth }, (_, index) => {
        const month = startMonth + index;

        return {
          ...buildIncompletePaymentSnapshot(financialStudent),
          isActive: true,
          isPaid: false,
          month,
          note:
            month === startMonth
              ? `Criado automaticamente por ${input.sourceDescription}; completar dados financeiros.`
              : null,
          paidAt: null,
          studentId: financialStudent.id,
          year,
        };
      }),
      skipDuplicates: true,
    });

    await tx.financialLog.create({
      data: {
        action: "CREATE_LINKED_STUDENT",
        createdByUserId: input.actorUserId,
        description: `Cadastro financeiro vinculado ao AVA por ${input.sourceDescription}: ${profile.user.name}; completar valor, dia e forma de pagamento.`,
        studentId: financialStudent.id,
      },
    });

    financialStudentId = financialStudent.id;
    createdFinancial = true;
  }

  if (agendaStudentId) {
    await tx.agendaStudent.update({
      where: { id: agendaStudentId },
      data: {
        name: profile.user.name,
        phone,
        unit: profile.unit,
      },
    });
  } else {
    const agendaStudent = await tx.agendaStudent.create({
      data: {
        isActive: true,
        name: profile.user.name,
        notes: `Criado automaticamente por ${input.sourceDescription}; completar dias e horario.`,
        phone,
        studentProfileId: profile.id,
        unit: profile.unit,
        weekdayMask: 0,
      },
    });

    await tx.agendaLog.create({
      data: {
        action: "CREATE_LINKED_STUDENT",
        createdByUserId: input.actorUserId,
        description: `Agenda vinculada ao AVA por ${input.sourceDescription}: ${profile.user.name}; completar dias e horario.`,
        studentId: agendaStudent.id,
      },
    });

    agendaStudentId = agendaStudent.id;
    createdAgenda = true;
  }

  return {
    agendaStudentId,
    createdAgenda,
    createdFinancial,
    financialStudentId,
  };
}
