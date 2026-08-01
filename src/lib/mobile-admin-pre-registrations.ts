import type { Prisma } from "@/generated/prisma/client";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { resolveFinancialRegistration } from "@/lib/financial-completeness";
import { isOpenPreRegistrationStatus } from "@/lib/pre-registration-queue";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_PAGE_SIZE = 50;
const openStatuses = [
  "PENDING",
  "CONTACTED",
  "WAITING_PAYMENT",
  "READY_TO_CONVERT",
] as const;
const statusSchema = z.enum([
  "ALL",
  "OPEN",
  ...openStatuses,
  "APPROVED",
  "REJECTED",
]);
const unitSchema = z.enum(["ALL", "IVATE", "DOURADINA"]);
const listInputSchema = z
  .object({
    cursor: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
    query: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((value) => value || undefined),
    status: statusSchema.default("OPEN"),
    unit: unitSchema.default("ALL"),
  })
  .strict();
const requestIdSchema = z.string().trim().min(1).max(200);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const listSelect = {
  assignedTeacherProfile: { select: { user: { select: { name: true } } } },
  convertedUserId: true,
  createdAt: true,
  email: true,
  fullName: true,
  id: true,
  phone: true,
  status: true,
  statusNote: true,
  unit: true,
  updatedAt: true,
} satisfies Prisma.StudentPreRegistrationSelect;

const detailSelect = {
  address: true,
  assignedTeacherProfile: { select: { user: { select: { name: true } } } },
  birthDate: true,
  city: true,
  convertedAgendaStudentId: true,
  convertedFinancialStudentId: true,
  convertedStudentProfileId: true,
  convertedUser: { select: { email: true, name: true } },
  convertedUserId: true,
  createdAt: true,
  createdByUser: { select: { name: true, role: true } },
  email: true,
  englishGoal: true,
  estimatedLevel: true,
  fullName: true,
  guardianDocument: true,
  guardianName: true,
  guardianPhone: true,
  id: true,
  installmentsTotal: true,
  intendedTime: true,
  intendedWeekdayMask: true,
  notes: true,
  paymentDay: true,
  paymentMethod: true,
  phone: true,
  reviewedAt: true,
  reviewedByUser: { select: { name: true } },
  secondaryContact: true,
  status: true,
  statusNote: true,
  studentPhone: true,
  tuitionCents: true,
  unit: true,
  updatedAt: true,
} satisfies Prisma.StudentPreRegistrationSelect;

type ListRow = Prisma.StudentPreRegistrationGetPayload<{
  select: typeof listSelect;
}>;
type DetailRow = Prisma.StudentPreRegistrationGetPayload<{
  select: typeof detailSelect;
}>;

export type MobileAdminPreRegistrationsStore = Pick<
  ReturnType<typeof getPrisma>,
  "studentPreRegistration"
>;

type Options = {
  now?: () => Date;
  store?: MobileAdminPreRegistrationsStore;
};

export class MobileAdminPreRegistrationsError extends Error {
  constructor(
    public readonly code:
      | "INVALID_QUERY"
      | "PRE_REGISTRATION_NOT_FOUND"
      | "ROLE_FORBIDDEN",
  ) {
    super(code);
    this.name = "MobileAdminPreRegistrationsError";
  }
}

function requireAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminPreRegistrationsError("ROLE_FORBIDDEN");
  }
}

function text(value: string, maximum: number) {
  return value.trim().slice(0, maximum);
}

function nullableText(value: string | null, maximum: number) {
  const normalized = value?.trim().slice(0, maximum);
  return normalized || null;
}

function converted(row: {
  convertedAgendaStudentId?: string | null;
  convertedFinancialStudentId?: string | null;
  convertedStudentProfileId?: string | null;
  convertedUserId: string | null;
}) {
  return Boolean(
    row.convertedUserId ||
      row.convertedStudentProfileId ||
      row.convertedFinancialStudentId ||
      row.convertedAgendaStudentId,
  );
}

