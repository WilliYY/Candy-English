"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Eraser,
  ExternalLink,
  FileText,
  LoaderCircle,
  RotateCcw,
  Save,
  Send,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  reopenInteractiveHomeworkDraft,
  saveInteractiveHomeworkDraft,
  submitInteractiveHomework,
} from "@/app/ava/student/actions";
import {
  saveCandyXpActivityDraft,
  submitCandyXpActivity,
} from "@/app/ava/candy-xp/actions";
import {
  type DrawingPoint,
  type DrawingStroke,
  InteractiveHomeworkDrawingStrokes,
  parseInteractiveHomeworkDrawingValue,
  serializeInteractiveHomeworkDrawingValue,
} from "@/components/ava/interactive-homework-drawing";
import { InteractiveHomeworkDocument } from "@/components/ava/interactive-homework-document";
import { InteractiveHomeworkListeningPlayer } from "@/components/ava/interactive-homework-listening";
import { InteractiveHomeworkMark } from "@/components/ava/interactive-homework-mark";
import {
  HomeworkReviewAnnotationLayer,
  normalizeHomeworkReviewAnnotations,
} from "@/components/ava/homework-review-annotations";
import {
  getInteractiveHomeworkTinyTextStyle,
  getInteractiveHomeworkTextStyle,
  InteractiveHomeworkTextFrame,
  InteractiveHomeworkTextLineGuide,
} from "@/components/ava/interactive-homework-text";
import { Button } from "@/components/ui/button";
import {
  normalizeTinyTextAnswer,
  TINY_TEXT_MAX_LENGTH,
  type InteractiveHomeworkFieldType,
} from "@/lib/interactive-homework-fields";
import { CANDY_XP_REWARDS } from "@/lib/candy-xp";

export type StudentInteractiveField = {
  height: number;
  id: string;
  label: string | null;
  page: number;
  placeholder: string | null;
  required: boolean;
  sortOrder: number;
  type: InteractiveHomeworkFieldType;
  width: number;
  x: number;
  y: number;
};

export type StudentInteractiveSubmission = {
  answers: unknown;
  awardedXp?: number | null;
  feedback: string | null;
  id: string;
  status: string;
  submittedAt: Date | string | null;
  teacherAnnotations?: unknown;
};

export type StudentInteractiveHomework = {
  assetFileName: string | null;
  assetMimeType: string | null;
  assetPageCount: number | null;
  assetUrl?: string;
  dueDate: Date | null;
  fields: StudentInteractiveField[];
  id: string;
  instructions: string | null;
  submission?: StudentInteractiveSubmission;
  title: string;
  xpReward?: number;
};

const studentHomeworkDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatStudentHomeworkDate(value?: Date | string | null) {
  if (!value) {
    return "Sem prazo";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sem prazo";
  }

  return `Prazo ${studentHomeworkDateFormatter.format(date)}`;
}

function answersToMap(answers: unknown) {
  const values: Record<string, string> = {};

  if (!Array.isArray(answers)) {
    return values;
  }

  for (const answer of answers) {
    if (
      typeof answer === "object" &&
      answer !== null &&
      "value" in answer &&
      typeof answer.value === "string"
    ) {
      if ("fieldId" in answer && typeof answer.fieldId === "string") {
        values[answer.fieldId] = answer.value;
      }

      if ("questionId" in answer && typeof answer.questionId === "string") {
        values[answer.questionId] = answer.value;
      }
    }
  }

  return values;
}

function buildAnswersPayload(
  fields: StudentInteractiveField[],
  values: Record<string, string>,
) {
  return fields.map((field) => ({
    fieldId: field.id,
    value: values[field.id] ?? "",
  }));
}

function buildCandyXpAnswersPayload(
  fields: StudentInteractiveField[],
  values: Record<string, string>,
) {
  return fields.map((field) => ({
    questionId: field.id,
    value: values[field.id] ?? "",
  }));
}

