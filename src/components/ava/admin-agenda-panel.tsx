"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClipboardList,
  LoaderCircle,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createAgendaMakeup,
  createAgendaSchedule,
  removeAgendaStudentFromMonth,
  updateAgendaAttendance,
} from "@/app/ava/admin/actions";
import {
  adminAgendaMakeupSchema,
  adminAgendaScheduleCreateSchema,
  type AdminAgendaAttendanceInput,
  type AdminAgendaMakeupInput,
  type AdminAgendaRemoveStudentInput,
  type AdminAgendaScheduleCreateInput,
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
  id: string;
  name: string;
  phone: string | null;
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
  { label: "Dom", value: 0 },
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sab", value: 6 },
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

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TODAY_QUEUE_RETENTION_MS = 2 * 60 * 60 * 1000;

function createDefaultValues(month: number): AdminAgendaScheduleCreateInput {
  return {
    month,
    name: "",
    notes: "",
    phone: "",
    time: "08:00",
    weekdays: [],
    year: 2026,
  };
}

function clampMonth(month: number) {
  return Math.min(Math.max(month, 1), 12);
}

function getAutomaticAgendaMonth(fallbackMonth: number) {
  const now = new Date();

  if (now.getFullYear() === 2026) {
    return now.getMonth() + 1;
  }

  return clampMonth(fallbackMonth);
}

function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toInputDate(date: Date) {
  return toDayKey(date);
}

function parseLessonDate(value: string) {
  return new Date(value);
}

function formatDate(value: string) {
  return dateFormatter.format(parseLessonDate(value));
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(parseLessonDate(value));
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function getWeekdayLabel(value: number) {
  return weekdays.find((weekday) => weekday.value === value)?.label ?? "Dia";
}

function getLessonElementId(lessonId: string) {
  return `agenda-lesson-${lessonId}`;
}

function getLessonDateTime(lesson: AdminAgendaLessonRow) {
  const date = parseLessonDate(lesson.date);
  const [hour = "0", minute = "0"] = lesson.time.split(":");

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hour),
    Number(minute),
  );
}

function hasAttendanceAction(status: AdminAgendaLessonStatus) {
  return status !== "SCHEDULED" && status !== "MAKEUP_SCHEDULED";
}

function shouldShowInTodayQueue(lesson: AdminAgendaLessonRow, now: Date) {
  const elapsedTime = now.getTime() - getLessonDateTime(lesson).getTime();

  return (
    hasAttendanceAction(lesson.status) ||
    elapsedTime <= TODAY_QUEUE_RETENTION_MS
  );
}

function getStatusMeta(status: AdminAgendaLessonStatus) {
  if (status === "ATTENDED" || status === "MAKEUP_ATTENDED") {
    return {
      className: "border-emerald-300 bg-emerald-50 text-emerald-800",
      label: status === "MAKEUP_ATTENDED" ? "Reposicao feita" : "Confirmado",
    };
  }

  if (status === "MISSED") {
    return {
      className: "border-red-300 bg-red-50 text-red-800",
      label: "Faltou",
    };
  }

  if (status === "MAKEUP_SCHEDULED") {
    return {
      className: "border-amber-300 bg-amber-50 text-amber-900",
      label: "Reposicao",
    };
  }

  return {
    className: "border-sky-200 bg-sky-50 text-sky-800",
    label: "Previsto",
  };
}

