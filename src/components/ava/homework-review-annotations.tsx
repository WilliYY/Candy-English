"use client";

import type { PointerEvent } from "react";
import { useRef, useState } from "react";
import {
  getInteractiveHomeworkDrawingPath,
  type DrawingPoint,
  type DrawingStroke,
} from "@/components/ava/interactive-homework-drawing";
import { cn } from "@/lib/utils";

export const HOMEWORK_REVIEW_ANNOTATION_COLORS = [
  { id: "red", label: "Vermelho", value: "#dc2626" },
  { id: "black", label: "Preto", value: "#111827" },
  { id: "yellow", label: "Amarelo", value: "#ca8a04" },
  { id: "blue", label: "Azul", value: "#2563eb" },
  { id: "green", label: "Verde", value: "#16a34a" },
  { id: "purple", label: "Roxo", value: "#7c3aed" },
  { id: "white", label: "Branco", value: "#ffffff" },
] as const;

export type HomeworkReviewAnnotationColor =
  (typeof HOMEWORK_REVIEW_ANNOTATION_COLORS)[number]["id"];

export type HomeworkReviewStrokeAnnotation = {
  color: HomeworkReviewAnnotationColor;
  id: string;
  kind: "stroke";
  page: number;
  points: DrawingStroke;
  width: number;
};

export type HomeworkReviewTextAnnotation = {
  color: HomeworkReviewAnnotationColor;
  id: string;
  kind: "text";
  page: number;
  size: number;
  text: string;
  x: number;
  y: number;
};

export type HomeworkReviewAnnotationItem =
  | HomeworkReviewStrokeAnnotation
  | HomeworkReviewTextAnnotation;

export type HomeworkReviewAnnotations = {
  items: HomeworkReviewAnnotationItem[];
  version: 1;
};

type HomeworkReviewAnnotationTool = "pen" | "text";

const colorMap = new Map(
  HOMEWORK_REVIEW_ANNOTATION_COLORS.map((color) => [color.id, color.value]),
);

export const EMPTY_HOMEWORK_REVIEW_ANNOTATIONS: HomeworkReviewAnnotations = {
  items: [],
  version: 1,
};

function clampPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function clampPage(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(20, Math.max(1, Math.floor(value)));
}

function isAnnotationColor(value: unknown): value is HomeworkReviewAnnotationColor {
  return (
    typeof value === "string" &&
    HOMEWORK_REVIEW_ANNOTATION_COLORS.some((color) => color.id === value)
  );
}

function normalizePoint(point: unknown): DrawingPoint | null {
  if (
    !Array.isArray(point) ||
    typeof point[0] !== "number" ||
    typeof point[1] !== "number"
  ) {
    return null;
  }

  return [clampPercent(point[0]), clampPercent(point[1])];
}

export function normalizeHomeworkReviewAnnotations(
  value: unknown,
): HomeworkReviewAnnotations {
  if (typeof value !== "object" || value === null || !("items" in value)) {
    return EMPTY_HOMEWORK_REVIEW_ANNOTATIONS;
  }

  const rawItems = (value as { items?: unknown }).items;

  if (!Array.isArray(rawItems)) {
    return EMPTY_HOMEWORK_REVIEW_ANNOTATIONS;
  }

  const items = rawItems
    .slice(0, 120)
    .map((item, index): HomeworkReviewAnnotationItem | null => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const color = isAnnotationColor(candidate.color) ? candidate.color : "red";
      const id =
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id.slice(0, 80)
          : `annotation-${index}`;
      const page = clampPage(candidate.page);

      if (candidate.kind === "stroke" && Array.isArray(candidate.points)) {
        const points = candidate.points
          .slice(0, 240)
          .map(normalizePoint)
          .filter((point): point is DrawingPoint => Boolean(point));

        if (points.length === 0) {
          return null;
        }

        return {
          color,
          id,
          kind: "stroke",
          page,
          points,
          width:
            typeof candidate.width === "number"
              ? Math.min(12, Math.max(1, candidate.width))
              : 4,
        };
      }

      if (candidate.kind === "text" && typeof candidate.text === "string") {
        const text = candidate.text.trim().slice(0, 400);

        if (!text) {
          return null;
        }

        return {
          color,
          id,
          kind: "text",
          page,
          size:
            typeof candidate.size === "number"
              ? Math.min(36, Math.max(12, candidate.size))
              : 18,
          text,
          x: clampPercent(candidate.x),
          y: clampPercent(candidate.y),
        };
      }

      return null;
    })
    .filter((item): item is HomeworkReviewAnnotationItem => Boolean(item));

  return {
    items,
    version: 1,
  };
}

