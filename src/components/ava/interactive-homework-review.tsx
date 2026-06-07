"use client";

import { useMemo } from "react";
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
  assetMimeType: string | null;
  assetPageCount: number | null;
  className?: string;
  fields: ReviewInteractiveField[];
  homeworkId: string;
  pageClassName?: string;
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

export function InteractiveHomeworkReview({
  answers,
  assetMimeType,
  assetPageCount,
  className,
  fields,
  homeworkId,
  pageClassName = "max-w-[760px]",
  title,
}: InteractiveHomeworkReviewProps) {
  const assetUrl = `/ava/homework-assets/${homeworkId}`;
  const values = useMemo(() => answersToMap(answers), [answers]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-primary/15 bg-white",
        className,
      )}
    >
      <div className="border-b border-primary/10 px-3 py-2 text-sm font-semibold text-primary">
        Entrega marcada no arquivo
      </div>
      <div className="bg-muted/20 p-3">
        <InteractiveHomeworkDocument
          assetMimeType={assetMimeType}
          assetUrl={assetUrl}
          expectedPageCount={assetPageCount}
          fields={fields}
          pageClassName={pageClassName}
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
