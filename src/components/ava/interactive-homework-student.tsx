"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  Eraser,
  LoaderCircle,
  RotateCcw,
  Save,
  Send,
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
  type DrawingPoint,
  type DrawingStroke,
  InteractiveHomeworkDrawingStrokes,
  parseInteractiveHomeworkDrawingValue,
  serializeInteractiveHomeworkDrawingValue,
} from "@/components/ava/interactive-homework-drawing";
import { InteractiveHomeworkDocument } from "@/components/ava/interactive-homework-document";
import { InteractiveHomeworkMark } from "@/components/ava/interactive-homework-mark";
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
  feedback: string | null;
  id: string;
  status: string;
  submittedAt: Date;
};

export type StudentInteractiveHomework = {
  assetFileName: string | null;
  assetMimeType: string | null;
  assetPageCount: number | null;
  dueDate: Date | null;
  fields: StudentInteractiveField[];
  id: string;
  instructions: string | null;
  submission?: StudentInteractiveSubmission;
  title: string;
};

function answersToMap(answers: unknown) {
  const values: Record<string, string> = {};

  if (!Array.isArray(answers)) {
    return values;
  }

  for (const answer of answers) {
    if (
      typeof answer === "object" &&
      answer !== null &&
      "fieldId" in answer &&
      "value" in answer &&
      typeof answer.fieldId === "string" &&
      typeof answer.value === "string"
    ) {
      values[answer.fieldId] = answer.value;
    }
  }

  return values;
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
    return "border-emerald-700 bg-emerald-600 text-white";
  }

  if (status === "SUBMITTED") {
    return "border-primary bg-primary text-primary-foreground";
  }

  if (status === "RETURNED") {
    return "border-amber-600 bg-amber-100 text-amber-900";
  }

  return "border-red-700 bg-red-600 text-white";
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
  homework,
}: {
  context?: "homework" | "lesson";
  homework: StudentInteractiveHomework;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isPending, startTransition] = useTransition();
  const initialValues = useMemo(
    () => answersToMap(homework.submission?.answers),
    [homework.submission?.answers],
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const mounted = useRef(false);
  const status = homework.submission?.status;
  const isLocked = status === "SUBMITTED" || status === "REVIEWED";
  const canReopen = status === "SUBMITTED";
  const isLessonContext = context === "lesson";
  const isComplete = isCompleteStatus(status);
  const assetUrl = `/ava/homework-assets/${homework.id}`;
  const fallbackAssetLabel =
    context === "lesson" ? "Aula interativa" : "Homework interativa";
  const fallbackInstructions =
    context === "lesson"
      ? "Complete a aula e marque como concluido."
      : "Complete a atividade e entregue.";
  const lessonStatusClass = isComplete
    ? "border-emerald-500/40 bg-emerald-50 text-emerald-900"
    : "border-red-500/40 bg-red-50 text-red-900";
  const lessonStatusDotClass = isComplete ? "bg-emerald-500" : "bg-red-600";

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    if (isLocked) {
      return;
    }

    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      const result = await saveInteractiveHomeworkDraft({
        answers: homework.fields.map((field) => ({
          fieldId: field.id,
          value: values[field.id] ?? "",
        })),
        homeworkId: homework.id,
      });

      setMessage(result.ok ? null : result.message);
      setSaveState(result.ok ? "saved" : "idle");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [homework.fields, homework.id, isLocked, values]);

  function updateValue(fieldId: string, value: string) {
    setValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await submitInteractiveHomework({
        answers: homework.fields.map((field) => ({
          fieldId: field.id,
          value: values[field.id] ?? "",
        })),
        homeworkId: homework.id,
      });

      setMessage(result.message);

      if (result.ok) {
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

  return (
    <details
      className={
        isLessonContext
          ? "group overflow-hidden rounded-xl border border-primary/15 bg-white shadow-md shadow-primary/10"
          : "group rounded-lg border-2 border-primary/20 bg-white shadow-sm"
      }
    >
      <summary
        className={
          isLessonContext
            ? "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-primary/5 md:px-6 [&::-webkit-details-marker]:hidden"
            : "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-primary/5 [&::-webkit-details-marker]:hidden"
        }
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={
              isLessonContext
                ? "flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                : "flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            }
          >
            <ClipboardCheck aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span
              className={
                isLessonContext
                  ? "block truncate text-base font-semibold"
                  : "block truncate font-semibold"
              }
            >
              {homework.title}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {homework.assetFileName ?? fallbackAssetLabel}
            </span>
          </span>
        </span>
        {isLessonContext ? (
          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${lessonStatusClass}`}
          >
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full ${lessonStatusDotClass}`}
            />
            {isComplete ? "Concluido" : "Nao concluido"}
          </span>
        ) : (
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
              status,
            )}`}
          >
            {statusLabel(status)}
          </span>
        )}
      </summary>

      <div
        className={
          isLessonContext
            ? "border-t border-primary/15 p-5 md:p-6"
            : "border-t border-primary/15 p-4"
        }
      >
        <div className="mb-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-start">
          <p className="leading-6">
            {homework.instructions ?? fallbackInstructions}
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-semibold">
            <Save aria-hidden="true" />
            {saveState === "saving"
              ? "Salvando"
              : saveState === "saved"
                ? "Salvo"
                : "Autosave"}
          </span>
        </div>

        <InteractiveHomeworkDocument
          assetMimeType={homework.assetMimeType}
          assetUrl={assetUrl}
          expectedPageCount={homework.assetPageCount}
          fields={homework.fields}
          pageClassName={isLessonContext ? "max-w-[1120px]" : "max-w-[980px]"}
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
                      className="block size-full min-h-0 min-w-0 appearance-none rounded-[3px] border border-primary/35 bg-white/55 p-0 text-center font-extrabold uppercase text-primary shadow-[0_1px_4px_rgba(65,42,76,0.12)] outline-none transition focus:border-primary focus:bg-white/80 focus:ring-2 focus:ring-primary/20 disabled:bg-white/30 disabled:text-primary disabled:opacity-100"
                      disabled={isLocked}
                      inputMode="text"
                      maxLength={TINY_TEXT_MAX_LENGTH}
                      onChange={(event) =>
                        updateValue(
                          field.id,
                          normalizeTinyTextAnswer(event.target.value),
                        )
                      }
                      placeholder={field.placeholder ?? "A"}
                      style={getInteractiveHomeworkTinyTextStyle()}
                      value={values[field.id] ?? ""}
                    />
                  </InteractiveHomeworkTextFrame>
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
                    onChange={(event) =>
                      updateValue(field.id, event.target.value)
                    }
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
            {isLessonContext ? "Concluido" : "Entregar"}
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
              Corrigida
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
