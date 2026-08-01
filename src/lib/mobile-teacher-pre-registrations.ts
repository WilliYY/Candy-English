import type { Prisma } from "@/generated/prisma/client";
import { resolveFinancialRegistration } from "@/lib/financial-completeness";
import { isOpenPreRegistrationStatus } from "@/lib/pre-registration-queue";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const detailSelect = {
  convertedAgendaStudentId: true,
  convertedFinancialStudentId: true,
  convertedStudentProfileId: true,
  convertedUserId: true,
  email: true,
  englishGoal: true,
  estimatedLevel: true,
  fullName: true,
  id: true,
  intendedTime: true,
  intendedWeekdayMask: true,
  paymentDay: true,
  paymentMethod: true,
  phone: true,
  status: true,
  statusNote: true,
  studentPhone: true,
  tuitionCents: true,
  unit: true,
  updatedAt: true,
} satisfies Prisma.StudentPreRegistrationSelect;

type DetailRow = Prisma.StudentPreRegistrationGetPayload<{
  select: typeof detailSelect;
}>;

export type MobileTeacherPreRegistrationStore = Pick<
  ReturnType<typeof getPrisma>,
  "studentPreRegistration" | "teacherProfile"
>;

type Options = { store?: MobileTeacherPreRegistrationStore };
type Reason = "INVALID" | "NOT_FOUND" | "PROFILE_NOT_FOUND";

type Result = {
  data?: {
    agenda: { complete: boolean; days: string | null; time: string | null };
    canConvert: boolean;
    converted: boolean;
    email: string | null;
    englishGoal: string;
    estimatedLevel: string | null;
    finance: { complete: boolean };
    fullName: string;
    id: string;
    phone: string;
    status: DetailRow["status"];
    statusNote: string | null;
    unit: DetailRow["unit"];
    updatedAt: string;
  };
  message: string;
  ok: boolean;
  reason?: Reason;
};

function paymentMethod(method: string | null) {
  if (!method) return null;
  return (
    {
      CARTAO: "CREDIT_CARD",
      DINHEIRO: "CASH",
      OUTRO: "OTHER",
      PIX: "PIX",
    }[method] ?? "OTHER"
  );
}

function normalize(row: DetailRow): NonNullable<Result["data"]> {
  const weekdays = dayLabels.filter(
    (_, index) => (row.intendedWeekdayMask & (1 << index)) !== 0,
  );
  const agendaComplete = Boolean(
    weekdays.length > 0 && row.intendedTime && timePattern.test(row.intendedTime),
  );
  const finance = resolveFinancialRegistration({
    amountCents: row.tuitionCents,
    paymentDay: row.paymentDay,
    paymentMethod: paymentMethod(row.paymentMethod),
  });
  const converted = Boolean(
    row.convertedUserId ||
      row.convertedStudentProfileId ||
      row.convertedFinancialStudentId ||
      row.convertedAgendaStudentId,
  );
  return {
    agenda: {
      complete: agendaComplete,
      days: weekdays.length > 0 ? weekdays.join(", ") : null,
      time: agendaComplete ? row.intendedTime : null,
    },
    canConvert: isOpenPreRegistrationStatus(row.status) && !converted,
    converted,
    email: row.email,
    englishGoal: row.englishGoal,
    estimatedLevel: row.estimatedLevel,
    finance: { complete: finance.isComplete },
    fullName: row.fullName,
    id: row.id,
    phone: row.studentPhone ?? row.phone,
    status: row.status,
    statusNote: row.statusNote,
    unit: row.unit,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getMobileTeacherPreRegistration(
  userId: string,
  requestId: string,
  options: Options = {},
): Promise<Result> {
  if (!z.string().trim().min(1).max(80).safeParse(requestId).success) {
    return { message: "Pre-cadastro invalido.", ok: false, reason: "INVALID" };
  }
  const store = options.store ?? getPrisma();
  const profile = await store.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return {
      message: "Perfil de teacher nao encontrado.",
      ok: false,
      reason: "PROFILE_NOT_FOUND",
    };
  }
  const request = await store.studentPreRegistration.findFirst({
    where: {
      OR: [
        { assignedTeacherProfileId: profile.id },
        { createdByUserId: userId },
      ],
      id: requestId,
    },
    select: detailSelect,
  });
  if (!request) {
    return {
      message: "Pre-cadastro nao encontrado.",
      ok: false,
      reason: "NOT_FOUND",
    };
  }
  return { data: normalize(request), message: "Pre-cadastro carregado.", ok: true };
}
