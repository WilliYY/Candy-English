import type { Prisma } from "@/generated/prisma/client";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const positiveInteger = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().positive(),
);
const inputSchema = z
  .object({
    date: z.string().date().optional(),
    month: positiveInteger.pipe(z.number().int().min(1).max(12)).optional(),
    query: z.string().trim().max(80).optional(),
    unit: z.enum(["ALL", "IVATE", "DOURADINA"]).default("ALL"),
    year: positiveInteger.pipe(z.number().int().min(2020).max(2100)).optional(),
  })
  .strict();

export const mobileAdminAgendaLessonSelect = {
  date: true,
  id: true,
  isMakeup: true,
  notes: true,
  status: true,
  student: {
    select: {
      id: true,
      name: true,
      notes: true,
      phone: true,
      unit: true,
    },
  },
  time: true,
  updatedAt: true,
} satisfies Prisma.AgendaLessonSelect;

export type MobileAdminAgendaLessonRow = Prisma.AgendaLessonGetPayload<{
  select: typeof mobileAdminAgendaLessonSelect;
}>;
export type MobileAdminAgendaStore = Pick<
  ReturnType<typeof getPrisma>,
  "agendaLesson"
>;
type Options = {
  now?: () => Date;
  store?: MobileAdminAgendaStore;
};

export class MobileAdminAgendaError extends Error {
  constructor(
    public readonly code:
      | "INVALID_QUERY"
      | "RESULT_LIMIT"
      | "ROLE_FORBIDDEN",
  ) {
    super(code);
    this.name = "MobileAdminAgendaError";
  }
}

export function getMobileAgendaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    month: Number(value.month),
    year: Number(value.year),
  };
}

export function safeMobileAgendaText(value: string, maximum: number) {
  return value.trim().slice(0, maximum);
}

export function safeNullableMobileAgendaText(
  value: string | null,
  maximum: number,
) {
  const normalized = value?.trim().slice(0, maximum);
  return normalized || null;
}

function normalizedSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function isAttended(row: MobileAdminAgendaLessonRow) {
  return row.status === "ATTENDED" || row.status === "MAKEUP_ATTENDED";
}

function isScheduled(row: MobileAdminAgendaLessonRow) {
  return row.status === "SCHEDULED" || row.status === "MAKEUP_SCHEDULED";
}

function counts(rows: MobileAdminAgendaLessonRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.count += 1;
      if (isAttended(row)) summary.attendedCount += 1;
      if (isScheduled(row)) summary.scheduledCount += 1;
      if (row.status === "MISSED") summary.missedCount += 1;
      if (row.isMakeup) summary.makeupCount += 1;
      return summary;
    },
    {
      attendedCount: 0,
      count: 0,
      makeupCount: 0,
      missedCount: 0,
      scheduledCount: 0,
    },
  );
}

export function serializeMobileAdminAgendaLesson(
  row: MobileAdminAgendaLessonRow,
) {
  return {
    date: getMobileAgendaDateParts(row.date).date,
    id: row.id,
    isMakeup: row.isMakeup,
    lessonNote: safeNullableMobileAgendaText(row.notes, 500),
    status: row.status,
    studentId: row.student.id,
    studentName: safeMobileAgendaText(row.student.name, 120),
    studentNote: safeNullableMobileAgendaText(row.student.notes, 500),
    studentPhone: safeNullableMobileAgendaText(row.student.phone, 40),
    studentUnit: row.student.unit,
    time: safeMobileAgendaText(row.time, 10),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getMobileAdminAgenda(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminAgendaError("ROLE_FORBIDDEN");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminAgendaError("INVALID_QUERY");
  }
  const now = options.now?.() ?? new Date();
  const today = getMobileAgendaDateParts(now);
  const year = parsed.data.year ?? today.year;
  const month = parsed.data.month ?? today.month;
  const fallbackDate =
    year === today.year && month === today.month
      ? today.date
      : `${year}-${String(month).padStart(2, "0")}-01`;
  const selectedDate = parsed.data.date ?? fallbackDate;
  if (!selectedDate.startsWith(`${year}-${String(month).padStart(2, "0")}-`)) {
    throw new MobileAdminAgendaError("INVALID_QUERY");
  }

  const store = options.store ?? getPrisma();
  const rows = await store.agendaLesson.findMany({
    orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }],
    select: mobileAdminAgendaLessonSelect,
    take: 2_001,
    where: {
      isActive: true,
      month,
      student: {
        isActive: true,
        ...(parsed.data.unit === "ALL" ? {} : { unit: parsed.data.unit }),
      },
      year,
    },
  });
  if (rows.length > 2_000) {
    throw new MobileAdminAgendaError("RESULT_LIMIT");
  }

  const byDate = new Map<string, MobileAdminAgendaLessonRow[]>();
  for (const row of rows) {
    const key = getMobileAgendaDateParts(row.date).date;
    const current = byDate.get(key) ?? [];
    current.push(row);
    byDate.set(key, current);
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    return { date, ...counts(byDate.get(date) ?? []) };
  });
  const query = normalizedSearch(parsed.data.query ?? "");
  const dailyLessons = (byDate.get(selectedDate) ?? [])
    .filter((row) => {
      if (!query) return true;
      return normalizedSearch(
        `${row.student.name} ${row.student.phone ?? ""}`,
      ).includes(query);
    })
    .sort(
      (left, right) =>
        left.time.localeCompare(right.time, "pt-BR") ||
        left.student.name.localeCompare(right.student.name, "pt-BR") ||
        left.id.localeCompare(right.id),
    )
    .map(serializeMobileAdminAgendaLesson);

  return {
    dailyLessons,
    days,
    generatedAt: now.toISOString(),
    period: { month, year },
    selectedDate,
    summary: counts(rows),
    unit: parsed.data.unit,
  };
}