function AgendaSummaryCard({
  className,
  hint,
  icon: Icon,
  label,
  value,
}: {
  className?: string;
  hint: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3 shadow-sm",
        "flex min-w-0 items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <strong className="mt-1 block text-2xl leading-none text-primary">
          {value}
        </strong>
        <span className="mt-2 block text-xs text-muted-foreground">{hint}</span>
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/80 text-primary shadow-sm ring-1 ring-primary/10">
        <Icon aria-hidden="true" className="size-5" />
      </span>
    </div>
  );
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

function AgendaAttendanceButtons({ lesson }: { lesson: AdminAgendaLessonRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitStatus(status: AdminAgendaAttendanceInput["status"]) {
    setMessage(null);

    startTransition(async () => {
      const result = await updateAgendaAttendance({
        lessonId: lesson.id,
        status,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
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
        Foi
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        className="h-8 border border-red-700 bg-red-600 px-3 text-white hover:bg-red-700"
        onClick={() => submitStatus("MISSED")}
      >
        <XCircle data-icon="inline-start" />
        Faltou
      </Button>
      {lesson.status !== "SCHEDULED" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          className="h-8 px-3"
          onClick={() => submitStatus("SCHEDULED")}
        >
          Resetar
        </Button>
      ) : null}
      {message ? (
        <span className="w-full text-xs text-muted-foreground">{message}</span>
      ) : null}
    </div>
  );
}

function AgendaTodayQuickActions({
  lesson,
  onReschedule,
}: {
  lesson: AdminAgendaLessonRow;
  onReschedule: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAttended =
    lesson.status === "ATTENDED" || lesson.status === "MAKEUP_ATTENDED";
  const isMissed = lesson.status === "MISSED";

  function submitStatus(status: AdminAgendaAttendanceInput["status"]) {
    setMessage(null);

    startTransition(async () => {
      const result = await updateAgendaAttendance({
        lessonId: lesson.id,
        status,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        aria-label={`Marcar ${lesson.studentName} como presente`}
        title="Confirmar presenca"
        className={cn(
          "h-8 w-8 border border-emerald-700 bg-emerald-600 p-0 text-white hover:bg-emerald-700",
          isAttended ? "ring-2 ring-emerald-200" : "",
        )}
        onClick={() => submitStatus("ATTENDED")}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <CheckCircle2 data-icon="inline-start" />
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        aria-label={`Marcar ${lesson.studentName} como falta`}
        title="Registrar falta"
        className={cn(
          "h-8 w-8 border border-red-700 bg-red-600 p-0 text-white hover:bg-red-700",
          isMissed ? "ring-2 ring-red-200" : "",
        )}
        onClick={() => submitStatus("MISSED")}
      >
        <XCircle data-icon="inline-start" />
      </Button>
      {!lesson.isMakeup ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-amber-300 px-2 text-xs font-semibold text-amber-900 hover:bg-amber-50 hover:text-amber-950"
          onClick={onReschedule}
        >
          <RotateCcw data-icon="inline-start" />
          Reagendar
        </Button>
      ) : null}
      {message ? (
        <span className="sr-only" role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}

function AgendaMakeupForm({ lesson }: { lesson: AdminAgendaLessonRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const form = useForm<AdminAgendaMakeupInput>({
    resolver: zodResolver(adminAgendaMakeupSchema, undefined, {
      raw: true,
    }),
    defaultValues: {
      date: toInputDate(tomorrow),
      lessonId: lesson.id,
      notes: "",
      time: lesson.time,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createAgendaMakeup(values);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminAgendaMakeupInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      form.reset({
        date: toInputDate(tomorrow),
        lessonId: lesson.id,
        notes: "",
        time: lesson.time,
      });
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form
      className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 md:grid-cols-[minmax(130px,0.7fr)_minmax(100px,0.45fr)_minmax(160px,1fr)_auto]"
      onSubmit={onSubmit}
      noValidate
    >
      <input type="hidden" {...form.register("lessonId")} />
      <Field data-invalid={Boolean(form.formState.errors.date)}>
        <FieldLabel htmlFor={`agenda-makeup-date-${lesson.id}`}>
          Nova data
        </FieldLabel>
        <Input
          id={`agenda-makeup-date-${lesson.id}`}
          type="date"
          disabled={isPending}
          {...form.register("date")}
        />
        <FieldError errors={[form.formState.errors.date]} />
      </Field>
      <Field data-invalid={Boolean(form.formState.errors.time)}>
        <FieldLabel htmlFor={`agenda-makeup-time-${lesson.id}`}>
          Horario
        </FieldLabel>
        <Input
          id={`agenda-makeup-time-${lesson.id}`}
          type="time"
          disabled={isPending}
          {...form.register("time")}
        />
        <FieldError errors={[form.formState.errors.time]} />
      </Field>
      <Field data-invalid={Boolean(form.formState.errors.notes)}>
        <FieldLabel htmlFor={`agenda-makeup-note-${lesson.id}`}>
          Observacao
        </FieldLabel>
        <Input
          id={`agenda-makeup-note-${lesson.id}`}
          disabled={isPending}
          placeholder="Opcional"
          {...form.register("notes")}
        />
        <FieldError errors={[form.formState.errors.notes]} />
      </Field>
      <Button type="submit" size="sm" className="md:mt-6" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <RotateCcw data-icon="inline-start" />
        )}
        Criar
      </Button>
      {message ? (
        <p className="text-xs text-muted-foreground md:col-span-4">{message}</p>
      ) : null}
    </form>
  );
}

function AgendaRemoveButton({
  month,
  studentId,
  studentName,
}: {
  month: number;
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    setMessage(null);

    const confirmed = window.confirm(
      `Retirar ${studentName} da agenda deste mes em diante?`,
    );

    if (!confirmed) {
      return;
    }

    const payload: AdminAgendaRemoveStudentInput = {
      month,
      studentId,
      year: 2026,
    };

    startTransition(async () => {
      const result = await removeAgendaStudentFromMonth(payload);
      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        className="h-8 justify-start border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={handleRemove}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Trash2 data-icon="inline-start" />
        )}
        Retirar agenda
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground">{message}</span>
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
  const initialActiveMonth = getAutomaticAgendaMonth(initialMonth);
  const [activeMonth, setActiveMonth] = useState(initialActiveMonth);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [monthChangedManually, setMonthChangedManually] = useState(false);
  const [openMakeupLessonId, setOpenMakeupLessonId] = useState<string | null>(
    null,
  );
  const [pendingScrollLessonId, setPendingScrollLessonId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminAgendaScheduleCreateInput>({
    resolver: zodResolver(adminAgendaScheduleCreateSchema, undefined, {
      raw: true,
    }),
    defaultValues: createDefaultValues(initialActiveMonth),
  });
  const { setValue } = form;

  const selectedWeekdays = form.watch("weekdays") ?? [];
  const activeMonthLabel =
    months.find((month) => month.value === activeMonth)?.label ?? "Mes";
  const activeLessons = useMemo(
    () =>
      lessons
        .filter(
          (lesson) =>
            lesson.year === 2026 &&
            lesson.month === activeMonth &&
            lesson.isActive,
        )
        .sort(sortLessons),
    [activeMonth, lessons],
  );
  const monthCounts = useMemo(
    () =>
      months.reduce<Record<number, number>>((accumulator, month) => {
        accumulator[month.value] = lessons.filter(
          (lesson) =>
            lesson.year === 2026 &&
            lesson.month === month.value &&
            lesson.isActive,
        ).length;

        return accumulator;
      }, {}),
    [lessons],
  );
  const todayKey = toDayKey(currentTime);
  const todayLessons = useMemo(
    () =>
      lessons
        .filter(
          (lesson) =>
            lesson.isActive &&
            toDayKey(parseLessonDate(lesson.date)) === todayKey &&
            shouldShowInTodayQueue(lesson, currentTime),
        )
        .sort(sortLessons),
    [currentTime, lessons, todayKey],
  );
  const upcomingLessons = useMemo(() => {
    const end = new Date(currentTime);
    end.setDate(currentTime.getDate() + 7);

    return lessons
      .filter((lesson) => {
        const date = getLessonDateTime(lesson);

        return lesson.isActive && date >= currentTime && date <= end;
      })
      .sort(sortLessons)
      .slice(0, 8);
  }, [currentTime, lessons]);
  const lessonsByDay = useMemo(() => {
    return activeLessons.reduce<
      { date: string; lessons: AdminAgendaLessonRow[]; weekday: number }[]
    >((groups, lesson) => {
      const existingGroup = groups.find((group) => group.date === lesson.date);

      if (existingGroup) {
        existingGroup.lessons.push(lesson);
        return groups;
      }

      groups.push({
        date: lesson.date,
        lessons: [lesson],
        weekday: lesson.weekday,
      });
      return groups;
    }, []);
  }, [activeLessons]);
  const activeMonthLessonCount = activeLessons.length;
  const attendedLessonsCount = activeLessons.filter(
    (lesson) =>
      lesson.status === "ATTENDED" || lesson.status === "MAKEUP_ATTENDED",
  ).length;
  const missedLessonsCount = activeLessons.filter(
    (lesson) => lesson.status === "MISSED",
  ).length;
  const scheduledLessonsCount = activeLessons.filter(
    (lesson) =>
      lesson.status === "SCHEDULED" || lesson.status === "MAKEUP_SCHEDULED",
  ).length;
  const makeupLessonsCount = activeLessons.filter(
    (lesson) => lesson.isMakeup,
  ).length;
  const selectedWeekdaySummary =
    selectedWeekdays.length > 0
      ? selectedWeekdays.map(getWeekdayLabel).join(", ")
      : "Selecione os dias";

  useEffect(() => {
    if (monthChangedManually) {
      return;
    }

    const syncCurrentMonth = () => {
      const nextMonth = getAutomaticAgendaMonth(initialMonth);

      setActiveMonth(nextMonth);
      setValue("month", nextMonth);
    };

    syncCurrentMonth();

    const interval = window.setInterval(syncCurrentMonth, 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [initialMonth, monthChangedManually, setValue]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pendingScrollLessonId) {
      return;
    }

    const element = document.getElementById(
      getLessonElementId(pendingScrollLessonId),
    );

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
    setPendingScrollLessonId(null);
  }, [activeLessons, pendingScrollLessonId]);

  function handleMonthChange(month: number) {
    setMonthChangedManually(true);
    setActiveMonth(month);
    setValue("month", month);
  }

  function goToLesson(
    lesson: AdminAgendaLessonRow,
    options?: { openMakeup?: boolean },
  ) {
    setMonthChangedManually(true);
    setActiveMonth(lesson.month);
    setValue("month", lesson.month);
    setPendingScrollLessonId(lesson.id);

    if (options?.openMakeup) {
      setOpenMakeupLessonId(lesson.id);
    }
  }

  function toggleWeekday(weekday: number) {
    const nextWeekdays = selectedWeekdays.includes(weekday)
      ? selectedWeekdays.filter((item) => item !== weekday)
      : [...selectedWeekdays, weekday].sort((left, right) => left - right);

    form.setValue("weekdays", nextWeekdays, { shouldValidate: true });
  }

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createAgendaSchedule({
        ...values,
        month: activeMonth,
        year: 2026,
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

      form.reset(createDefaultValues(activeMonth));
      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pr-20">
      <section className="rounded-lg border border-primary/25 bg-[linear-gradient(135deg,#fff_0%,#fbf5ff_58%,#fff7ed_100%)] p-3 shadow-sm md:p-4">
        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-primary/25 bg-white/90 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <CalendarCheck2 aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Fila de hoje
                  </span>
                  <h2 className="mt-1 text-lg font-semibold text-primary">
                    Aulas para conferir
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                {todayLessons.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {todayLessons.length === 0 ? (
                <p className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/70 p-3 text-sm font-medium text-emerald-800">
                  Nenhum aluno pendente para hoje.
                </p>
              ) : (
                todayLessons.map((lesson) => {
                  const status = getStatusMeta(lesson.status);

                  return (
                    <div
                      key={lesson.id}
                      className="grid min-w-0 gap-3 rounded-lg border border-primary/20 bg-white px-3 py-2.5 text-sm shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="min-w-0 truncate text-left font-semibold text-primary underline-offset-4 hover:underline"
                            title="Ir para este aluno na lista mensal"
                            onClick={() => goToLesson(lesson)}
                          >
                            {lesson.studentName}
                          </button>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                            <Clock aria-hidden="true" className="size-3.5" />
                            {lesson.time}
                          </span>
                          {lesson.isMakeup ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                              Reposicao
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <AgendaTodayQuickActions
                        lesson={lesson}
                        onReschedule={() =>
                          goToLesson(lesson, { openMakeup: true })
                        }
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-lg border border-primary/25 bg-white/90 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-800 shadow-sm ring-1 ring-sky-200">
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Proximos 7 dias
                  </span>
                  <h2 className="mt-1 text-lg font-semibold text-primary">
                    Proximas aulas
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                {upcomingLessons.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {upcomingLessons.length === 0 ? (
                <p className="rounded-lg border border-dashed border-primary/25 bg-primary/5 p-3 text-sm text-muted-foreground sm:col-span-2">
                  Nenhuma aula nos proximos dias.
                </p>
              ) : (
                upcomingLessons.map((lesson) => {
                  const status = getStatusMeta(lesson.status);

                  return (
                    <div
                      key={lesson.id}
                      className="min-w-0 rounded-lg border border-primary/20 bg-white px-3 py-2.5 text-sm shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 truncate text-left font-semibold text-primary underline-offset-4 hover:underline"
                          title="Ir para este aluno na lista mensal"
                          onClick={() => goToLesson(lesson)}
                        >
                          {lesson.studentName}
                        </button>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {lesson.time}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {getWeekdayLabel(lesson.weekday)} -{" "}
                          {formatShortDate(lesson.date)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 font-semibold",
                            status.className,
                          )}
                        >
                          {lesson.isMakeup ? "Reposicao" : status.label}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AgendaSummaryCard
          icon={CalendarDays}
          label="Mes ativo"
          value={activeMonthLabel}
          hint="Ano 2026"
          className="border-primary/25 bg-white"
        />
        <AgendaSummaryCard
          icon={ClipboardList}
          label="Aulas"
          value={activeMonthLessonCount}
          hint={`${scheduledLessonsCount} a conferir`}
          className="border-sky-200 bg-sky-50/60"
        />
        <AgendaSummaryCard
          icon={CheckCircle2}
          label="Confirmadas"
          value={attendedLessonsCount}
          hint="Presencas marcadas"
          className="border-emerald-200 bg-emerald-50/70"
        />
        <AgendaSummaryCard
          icon={AlertTriangle}
          label="Faltas"
          value={missedLessonsCount}
          hint={`${makeupLessonsCount} reposicao(oes)`}
          className="border-red-200 bg-red-50/70"
        />
        <AgendaSummaryCard
          icon={Users}
          label="Alunos"
          value={students.length}
          hint="Na agenda"
          className="border-amber-200 bg-amber-50/70"
        />
      </div>

      <section className="rounded-lg border border-primary/25 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Mapa mensal
            </span>
            <h2 className="mt-1 text-lg font-semibold text-primary">
              Escolha o mes para visualizar
            </h2>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            {activeMonthLessonCount} aula(s) em {activeMonthLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-12">
          {months.map((month) => (
            <button
              key={month.value}
              type="button"
              onClick={() => handleMonthChange(month.value)}
              className={cn(
                "rounded-lg border px-2.5 py-2.5 text-sm font-semibold transition-all",
                activeMonth === month.value
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
                  : "border-primary/20 bg-white text-primary hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              <span className="block">{month.shortLabel}</span>
              <span className="mt-1 block text-xs opacity-85">
                {monthCounts[month.value] ?? 0} aula(s)
              </span>
            </button>
          ))}
        </div>
      </section>

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-primary/25 bg-white p-3 shadow-sm md:p-4"
        noValidate
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CalendarPlus aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Novo aluno
              </span>
              <h2 className="mt-1 text-lg font-semibold text-primary">
                Criar agenda recorrente
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cria aulas de {activeMonthLabel} ate dezembro de 2026.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            {selectedWeekdaySummary}
          </span>
        </div>
        <FieldGroup className="gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(170px,1fr)_minmax(120px,0.55fr)_minmax(110px,0.42fr)_auto]">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="agenda-name">Aluno</FieldLabel>
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
                const checked = selectedWeekdays.includes(weekday.value);

                return (
                  <button
                    key={weekday.value}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleWeekday(weekday.value)}
                    className={cn(
                      "rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors",
                      checked
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10",
                    )}
                  >
                    {weekday.label}
                  </button>
                );
              })}
            </div>
            <FieldError errors={[form.formState.errors.weekdays]} />
          </Field>
          <details className="group rounded-lg border border-primary/25 bg-primary/5 p-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
              <span>Observacao do aluno</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="group-open:hidden">abrir</span>
                <span className="hidden group-open:inline">fechar</span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-open:rotate-180"
                />
              </span>
            </summary>
            <Field
              className="mt-3"
              data-invalid={Boolean(form.formState.errors.notes)}
            >
              <FieldLabel htmlFor="agenda-notes" className="sr-only">
                Observacao
              </FieldLabel>
              <Textarea
                id="agenda-notes"
                className="min-h-16 resize-y"
                disabled={isPending}
                placeholder="Observacao interna opcional."
                {...form.register("notes")}
              />
              <FieldError errors={[form.formState.errors.notes]} />
            </Field>
          </details>
        </FieldGroup>
        {message ? (
          <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
            {message}
          </p>
        ) : null}
      </form>

      <section className="rounded-lg border border-primary/25 bg-white p-3 shadow-sm md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Grade do mes
            </span>
            <h2 className="mt-1 text-lg font-semibold text-primary">
              Agenda de {activeMonthLabel}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">
              {scheduledLessonsCount} previsto(s)
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
              {attendedLessonsCount} confirmado(s)
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1 text-red-800">
              {missedLessonsCount} falta(s)
            </span>
          </div>
        </div>
        {lessonsByDay.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-center">
            <CalendarCheck2
              aria-hidden="true"
              className="size-8 text-primary"
            />
            <p className="max-w-sm text-sm text-muted-foreground">
              Nenhum aluno agendado para este mes.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lessonsByDay.map((group) => (
              <div
                key={group.date}
                className="rounded-lg border border-primary/20 bg-[#fefbfa] p-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 px-1 pb-2">
                  <h3 className="text-base font-semibold text-primary">
                    {getWeekdayLabel(group.weekday)} - {formatDate(group.date)}
                  </h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/15">
                    {group.lessons.length} aula(s)
                  </span>
                </div>
                <div className="mt-2 grid gap-2">
                  {group.lessons.map((lesson) => {
                    const status = getStatusMeta(lesson.status);
                    const isAttended =
                      lesson.status === "ATTENDED" ||
                      lesson.status === "MAKEUP_ATTENDED";
                    const lessonTone = lesson.isMakeup
                      ? "border-l-amber-400 bg-amber-50/35"
                      : lesson.status === "MISSED"
                        ? "border-l-red-400 bg-red-50/35"
                        : isAttended
                          ? "border-l-emerald-400 bg-emerald-50/35"
                          : "border-l-sky-400 bg-white";

                    return (
                      <article
                        key={lesson.id}
                        id={getLessonElementId(lesson.id)}
                        tabIndex={-1}
                        className={cn(
                          "scroll-mt-28 grid gap-3 rounded-lg border border-primary/20 border-l-4 p-3 shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20",
                          "xl:grid-cols-[82px_minmax(170px,1fr)_145px_minmax(220px,1fr)_160px] xl:items-center",
                          lessonTone,
                        )}
                      >
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-2.5 py-2 font-bold text-primary shadow-sm ring-1 ring-primary/10">
                          <Clock aria-hidden="true" className="size-4" />
                          {lesson.time}
                        </div>
                        <div className="min-w-0">
                          <strong className="block truncate text-base text-primary">
                            {lesson.studentName}
                          </strong>
                          <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                            <Phone aria-hidden="true" className="size-3.5" />
                            <span className="truncate">
                              {lesson.studentPhone || "Sem telefone"}
                            </span>
                          </p>
                          {lesson.studentNotes ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {lesson.studentNotes}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                            status.className,
                          )}
                        >
                          {lesson.status === "MISSED" ? (
                            <AlertTriangle
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          ) : (
                            <CalendarCheck2
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          )}
                          {lesson.isMakeup ? "Reposicao" : status.label}
                        </span>
                        <AgendaAttendanceButtons lesson={lesson} />
                        <AgendaRemoveButton
                          month={activeMonth}
                          studentId={lesson.studentId}
                          studentName={lesson.studentName}
                        />
                        {!lesson.isMakeup ? (
                          <details
                            open={openMakeupLessonId === lesson.id}
                            onToggle={(event) => {
                              setOpenMakeupLessonId(
                                event.currentTarget.open ? lesson.id : null,
                              );
                            }}
                            className="group xl:col-span-5"
                          >
                            <summary className="mt-1 flex w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 [&::-webkit-details-marker]:hidden">
                              <RotateCcw
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              Reagendar
                            </summary>
                            <div className="mt-2">
                              <AgendaMakeupForm lesson={lesson} />
                            </div>
                          </details>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <details className="group rounded-lg border border-primary/25 bg-white p-3 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList aria-hidden="true" className="size-4" />
            </span>
            <span className="text-base font-semibold text-primary">
              Log da agenda
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {logs.length}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-3">
          {logs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
              Nenhuma movimentacao registrada ainda.
            </p>
          ) : (
            <ol className="grid gap-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="grid gap-1 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm md:grid-cols-[180px_minmax(0,1fr)]"
                >
                  <span className="font-semibold text-primary">
                    {formatDateTime(log.createdAt)}
                  </span>
                  <span className="min-w-0 break-words text-muted-foreground">
                    {log.description}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </div>
  );
}
