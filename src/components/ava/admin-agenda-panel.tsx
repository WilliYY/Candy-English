"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  ListChecks,
  LoaderCircle,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createAgendaSchedule,
  deleteAgendaStudent,
  updateAgendaAttendance,
  updateAgendaStudentSchedule,
} from "@/app/ava/admin/actions";
import {
  adminAgendaScheduleCreateSchema,
  adminAgendaStudentUpdateSchema,
  FINANCIAL_UNITS,
  type AdminAgendaAttendanceInput,
  type AdminAgendaScheduleCreateInput,
  type AdminAgendaStudentUpdateInput,
} from "@/lib/validations/admin-users";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  SECRETARIA_UNIT_FILTER_OPTIONS,
  type SecretariaUnitFilter,
} from "@/lib/secretaria-unit-filter";
import {
  AgendaDateRail,
  type AgendaDateRailDay,
} from "@/components/ava/agenda-date-rail";
import { AgendaMonthStudentCard } from "@/components/ava/agenda-month-student-card";

export type AdminAgendaLessonStatus =
  | "ATTENDED"
  | "MAKEUP_ATTENDED"
  | "MAKEUP_SCHEDULED"
  | "MISSED"
  | "SCHEDULED";

type FinancialUnit = "IVATE" | "DOURADINA";

export type AdminAgendaLessonRow = {
  date: string;
  id: string;
  isActive: boolean;
  isMakeup: boolean;
  makeupForLessonId: string | null;
  month: number;
  notes: string | null;
  status: AdminAgendaLessonStatus;
  studentId: string;
  studentName: string;
  studentNotes: string | null;
  studentPhone: string | null;
  studentUnit: FinancialUnit;
  time: string;
  weekday: number;
  year: number;
};

export type AdminAgendaStudentRow = {
  defaultTime: string | null;
  id: string;
  isActive: boolean;
  name: string;
  notes: string | null;
  phone: string | null;
  unit: FinancialUnit;
  weekdayMask: number;
};

export type AdminAgendaAvaStudentOption = {
  agendaStudentId: string | null;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  phone: string | null;
  unit: FinancialUnit;
};

export type AdminAgendaLogRow = {
  createdAt: string;
  description: string;
  id: string;
  studentName: string | null;
};

type AdminAgendaPanelProps = {
  avaStudents: AdminAgendaAvaStudentOption[];
  initialMonth: number;
  initialUnitFilter?: SecretariaUnitFilter;
  lessons: AdminAgendaLessonRow[];
  logs: AdminAgendaLogRow[];
  nowIso: string;
  students: AdminAgendaStudentRow[];
};

type AgendaSheetFilter = "ALL" | "TODAY" | "PENDING" | "MISSED" | "INACTIVE";
type AgendaViewMode = "DAY" | "MONTH";

type AgendaStudentMonthRow = {
  attendedCount: number;
  lessons: AdminAgendaLessonRow[];
  missedCount: number;
  nextLesson: AdminAgendaLessonRow | null;
  scheduledCount: number;
  schedule: {
    isComplete: boolean;
    time: string;
    weekdays: number[];
  };
  student: AdminAgendaStudentRow;
  todayLesson: AdminAgendaLessonRow | null;
};

const AGENDA_YEAR = 2026;
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

const months = [
  { label: "Janeiro", shortLabel: "Jan", value: 1 },
  { label: "Fevereiro", shortLabel: "Fev", value: 2 },
  { label: "Marco", shortLabel: "Mar", value: 3 },
  { label: "Abril", shortLabel: "Abr", value: 4 },
  { label: "Maio", shortLabel: "Mai", value: 5 },
  { label: "Junho", shortLabel: "Jun", value: 6 },
  { label: "Julho", shortLabel: "Jul", value: 7 },
  { label: "Agosto", shortLabel: "Ago", value: 8 },
  { label: "Setembro", shortLabel: "Set", value: 9 },
  { label: "Outubro", shortLabel: "Out", value: 10 },
  { label: "Novembro", shortLabel: "Nov", value: 11 },
  { label: "Dezembro", shortLabel: "Dez", value: 12 },
];

const weekdays = [
  { label: "Dom", longLabel: "Domingo", value: 0 },
  { label: "Seg", longLabel: "Segunda", value: 1 },
  { label: "Ter", longLabel: "Terca", value: 2 },
  { label: "Qua", longLabel: "Quarta", value: 3 },
  { label: "Qui", longLabel: "Quinta", value: 4 },
  { label: "Sex", longLabel: "Sexta", value: 5 },
  { label: "Sab", longLabel: "Sabado", value: 6 },
];

const unitLabels: Record<FinancialUnit, string> = {
  DOURADINA: "Unidade 2 Douradina",
  IVATE: "Unidade 1 Ivate",
};

const agendaSheetFilters: ReadonlyArray<{
  label: string;
  value: AgendaSheetFilter;
}> = [
  { label: "Todos", value: "ALL" },
  { label: "Aulas de hoje", value: "TODAY" },
  { label: "A confirmar", value: "PENDING" },
  { label: "Com faltas", value: "MISSED" },
  { label: "Inativos", value: "INACTIVE" },
];

const agendaUnitMeta: Record<
  FinancialUnit,
  {
    groupClassName: string;
    label: string;
    pillClassName: string;
    rowClassName: string;
  }
> = {
  DOURADINA: {
    groupClassName: "border-rose-200 bg-rose-50 text-rose-900",
    label: "Polo 2 - Douradina",
    pillClassName: "border-rose-200 bg-rose-50 text-rose-800",
    rowClassName: "bg-rose-50/35 hover:bg-rose-50/70",
  },
  IVATE: {
    groupClassName: "border-cyan-200 bg-cyan-50 text-cyan-900",
    label: "Polo 1 - Ivate",
    pillClassName: "border-cyan-200 bg-cyan-50 text-cyan-800",
    rowClassName: "bg-cyan-50/35 hover:bg-cyan-50/70",
  },
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: SAO_PAULO_TIME_ZONE,
});

const railDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: SAO_PAULO_TIME_ZONE,
});

const saoPauloDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
});

function clampMonth(month: number) {
  return Math.min(Math.max(month, 1), 12);
}

function getMonthLabel(month: number) {
  return months.find((item) => item.value === month)?.label ?? "Mes";
}

function getWeekdayLabel(weekday: number) {
  return weekdays.find((item) => item.value === weekday)?.longLabel ?? "Dia";
}

function getWeekdayShortLabel(weekday: number) {
  return weekdays.find((item) => item.value === weekday)?.label ?? "Dia";
}

function formatWeekdayList(values: number[]) {
  if (values.length === 0) {
    return "Sem dias ativos";
  }

  return values.map(getWeekdayShortLabel).join(", ");
}

function getAgendaInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "CE";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDayKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getSaoPauloDateParts(date: Date) {
  const parts = saoPauloDatePartsFormatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    day: getPart("day"),
    month: getPart("month"),
    year: getPart("year"),
  };
}

function toDayKey(date: Date) {
  const parts = getSaoPauloDateParts(date);

  return getDayKey(parts.year, parts.month, parts.day);
}