function valuesSignature(values: Record<string, string>) {
  return JSON.stringify(
    Object.keys(values)
      .sort()
      .map((key) => [key, values[key] ?? ""]),
  );
}

function draftStorageKey(homeworkId: string, context = "homework") {
  if (context === "homework") {
    return `candy:interactive-homework-draft:${homeworkId}`;
  }

  return `candy:interactive-${context}-draft:${homeworkId}`;
}

function readStoredDraft(homeworkId: string, context = "homework") {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(
      draftStorageKey(homeworkId, context),
    );

    if (!rawDraft) {
      return null;
    }

    const parsed: unknown = JSON.parse(rawDraft);

    if (!parsed || typeof parsed !== "object" || !("values" in parsed)) {
      return null;
    }

    const maybeValues = (parsed as { values?: unknown }).values;

    if (
      !maybeValues ||
      typeof maybeValues !== "object" ||
      Array.isArray(maybeValues)
    ) {
      return null;
    }

    return Object.entries(maybeValues).reduce<Record<string, string>>(
      (draft, [fieldId, value]) => {
        if (typeof value === "string") {
          draft[fieldId] = value;
        }

        return draft;
      },
      {},
    );
  } catch {
    return null;
  }
}

function writeStoredDraft(
  homeworkId: string,
  values: Record<string, string>,
  context = "homework",
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const hasContent = Object.values(values).some((value) => value.length > 0);

    if (!hasContent) {
      window.localStorage.removeItem(draftStorageKey(homeworkId, context));
      return;
    }

    window.localStorage.setItem(
      draftStorageKey(homeworkId, context),
      JSON.stringify({
        savedAt: new Date().toISOString(),
        values,
      }),
    );
  } catch {
    // localStorage is only a safety copy; autosave to the server remains primary.
  }
}

function clearStoredDraft(homeworkId: string, context = "homework") {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(draftStorageKey(homeworkId, context));
  } catch {
    // Ignore storage cleanup failures.
  }
}

function statusLabel(status?: string) {
  if (status === "REVIEWED") {
    return "Corrigida";
  }

  if (status === "SUBMITTED") {
    return "Entregue";
  }

  if (status === "RETURNED") {
    return "Refazer";
  }

  if (status === "DRAFT") {
    return "Rascunho";
  }

  return "Pendente";
}

function statusClass(status?: string) {
  if (status === "REVIEWED") {
    return "border-emerald-500/40 bg-emerald-50 text-emerald-900";
  }

  if (status === "SUBMITTED") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  if (status === "RETURNED") {
    return "border-amber-600 bg-amber-100 text-amber-900";
  }

  if (status === "DRAFT") {
    return "border-sky-500/30 bg-sky-50 text-sky-900";
  }

  return "border-rose-500/40 bg-rose-50 text-rose-900";
}

function statusAccentClass(status?: string) {
  if (status === "REVIEWED") {
    return "bg-emerald-500";
  }

  if (status === "SUBMITTED") {
    return "bg-primary";
  }

  if (status === "RETURNED") {
    return "bg-amber-500";
  }

  if (status === "DRAFT") {
    return "bg-sky-500";
  }

  return "bg-rose-500";
}

function statusIconClass(status?: string) {
  if (status === "REVIEWED") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "SUBMITTED") {
    return "bg-primary/10 text-primary";
  }

  if (status === "RETURNED") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "DRAFT") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-rose-100 text-rose-700";
}

function statusHelper(status?: string) {
  if (status === "REVIEWED") {
    return "Feedback liberado";
  }

  if (status === "SUBMITTED") {
    return "Aguardando correcao";
  }

  if (status === "RETURNED") {
    return "Teacher pediu ajuste";
  }

  if (status === "DRAFT") {
    return "Rascunho salvo";
  }

  return "Ainda nao entregue";
}