function getPointerPoint(
  event: PointerEvent<HTMLElement>,
): DrawingPoint | null {
  const rect = event.currentTarget.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return [
    clampPercent(((event.clientX - rect.left) / rect.width) * 100),
    clampPercent(((event.clientY - rect.top) / rect.height) * 100),
  ];
}

function annotationId() {
  return `review-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function HomeworkReviewAnnotationLayer({
  annotations,
  className,
  color = "red",
  editable = false,
  onChange,
  pageNumber,
  strokeWidth = 4,
  textValue = "",
  tool = "pen",
}: {
  annotations: HomeworkReviewAnnotations;
  className?: string;
  color?: HomeworkReviewAnnotationColor;
  editable?: boolean;
  onChange?: (annotations: HomeworkReviewAnnotations) => void;
  pageNumber: number;
  strokeWidth?: number;
  textValue?: string;
  tool?: HomeworkReviewAnnotationTool;
}) {
  const activePointer = useRef<number | null>(null);
  const [draftPoints, setDraftPoints] = useState<DrawingStroke | null>(null);
  const pageItems = annotations.items.filter((item) => item.page === pageNumber);

  function commitStroke(points: DrawingStroke) {
    if (points.length === 0 || !onChange) {
      return;
    }

    onChange({
      items: [
        ...annotations.items,
        {
          color,
          id: annotationId(),
          kind: "stroke",
          page: pageNumber,
          points,
          width: strokeWidth,
        },
      ],
      version: 1,
    });
  }

  function addText(point: DrawingPoint) {
    const text = textValue.trim();

    if (!text || !onChange) {
      return;
    }

    onChange({
      items: [
        ...annotations.items,
        {
          color,
          id: annotationId(),
          kind: "text",
          page: pageNumber,
          size: 18,
          text,
          x: point[0],
          y: point[1],
        },
      ],
      version: 1,
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!editable || !onChange) {
      return;
    }

    const point = getPointerPoint(event);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (tool === "text") {
      addText(point);
      return;
    }

    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraftPoints([point]);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (
      !editable ||
      tool !== "pen" ||
      activePointer.current !== event.pointerId
    ) {
      return;
    }

    const point = getPointerPoint(event);

    if (!point) {
      return;
    }

    setDraftPoints((current) => (current ? [...current, point].slice(-240) : null));
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== event.pointerId) {
      return;
    }

    activePointer.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDraftPoints((current) => {
      if (current) {
        commitStroke(current);
      }

      return null;
    });
  }

  return (
    <div
      aria-label={editable ? "Anotar correcao" : "Anotacoes da correcao"}
      className={cn(
        "absolute inset-0 z-30",
        editable ? "pointer-events-auto touch-none" : "pointer-events-none",
        tool === "text" && editable ? "cursor-text" : "cursor-crosshair",
        className,
      )}
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-visible"
        viewBox="0 0 100 100"
      >
        {pageItems
          .filter((item): item is HomeworkReviewStrokeAnnotation => item.kind === "stroke")
          .map((item) => {
            const strokeColor = colorMap.get(item.color) ?? colorMap.get("red");

            if (item.points.length === 1) {
              const [x, y] = item.points[0];

              return (
                <circle
                  key={item.id}
                  cx={x}
                  cy={y}
                  fill={strokeColor}
                  r={item.width / 2}
                />
              );
            }

            return (
              <path
                key={item.id}
                d={getInteractiveHomeworkDrawingPath(item.points)}
                fill="none"
                stroke={strokeColor}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={item.width}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        {draftPoints && draftPoints.length === 1 ? (
          <circle
            cx={draftPoints[0][0]}
            cy={draftPoints[0][1]}
            fill={colorMap.get(color) ?? colorMap.get("red")}
            r={strokeWidth / 2}
          />
        ) : draftPoints ? (
          <path
            d={getInteractiveHomeworkDrawingPath(draftPoints)}
            fill="none"
            stroke={colorMap.get(color) ?? colorMap.get("red")}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {pageItems
        .filter((item): item is HomeworkReviewTextAnnotation => item.kind === "text")
        .map((item) => (
          <div
            key={item.id}
            className="absolute max-w-[42%] rounded-md border bg-white/88 px-2 py-1 font-bold leading-snug shadow-[0_6px_18px_rgba(44,19,56,0.16)] backdrop-blur-sm"
            style={{
              backgroundColor:
                item.color === "white" ? "rgba(17,24,39,0.78)" : undefined,
              borderColor: colorMap.get(item.color) ?? colorMap.get("red"),
              color: colorMap.get(item.color) ?? colorMap.get("red"),
              fontSize: `${item.size}px`,
              left: `${item.x}%`,
              top: `${item.y}%`,
            }}
          >
            {item.text}
          </div>
        ))}
    </div>
  );
}
