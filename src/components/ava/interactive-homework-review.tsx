"use client";

import { useMemo } from "react";
import { InteractiveHomeworkDocument } from "@/components/ava/interactive-homework-document";
import {
  getInteractiveHomeworkTextStyle,
  InteractiveHomeworkTextFrame,
} from "@/components/ava/interactive-homework-text";
import { cn } from "@/lib/utils";

export type ReviewInteractiveField = {
  height: number;
  id: string;
  label: string | null;
  page: number;
  placeholder: string | null;
  required: boolean;
  sortOrder: number;
  type: "SHORT_TEXT" | "LONG_TEXT" | "CHECKBOX" | "DRAWING";
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

type DrawingPoint = [number, number];
type DrawingStroke = DrawingPoint[];

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

function parseDrawingValue(value?: string): DrawingStroke[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as { strokes?: unknown };

    if (!Array.isArray(parsed.strokes)) {
      return [];
    }

    return parsed.strokes
      .map((stroke) => {
        if (!Array.isArray(stroke)) {
          return [];
        }

        return stroke
          .map((point) => {
            if (
              !Array.isArray(point) ||
              typeof point[0] !== "number" ||
              typeof point[1] !== "number"
            ) {
              return null;
            }

            return [point[0], point[1]] satisfies DrawingPoint;
          })
          .filter((point): point is DrawingPoint => Boolean(point));
      })
      .filter((stroke) => stroke.length > 0);
  } catch {
    return [];
  }
}

function drawingPath(stroke: DrawingStroke) {
  return stroke
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
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
                  className="absolute flex items-center justify-center rounded-[3px] text-lg font-bold text-primary"
                  style={style}
                >
                  {value === "true" ? "X" : null}
                </div>
              );
            }

            if (field.type === "DRAWING") {
              const strokes = parseDrawingValue(value);

              return (
                <svg
                  key={field.id}
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  className="absolute text-primary"
                  role="img"
                  style={style}
                  viewBox="0 0 100 100"
                >
                  {strokes.map((stroke, strokeIndex) => (
                    <path
                      key={`${strokeIndex}-${stroke.length}`}
                      d={drawingPath(stroke)}
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              );
            }

            if (field.type === "SHORT_TEXT") {
              return (
                <InteractiveHomeworkTextFrame key={field.id} style={style}>
                  <div
                    aria-label={field.label ?? `Campo ${index + 1}`}
                    className="flex size-full items-center overflow-hidden whitespace-nowrap px-[0.25em] font-semibold text-primary"
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
                  className="size-full overflow-hidden whitespace-pre-wrap px-[0.3em] py-[0.2em] font-semibold text-primary"
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
