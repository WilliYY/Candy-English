import type { Prisma } from "@/generated/prisma/client";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { hasCompleteFinancialRegistration } from "@/lib/financial-completeness";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_PAGE_SIZE = 50;
const financialUnits = ["IVATE", "DOURADINA"] as const;
const financeStatuses = [
  "ALL",
  "PAID",
  "PENDING",
  "OVERDUE",
  "INCOMPLETE",
] as const;
const inputSchema = z
  .object({
    cursor: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
    month: z.coerce.number().int().min(1).max(12).optional(),
    query: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((value) => value || undefined),
    status: z.enum(financeStatuses).default("ALL"),
    unit: z.enum(["ALL", ...financialUnits]).default("ALL"),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
  })
  .strict();

export const mobileAdminFinancePaymentSelect = {
  id: true,
  isActive: true,
  isPaid: true,
  month: true,
  note: true,
  paidAt: true,
  snapshotAmountCents: true,
  snapshotInstallmentNumber: true,
  snapshotInstallmentsTotal: true,
  snapshotName: true,
  snapshotPaymentDay: true,
  snapshotPaymentMethod: true,
  snapshotUnit: true,
  studentId: true,
  updatedAt: true,
  year: true,
} satisfies Prisma.FinancialPaymentSelect;

export type MobileAdminFinancePaymentRow = Prisma.FinancialPaymentGetPayload<{
  select: typeof mobileAdminFinancePaymentSelect;
}>;

export type MobileAdminFinanceStore = Pick<
  ReturnType<typeof getPrisma>,
  "financialPayment"
>;

type Options = {
  now?: () => Date;
  store?: MobileAdminFinanceStore;
};

export class MobileAdminFinanceError extends Error {
  constructor(public readonly code: "INVALID_QUERY" | "ROLE_FORBIDDEN") {
    super(code);
    this.name = "MobileAdminFinanceError";
  }
}

export function getMobileFinanceDateParts(date: Date) {
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

function comparableDate(year: number, month: number, day: number) {
  return year * 10_000 + month * 100 + day;
}

function paymentStatus(
  row: MobileAdminFinancePaymentRow,
  today: ReturnType<typeof getMobileFinanceDateParts>,
) {
  if (
    !hasCompleteFinancialRegistration({
      amountCents: row.snapshotAmountCents,
      paymentDay: row.snapshotPaymentDay,
      paymentMethod: row.snapshotPaymentMethod,
    })
  ) {
    return "INCOMPLETE" as const;
  }
  if (row.isPaid) return "PAID" as const;

  const lastDay = new Date(Date.UTC(row.year, row.month, 0)).getUTCDate();
  const dueDay = Math.min(row.snapshotPaymentDay, lastDay);
  return comparableDate(today.year, today.month, today.day) >
    comparableDate(row.year, row.month, dueDay)
    ? ("OVERDUE" as const)
    : ("PENDING" as const);
}

function safeText(value: string, maximum: number) {
  return value.trim().slice(0, maximum);
}

function safeNullableText(value: string | null, maximum: number) {
  const normalized = value?.trim().slice(0, maximum);
  return normalized || null;
}

function positiveInteger(value: number | null) {
  return value && value > 0 ? value : null;
}

export function serializeMobileAdminFinancePayment(
  row: MobileAdminFinancePaymentRow,
  today: ReturnType<typeof getMobileFinanceDateParts>,
) {
  return {
    amountCents: Math.max(0, row.snapshotAmountCents),
    id: row.id,
    installmentNumber: positiveInteger(row.snapshotInstallmentNumber),
    installmentsTotal: positiveInteger(row.snapshotInstallmentsTotal),
    isPaid: row.isPaid,
    month: row.month,
    name: safeText(row.snapshotName, 120) || "Aluno sem nome",
    note: safeNullableText(row.note, 500),
    paidAt: row.paidAt?.toISOString() ?? null,
    paymentDay: Math.min(31, Math.max(1, row.snapshotPaymentDay)),
    paymentMethod:
      safeText(row.snapshotPaymentMethod, 80) || "A_DEFINIR",
    status: paymentStatus(row, today),
    studentId: row.studentId,
    unit: row.snapshotUnit,
    updatedAt: row.updatedAt.toISOString(),
    year: row.year,
  };
}

type FinanceItem = ReturnType<typeof serializeMobileAdminFinancePayment>;

function summary(rows: FinanceItem[]) {
  return rows.reduce(
    (accumulator, row) => {
      accumulator.studentsCount += 1;
      if (row.status === "INCOMPLETE") {
        accumulator.incompleteCount += 1;
        return accumulator;
      }

      accumulator.totalCents += row.amountCents;
      if (row.status === "PAID") {
        accumulator.paidCents += row.amountCents;
        accumulator.paidCount += 1;
      } else {
        accumulator.pendingCents += row.amountCents;
        accumulator.pendingCount += 1;
      }
      if (row.status === "OVERDUE") {
        accumulator.overdueCents += row.amountCents;
        accumulator.overdueCount += 1;
      }
      return accumulator;
    },
    {
      incompleteCount: 0,
      overdueCents: 0,
      overdueCount: 0,
      paidCents: 0,
      paidCount: 0,
      pendingCents: 0,
      pendingCount: 0,
      studentsCount: 0,
      totalCents: 0,
    },
  );
}

export async function getMobileAdminFinance(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminFinanceError("ROLE_FORBIDDEN");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminFinanceError("INVALID_QUERY");
  }

  const now = options.now?.() ?? new Date();
  const today = getMobileFinanceDateParts(now);
  const month = parsed.data.month ?? today.month;
  const year = parsed.data.year ?? today.year;
  const store = options.store ?? getPrisma();
  const rows = await store.financialPayment.findMany({
    orderBy: [
      { snapshotPaymentDay: "asc" },
      { snapshotName: "asc" },
      { id: "asc" },
    ],
    select: mobileAdminFinancePaymentSelect,
    where: { isActive: true, month, year },
  });
  const allItems = rows
    .map((row) => serializeMobileAdminFinancePayment(row, today))
    .sort(
      (left, right) =>
        left.paymentDay - right.paymentDay ||
        left.name.localeCompare(right.name, "pt-BR") ||
        left.id.localeCompare(right.id),
    );
  const scopeItems = allItems.filter(
    (row) => parsed.data.unit === "ALL" || row.unit === parsed.data.unit,
  );
  const normalizedQuery = parsed.data.query?.toLocaleLowerCase("pt-BR");
  const filteredItems = scopeItems.filter(
    (row) =>
      (parsed.data.status === "ALL" || row.status === parsed.data.status) &&
      (!normalizedQuery ||
        row.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)),
  );
  const cursorIndex = parsed.data.cursor
    ? filteredItems.findIndex((row) => row.id === parsed.data.cursor)
    : -1;
  if (parsed.data.cursor && cursorIndex < 0) {
    throw new MobileAdminFinanceError("INVALID_QUERY");
  }
  const start = cursorIndex + 1;
  const visibleItems = filteredItems.slice(start, start + parsed.data.limit);

  return {
    generatedAt: now.toISOString(),
    items: visibleItems,
    nextCursor:
      start + parsed.data.limit < filteredItems.length
        ? (visibleItems.at(-1)?.id ?? null)
        : null,
    period: { month, year },
    scopeSummary: summary(scopeItems),
    total: filteredItems.length,
    unitSummaries: financialUnits.map((unit) => ({
      unit,
      ...summary(allItems.filter((row) => row.unit === unit)),
    })),
  };
}