const studentHomeworkSubmittedXp = CANDY_XP_REWARDS.student.homeworkSubmitted;
const studentHomeworkFeedbackXp = CANDY_XP_REWARDS.student.feedbackReviewed;
const studentHomeworkReviewedXp =
  studentHomeworkSubmittedXp + studentHomeworkFeedbackXp;

function homeworkXpAmount(status?: string) {
  return status === "REVIEWED"
    ? studentHomeworkReviewedXp
    : studentHomeworkSubmittedXp;
}

function homeworkXpLabel(status?: string) {
  const amount = homeworkXpAmount(status);

  if (
    status === "REVIEWED" ||
    status === "SUBMITTED" ||
    status === "RETURNED"
  ) {
    return `Ganhou +${amount} XP`;
  }

  return `Vale +${amount} XP`;
}

function homeworkXpHelper(status?: string) {
  if (status === "REVIEWED") {
    return `envio + feedback`;
  }

  if (status === "SUBMITTED") {
    return "envio registrado";
  }

  if (status === "RETURNED") {
    return "XP preservado";
  }

  return "ao entregar";
}

function homeworkXpClass(status?: string) {
  if (status === "REVIEWED") {
    return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }

  if (status === "SUBMITTED" || status === "RETURNED") {
    return "border-amber-300 bg-amber-50 text-amber-950";
  }

  return "border-primary/15 bg-white text-primary";
}

function isCompleteStatus(status?: string) {
  return status === "SUBMITTED" || status === "REVIEWED";
}

function roundPoint(value: number) {
  return Math.round(value * 10) / 10;
}

function pointDistance(a: DrawingPoint, b: DrawingPoint) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];

  return Math.sqrt(dx * dx + dy * dy);
}

function totalDrawingPoints(strokes: DrawingStroke[]) {
  return strokes.reduce((total, stroke) => total + stroke.length, 0);
}

function pointerToDrawingPoint(
  element: SVGSVGElement,
  event: PointerEvent<SVGSVGElement>,
): DrawingPoint {
  const rect = element.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
  const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;

  return [
    Math.min(100, Math.max(0, roundPoint(x))),
    Math.min(100, Math.max(0, roundPoint(y))),
  ];
}

