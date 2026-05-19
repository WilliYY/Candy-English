"use client";

import { useMemo, useState } from "react";
import { InteractiveHomeworkDocument } from "@/components/ava/interactive-homework-document";

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
  fields: ReviewInteractiveField[];
  homeworkId: string;
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
  fields,
  homeworkId,
  title,
}: InteractiveHomeworkReviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const assetUrl = `/ava/homework-assets/${homeworkId}`;
  const values = useMemo(() => answersToMap(answers), [answers]);

  return (
    <details
      className="overflow-hidden rounded-lg border border-primary/20 bg-white"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 [&::-webkit-details-marker]:hidden">
        Visualizar resposta no arquivo
      </summary>
      {isOpen ? (
        <div className="border-t border-primary/10 bg-muted/20 p-3">
          <InteractiveHomeworkDocument
            assetMimeType={assetMimeType}
            assetUrl={assetUrl}
            expectedPageCount={assetPageCount}
            fields={fields}
            pageClassName="max-w-[760px]"
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

              return (
                <div
                  key={field.id}
                  aria-label={field.label ?? `Campo ${index + 1}`}
                  className="absolute overflow-hidden whitespace-pre-wrap rounded-[3px] px-1 text-sm font-semibold leading-5 text-primary"
                  style={style}
                >
                  {value}
                </div>
              );
            }}
            title={title}
          />
        </div>
      ) : null}
    </details>
  );
}