function listItem(row: ListRow) {
  return {
    assignedTeacherName: row.assignedTeacherProfile
      ? text(row.assignedTeacherProfile.user.name, 120)
      : null,
    converted: converted(row),
    createdAt: row.createdAt.toISOString(),
    email: nullableText(row.email, 254),
    fullName: text(row.fullName, 120) || "Interessado sem nome",
    id: row.id,
    phone: text(row.phone, 40),
    status: row.status,
    statusNote: nullableText(row.statusNote, 500),
    unit: row.unit,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizePaymentMethod(method: string | null) {
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

function detail(row: DetailRow) {
  const days = dayLabels.filter(
    (_, index) => (row.intendedWeekdayMask & (1 << index)) !== 0,
  );
  const agendaComplete = Boolean(
    days.length > 0 && row.intendedTime && timePattern.test(row.intendedTime),
  );
  const finance = resolveFinancialRegistration({
    amountCents: row.tuitionCents,
    paymentDay: row.paymentDay,
    paymentMethod: normalizePaymentMethod(row.paymentMethod),
  });
  const isConverted = converted(row);

  return {
    address: nullableText(row.address, 240),
    agenda: {
      complete: agendaComplete,
      days,
      time: agendaComplete ? row.intendedTime : null,
    },
    assignedTeacherName: row.assignedTeacherProfile
      ? text(row.assignedTeacherProfile.user.name, 120)
      : null,
    birthDate: row.birthDate?.toISOString().slice(0, 10) ?? null,
    canConvert: isOpenPreRegistrationStatus(row.status) && !isConverted,
    city: nullableText(row.city, 120),
    converted: isConverted,
    convertedUser: row.convertedUser
      ? {
          email: text(row.convertedUser.email, 254),
          name: text(row.convertedUser.name, 120),
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdByUser
      ? {
          name: text(row.createdByUser.name, 120),
          role: row.createdByUser.role,
        }
      : null,
    email: nullableText(row.email, 254),
    englishGoal: text(row.englishGoal, 1000),
    estimatedLevel: nullableText(row.estimatedLevel, 80),
    finance: { complete: finance.isComplete },
    fullName: text(row.fullName, 120) || "Interessado sem nome",
    guardianDocument: nullableText(row.guardianDocument, 40),
    guardianName: nullableText(row.guardianName, 120),
    guardianPhone: nullableText(row.guardianPhone, 40),
    id: row.id,
    installmentsTotal: row.installmentsTotal,
    notes: nullableText(row.notes, 2000),
    paymentDay: row.paymentDay,
    paymentMethod: nullableText(row.paymentMethod, 80),
    phone: text(row.phone, 40),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByName: row.reviewedByUser
      ? text(row.reviewedByUser.name, 120)
      : null,
    secondaryContact: nullableText(row.secondaryContact, 160),
    status: row.status,
    statusNote: nullableText(row.statusNote, 500),
    studentPhone: nullableText(row.studentPhone, 40),
    tuitionCents: row.tuitionCents,
    unit: row.unit,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getMobileAdminPreRegistrations(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsed = listInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminPreRegistrationsError("INVALID_QUERY");
  }

  const store = options.store ?? getPrisma();
  const { cursor, limit, query, status, unit } = parsed.data;
  const where: Prisma.StudentPreRegistrationWhereInput = {
    ...(status === "ALL"
      ? {}
      : status === "OPEN"
        ? { status: { in: [...openStatuses] } }
        : { status }),
    ...(unit === "ALL" ? {} : { unit }),
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
            {
              studentPhone: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    store.studentPreRegistration.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: listSelect,
      skip: cursor ? 1 : undefined,
      take: limit + 1,
      where,
    }),
    store.studentPreRegistration.count({ where }),
  ]);
  const visibleRows = rows.slice(0, limit);

  return {
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    items: visibleRows.map(listItem),
    nextCursor:
      rows.length > limit ? (visibleRows.at(-1)?.id ?? null) : null,
    total,
  };
}

export async function getMobileAdminPreRegistration(
  actor: MobileAuthUser,
  requestId: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedRequestId = requestIdSchema.safeParse(requestId);
  if (!parsedRequestId.success) {
    throw new MobileAdminPreRegistrationsError("INVALID_QUERY");
  }

  const store = options.store ?? getPrisma();
  const preRegistration = await store.studentPreRegistration.findUnique({
    where: { id: parsedRequestId.data },
    select: detailSelect,
  });
  if (!preRegistration) {
    throw new MobileAdminPreRegistrationsError(
      "PRE_REGISTRATION_NOT_FOUND",
    );
  }
  return detail(preRegistration);
}