function DrawingField({
  ariaLabel,
  disabled,
  onChange,
  style,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  onChange: (value: string) => void;
  style: CSSProperties;
  value: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDrawing = useRef(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(() =>
    parseInteractiveHomeworkDrawingValue(value),
  );

  useEffect(() => {
    setStrokes(parseInteractiveHomeworkDrawingValue(value));
  }, [value]);

  function commit(nextStrokes: DrawingStroke[]) {
    onChange(
      nextStrokes.length > 0
        ? serializeInteractiveHomeworkDrawingValue(nextStrokes)
        : "",
    );
    return nextStrokes;
  }

  function startStroke(event: PointerEvent<SVGSVGElement>) {
    if (disabled || !svgRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawing.current = true;
    const point = pointerToDrawingPoint(svgRef.current, event);

    setStrokes((current) => commit([...current, [point]]));
  }

  function continueStroke(event: PointerEvent<SVGSVGElement>) {
    if (disabled || !isDrawing.current || !svgRef.current) {
      return;
    }

    event.preventDefault();
    const point = pointerToDrawingPoint(svgRef.current, event);

    setStrokes((current) => {
      if (totalDrawingPoints(current) >= 520) {
        return current;
      }

      const lastStroke = current[current.length - 1];

      if (!lastStroke) {
        return commit([[point]]);
      }

      const lastPoint = lastStroke[lastStroke.length - 1];

      if (lastPoint && pointDistance(lastPoint, point) < 0.55) {
        return current;
      }

      const nextStrokes = current.map((stroke, index) =>
        index === current.length - 1 ? [...stroke, point] : stroke,
      );

      return commit(nextStrokes);
    });
  }

  function endStroke(event: PointerEvent<SVGSVGElement>) {
    isDrawing.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function undoStroke() {
    setStrokes((current) => commit(current.slice(0, -1)));
  }

  function clearDrawing() {
    setStrokes(() => commit([]));
  }

  return (
    <div
      className="pointer-events-auto group absolute bg-transparent"
      style={style}
    >
      <svg
        ref={svgRef}
        aria-label={ariaLabel}
        className="size-full cursor-crosshair touch-none rounded-[3px] text-primary outline-none"
        onPointerCancel={endStroke}
        onPointerDown={startStroke}
        onPointerMove={continueStroke}
        onPointerUp={endStroke}
        role="img"
        tabIndex={disabled ? -1 : 0}
        viewBox="0 0 100 100"
      >
        <InteractiveHomeworkDrawingStrokes strokes={strokes} />
      </svg>
      {!disabled && strokes.length > 0 ? (
        <span className="absolute right-0 top-0 flex gap-1 rounded-full bg-white/70 p-0.5 shadow-sm backdrop-blur-sm">
          <button
            aria-label="Desfazer ultimo desenho"
            className="flex size-6 items-center justify-center rounded-full text-primary hover:bg-white"
            onClick={undoStroke}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
          </button>
          <button
            aria-label="Limpar desenho"
            className="flex size-6 items-center justify-center rounded-full text-primary hover:bg-white"
            onClick={clearDrawing}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <Eraser aria-hidden="true" className="size-3.5" />
          </button>
        </span>
      ) : null}
    </div>
  );
}

export function InteractiveHomeworkStudent({
  context = "homework",
  defaultOpen = false,
  displayMode = "accordion",
  homework,
}: {
  context?: "candy-xp" | "homework" | "lesson";
  defaultOpen?: boolean;
  displayMode?: "accordion" | "panel";
  homework: StudentInteractiveHomework;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const initialValues = useMemo(
    () => answersToMap(homework.submission?.answers),
    [homework.submission?.answers],
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const autosaveTimeout = useRef<number | null>(null);
  const dirtyValues = useRef(false);
  const homeworkId = useRef(homework.id);
  const mounted = useRef(false);
  const saveRequest = useRef(0);
  const valuesRef = useRef(values);
  const status = homework.submission?.status;
  const isLocked = status === "SUBMITTED" || status === "REVIEWED";
  const isCandyXpContext = context === "candy-xp";
  const canReopen = !isCandyXpContext && status === "SUBMITTED";
  const isLessonContext = context === "lesson";
  const isComplete = isCandyXpContext
    ? status === "REVIEWED"
    : isCompleteStatus(status);
  const assetUrl = homework.assetUrl ?? `/ava/homework-assets/${homework.id}`;
  const statusAccent = statusAccentClass(status);
  const statusTone = statusClass(status);
  const statusIconTone = statusIconClass(status);
  const fallbackAssetLabel =
    context === "lesson"
      ? "Aula interativa"
      : isCandyXpContext
        ? "Missao Candy XP"
        : "Homework interativa";
  const fallbackInstructions =
    context === "lesson"
      ? "Complete a aula e marque como concluido."
      : isCandyXpContext
        ? "Complete as areas marcadas no arquivo e envie a missao."
        : "Complete a atividade e entregue.";
  const candyXpAmount = homework.xpReward ?? homework.submission?.awardedXp ?? 0;
  const xpBadgeLabel = isCandyXpContext
    ? status === "REVIEWED"
      ? `Ganhou +${candyXpAmount} XP`
      : `Vale +${candyXpAmount} XP`
    : homeworkXpLabel(status);
  const xpBadgeHelper = isCandyXpContext
    ? status === "REVIEWED"
      ? "missao concluida"
      : status === "SUBMITTED"
        ? "envio registrado"
        : status === "RETURNED"
          ? "refazer liberado"
          : "ao enviar"
    : homeworkXpHelper(status);
  const xpBadgeClass = isCandyXpContext
    ? status === "REVIEWED"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : "border-amber-300 bg-amber-50 text-amber-950"
    : homeworkXpClass(status);
  const displayedStatusLabel =
    isCandyXpContext && status === "REVIEWED" ? "Concluida" : statusLabel(status);
  const displayedStatusHelper =
    isCandyXpContext && status === "REVIEWED"
      ? "XP registrado"
      : isCandyXpContext && status === "SUBMITTED"
        ? "Aguardando correcao"
        : isCandyXpContext && status === "RETURNED"
          ? "Refazer missao"
          : statusHelper(status);
  const lessonStatusClass = isComplete
    ? "border-emerald-500/40 bg-emerald-50 text-emerald-900"
    : "border-red-500/40 bg-red-50 text-red-900";
  const lessonStatusDotClass = isComplete ? "bg-emerald-500" : "bg-red-600";
  const teacherAnnotations = useMemo(
    () =>
      status === "RETURNED" || status === "REVIEWED"
        ? normalizeHomeworkReviewAnnotations(homework.submission?.teacherAnnotations)
        : null,
    [homework.submission?.teacherAnnotations, status],
  );
  const hasTeacherAnnotations = Boolean(
    teacherAnnotations && teacherAnnotations.items.length > 0,
  );

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen, homework.id]);

  useEffect(() => {
    if (homeworkId.current !== homework.id) {
      homeworkId.current = homework.id;
      dirtyValues.current = false;
      mounted.current = false;
      setDraftHydrated(false);
      setMessage(null);
      setSaveState("idle");
      setValues(initialValues);
      return;
    }

    if (!dirtyValues.current) {
      setValues(initialValues);
    }
  }, [homework.id, initialValues]);

  useEffect(() => {
    mounted.current = false;
    setDraftHydrated(false);

    if (isLocked) {
      clearStoredDraft(homework.id, context);
      setDraftHydrated(true);
      return;
    }

    const storedValues = readStoredDraft(homework.id, context);

    if (storedValues && Object.keys(storedValues).length > 0) {
      dirtyValues.current = true;
      setValues((current) => ({
        ...current,
        ...storedValues,
      }));
    }

    setDraftHydrated(true);
  }, [context, homework.id, isLocked]);

  useEffect(() => {
    if (!draftHydrated || isLocked) {
      return;
    }

    writeStoredDraft(homework.id, values, context);
  }, [context, draftHydrated, homework.id, isLocked, values]);

  useEffect(() => {
    if (isLocked || !draftHydrated) {
      return;
    }

    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    setSaveState("saving");
    const valuesSnapshot = values;
    const savedSignature = valuesSignature(valuesSnapshot);
    const requestId = saveRequest.current + 1;

    saveRequest.current = requestId;

    const timeout = window.setTimeout(async () => {
      const result = isCandyXpContext
        ? await saveCandyXpActivityDraft({
            activityId: homework.id,
            answers: buildCandyXpAnswersPayload(homework.fields, valuesSnapshot),
          })
        : await saveInteractiveHomeworkDraft({
            answers: buildAnswersPayload(homework.fields, valuesSnapshot),
            homeworkId: homework.id,
          });

      if (requestId !== saveRequest.current) {
        return;
      }

      if (!result.ok) {
        setMessage(result.message);
        setSaveState("idle");
        return;
      }

      setMessage(null);

      if (valuesSignature(valuesRef.current) === savedSignature) {
        dirtyValues.current = false;
        setSaveState("saved");
      }
    }, 900);

    autosaveTimeout.current = timeout;

    return () => {
      window.clearTimeout(timeout);

      if (autosaveTimeout.current === timeout) {
        autosaveTimeout.current = null;
      }
    };
  }, [
    draftHydrated,
    homework.fields,
    homework.id,
    isCandyXpContext,
    isLocked,
    values,
  ]);

  function updateValue(fieldId: string, value: string) {
    dirtyValues.current = true;
    setSaveState("idle");
    setValues((current) => {
      const nextValues = {
        ...current,
        [fieldId]: value,
      };

      valuesRef.current = nextValues;
      return nextValues;
    });
  }

  function submit() {
    setMessage(null);
    if (autosaveTimeout.current) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }

    const currentValues = valuesRef.current;

    startTransition(async () => {
      const result = isCandyXpContext
        ? await submitCandyXpActivity({
            activityId: homework.id,
            answers: buildCandyXpAnswersPayload(homework.fields, currentValues),
          })
        : await submitInteractiveHomework({
            answers: buildAnswersPayload(homework.fields, currentValues),
            homeworkId: homework.id,
          });

      setMessage(result.message);

      if (result.ok) {
        clearStoredDraft(homework.id, context);
        dirtyValues.current = false;
        setSaveState("saved");
        router.refresh();
      }
    });
  }

  function reopen() {
    setMessage(null);
    startTransition(async () => {
      const result = await reopenInteractiveHomeworkDraft({
        homeworkId: homework.id,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  const detailsContent = (
    <div
      className={
        isLessonContext
          ? "border-t border-primary/15 p-3 sm:p-4 md:p-6"
          : displayMode === "panel"
            ? "bg-gradient-to-b from-white to-primary/[0.03] p-3 sm:p-4 md:p-5"
            : "border-t border-primary/15 bg-gradient-to-b from-white to-primary/[0.03] p-3 sm:p-4 md:p-5"
      }
    >
      <div className="mb-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-start">
        <p className="leading-6">
          {homework.instructions ?? fallbackInstructions}
        </p>
        <span className="flex flex-wrap items-center gap-2">
          {!isLessonContext ? (
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${xpBadgeClass}`}
            >
              <Zap aria-hidden="true" className="size-3.5" />
              {xpBadgeLabel}
            </span>
          ) : null}
          {!isLessonContext ? (
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}
            >
              {displayedStatusHelper}
            </span>
          ) : null}
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold">
            <Save aria-hidden="true" />
            {saveState === "saving"
              ? "Salvando"
              : saveState === "saved"
                ? "Salvo"
                : "Autosave"}
          </span>
        </span>
      </div>

      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 rounded-lg border border-primary/10 bg-white/80 px-3 py-2 text-xs shadow-sm">
        <span className="flex min-w-0 items-center gap-2 font-semibold text-primary">
          <FileText aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            {homework.assetFileName ?? fallbackAssetLabel}
          </span>
        </span>
        <a
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 font-semibold text-primary"
          href={assetUrl}
          rel="noreferrer"
          target="_blank"
        >
          Abrir arquivo
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </div>

      <InteractiveHomeworkDocument
        assetMimeType={homework.assetMimeType}
        assetUrl={assetUrl}
        expectedPageCount={homework.assetPageCount}
        fields={homework.fields}
        mobileReadable
        pageClassName={isLessonContext ? "max-w-[1120px]" : "max-w-[980px]"}
        renderPageForeground={(pageNumber) =>
          teacherAnnotations && hasTeacherAnnotations ? (
            <HomeworkReviewAnnotationLayer
              annotations={teacherAnnotations}
              pageNumber={pageNumber}
            />
          ) : null
        }
        renderField={(field, index, style) => {
          const commonClass =
            "block size-full max-h-none max-w-none min-h-0 min-w-0 appearance-none border-0 bg-transparent text-left font-semibold text-primary/95 shadow-none outline-none ring-0 transition placeholder:text-transparent focus:bg-transparent focus:outline-none focus:ring-0 disabled:bg-transparent disabled:text-primary/80 disabled:opacity-100";

          if (field.type === "CHECKBOX") {
            return (
              <label
                key={field.id}
                className="pointer-events-auto absolute flex cursor-pointer items-center justify-center bg-transparent text-primary"
                style={{ ...style, containerType: "size" }}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
                />
                <input
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  checked={values[field.id] === "true"}
                  className="sr-only"
                  disabled={isLocked}
                  onChange={(event) =>
                    updateValue(
                      field.id,
                      event.target.checked ? "true" : "false",
                    )
                  }
                  type="checkbox"
                />
                {values[field.id] === "true" ? (
                  <InteractiveHomeworkMark />
                ) : null}
              </label>
            );
          }

          if (field.type === "DRAWING") {
            return (
              <DrawingField
                key={field.id}
                ariaLabel={field.label ?? `Campo ${index + 1}`}
                disabled={isLocked}
                onChange={(value) => updateValue(field.id, value)}
                style={style}
                value={values[field.id] ?? ""}
              />
            );
          }

          if (field.type === "TINY_TEXT") {
            return (
              <InteractiveHomeworkTextFrame
                key={field.id}
                className="pointer-events-auto"
                style={style}
              >
                <input
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  autoCapitalize="characters"
                  className="block size-full min-h-0 min-w-0 appearance-none rounded-[5px] border border-primary/28 bg-white/55 p-0 text-center font-extrabold uppercase text-primary shadow-[0_1px_4px_rgba(65,42,76,0.08),inset_0_0_0_1px_rgba(255,255,255,0.62)] outline-none transition placeholder:text-transparent focus:border-primary focus:bg-white/92 focus:ring-2 focus:ring-primary/25 disabled:bg-white/28 disabled:text-primary disabled:opacity-100"
                  disabled={isLocked}
                  inputMode="text"
                  maxLength={TINY_TEXT_MAX_LENGTH}
                  onChange={(event) =>
                    updateValue(
                      field.id,
                      normalizeTinyTextAnswer(event.target.value),
                    )
                  }
                  placeholder=""
                  style={getInteractiveHomeworkTinyTextStyle()}
                  value={values[field.id] ?? ""}
                />
              </InteractiveHomeworkTextFrame>
            );
          }

          if (field.type === "LISTENING") {
            return (
              <InteractiveHomeworkListeningPlayer
                key={field.id}
                fieldId={field.id}
                label={field.label ?? `Listening ${index + 1}`}
                sentence={field.placeholder}
                style={style}
              />
            );
          }

          if (field.type === "SHORT_TEXT") {
            return (
              <InteractiveHomeworkTextFrame
                key={field.id}
                className="pointer-events-auto"
                style={style}
              >
                <InteractiveHomeworkTextLineGuide
                  kind="SHORT_TEXT"
                  variant="student"
                />
                <input
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  className={`${commonClass} relative z-10 overflow-hidden whitespace-nowrap px-[0.25em]`}
                  disabled={isLocked}
                  onChange={(event) =>
                    updateValue(field.id, event.target.value)
                  }
                  placeholder={field.placeholder ?? "Resposta"}
                  style={getInteractiveHomeworkTextStyle("SHORT_TEXT")}
                  value={values[field.id] ?? ""}
                />
              </InteractiveHomeworkTextFrame>
            );
          }

          return (
            <InteractiveHomeworkTextFrame
              key={field.id}
              className="pointer-events-auto"
              style={style}
            >
              <InteractiveHomeworkTextLineGuide
                kind="LONG_TEXT"
                variant="student"
              />
              <textarea
                aria-label={field.label ?? `Campo ${index + 1}`}
                className={`${commonClass} relative z-10 resize-none overflow-hidden whitespace-pre-wrap break-words px-[0.3em] py-[0.2em]`}
                disabled={isLocked}
                onChange={(event) => updateValue(field.id, event.target.value)}
                placeholder={field.placeholder ?? "Resposta"}
                style={getInteractiveHomeworkTextStyle("LONG_TEXT")}
                value={values[field.id] ?? ""}
                wrap="soft"
              />
            </InteractiveHomeworkTextFrame>
          );
        }}
        title={homework.title}
      />

      {homework.submission?.feedback ? (
        <div className="mt-4 rounded-lg border border-primary/20 bg-secondary p-3 text-sm leading-6">
          <strong>Feedback:</strong> {homework.submission.feedback}
        </div>
      ) : null}

      {hasTeacherAnnotations ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          A teacher marcou pontos no arquivo para voce revisar.
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div
        className={
          isLessonContext
            ? "mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start"
            : "mt-4 flex flex-wrap items-center gap-2"
        }
      >
        <Button
          type="button"
          onClick={submit}
          disabled={isPending || isLocked}
          className={isLessonContext ? "h-10 px-5" : undefined}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : isLessonContext ? (
            <CheckCircle2 data-icon="inline-start" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          {isLessonContext
            ? "Concluido"
            : isCandyXpContext
              ? "Enviar missao"
              : "Entregar"}
        </Button>
        {canReopen ? (
          <Button
            type="button"
            variant="outline"
            onClick={reopen}
            disabled={isPending}
          >
            <RotateCcw data-icon="inline-start" />
            Refazer
          </Button>
        ) : null}
        {status === "REVIEWED" ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 aria-hidden="true" />
            {isCandyXpContext ? "Concluida" : "Corrigida"}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (displayMode === "panel") {
    return detailsContent;
  }

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className={
        isLessonContext
          ? "group overflow-hidden rounded-xl border border-primary/15 bg-white shadow-md shadow-primary/10"
          : "group relative overflow-hidden rounded-2xl border border-primary/15 bg-white/95 shadow-sm transition hover:border-primary/25 hover:shadow-md"
      }
    >
      {!isLessonContext ? (
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-1 ${statusAccent}`}
        />
      ) : null}
      <summary
        className={
          isLessonContext
            ? "flex cursor-pointer list-none flex-col items-stretch gap-3 px-4 py-4 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between md:px-6 [&::-webkit-details-marker]:hidden"
            : "flex cursor-pointer list-none flex-col gap-3 px-5 py-4 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden"
        }
      >
        <span className="flex min-w-0 items-start gap-3 sm:items-center">
          <span
            className={
              isLessonContext
                ? "flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                : `flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${statusIconTone}`
            }
          >
            <ClipboardCheck
              aria-hidden="true"
              className={isLessonContext ? undefined : "size-6"}
            />
          </span>
          <span className="min-w-0">
            <span
              className={
                isLessonContext
                  ? "block truncate text-base font-semibold"
                  : "block truncate text-lg font-semibold text-primary"
              }
            >
              {homework.title}
            </span>
            {isLessonContext ? (
              <span className="block truncate text-xs text-muted-foreground">
                {homework.assetFileName ?? fallbackAssetLabel}
              </span>
            ) : (
              <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1">
                  <FileText aria-hidden="true" className="size-3.5" />
                  {homework.assetFileName ?? fallbackAssetLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-2.5 py-1">
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  {formatStudentHomeworkDate(homework.dueDate)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-2.5 py-1">
                  {homework.fields.length} area(s)
                </span>
              </span>
            )}
          </span>
        </span>
        {isLessonContext ? (
          <span className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${lessonStatusClass}`}
            >
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full ${lessonStatusDotClass}`}
              />
              {isComplete ? "Concluido" : "Nao concluido"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              {isOpen ? "Fechar" : "Abrir"}
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition group-open:rotate-180"
              />
            </span>
          </span>
        ) : (
          <span className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <span
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm ${xpBadgeClass}`}
            >
              <Zap aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="leading-tight">
                <span className="block">{xpBadgeLabel}</span>
                <span className="block text-[10px] font-semibold opacity-70">
                  {xpBadgeHelper}
                </span>
              </span>
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}
            >
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full ${statusAccent}`}
              />
              {displayedStatusLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              {isOpen
                ? "Fechar"
                : isCandyXpContext
                  ? "Abrir missao"
                  : "Abrir atividade"}
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition group-open:rotate-180"
              />
            </span>
          </span>
        )}
      </summary>
      {detailsContent}
    </details>
  );
}
