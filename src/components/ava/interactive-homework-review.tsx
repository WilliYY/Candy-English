"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eraser,
  LoaderCircle,
  PenLine,
  RotateCcw,
  Save,
  Type,
} from "lucide-react";
import { saveHomeworkReviewAnnotations } from "@/app/ava/teacher/actions";
import {
  InteractiveHomeworkDrawingStrokes,
  parseInteractiveHomeworkDrawingValue,
} from "@/components/ava/interactive-homework-drawing";
import { InteractiveHomeworkDocument } from "@/components/ava/interactive-homework-document";
import { InteractiveHomeworkListeningPlayer } from "@/components/ava/interactive-homework-listening";
import { InteractiveHomeworkMark } from "@/components/ava/interactive-homework-mark";
import {
  InteractiveHomeworkTinyTextPreview,
  getInteractiveHomeworkTextStyle,
  InteractiveHomeworkTextFrame,
} from "@/components/ava/interactive-homework-text";
import {
  EMPTY_HOMEWORK_REVIEW_ANNOTATIONS,
  HOMEWORK_REVIEW_ANNOTATION_COLORS,
  HomeworkReviewAnnotationLayer,
  normalizeHomeworkReviewAnnotations,
  type HomeworkReviewAnnotationColor,
  type HomeworkReviewAnnotations,
} from "@/components/ava/homework-review-annotations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InteractiveHomeworkFieldType } from "@/lib/interactive-homework-fields";
import { cn } from "@/lib/utils";

