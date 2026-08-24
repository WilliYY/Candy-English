import { hasCompleteFinancialRegistration } from "@/lib/financial-completeness";

export const TEACHER_FINANCE_YEAR = 2026;

export const TEACHER_FINANCE_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type TeacherFinanceStatus =
  | "PAID"
  | "PENDING"
  | "OVERDUE"
  | "INCOMPLETE"
  | "INACTIVE";

export type TeacherFinanceRow = {
  id: string;
  name: string;
  paidAt: string | null;
  paymentDay: number | null;
  status: TeacherFinanceStatus;
  unit: "IVATE" | "DOURADINA";
};

type TeacherFinancePaymentSource = {
  isActive: boolean;
  isPaid: boolean;
  month: number;
  paidAt: Date | null;
  snapshotAmountCents: number;
  snapshotName: string;
  snapshotPaymentDay: number;
  snapshotPaymentMethod: string;
  snapshotUnit: "IVATE" | "DOURADINA";
  year: number;
};

export type TeacherFinanceStudentSource = {
  financialStudent: {
    payments: TeacherFinancePaymentSource[];
  } | null;
  id: string;
  unit: "IVATE" | "DOURADINA";
  user: {
    name: string;
  };
};

type DateParts = {
  day: number;
  month: number;
  year: number;
};

export function getTeacherFinanceDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(date);
  const number = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    day: number("day"),
    month: number("month"),
    year: number("year"),
  };
}

export function normalizeTeacherFinanceMonth(
  value: unknown,
  fallbackMonth: number,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed
    : fallbackMonth;
}

function comparableDate(year: number, month: number, day: number) {
  return year * 10_000 + month * 100 + day;
}

function getTeacherFinanceStatus(
  payment: TeacherFinancePaymentSource,
  today: DateParts,
): TeacherFinanceStatus {
  if (!payment.isActive) {
    return "INACTIVE";
  }

  if (
    !hasCompleteFinancialRegistration({
      amountCents: payment.snapshotAmountCents,
      paymentDay: payment.snapshotPaymentDay,
      paymentMethod: payment.snapshotPaymentMethod,
    })
  ) {
    return "INCOMPLETE";
  }

  if (payment.isPaid) {
    return "PAID";
  }

  const lastDay = new Date(
    Date.UTC(payment.year, payment.month, 0),
  ).getUTCDate();
  const dueDay = Math.min(payment.snapshotPaymentDay, lastDay);

  return comparableDate(today.year, today.month, today.day) >
    comparableDate(payment.year, payment.month, dueDay)
    ? "OVERDUE"
    : "PENDING";
}

export function projectTeacherFinanceRow(
  student: TeacherFinanceStudentSource,
  now: Date,
): TeacherFinanceRow {
  const payment = student.financialStudent?.payments[0];

  if (!payment) {
    return {
      id: student.id,
      name: student.user.name,
      paidAt: null,
      paymentDay: null,
      status: "INCOMPLETE",
      unit: student.unit,
    };
  }

  return {
    id: student.id,
    name: payment.snapshotName,
    paidAt: payment.paidAt?.toISOString() ?? null,
    paymentDay:
      payment.snapshotPaymentDay >= 1 && payment.snapshotPaymentDay <= 31
        ? payment.snapshotPaymentDay
        : null,
    status: getTeacherFinanceStatus(
      payment,
      getTeacherFinanceDateParts(now),
    ),
    unit: payment.snapshotUnit,
  };
}