function parseDayKey(key: string) {
  const [year = AGENDA_YEAR, month = 1, day = 1] = key
    .split("-")
    .map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function parseLessonDate(value: string) {
  return new Date(value);
}

function getLessonDayKey(lesson: AdminAgendaLessonRow) {
  return toDayKey(parseLessonDate(lesson.date));
}

function formatDate(value: string) {
  return dateFormatter.format(parseLessonDate(value));
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(parseLessonDate(value));
}

function sortLessons(left: AdminAgendaLessonRow, right: AdminAgendaLessonRow) {
  const dateDiff =
    parseLessonDate(left.date).getTime() -
    parseLessonDate(right.date).getTime();

  if (dateDiff !== 0) {
    return dateDiff;
  }

  if (left.time !== right.time) {
    return left.time.localeCompare(right.time);
  }

  return left.studentName.localeCompare(right.studentName, "pt-BR");
}

function decodeWeekdayMask(mask: number) {
  return weekdays
    .filter((weekday) => (mask & (1 << weekday.value)) !== 0)
    .map((weekday) => weekday.value);
}

function createDefaultValues(
  month: number,
  weekdaysValue: number[] = [],
  unit: FinancialUnit = "IVATE",
): AdminAgendaScheduleCreateInput {
  return {
    month,
    name: "",
    notes: "",
    phone: "",
    studentProfileId: "",
    time: "08:00",
    unit,
    weekdays: weekdaysValue,
    year: AGENDA_YEAR,
  };
}

function getDefaultUnitForFilter(
  filter: SecretariaUnitFilter | undefined,
): FinancialUnit {
  return filter === "DOURADINA" || filter === "IVATE" ? filter : "IVATE";
}

function getStatusMeta(status: AdminAgendaLessonStatus) {
  if (status === "ATTENDED" || status === "MAKEUP_ATTENDED") {
    return {
      accentClassName: "bg-emerald-500",
      cardClassName:
        "border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/80 text-emerald-950",
      dotClassName: "bg-emerald-500",
      iconClassName: "bg-emerald-600 text-white shadow-emerald-200",
      label: status === "MAKEUP_ATTENDED" ? "Reposicao feita" : "Veio",
      pillClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
      softClassName: "border-emerald-100 bg-emerald-50 text-emerald-800",
    };
  }

  if (status === "MISSED") {
    return {
      accentClassName: "bg-red-500",
      cardClassName:
        "border-red-200 bg-gradient-to-br from-white via-white to-rose-50/85 text-red-950",
      dotClassName: "bg-red-500",
      iconClassName: "bg-red-600 text-white shadow-red-200",
      label: "Nao veio",
      pillClassName: "border-red-200 bg-red-50 text-red-800",
      softClassName: "border-red-100 bg-red-50 text-red-800",
    };
  }

  if (status === "MAKEUP_SCHEDULED") {
    return {
      accentClassName: "bg-amber-500",
      cardClassName:
        "border-amber-200 bg-gradient-to-br from-white via-white to-amber-50/85 text-amber-950",
      dotClassName: "bg-amber-500",
      iconClassName: "bg-amber-500 text-white shadow-amber-200",
      label: "Reposicao",
      pillClassName: "border-amber-200 bg-amber-50 text-amber-900",
      softClassName: "border-amber-100 bg-amber-50 text-amber-900",
    };
  }

  return {
    accentClassName: "bg-primary",
    cardClassName:
      "border-primary/20 bg-gradient-to-br from-white via-white to-violet-50/80 text-primary",
    dotClassName: "bg-primary",
    iconClassName: "bg-primary text-primary-foreground shadow-primary/20",
    label: "Previsto",
    pillClassName: "border-primary/20 bg-primary/5 text-primary",
    softClassName: "border-primary/10 bg-primary/5 text-primary",
  };
}

function getStudentSchedule(
  student: AdminAgendaStudentRow,
  lessons: AdminAgendaLessonRow[],
) {
  const activeLessons = lessons
    .filter((lesson) => lesson.studentId === student.id && lesson.isActive)
    .sort(sortLessons);
  const weekdaysFromMask = decodeWeekdayMask(student.weekdayMask);
  const weekdaysFromLessons = Array.from(
    new Set(
      activeLessons
        .filter((lesson) => !lesson.isMakeup)
        .map((lesson) => lesson.weekday),
    ),
  ).sort((left, right) => left - right);
  const scheduleWeekdays =
    weekdaysFromMask.length > 0 ? weekdaysFromMask : weekdaysFromLessons;
  const resolvedTime = student.defaultTime ?? activeLessons[0]?.time ?? null;

  return {
    isComplete: Boolean(resolvedTime && scheduleWeekdays.length > 0),
    time: resolvedTime ?? "08:00",
    weekdays: scheduleWeekdays,
  };
}

function matchesAgendaSheetFilter(
  row: AgendaStudentMonthRow,
  filter: AgendaSheetFilter,
) {
  if (filter === "TODAY") {
    return Boolean(row.todayLesson);
  }

  if (filter === "PENDING") {
    return row.scheduledCount > 0;
  }

  if (filter === "MISSED") {
    return row.missedCount > 0;
  }

  if (filter === "INACTIVE") {
    return !row.student.isActive;
  }

  return true;
}

function getPendingLessonCount(lessons: AdminAgendaLessonRow[]) {
  return lessons.filter(
    (lesson) =>
      lesson.status === "SCHEDULED" ||
      lesson.status === "MAKEUP_SCHEDULED",
  ).length;
}

function buildEditValues(
  student: AdminAgendaStudentRow,
  lessons: AdminAgendaLessonRow[],
  month: number,
): AdminAgendaStudentUpdateInput {
  const schedule = getStudentSchedule(student, lessons);

  return {
    isActive: student.isActive,
    month,
    name: student.name,
    notes: student.notes ?? "",
    phone: student.phone ?? "",
    studentId: student.id,
    time: schedule.isComplete ? schedule.time : "",
    unit: student.unit,
    weekdays: schedule.isComplete ? schedule.weekdays : [],
    year: AGENDA_YEAR,
  };
}

function AgendaMetric({
  className,
  helper,
  icon: Icon,
  iconClassName,
  label,
  value,
  valueClassName,
}: {
  className?: string;
  helper: string;
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: number | string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border p-3.5 shadow-[0_8px_22px_rgba(58,29,75,0.07)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border bg-white/80 shadow-sm",
            iconClassName,
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <strong
        className={cn(
          "mt-1 block text-3xl leading-none text-primary tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </strong>
      <span className="mt-2 block text-xs font-medium text-muted-foreground">
        {helper}
      </span>
    </div>
  );
}

function AgendaAttendanceButtons({ lesson }: { lesson: AdminAgendaLessonRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function submitStatus(status: AdminAgendaAttendanceInput["status"]) {
    startTransition(async () => {
      const result = await updateAgendaAttendance({
        lessonId: lesson.id,
        status,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        className="h-11 justify-center border border-emerald-700 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
        onClick={() => submitStatus("ATTENDED")}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <CheckCircle2 data-icon="inline-start" />
        )}
        Veio
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        className="h-11 justify-center border border-red-700 bg-red-600 px-3 text-white hover:bg-red-700"
        onClick={() => submitStatus("MISSED")}
      >
        <XCircle data-icon="inline-start" />
        Nao veio
      </Button>
      {lesson.status !== "SCHEDULED" && lesson.status !== "MAKEUP_SCHEDULED" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          className="h-11 justify-center border-primary/25 px-3 text-primary sm:col-span-2 2xl:col-span-1"
          onClick={() => submitStatus("SCHEDULED")}
        >
          <RotateCcw data-icon="inline-start" />
          Resetar
        </Button>
      ) : null}
    </div>
  );
}

export function AdminAgendaPanel({
  avaStudents,
  initialMonth,
  initialUnitFilter,
  lessons,
  logs,
  nowIso,
  students,
}: AdminAgendaPanelProps) {
  const router = useRouter();
  const initialFormUnit = getDefaultUnitForFilter(initialUnitFilter);
  const today = useMemo(
    () => getSaoPauloDateParts(new Date(nowIso)),
    [nowIso],
  );
  const todayIsAgendaYear = today.year === AGENDA_YEAR;
  const todayMonth = todayIsAgendaYear
    ? today.month
    : clampMonth(initialMonth);
  const todayKey = todayIsAgendaYear
    ? getDayKey(today.year, today.month, today.day)
    : getDayKey(AGENDA_YEAR, todayMonth, 1);
  const [activeMonth, setActiveMonth] = useState(todayMonth);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [viewMode, setViewMode] = useState<AgendaViewMode>("DAY");
  const [search, setSearch] = useState("");
  const [sheetFilter, setSheetFilter] = useState<AgendaSheetFilter>("ALL");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditPending, startEditTransition] = useTransition();
  const selectedDate = parseDayKey(selectedDayKey);
  const selectedWeekday = selectedDate.getUTCDay();
  const activeMonthLabel = getMonthLabel(activeMonth);

  const form = useForm<AdminAgendaScheduleCreateInput>({
    defaultValues: createDefaultValues(
      activeMonth,
      [selectedWeekday],
      initialFormUnit,
    ),
    resolver: zodResolver(adminAgendaScheduleCreateSchema),
  });
  const editForm = useForm<AdminAgendaStudentUpdateInput>({
    defaultValues:
      students[0] !== undefined
        ? buildEditValues(students[0], lessons, activeMonth)
        : {
            isActive: true,
            month: activeMonth,
            name: "",
            notes: "",
            phone: "",
            studentId: "",
            time: "08:00",
            unit: initialFormUnit,
            weekdays: [selectedWeekday],
            year: AGENDA_YEAR,
          },
    resolver: zodResolver(adminAgendaStudentUpdateSchema),
  });
  const selectedCreateWeekdays = form.watch("weekdays") ?? [];
  const selectedCreateStudentProfileId = form.watch("studentProfileId");
  const selectedEditWeekdays = editForm.watch("weekdays") ?? [];
  const selectedCreateStudent = useMemo(
    () =>
      avaStudents.find(
        (student) => student.id === selectedCreateStudentProfileId,
      ) ?? null,
    [avaStudents, selectedCreateStudentProfileId],
  );
  const availableAvaStudents = useMemo(
    () =>
      avaStudents.filter(
        (student) => student.isActive && !student.agendaStudentId,
      ),
    [avaStudents],
  );
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );
  const selectedStudentSchedule = useMemo(
    () =>
      selectedStudent ? getStudentSchedule(selectedStudent, lessons) : null,
    [lessons, selectedStudent],
  );

  useEffect(() => {
    form.setValue("month", activeMonth);
  }, [activeMonth, form]);

  useEffect(() => {
    if (!selectedCreateStudent) return;

    form.setValue("name", selectedCreateStudent.name, { shouldValidate: true });
    form.setValue("phone", selectedCreateStudent.phone ?? "");
    form.setValue("unit", selectedCreateStudent.unit);
  }, [form, selectedCreateStudent]);

  const monthLessons = useMemo(
    () =>
      lessons
        .filter(
          (lesson) =>
            lesson.year === AGENDA_YEAR &&
            lesson.month === activeMonth &&
            lesson.isActive,
        )
        .sort(sortLessons),
    [activeMonth, lessons],
  );
  const monthLessonsByDay = useMemo(() => {
    return monthLessons.reduce<Map<string, AdminAgendaLessonRow[]>>(
      (map, lesson) => {
        const key = getLessonDayKey(lesson);
        const group = map.get(key) ?? [];

        group.push(lesson);
        map.set(key, group);

        return map;
      },
      new Map(),
    );
  }, [monthLessons]);
  const agendaRailDays = useMemo<AgendaDateRailDay[]>(() => {
    const daysInMonth = new Date(
      Date.UTC(AGENDA_YEAR, activeMonth, 0),
    ).getUTCDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const key = getDayKey(AGENDA_YEAR, activeMonth, day);
      const date = new Date(Date.UTC(AGENDA_YEAR, activeMonth - 1, day, 12));
      const dayLessons = monthLessonsByDay.get(key) ?? [];
      const attendedCount = dayLessons.filter(
        (lesson) =>
          lesson.status === "ATTENDED" ||
          lesson.status === "MAKEUP_ATTENDED",
      ).length;
      const missedCount = dayLessons.filter(
        (lesson) => lesson.status === "MISSED",
      ).length;
      const pendingCount = dayLessons.filter(
        (lesson) =>
          lesson.status === "SCHEDULED" ||
          lesson.status === "MAKEUP_SCHEDULED",
      ).length;

      return {
        attendedCount,
        dateLabel: railDateFormatter.format(date),
        day,
        key,
        lessonCount: dayLessons.length,
        missedCount,
        pendingCount,
        weekdayLabel: getWeekdayShortLabel(date.getUTCDay()),
        weekdayLongLabel: getWeekdayLabel(date.getUTCDay()),
      };
    });
  }, [activeMonth, monthLessonsByDay]);
  const selectedDayAllLessons = monthLessonsByDay.get(selectedDayKey) ?? [];
  const selectedDayLessons = selectedDayAllLessons.filter((lesson) => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    if (!query) {
      return true;
    }

    return (
      lesson.studentName.toLocaleLowerCase("pt-BR").includes(query) ||
      lesson.studentPhone?.toLocaleLowerCase("pt-BR").includes(query)
    );
  });
  const selectedDayAttendedCount = selectedDayAllLessons.filter(
    (lesson) =>
      lesson.status === "ATTENDED" || lesson.status === "MAKEUP_ATTENDED",
  ).length;
  const selectedDayMissedCount = selectedDayAllLessons.filter(
    (lesson) => lesson.status === "MISSED",
  ).length;
  const selectedDayScheduledCount = selectedDayAllLessons.filter(
    (lesson) =>
      lesson.status === "SCHEDULED" || lesson.status === "MAKEUP_SCHEDULED",
  ).length;
  const agendaMonthRows = useMemo<AgendaStudentMonthRow[]>(() => {
    const monthStartKey = getDayKey(AGENDA_YEAR, activeMonth, 1);
    const referenceKey = activeMonth === todayMonth ? todayKey : monthStartKey;
    const canHaveNextLesson = !todayIsAgendaYear || activeMonth >= todayMonth;

    return students
      .map((student) => {
        const studentLessons = monthLessons.filter(
          (lesson) => lesson.studentId === student.id,
        );
        const attendedCount = studentLessons.filter(
          (lesson) =>
            lesson.status === "ATTENDED" ||
            lesson.status === "MAKEUP_ATTENDED",
        ).length;
        const missedCount = studentLessons.filter(
          (lesson) => lesson.status === "MISSED",
        ).length;
        const scheduledCount = studentLessons.filter(
          (lesson) =>
            lesson.status === "SCHEDULED" ||
            lesson.status === "MAKEUP_SCHEDULED",
        ).length;
        const todayLesson =
          activeMonth === todayMonth
            ? studentLessons.find(
                (lesson) => getLessonDayKey(lesson) === todayKey,
              ) ?? null
            : null;
        const nextLesson = canHaveNextLesson
          ? studentLessons.find(
              (lesson) =>
                getLessonDayKey(lesson) >= referenceKey &&
                (lesson.status === "SCHEDULED" ||
                  lesson.status === "MAKEUP_SCHEDULED"),
            ) ?? null
          : null;

        return {
          attendedCount,
          lessons: studentLessons,
          missedCount,
          nextLesson,
          scheduledCount,
          schedule: getStudentSchedule(student, lessons),
          student,
          todayLesson,
        };
      })
      .sort((left, right) => {
        if (left.student.unit !== right.student.unit) {
          return left.student.unit === "IVATE" ? -1 : 1;
        }

        return left.student.name.localeCompare(right.student.name, "pt-BR");
      });
  }, [activeMonth, lessons, monthLessons, students, todayIsAgendaYear, todayKey, todayMonth]);
  const agendaSheetRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    return agendaMonthRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.student.name.toLocaleLowerCase("pt-BR").includes(query) ||
        row.student.phone?.toLocaleLowerCase("pt-BR").includes(query);

      return matchesSearch && matchesAgendaSheetFilter(row, sheetFilter);
    });
  }, [agendaMonthRows, search, sheetFilter]);
  const agendaSheetGroups = useMemo(
    () =>
      (["IVATE", "DOURADINA"] as const)
        .map((unit) => ({
          rows: agendaSheetRows.filter((row) => row.student.unit === unit),
          unit,
        }))
        .filter((group) => group.rows.length > 0),
    [agendaSheetRows],
  );
  const attendedCount = monthLessons.filter(
    (lesson) =>
      lesson.status === "ATTENDED" || lesson.status === "MAKEUP_ATTENDED",
  ).length;
  const missedCount = monthLessons.filter(
    (lesson) => lesson.status === "MISSED",
  ).length;
  const scheduledCount = monthLessons.filter(
    (lesson) =>
      lesson.status === "SCHEDULED" || lesson.status === "MAKEUP_SCHEDULED",
  ).length;
  const activeStudentsCount = students.filter((student) => {
    if (student.isActive) {
      return true;
    }

    return lessons.some(
      (lesson) => lesson.studentId === student.id && lesson.isActive,
    );
  }).length;
  const selectedStudentLessons = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    return lessons
      .filter((lesson) => lesson.studentId === selectedStudent.id)
      .sort((left, right) => -sortLessons(left, right));
  }, [lessons, selectedStudent]);
  const selectedStudentAttended = selectedStudentLessons.filter(
    (lesson) =>
      lesson.status === "ATTENDED" || lesson.status === "MAKEUP_ATTENDED",
  ).length;
  const selectedStudentMissed = selectedStudentLessons.filter(
    (lesson) => lesson.status === "MISSED",
  ).length;
  const selectedDayIsToday = selectedDayKey === todayKey;

  function updateSelectedDay(nextMonth: number) {
    const nextKey =
      nextMonth === todayMonth
        ? todayKey
        : getDayKey(AGENDA_YEAR, nextMonth, 1);

    setSelectedDayKey(nextKey);
    setSelectedStudentId(null);
  }

  function changeMonth(month: number) {
    if (
      selectedStudentId &&
      editForm.formState.isDirty &&
      !window.confirm("Descartar as alteracoes nao salvas da rotina?")
    ) {
      return;
    }

    const nextMonth = clampMonth(month);

    setActiveMonth(nextMonth);
    updateSelectedDay(nextMonth);
  }

  function selectAgendaDay(dayKey: string) {
    setSelectedDayKey(dayKey);
    setViewMode("DAY");
    window.setTimeout(() => {
      document
        .getElementById("agenda-day-details")
        ?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 50);
  }

  function toggleCreateWeekday(weekday: number) {
    const nextWeekdays = selectedCreateWeekdays.includes(weekday)
      ? selectedCreateWeekdays.filter((item) => item !== weekday)
      : [...selectedCreateWeekdays, weekday].sort((left, right) => left - right);

    form.setValue("weekdays", nextWeekdays, { shouldValidate: true });
  }

  function toggleEditWeekday(weekday: number) {
    const nextWeekdays = selectedEditWeekdays.includes(weekday)
      ? selectedEditWeekdays.filter((item) => item !== weekday)
      : [...selectedEditWeekdays, weekday].sort((left, right) => left - right);

    editForm.setValue("weekdays", nextWeekdays, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function prepareFormForSelectedDay() {
    form.setValue("weekdays", [selectedWeekday], { shouldValidate: true });
    form.setValue("month", activeMonth);
    document
      .getElementById("agenda-new-student")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openStudent(
    studentId: string,
    targetMonth = activeMonth,
  ) {
    const student = students.find((item) => item.id === studentId);

    if (!student) {
      return;
    }

    if (
      selectedStudentId &&
      editForm.formState.isDirty &&
      !window.confirm("Descartar as alteracoes nao salvas da rotina?")
    ) {
      return;
    }

    setSelectedStudentId(student.id);
    setEditMessage(null);
    setListMessage(null);
    editForm.reset(
      buildEditValues(student, lessons, targetMonth),
    );
  }

  function openAgendaSheetRow(row: AgendaStudentMonthRow) {
    const focusLesson = row.todayLesson ?? row.nextLesson ?? row.lessons[0] ?? null;

    if (focusLesson) {
      setSelectedDayKey(getLessonDayKey(focusLesson));
    }

    openStudent(row.student.id, activeMonth);
    window.setTimeout(() => {
      document
        .getElementById("agenda-student-details")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function changeUnitFilter(filter: SecretariaUnitFilter) {
    const unitParam = filter === "all" ? "" : `&unit=${filter}`;

    router.push(`/ava/admin?task=agenda${unitParam}`);
  }

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createAgendaSchedule({
        ...values,
        month: activeMonth,
        year: AGENDA_YEAR,
      });

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminAgendaScheduleCreateInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      form.reset(createDefaultValues(activeMonth, [selectedWeekday], values.unit));
      setMessage(result.message);
      router.refresh();
    });
  });

  const onEditSubmit = editForm.handleSubmit((values) => {
    setEditMessage(null);
    const submittedValues: AdminAgendaStudentUpdateInput = {
      ...values,
      month: activeMonth,
      year: AGENDA_YEAR,
    };

    startEditTransition(async () => {
      const result = await updateAgendaStudentSchedule(submittedValues);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              editForm.setError(field as keyof AdminAgendaStudentUpdateInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setEditMessage(result.message);
        return;
      }

      editForm.reset(submittedValues);
      setEditMessage(result.message);
      router.refresh();
    });
  });

  function inactivateSelectedStudent() {
    if (!selectedStudent) {
      return;
    }

    const confirmed = window.confirm(
      `Inativar ${selectedStudent.name} da agenda a partir de ${activeMonthLabel}?`,
    );

    if (!confirmed) {
      return;
    }

    editForm.setValue("isActive", false, { shouldDirty: true });
    editForm.handleSubmit((values) => {
      const submittedValues: AdminAgendaStudentUpdateInput = {
        ...values,
        isActive: false,
        month: activeMonth,
        year: AGENDA_YEAR,
      };

      startEditTransition(async () => {
        const result = await updateAgendaStudentSchedule(submittedValues);

        setEditMessage(result.message);

        if (result.ok) {
          editForm.reset(submittedValues);
          router.refresh();
        }
      });
    })();
  }

  function deleteSelectedStudent() {
    if (!selectedStudent) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir definitivamente ${selectedStudent.name} da agenda? Isso remove o cadastro interno e as ocorrencias dele. Para manter historico, use Inativar.`,
    );

    if (!confirmed) {
      return;
    }

    startEditTransition(async () => {
      const result = await deleteAgendaStudent({
        studentId: selectedStudent.id,
      });

      if (!result.ok) {
        setEditMessage(result.message);
        return;
      }

      setSelectedStudentId(null);
      setListMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      <section className="relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-white via-[#fff8fc] to-[#eef9ff] shadow-[0_22px_60px_rgba(65,42,76,0.11)] ring-1 ring-white/70">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500"
        />
        <div className="border-b border-primary/15 bg-white/85 p-4 pt-5 md:p-5 md:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(65,42,76,0.2)]">
                <CalendarDays aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Agenda interna
                </span>
                <h2 className="mt-1 text-xl font-semibold text-primary">
                  {activeMonthLabel} {AGENDA_YEAR}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Organize a rotina, acompanhe o dia e confirme presencas em um
                  so lugar.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect
                aria-label="Selecionar mes da agenda"
                className="h-11 min-w-36 border-primary/20 bg-white font-semibold text-primary shadow-sm"
                value={activeMonth}
                onChange={(event) => changeMonth(Number(event.target.value))}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Ir para o mes anterior"
                className="h-11 border-primary/25 bg-white px-3 text-primary shadow-sm"
                onClick={() => changeMonth(activeMonth - 1)}
                disabled={activeMonth <= 1}
              >
                <ChevronLeft data-icon="inline-start" />
                <span className="hidden sm:inline">Mes anterior</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-11 bg-primary px-4 text-primary-foreground shadow-sm"
                onClick={() => changeMonth(todayMonth)}
              >
                Hoje
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Ir para o proximo mes"
                className="h-11 border-primary/25 bg-white px-3 text-primary shadow-sm"
                onClick={() => changeMonth(activeMonth + 1)}
                disabled={activeMonth >= 12}
              >
                <span className="hidden sm:inline">Proximo mes</span>
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AgendaMetric
              helper="Aguardando confirmacao"
              icon={CalendarDays}
              label="Previstos"
              value={scheduledCount}
              className="border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50"
              iconClassName="border-violet-200 text-violet-700"
              valueClassName="text-violet-800"
            />
            <AgendaMetric
              helper="Presencas registradas"
              icon={CheckCircle2}
              label="Vieram"
              value={attendedCount}
              className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/75"
              iconClassName="border-emerald-200 text-emerald-700"
              valueClassName="text-emerald-800"
            />
            <AgendaMetric
              helper="Faltas no mes"
              icon={XCircle}
              label="Nao vieram"
              value={missedCount}
              className="border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-100/70"
              iconClassName="border-red-200 text-red-700"
              valueClassName="text-red-800"
            />
            <AgendaMetric
              helper="Na agenda interna"
              icon={Users}
              label="Alunos ativos"
              value={activeStudentsCount}
              className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/70"
              iconClassName="border-amber-200 text-amber-700"
              valueClassName="text-amber-800"
            />
          </div>
          <div className="mt-4 rounded-lg border border-primary/15 bg-white p-3.5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto]">
              <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-primary/20 bg-white px-3 shadow-sm focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10">
                <Search aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span className="sr-only">Buscar aluno na agenda</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar aluno ou telefone…"
                  type="search"
                />
              </label>
              <div
                aria-label="Escolher visualizacao da agenda"
                className="grid grid-cols-2 rounded-lg border border-primary/15 bg-primary/[0.045] p-1"
                role="group"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={viewMode === "DAY"}
                  className={cn(
                    "h-11 px-3",
                    viewMode === "DAY"
                      ? "bg-white text-primary shadow-sm hover:bg-white"
                      : "text-primary/65 hover:bg-white/70 hover:text-primary",
                  )}
                  onClick={() => setViewMode("DAY")}
                >
                  <Clock data-icon="inline-start" />
                  Agenda do dia
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={viewMode === "MONTH"}
                  className={cn(
                    "h-11 px-3",
                    viewMode === "MONTH"
                      ? "bg-white text-primary shadow-sm hover:bg-white"
                      : "text-primary/65 hover:bg-white/70 hover:text-primary",
                  )}
                  onClick={() => setViewMode("MONTH")}
                >
                  <ListChecks data-icon="inline-start" />
                  Visao mensal
                </Button>
              </div>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto border-t border-primary/10 pt-3">
              <span className="mr-1 shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-primary/55">
                Polo
              </span>
              {SECRETARIA_UNIT_FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={initialUnitFilter === option.value ? "default" : "outline"}
                  aria-pressed={initialUnitFilter === option.value}
                  className={cn(
                    "h-11 shrink-0",
                    initialUnitFilter === option.value
                      ? "bg-primary text-primary-foreground"
                      : "border-primary/15 bg-white text-primary",
                  )}
                  onClick={() => changeUnitFilter(option.value)}
                >
                  {option.value === "all"
                    ? "Todos os polos"
                    : option.value === "IVATE"
                      ? "Polo 1 - Ivate"
                      : "Polo 2 - Douradina"}
                </Button>
              ))}
              <span className="ml-auto shrink-0 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                {viewMode === "DAY"
                  ? `${selectedDayLessons.length} aula(s) no dia`
                  : `${agendaSheetRows.length} de ${agendaMonthRows.length} aluno(s)`}
              </span>
            </div>

            {viewMode === "MONTH" ? (
              <div className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto border-t border-primary/10 pt-3">
                <span className="mr-1 shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-primary/55">
                  Situacao
                </span>
                {agendaSheetFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={sheetFilter === filter.value ? "default" : "outline"}
                    aria-pressed={sheetFilter === filter.value}
                    className={cn(
                      "h-11 shrink-0 px-3",
                      sheetFilter === filter.value
                        ? "bg-primary text-primary-foreground"
                        : "border-primary/15 bg-white text-primary",
                    )}
                    onClick={() => setSheetFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          {listMessage ? (
            <p
              aria-live="polite"
              className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
            >
              {listMessage}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 p-3 md:p-4">
          <div className="min-w-0 rounded-lg border border-primary/15 bg-gradient-to-r from-white via-white to-violet-50/60 p-3 shadow-sm md:p-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                  Navegue pelo mes
                </span>
                <h3 className="mt-1 text-base font-semibold text-primary">
                  Escolha um dia da agenda
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Verde indica presencas, vermelho faltas e amarelo aulas a
                  confirmar.
                </p>
              </div>
              <span className="rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-bold text-primary shadow-sm">
                {agendaRailDays.length} dias em {activeMonthLabel}
              </span>
            </div>
            <AgendaDateRail
              days={agendaRailDays}
              onSelectDay={selectAgendaDay}
              selectedDayKey={selectedDayKey}
              todayKey={todayKey}
            />
          </div>

          {viewMode === "MONTH" ? (
            <div className="min-w-0 overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/15 bg-primary px-4 py-3.5 text-primary-foreground">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/65">
                  Planilha mensal
                </span>
                <h3 className="mt-0.5 text-base font-semibold">
                  Controle por aluno - {activeMonthLabel}
                </h3>
                <p className="mt-1 text-xs text-white/75">
                  Rotina, presencas, faltas e proximas aulas em uma unica visao.
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
                {agendaSheetRows.length} aluno(s) visivel(is)
              </span>
            </div>

            {agendaSheetRows.length === 0 ? (
              <div className="m-4 rounded-lg border border-dashed border-primary/20 bg-primary/5 px-4 py-10 text-center">
                <Users aria-hidden="true" className="mx-auto size-6 text-primary/45" />
                <p className="mt-2 text-sm font-semibold text-primary">
                  Nenhum aluno encontrado neste filtro.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajuste a busca, o status ou o polo para ver outros registros.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 p-3 md:hidden">
                  {agendaSheetGroups.map((group) => {
                    const unitMeta = agendaUnitMeta[group.unit];

                    return (
                      <section key={group.unit} className="grid gap-2">
                        <div
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-2",
                            unitMeta.groupClassName,
                          )}
                        >
                          <h4 className="text-sm font-bold">{unitMeta.label}</h4>
                          <span className="text-xs font-semibold opacity-75">
                            {group.rows.length} aluno(s)
                          </span>
                        </div>
                        {group.rows.map((row) => {
                          const isSelected = selectedStudentId === row.student.id;
                          const pendingCount = getPendingLessonCount(row.lessons);

                          return (
                            <AgendaMonthStudentCard
                              key={row.student.id}
                              attendedCount={row.attendedCount}
                              initials={getAgendaInitials(row.student.name)}
                              isSelected={isSelected}
                              missedCount={row.missedCount}
                              nextLessonLabel={
                                row.todayLesson
                                  ? `Hoje as ${row.todayLesson.time}`
                                  : row.nextLesson
                                    ? `Proxima: ${formatShortDate(row.nextLesson.date)} as ${row.nextLesson.time}`
                                    : "Sem proxima aula"
                              }
                              onOpen={() => openAgendaSheetRow(row)}
                              pendingCount={pendingCount}
                              phone={row.student.phone}
                              scheduleLabel={
                                row.schedule.isComplete
                                  ? `${formatWeekdayList(row.schedule.weekdays)} as ${row.schedule.time}`
                                  : "Rotina pendente"
                              }
                              studentName={row.student.name}
                              unitLabel={group.unit === "IVATE" ? "Polo 1" : "Polo 2"}
                              unitToneClassName={unitMeta.pillClassName}
                            />
                          );
                        })}
                      </section>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                  <thead className="bg-[#f8f4fa] text-[0.65rem] font-bold uppercase tracking-[0.11em] text-primary/60">
                    <tr>
                      <th className="w-[23%] px-4 py-3">Aluno</th>
                      <th className="w-[16%] px-3 py-3">Rotina</th>
                      <th className="px-3 py-3">Polo</th>
                      <th className="px-3 py-3 text-center">Aulas</th>
                      <th className="px-3 py-3 text-center">Vieram</th>
                      <th className="px-3 py-3 text-center">Faltas</th>
                      <th className="px-3 py-3 text-center">A confirmar</th>
                      <th className="w-[17%] px-3 py-3">Proxima aula</th>
                      <th className="px-4 py-3 text-right">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendaSheetGroups.map((group) => {
                      const unitMeta = agendaUnitMeta[group.unit];

                      if (group.rows.length === 0) {
                        return null;
                      }

                      return (
                        <Fragment key={group.unit}>
                          <tr className={unitMeta.groupClassName}>
                            <td colSpan={9} className="border-y px-4 py-2.5">
                              <span className="font-bold">{unitMeta.label}</span>
                              <span className="ml-2 text-xs font-medium opacity-70">
                                {group.rows.length} aluno(s)
                              </span>
                            </td>
                          </tr>
                          {group.rows.map((row) => {
                            const isSelected = selectedStudentId === row.student.id;
                            const pendingCount = getPendingLessonCount(row.lessons);

                            return (
                              <tr
                                key={row.student.id}
                                className={cn(
                                  "border-b border-primary/10 transition-colors hover:bg-primary/[0.035]",
                                  unitMeta.rowClassName,
                                  isSelected && "bg-primary/[0.08] ring-1 ring-inset ring-primary/25",
                                )}
                              >
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    className="flex min-w-0 items-center gap-2.5 text-left focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    onClick={() => openAgendaSheetRow(row)}
                                  >
                                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                                      {getAgendaInitials(row.student.name)}
                                    </span>
                                    <span className="min-w-0">
                                      <strong className="block truncate text-sm text-primary">
                                        {row.student.name}
                                      </strong>
                                      <span className="block truncate text-xs text-muted-foreground">
                                        {row.student.phone || "Sem telefone"}
                                      </span>
                                    </span>
                                  </button>
                                </td>
                                <td className="px-3 py-3">
                                  {row.schedule.isComplete ? (
                                    <>
                                      <strong className="block text-xs text-primary">
                                        {formatWeekdayList(row.schedule.weekdays)}
                                      </strong>
                                      <span className="mt-0.5 block text-xs text-muted-foreground">
                                        {row.schedule.time}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
                                      Completar rotina
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-bold", unitMeta.pillClassName)}>
                                    {group.unit === "IVATE" ? "Polo 1" : "Polo 2"}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-primary">
                                  <span className="tabular-nums">{row.lessons.length}</span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="inline-flex min-w-8 justify-center rounded-md bg-emerald-100 px-2 py-1 font-bold text-emerald-800 tabular-nums">
                                    {row.attendedCount}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="inline-flex min-w-8 justify-center rounded-md bg-red-100 px-2 py-1 font-bold text-red-800 tabular-nums">
                                    {row.missedCount}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="inline-flex min-w-8 justify-center rounded-md bg-amber-100 px-2 py-1 font-bold text-amber-900 tabular-nums">
                                    {pendingCount}
                                  </span>
                                </td>
                                <td className="px-3 py-3">
                                  {row.todayLesson ? (
                                    <span className="inline-flex items-center gap-1.5 font-bold text-violet-800">
                                      <Clock aria-hidden="true" className="size-3.5" />
                                      Hoje as {row.todayLesson.time}
                                    </span>
                                  ) : row.nextLesson ? (
                                    <>
                                      <strong className="block text-xs text-primary">
                                        {formatShortDate(row.nextLesson.date)}
                                      </strong>
                                      <span className="mt-0.5 block text-xs text-muted-foreground">
                                        as {row.nextLesson.time}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      Sem proxima aula
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    className={cn(
                                      "h-9",
                                      isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "border-primary/20 bg-white text-primary",
                                    )}
                                    onClick={() => openAgendaSheetRow(row)}
                                  >
                                    {isSelected ? "Aberto" : "Abrir"}
                                    <ChevronRight data-icon="inline-end" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            )}
            </div>
          ) : (

            <div
              id="agenda-day-details"
              className="flex min-w-0 scroll-mt-24 flex-col gap-3"
            >
            <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-white via-white to-violet-50/70 p-3.5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Dia selecionado
                  </span>
                  <h3 className="mt-1 text-lg font-semibold text-primary">
                    {getWeekdayLabel(selectedWeekday)},{" "}
                    {dateFormatter.format(selectedDate)}
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-primary/25 bg-white text-primary shadow-sm"
                  onClick={prepareFormForSelectedDay}
                >
                  <CalendarPlus data-icon="inline-start" />
                  Adicionar neste dia
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <span className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary/60">
                    Previstas
                  </span>
                  <strong className="mt-1 block text-lg leading-none text-primary">
                    {selectedDayScheduledCount}
                  </strong>
                </span>
                <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-emerald-700/75">
                    Vieram
                  </span>
                  <strong className="mt-1 block text-lg leading-none text-emerald-800">
                    {selectedDayAttendedCount}
                  </strong>
                </span>
                <span className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-red-700/75">
                    Faltas
                  </span>
                  <strong className="mt-1 block text-lg leading-none text-red-800">
                    {selectedDayMissedCount}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              {selectedDayLessons.length === 0 ? (
                <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/70 p-4 text-sm font-medium text-emerald-800">
                  {selectedDayIsToday
                    ? "Nenhum aluno agendado para hoje."
                    : "Nenhum aluno agendado para este dia."}
                </div>
              ) : (
                selectedDayLessons.map((lesson) => {
                  const meta = getStatusMeta(lesson.status);

                  return (
                    <article
                      key={lesson.id}
                      className={cn(
                        "relative overflow-hidden rounded-lg border p-3.5 pt-5 shadow-[0_10px_24px_rgba(58,29,75,0.08)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(58,29,75,0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                        meta.cardClassName,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn("absolute inset-x-0 top-0 h-1", meta.accentClassName)}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() =>
                            openStudent(
                              lesson.studentId,
                              lesson.month,
                            )
                          }
                        >
                          <span
                            className={cn(
                              "grid size-11 shrink-0 place-items-center rounded-lg text-xs font-bold uppercase shadow-sm",
                              meta.iconClassName,
                            )}
                          >
                            {getAgendaInitials(lesson.studentName)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                              <span
                                className={cn(
                                  "size-2 rounded-full",
                                  meta.dotClassName,
                                )}
                              />
                              {lesson.isMakeup ? "Reposicao" : "Aula prevista"}
                            </span>
                            <strong className="mt-1 block break-words text-lg leading-6 text-primary">
                              {lesson.studentName}
                            </strong>
                            <span className="mt-1 inline-flex rounded-full border border-primary/10 bg-white px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-primary/65">
                              {unitLabels[lesson.studentUnit]}
                            </span>
                            <span className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                                  meta.softClassName,
                                )}
                              >
                                <Clock aria-hidden="true" className="size-4" />
                                {lesson.time}
                              </span>
                              <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-primary/10 bg-white px-2.5 py-1.5 text-primary/75">
                                <Phone aria-hidden="true" className="size-4 shrink-0" />
                                <span className="truncate">
                                  {lesson.studentPhone || "Sem telefone"}
                                </span>
                              </span>
                            </span>
                            {lesson.studentNotes ? (
                              <span className="mt-2 line-clamp-2 block rounded-lg border border-primary/10 bg-[#fbf7ff] px-2.5 py-2 text-sm text-primary/75">
                                {lesson.studentNotes}
                              </span>
                            ) : null}
                          </span>
                        </button>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm",
                            meta.pillClassName,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-3 border-t border-primary/10 pt-3">
                        <AgendaAttendanceButtons lesson={lesson} />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            </div>
          )}
        </div>
      </section>

      <form
        id="agenda-new-student"
        onSubmit={onSubmit}
        className="relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-white via-white to-amber-50/55 p-3 shadow-[0_16px_40px_rgba(58,29,75,0.08)] md:p-4"
        noValidate
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-fuchsia-500 to-violet-600"
        />
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Plus aria-hidden="true" className="size-5" />
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Vinculo com o AVA
              </span>
              <h2 className="mt-1 text-lg font-semibold text-primary">
                Adicionar aluno na agenda
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione o cadastro real do aluno para manter AVA, polo,
                financeiro e agenda unidos.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            Comeca em {activeMonthLabel}
          </span>
        </div>
        <FieldGroup className="gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.25fr)_minmax(220px,0.9fr)_minmax(110px,0.42fr)_auto]">
            <Field
              data-invalid={Boolean(form.formState.errors.studentProfileId)}
            >
              <FieldLabel htmlFor="agenda-student-profile">
                Aluno cadastrado no AVA
              </FieldLabel>
              <NativeSelect
                id="agenda-student-profile"
                className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
                disabled={isPending || availableAvaStudents.length === 0}
                {...form.register("studentProfileId")}
              >
                <option value="">
                  {availableAvaStudents.length > 0
                    ? "Selecione nome, email ou polo"
                    : "Todos os alunos ativos ja estao vinculados"}
                </option>
                {availableAvaStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.email} - {unitLabels[student.unit]}
                  </option>
                ))}
              </NativeSelect>
              <FieldError
                errors={[form.formState.errors.studentProfileId]}
              />
            </Field>
            <div className="rounded-lg border border-cyan-200 bg-cyan-50/70 px-3 py-2.5 text-sm">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-cyan-800/70">
                Cadastro selecionado
              </span>
              <strong className="mt-1 block truncate text-primary">
                {selectedCreateStudent?.name ?? "Aguardando selecao"}
              </strong>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {selectedCreateStudent
                  ? `${unitLabels[selectedCreateStudent.unit]} - ${selectedCreateStudent.phone || "sem telefone"}`
                  : "Nome, telefone e polo vem do AVA."}
              </span>
              <input type="hidden" {...form.register("name")} />
              <input type="hidden" {...form.register("phone")} />
              <input type="hidden" {...form.register("unit")} />
            </div>
            <Field data-invalid={Boolean(form.formState.errors.time)}>
              <FieldLabel htmlFor="agenda-time">Horario</FieldLabel>
              <Input
                id="agenda-time"
                className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
                type="time"
                disabled={isPending}
                {...form.register("time")}
              />
              <FieldError errors={[form.formState.errors.time]} />
            </Field>
            <Button
              type="submit"
              className="h-11 shadow-sm lg:mt-6"
              disabled={isPending}
            >
              {isPending ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              Adicionar
            </Button>
          </div>
          <Field data-invalid={Boolean(form.formState.errors.weekdays)}>
            <FieldLabel>Dias da semana</FieldLabel>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {weekdays.map((weekday) => {
                const checked = selectedCreateWeekdays.includes(weekday.value);

                return (
                  <button
                    key={weekday.value}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleCreateWeekday(weekday.value)}
                    className={cn(
                      "min-h-11 rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors",
                      checked
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
                    )}
                  >
                    {weekday.label}
                  </button>
                );
              })}
            </div>
            <FieldError errors={[form.formState.errors.weekdays]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.notes)}>
            <FieldLabel htmlFor="agenda-notes">Observacao opcional</FieldLabel>
            <Textarea
              id="agenda-notes"
              className="min-h-24 resize-y border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
              disabled={isPending}
              placeholder="Observacao interna para a rotina."
              {...form.register("notes")}
            />
            <FieldError errors={[form.formState.errors.notes]} />
          </Field>
        </FieldGroup>
        {message ? (
          <p
            aria-live="polite"
            className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
          >
            {message}
          </p>
        ) : null}
      </form>

      {selectedStudent ? (
        <section
          id="agenda-student-details"
          className="order-[30] scroll-mt-24 rounded-lg border border-primary/20 bg-gradient-to-br from-white via-white to-cyan-50/45 p-3 shadow-[0_16px_40px_rgba(58,29,75,0.08)] md:p-4"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <UserRound aria-hidden="true" className="size-5" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Historico e cadastro
                </span>
                <h2 className="mt-1 text-lg font-semibold text-primary">
                  {selectedStudent.name}
                </h2>
                <span className="mt-2 inline-flex rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary/70">
                  {unitLabels[selectedStudent.unit]}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold",
                  selectedStudentSchedule?.isComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-900",
                )}
              >
                {selectedStudentSchedule?.isComplete ? "Completo" : "Completar"}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                {selectedStudentAttended} presenca(s)
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">
                {selectedStudentMissed} falta(s)
              </span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
            <form
              onSubmit={onEditSubmit}
              className="rounded-lg border border-primary/15 bg-gradient-to-br from-violet-50/65 via-white to-white p-3 shadow-sm"
              noValidate
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Editar dados
                  </span>
                  <h3 className="mt-1 text-base font-semibold text-primary">
                    Rotina do aluno
                  </h3>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-bold text-primary">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    {...editForm.register("isActive")}
                  />
                  Ativo
                </label>
              </div>
              <input type="hidden" {...editForm.register("studentId")} />
              <FieldGroup className="gap-3">
                <Field data-invalid={Boolean(editForm.formState.errors.name)}>
                  <FieldLabel htmlFor="agenda-edit-name">Nome</FieldLabel>
                  <Input
                    id="agenda-edit-name"
                    className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
                    disabled={isEditPending}
                    {...editForm.register("name")}
                  />
                  <FieldError errors={[editForm.formState.errors.name]} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field
                    data-invalid={Boolean(editForm.formState.errors.phone)}
                  >
                    <FieldLabel htmlFor="agenda-edit-phone">Telefone</FieldLabel>
                    <Input
                      id="agenda-edit-phone"
                      className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
                      disabled={isEditPending}
                      placeholder="Opcional"
                      {...editForm.register("phone")}
                    />
                    <FieldError errors={[editForm.formState.errors.phone]} />
                  </Field>
                  <Field data-invalid={Boolean(editForm.formState.errors.unit)}>
                    <FieldLabel htmlFor="agenda-edit-unit">Unidade</FieldLabel>
                    <NativeSelect
                      id="agenda-edit-unit"
                      className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
                      disabled={isEditPending}
                      {...editForm.register("unit")}
                    >
                      {FINANCIAL_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unitLabels[unit]}
                        </option>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[editForm.formState.errors.unit]} />
                  </Field>
                  <Field data-invalid={Boolean(editForm.formState.errors.time)}>
                    <FieldLabel htmlFor="agenda-edit-time">Horario</FieldLabel>
                    <Input
                      id="agenda-edit-time"
                      className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
                      type="time"
                      disabled={isEditPending}
                      {...editForm.register("time")}
                    />
                    <FieldError errors={[editForm.formState.errors.time]} />
                  </Field>
                </div>
                <Field
                  data-invalid={Boolean(editForm.formState.errors.weekdays)}
                >
                  <FieldLabel>Dias da semana</FieldLabel>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-4 2xl:grid-cols-7">
                    {weekdays.map((weekday) => {
                      const checked = selectedEditWeekdays.includes(
                        weekday.value,
                      );

                      return (
                        <button
                          key={weekday.value}
                          type="button"
                          aria-pressed={checked}
                          onClick={() => toggleEditWeekday(weekday.value)}
                          className={cn(
                            "min-h-11 rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-primary/20 bg-white text-primary hover:bg-primary/5",
                          )}
                        >
                          {weekday.label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError errors={[editForm.formState.errors.weekdays]} />
                </Field>
                <Field data-invalid={Boolean(editForm.formState.errors.notes)}>
                  <FieldLabel htmlFor="agenda-edit-notes">
                    Observacao
                  </FieldLabel>
                  <Textarea
                    id="agenda-edit-notes"
                    className="min-h-24 resize-y border-primary/20 bg-white shadow-sm focus-visible:border-primary/50"
                    disabled={isEditPending}
                    {...editForm.register("notes")}
                  />
                  <FieldError errors={[editForm.formState.errors.notes]} />
                </Field>
              </FieldGroup>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="submit" disabled={isEditPending}>
                  {isEditPending ? (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Save data-icon="inline-start" />
                  )}
                  Salvar rotina
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isEditPending}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={inactivateSelectedStudent}
                >
                  <XCircle data-icon="inline-start" />
                  Inativar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isEditPending}
                  className="border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
                  onClick={deleteSelectedStudent}
                >
                  <Trash2 data-icon="inline-start" />
                  Excluir
                </Button>
              </div>
              {editMessage ? (
                <p
                  aria-live="polite"
                  className="mt-3 rounded-lg border border-primary/20 bg-white px-3 py-2 text-sm font-medium text-primary"
                >
                  {editMessage}
                </p>
              ) : null}
            </form>

            <div className="rounded-lg border border-primary/15 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Presencas e faltas
                  </span>
                  <h3 className="mt-1 text-base font-semibold text-primary">
                    Historico do aluno
                  </h3>
                </div>
                <History aria-hidden="true" className="size-5 text-primary" />
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {selectedStudentLessons.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                    Nenhuma ocorrencia registrada para este aluno ainda.
                  </p>
                ) : (
                  selectedStudentLessons.map((lesson) => {
                    const meta = getStatusMeta(lesson.status);

                    return (
                      <div
                        key={lesson.id}
                        className={cn(
                          "rounded-lg border p-3",
                          lesson.isActive ? meta.cardClassName : "bg-muted/30",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <strong className="block text-sm text-primary">
                              {formatDate(lesson.date)} as {lesson.time}
                            </strong>
                            <span className="text-xs text-muted-foreground">
                              {lesson.isMakeup ? "Reposicao" : "Rotina"} -{" "}
                              {lesson.isActive ? "ativo" : "inativo"}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-1 text-xs font-bold",
                              meta.pillClassName,
                            )}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <details className="order-[40] rounded-lg border border-primary/20 bg-white p-3 shadow-sm md:p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Pencil aria-hidden="true" className="size-4" />
            Log recente da agenda
          </span>
          <span className="text-xs text-muted-foreground">
            {logs.length} registro(s)
          </span>
        </summary>
        <div className="mt-3 grid gap-2">
          {logs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              Nenhuma movimentacao registrada ainda.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm"
              >
                <div className="font-semibold text-primary">
                  {log.studentName ?? "Agenda"}
                </div>
                <p className="mt-1 text-muted-foreground">{log.description}</p>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {formatShortDate(log.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