export type ReviewInteractiveField = {
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

type InteractiveHomeworkReviewProps = {
  answers: unknown;
  annotations?: unknown;
  assetMimeType: string | null;
  assetPageCount: number | null;
  assetUrl?: string;
  className?: string;
  editableAnnotations?: boolean;
  fields: ReviewInteractiveField[];
  homeworkId: string;
  pageClassName?: string;
  submissionId?: string;
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

function annotationsSignature(annotations: HomeworkReviewAnnotations) {
  return JSON.stringify(annotations);
}

export function InteractiveHomeworkReview({
  answers,
  annotations,
  assetMimeType,
  assetPageCount,
  assetUrl,
  className,
  editableAnnotations = false,
  fields,
  homeworkId,
  pageClassName = "max-w-[760px]",
  submissionId,
  title,
}: InteractiveHomeworkReviewProps) {
  const resolvedAssetUrl = assetUrl ?? `/ava/homework-assets/${homeworkId}`;
  const values = useMemo(() => answersToMap(answers), [answers]);
  const initialAnnotations = useMemo(
    () => normalizeHomeworkReviewAnnotations(annotations),
    [annotations],
  );
  const initialAnnotationsSignature = useMemo(
    () => annotationsSignature(initialAnnotations),
    [initialAnnotations],
  );
  const [reviewAnnotations, setReviewAnnotations] =
    useState<HomeworkReviewAnnotations>(initialAnnotations);
  const [annotationTool, setAnnotationTool] = useState<"pen" | "text">("pen");
  const [annotationColor, setAnnotationColor] =
    useState<HomeworkReviewAnnotationColor>("red");
  const [annotationText, setAnnotationText] = useState("");
  const [saveState, setSaveState] = useState<
    "error" | "idle" | "saved" | "saving"
  >("saved");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const annotationsRef = useRef(reviewAnnotations);
  const dirtyAnnotations = useRef(false);
  const saveRequest = useRef(0);

  useEffect(() => {
    const normalized = normalizeHomeworkReviewAnnotations(annotations);

    annotationsRef.current = normalized;
    dirtyAnnotations.current = false;
    setReviewAnnotations(normalized);
    setSaveMessage(null);
    setSaveState("saved");
  }, [annotations, initialAnnotationsSignature, submissionId]);

  const updateAnnotations = useCallback((next: HomeworkReviewAnnotations) => {
    annotationsRef.current = next;
    dirtyAnnotations.current = true;
    setSaveMessage(null);
    setSaveState("idle");
    setReviewAnnotations(next);
  }, []);

  const persistAnnotations = useCallback(
    async (snapshot = annotationsRef.current) => {
      if (!submissionId) {
        return;
      }

      const requestId = saveRequest.current + 1;
      const signature = annotationsSignature(snapshot);

      saveRequest.current = requestId;
      setSaveState("saving");
      setSaveMessage(null);

      const result = await saveHomeworkReviewAnnotations({
        annotations: snapshot.items.length > 0 ? snapshot : null,
        submissionId,
      });

      if (requestId !== saveRequest.current) {
        return;
      }

      if (!result.ok) {
        setSaveState("error");
        setSaveMessage(result.message);
        return;
      }

      if (annotationsSignature(annotationsRef.current) === signature) {
        const savedAnnotations = result.annotations
          ? normalizeHomeworkReviewAnnotations(result.annotations)
          : EMPTY_HOMEWORK_REVIEW_ANNOTATIONS;

        annotationsRef.current = savedAnnotations;
        dirtyAnnotations.current = false;
        setReviewAnnotations(savedAnnotations);
        setSaveState("saved");
        setSaveMessage(result.message);
      }
    },
    [submissionId],
  );

  useEffect(() => {
    if (!editableAnnotations || !submissionId || !dirtyAnnotations.current) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void persistAnnotations(annotationsRef.current);
    }, 1100);

    return () => window.clearTimeout(timeout);
  }, [editableAnnotations, persistAnnotations, reviewAnnotations, submissionId]);

  const annotationCount = reviewAnnotations.items.length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-primary/15 bg-white",
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-primary/10 px-3 py-2 text-sm font-semibold text-primary sm:flex-row sm:items-center sm:justify-between">
        <span>Entrega marcada no arquivo</span>
        {annotationCount > 0 ? (
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
            {annotationCount} anotacao(oes)
          </span>
        ) : null}
      </div>
      {editableAnnotations ? (
        <div className="grid gap-3 border-b border-primary/10 bg-gradient-to-r from-white via-amber-50/55 to-primary/[0.035] px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={annotationTool === "pen" ? "default" : "outline"}
              onClick={() => setAnnotationTool("pen")}
              title="Caneta"
            >
              <PenLine data-icon="inline-start" />
              Caneta
            </Button>
            <Button
              type="button"
              size="sm"
              variant={annotationTool === "text" ? "default" : "outline"}
              onClick={() => setAnnotationTool("text")}
              title="Texto"
            >
              <Type data-icon="inline-start" />
              Texto
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-primary/10 bg-white px-2 py-1 shadow-sm">
              {HOMEWORK_REVIEW_ANNOTATION_COLORS.map((color) => (
                <button
                  key={color.id}
                  aria-label={`Cor ${color.label}`}
                  className={cn(
                    "size-6 rounded-full border transition hover:scale-105",
                    annotationColor === color.id
                      ? "border-primary shadow-[0_0_0_2px_rgba(65,42,76,0.16)]"
                      : "border-primary/15",
                  )}
                  onClick={() => setAnnotationColor(color.id)}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                  type="button"
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={annotationCount === 0}
              onClick={() =>
                updateAnnotations({
                  items: reviewAnnotations.items.slice(0, -1),
                  version: 1,
                })
              }
              title="Desfazer ultima anotacao"
            >
              <RotateCcw data-icon="inline-start" />
              Desfazer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={annotationCount === 0}
              onClick={() => updateAnnotations(EMPTY_HOMEWORK_REVIEW_ANNOTATIONS)}
              title="Limpar anotacoes"
            >
              <Eraser data-icon="inline-start" />
              Limpar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!submissionId || saveState === "saving"}
              onClick={() => void persistAnnotations(annotationsRef.current)}
              title="Salvar anotacoes agora"
            >
              {saveState === "saving" ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Salvar
            </Button>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                saveState === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : saveState === "saving"
                    ? "border-sky-200 bg-sky-50 text-sky-800"
                    : saveState === "saved"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-primary/15 bg-white text-primary",
              )}
            >
              {saveState === "saving"
                ? "Salvando"
                : saveState === "saved"
                  ? "Salvo"
                  : saveState === "error"
                    ? "Erro ao salvar"
                    : "Autosave pronto"}
            </span>
          </div>
          {annotationTool === "text" ? (
            <Input
              aria-label="Texto da anotacao"
              className="h-9 bg-white"
              maxLength={400}
              onChange={(event) => setAnnotationText(event.target.value)}
              placeholder="Digite a anotacao e clique no ponto do arquivo."
              value={annotationText}
            />
          ) : null}
          {saveMessage ? (
            <p className="text-xs text-muted-foreground">{saveMessage}</p>
          ) : null}
        </div>
      ) : null}
      <div className="bg-muted/20 p-3">
        <InteractiveHomeworkDocument
          assetMimeType={assetMimeType}
          assetUrl={resolvedAssetUrl}
          expectedPageCount={assetPageCount}
          fields={fields}
          pageClassName={pageClassName}
          renderPageForeground={(pageNumber) =>
            editableAnnotations || annotationCount > 0 ? (
              <HomeworkReviewAnnotationLayer
                annotations={reviewAnnotations}
                color={annotationColor}
                editable={editableAnnotations}
                onChange={updateAnnotations}
                pageNumber={pageNumber}
                textValue={annotationText}
                tool={annotationTool}
              />
            ) : null
          }
          renderField={(field, index, style) => {
            const value = values[field.id] ?? "";

            if (field.type === "CHECKBOX") {
              return (
                <div
                  key={field.id}
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  className="absolute flex items-center justify-center rounded-[3px] text-primary"
                  style={{ ...style, containerType: "size" }}
                >
                  {value === "true" ? <InteractiveHomeworkMark /> : null}
                </div>
              );
            }

            if (field.type === "DRAWING") {
              const strokes = parseInteractiveHomeworkDrawingValue(value);

              return (
                <svg
                  key={field.id}
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  className="absolute text-primary"
                  role="img"
                  style={style}
                  viewBox="0 0 100 100"
                >
                  <InteractiveHomeworkDrawingStrokes strokes={strokes} />
                </svg>
              );
            }

            if (field.type === "TINY_TEXT") {
              return (
                <InteractiveHomeworkTextFrame key={field.id} style={style}>
                  <InteractiveHomeworkTinyTextPreview
                    variant="review"
                    value={value}
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
                <InteractiveHomeworkTextFrame key={field.id} style={style}>
                  <div
                    aria-label={field.label ?? `Campo ${index + 1}`}
                    className="flex size-full min-w-0 items-center overflow-hidden whitespace-nowrap px-[0.25em] text-left font-semibold text-primary"
                    style={getInteractiveHomeworkTextStyle("SHORT_TEXT")}
                  >
                    {value}
                  </div>
                </InteractiveHomeworkTextFrame>
              );
            }

            return (
              <InteractiveHomeworkTextFrame key={field.id} style={style}>
                <div
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  className="block size-full min-h-0 min-w-0 overflow-hidden whitespace-pre-wrap break-words px-[0.3em] py-[0.2em] text-left font-semibold text-primary"
                  style={getInteractiveHomeworkTextStyle("LONG_TEXT")}
                >
                  {value}
                </div>
              </InteractiveHomeworkTextFrame>
            );
          }}
          title={title}
        />
      </div>
    </div>
  );
}
