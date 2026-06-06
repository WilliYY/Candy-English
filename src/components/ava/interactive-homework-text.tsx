"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type InteractiveTextKind = "LONG_TEXT" | "SHORT_TEXT";

const adaptiveTextMetrics = {
  LONG_TEXT: {
    heightFactor: 0.42,
    lineHeight: 1.22,
    maxFontSize: 20,
    minFontSize: 10,
    verticalPaddingFactor: 0.4,
    widthFactor: 0.052,
  },
  SHORT_TEXT: {
    heightFactor: 0.72,
    lineHeight: 1,
    maxFontSize: 22,
    minFontSize: 10,
    verticalPaddingFactor: 0,
    widthFactor: 0.13,
  },
} satisfies Record<
  InteractiveTextKind,
  {
    heightFactor: number;
    lineHeight: number;
    maxFontSize: number;
    minFontSize: number;
    verticalPaddingFactor: number;
    widthFactor: number;
  }
>;

const adaptiveTextStyles = {
  LONG_TEXT: {
    fontSize: "clamp(10px, min(42cqh, 5.2cqw), 20px)",
    lineHeight: String(adaptiveTextMetrics.LONG_TEXT.lineHeight),
  },
  SHORT_TEXT: {
    fontSize: "clamp(10px, min(72cqh, 13cqw), 22px)",
    lineHeight: String(adaptiveTextMetrics.SHORT_TEXT.lineHeight),
  },
} satisfies Record<InteractiveTextKind, CSSProperties>;

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function getInteractiveHomeworkTextStyle(kind: InteractiveTextKind) {
  return adaptiveTextStyles[kind];
}

export function getInteractiveHomeworkTextLineCount(
  kind: InteractiveTextKind,
  box: { height: number; width: number },
) {
  const metrics = adaptiveTextMetrics[kind];
  const fontSize = clampNumber(
    Math.min(
      box.height * metrics.heightFactor,
      box.width * metrics.widthFactor,
    ),
    metrics.minFontSize,
    metrics.maxFontSize,
  );
  const lineHeight = fontSize * metrics.lineHeight;
  const verticalPadding = fontSize * metrics.verticalPaddingFactor;
  const availableHeight = Math.max(0, box.height - verticalPadding);

  return clampNumber(Math.floor(availableHeight / lineHeight), 1, 12);
}

export function InteractiveHomeworkTextFrame({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style: CSSProperties;
}) {
  return (
    <div
      className={cn("absolute", className)}
      style={{
        ...style,
        containerType: "size",
      }}
    >
      {children}
    </div>
  );
}
