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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AdminAgendaLessonStatus =
  | "ATTENDED"
  | "MAKEUP_ATTENDED"
  | "MAKEUP_SCHEDULED"
  | "MISSED"
  | "SCHEDULED";

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
  weekdayMask: number;
};

export type AdminAgendaLogRow = {
  createdAt: string;
  description: string;
  id: string;
  studentName: string | null;
};

type AdminAgendaPanelProps = {
  initialMonth: number;
  lessons: AdminAgendaLessonRow[];
  logs: AdminAgendaLogRow[];
  students: AdminAgendaStudentRow[];
};

type CalendarDayCell = {
  date: Date;
  day: number;
  key: string;
  weekday: number;
};

type CalendarBlankCell = {
  key: string;
};

const AGENDA_YEAR = 2026;

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

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
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

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDayKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function toDayKey(date: Date) {
  return getDayKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function parseDayKey(key: string) {
  const [year = AGENDA_YEAR, month = 1, day = 1] = key
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
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

function getMonthDays(month: number): CalendarDayCell[] {
  const lastDay = new Date(AGENDA_YEAR, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = new Date(AGENDA_YEAR, month - 1, day);

    return {
      date,
      day,
      key: getDayKey(AGENDA_YEAR, month, day),
      weekday: date.getDay(),
    };
  });
}

function getCalendarCells(month: number): (CalendarDayCell | CalendarBlankCell)[] {
  const days = getMonthDays(month);
  const firstWeekday = days[0]?.weekday ?? 0;
  const blanks = Array.from({ length: firstWeekday }, (_, index) => ({
    key: `blank-${month}-${index}`,
  }));

  return [...blanks, ...days];
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
): AdminAgendaScheduleCreateInput {
  return {
    month,
    name: "",
    notes: "",
    phone: "",
    time: "08:00",
    weekdays: weekdaysValue,
    year: AGENDA_YEAR,
  };
}

function getStatusMeta(status: AdminAgendaLessonStatus) {
  if (status === "ATTENDED" || status === "MAKEUP_ATTENDED") {
    return {
      cardClassName:
        "border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_100%)]",
      dotClassName: "bg-emerald-500",
      label: status === "MAKEUP_ATTENDED" ? "Reposicao feita" : "Veio",
      pillClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (status === "MISSED") {
    return {
      cardClassName:
        "border-red-200 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_100%)]",
      dotClassName: "bg-red-500",
      label: "Nao veio",
      pillClassName: "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (status === "MAKEUP_SCHEDULED") {
    return {
      cardClassName:
        "border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_100%)]",
      dotClassName: "bg-amber-500",
      label: "Reposicao",
      pillClassName: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  return {
    cardClassName:
      "border-primary/20 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_100%)]",
    dotClassName: "bg-primary",
    label: "Previsto",
    pillClassName: "border-primary/20 bg-primary/5 text-primary",
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

  return {
    time: student.defaultTime ?? activeLessons[0]?.time ?? "08:00",
    weekdays:
      weekdaysFromMask.length > 0 ? weekdaysFromMask : weekdaysFromLessons,
  };
}

function buildEditValues(
  student: AdminAgendaStudentRow,
  lessons: AdminAgendaLessonRow[],
  month: number,
  fallbackWeekday: number,
): AdminAgendaStudentUpdateInput {
  const schedule = getStudentSchedule(student, lessons);

  return {
    isActive: student.isActive,
    month,
    name: student.name,
    notes: student.notes ?? "",
    phone: student.phone ?? "",
    studentId: student.id,
    time: schedule.time,
    weekdays: schedule.weekdays.length > 0 ? schedule.weekdays : [fallbackWeekday],
    year: AGENDA_YEAR,
  };
}

function AgendaMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className={cn("rounded-lg border p-3 shadow-sm", className)}>
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <strong className="mt-1 block text-2xl leading-none text-primary">
        {value}
      </strong>
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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        className="h-8 border border-emerald-700 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
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
        className="h-8 border border-red-700 bg-red-600 px-3 text-white hover:bg-red-700"
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
          className="h-8 border-primary/25 px-3 text-primary"
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
  initialMonth,
  lessons,
  logs,
  students,
}: AdminAgendaPanelProps) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayIsAgendaYear = today.getFullYear() === AGENDA_YEAR;
  const todayMonth = todayIsAgendaYear
    ? today.getMonth() + 1
    : clampMonth(initialMonth);
  const todayKey = todayIsAgendaYear
    ? toDayKey(today)
    : getDayKey(AGENDA_YEAR, todayMonth, 1);
  const [activeMonth, setActiveMonth] = useState(todayMonth);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditPending, startEditTransition] = useTransition();
  const selectedDate = parseDayKey(selectedDayKey);
  const selectedWeekday = selectedDate.getDay();
  const activeMonthLabel = getMonthLabel(activeMonth);

  const form = useForm<AdminAgendaScheduleCreateInput>({
    defaultValues: createDefaultValues(activeMonth, [selectedWeekday]),
    resolver: zodResolver(adminAgendaScheduleCreateSchema),
  });
  const editForm = useForm<AdminAgendaStudentUpdateInput>({
    defaultValues:
      students[0] !== undefined
        ? buildEditValues(students[0], lessons, activeMonth, selectedWeekday)
        : {
            isActive: true,
            month: activeMonth,
            name: "",
            notes: "",
            phone: "",
            studentId: "",
            time: "08:00",
            weekdays: [selectedWeekday],
            year: AGENDA_YEAR,
          },
    resolver: zodResolver(adminAgendaStudentUpdateSchema),
  });
  const selectedCreateWeekdays = form.watch("weekdays") ?? [];
  const selectedEditWeekdays = editForm.watch("weekdays") ?? [];
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );

  useEffect(() => {
    form.setValue("month", activeMonth);
  }, [activeMonth, form]);

  useEffect(() => {
    if (!selectedStudent) {
      return;
    }

    editForm.reset(
      buildEditValues(selectedStudent, lessons, activeMonth, selectedWeekday),
    );
  }, [activeMonth, editForm, lessons, selectedStudent, selectedWeekday]);

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
  const selectedDayLessons = (monthLessonsByDay.get(selectedDayKey) ?? []).filter(
    (lesson) => {
      const query = search.trim().toLocaleLowerCase("pt-BR");

      if (!query) {
        return true;
      }

      return (
        lesson.studentName.toLocaleLowerCase("pt-BR").includes(query) ||
        lesson.studentPhone?.toLocaleLowerCase("pt-BR").includes(query)
      );
    },
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
    const nextMonth = clampMonth(month);

    setActiveMonth(nextMonth);
    updateSelectedDay(nextMonth);
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

    editForm.setValue("weekdays", nextWeekdays, { shouldValidate: true });
  }

  function prepareFormForSelectedDay() {
    form.setValue("weekdays", [selectedWeekday], { shouldValidate: true });
    form.setValue("month", activeMonth);
  }

  function openStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);

    if (!student) {
      return;
    }

    setSelectedStudentId(student.id);
    setEditMessage(null);
    setListMessage(null);
    editForm.reset(
      buildEditValues(student, lessons, activeMonth, selectedWeekday),
    );
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

      form.reset(createDefaultValues(activeMonth, [selectedWeekday]));
      setMessage(result.message);
      router.refresh();
    });
  });

  const onEditSubmit = editForm.handleSubmit((values) => {
    setEditMessage(null);

    startEditTransition(async () => {
      const result = await updateAgendaStudentSchedule({
        ...values,
        month: activeMonth,
        year: AGENDA_YEAR,
      });

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

    editForm.setValue("isActive", false);
    editForm.handleSubmit((values) => {
      startEditTransition(async () => {
        const result = await updateAgendaStudentSchedule({
          ...values,
          isActive: false,
          month: activeMonth,
          year: AGENDA_YEAR,
        });

        setEditMessage(result.message);

        if (result.ok) {
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
    <div className="flex flex-col gap-5 pb-28 lg:pr-20">
      <section className="overflow-hidden rounded-lg border border-primary/20 bg-white shadow-sm">
        <div className="border-b border-primary/15 bg-[linear-gradient(135deg,#faf5ff_0%,#fff7ed_100%)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <CalendarDays aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Agenda interna
                </span>
                <h2 className="mt-1 text-xl font-semibold text-primary">
                  {activeMonthLabel} {AGENDA_YEAR}
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary/25 text-primary"
                onClick={() => changeMonth(activeMonth - 1)}
                disabled={activeMonth <= 1}
              >
                <ChevronLeft data-icon="inline-start" />
                Mes anterior
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-primary text-primary-foreground"
                onClick={() => changeMonth(todayMonth)}
              >
                Hoje
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary/25 text-primary"
                onClick={() => changeMonth(activeMonth + 1)}
                disabled={activeMonth >= 12}
              >
                Proximo mes
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <AgendaMetric
              label="Previstos"
              value={scheduledCount}
              className="border-primary/20 bg-white/85"
            />
            <AgendaMetric
              label="Vieram"
              value={attendedCount}
              className="border-emerald-200 bg-emerald-50"
            />
            <AgendaMetric
              label="Nao vieram"
              value={missedCount}
              className="border-red-200 bg-red-50"
            />
            <AgendaMetric
              label="Alunos ativos"
              value={activeStudentsCount}
              className="border-amber-200 bg-amber-50"
            />
          </div>
        </div>

        <div className="grid gap-4 p-3 md:p-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="rounded-lg border border-primary/15 bg-[#fefbff] p-3">
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {weekdays.map((weekday) => (
                <span key={weekday.value}>{weekday.label}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {getCalendarCells(activeMonth).map((cell) => {
                if (!("day" in cell)) {
                  return <span key={cell.key} aria-hidden="true" />;
                }

                const dayLessons = monthLessonsByDay.get(cell.key) ?? [];
                const isSelected = selectedDayKey === cell.key;
                const isToday = todayKey === cell.key;
                const hasMissed = dayLessons.some(
                  (lesson) => lesson.status === "MISSED",
                );
                const hasAttended = dayLessons.some(
                  (lesson) =>
                    lesson.status === "ATTENDED" ||
                    lesson.status === "MAKEUP_ATTENDED",
                );

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => {
                      setSelectedDayKey(cell.key);
                      setSelectedStudentId(null);
                    }}
                    className={cn(
                      "min-h-[76px] rounded-lg border bg-white p-2 text-left transition-all",
                      "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-sm",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
                        : "border-primary/15 text-primary",
                      isToday && !isSelected
                        ? "ring-2 ring-amber-300 ring-offset-1"
                        : "",
                    )}
                  >
                    <span className="flex items-start justify-between gap-1">
                      <span className="text-sm font-bold">{cell.day}</span>
                      {dayLessons.length > 0 ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[0.68rem] font-bold",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-primary/8 text-primary",
                          )}
                        >
                          {dayLessons.length}
                        </span>
                      ) : null}
                    </span>
                    {dayLessons.length > 0 ? (
                      <span className="mt-3 flex gap-1">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            hasAttended ? "bg-emerald-500" : "bg-primary",
                          )}
                        />
                        {hasMissed ? (
                          <span className="size-2 rounded-full bg-red-500" />
                        ) : null}
                        {dayLessons.length > 2 ? (
                          <span className="size-2 rounded-full bg-amber-500" />
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-lg border border-primary/15 bg-white p-3 shadow-sm">
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
                  className="border-primary/25 text-primary"
                  onClick={prepareFormForSelectedDay}
                >
                  <CalendarPlus data-icon="inline-start" />
                  Adicionar neste dia
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
                <Search aria-hidden="true" className="size-4 text-primary" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar aluno interno"
                  type="search"
                />
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
                        "rounded-lg border p-3 shadow-sm",
                        meta.cardClassName,
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() => openStudent(lesson.studentId)}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                meta.dotClassName,
                              )}
                            />
                            {lesson.isMakeup ? "Reposicao" : "Aula prevista"}
                          </span>
                          <strong className="mt-1 block truncate text-base text-primary">
                            {lesson.studentName}
                          </strong>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Clock aria-hidden="true" className="size-4" />
                            {lesson.time}
                            {lesson.studentPhone ? (
                              <>
                                <Phone aria-hidden="true" className="size-4" />
                                {lesson.studentPhone}
                              </>
                            ) : null}
                          </span>
                          {lesson.studentNotes ? (
                            <span className="mt-2 line-clamp-2 block text-sm text-muted-foreground">
                              {lesson.studentNotes}
                            </span>
                          ) : null}
                        </button>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-bold",
                            meta.pillClassName,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-3">
                        <AgendaAttendanceButtons lesson={lesson} />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-primary/20 bg-white p-3 shadow-sm md:p-4"
        noValidate
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Plus aria-hidden="true" className="size-5" />
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Aluno interno
              </span>
              <h2 className="mt-1 text-lg font-semibold text-primary">
                Adicionar aluno na agenda
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastro simples, separado dos alunos do AVA.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            Comeca em {activeMonthLabel}
          </span>
        </div>
        <FieldGroup className="gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(190px,1fr)_minmax(130px,0.6fr)_minmax(110px,0.42fr)_auto]">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="agenda-name">Nome do aluno</FieldLabel>
              <Input
                id="agenda-name"
                disabled={isPending}
                placeholder="Nome do aluno"
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.phone)}>
              <FieldLabel htmlFor="agenda-phone">Telefone</FieldLabel>
              <Input
                id="agenda-phone"
                disabled={isPending}
                placeholder="Opcional"
                {...form.register("phone")}
              />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.time)}>
              <FieldLabel htmlFor="agenda-time">Horario</FieldLabel>
              <Input
                id="agenda-time"
                type="time"
                disabled={isPending}
                {...form.register("time")}
              />
              <FieldError errors={[form.formState.errors.time]} />
            </Field>
            <Button type="submit" className="lg:mt-6" disabled={isPending}>
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
                      "rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors",
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
              className="min-h-20 resize-y"
              disabled={isPending}
              placeholder="Observacao interna para a rotina."
              {...form.register("notes")}
            />
            <FieldError errors={[form.formState.errors.notes]} />
          </Field>
        </FieldGroup>
        {message ? (
          <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
            {message}
          </p>
        ) : null}
      </form>

      {selectedStudent ? (
        <section className="order-[30] rounded-lg border border-primary/20 bg-white p-3 shadow-sm md:p-4">
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
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
              className="rounded-lg border border-primary/15 bg-[#fefbff] p-3"
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
                    disabled={isEditPending}
                    {...editForm.register("name")}
                  />
                  <FieldError errors={[editForm.formState.errors.name]} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    data-invalid={Boolean(editForm.formState.errors.phone)}
                  >
                    <FieldLabel htmlFor="agenda-edit-phone">Telefone</FieldLabel>
                    <Input
                      id="agenda-edit-phone"
                      disabled={isEditPending}
                      placeholder="Opcional"
                      {...editForm.register("phone")}
                    />
                    <FieldError errors={[editForm.formState.errors.phone]} />
                  </Field>
                  <Field data-invalid={Boolean(editForm.formState.errors.time)}>
                    <FieldLabel htmlFor="agenda-edit-time">Horario</FieldLabel>
                    <Input
                      id="agenda-edit-time"
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
                            "rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors",
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
                    className="min-h-20 resize-y"
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
                <p className="mt-3 rounded-lg border border-primary/20 bg-white px-3 py-2 text-sm font-medium text-primary">
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

      <section className="order-[20] rounded-lg border border-primary/20 bg-white p-3 shadow-sm md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Users aria-hidden="true" className="size-4" />
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Alunos da agenda
              </span>
              <h2 className="text-base font-semibold text-primary">
                Lista interna simples
              </h2>
            </div>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            {students.length} cadastro(s)
          </span>
        </div>
        {students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            Nenhum aluno interno cadastrado na agenda.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => {
              const schedule = getStudentSchedule(student, lessons);

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => openStudent(student.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                    selectedStudentId === student.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : student.isActive
                        ? "border-primary/15 bg-white text-primary"
                        : "border-muted bg-muted/35 text-muted-foreground",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm">{student.name}</strong>
                    <span className="text-xs font-bold">
                      {student.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs opacity-80">
                    {schedule.weekdays.map(getWeekdayLabel).join(", ") ||
                      "Sem dias ativos"}{" "}
                    - {schedule.time}
                  </span>
                  {student.phone ? (
                    <span className="mt-1 block truncate text-xs opacity-80">
                      {student.phone}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        {listMessage ? (
          <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
            {listMessage}
          </p>
        ) : null}
      </section>

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
