"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { TINY_TEXT_MAX_LENGTH } from "@/lib/interactive-homework-fields";
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

const tinyTextStyle = {
  fontSize: "clamp(12px, min(78cqh, 34cqw), 26px)",
  lineHeight: "1",
  textTransform: "uppercase",
} satisfies CSSProperties;

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function getInteractiveHomeworkTextStyle(kind: InteractiveTextKind) {
  return adaptiveTextStyles[kind];
}

export function getInteractiveHomeworkTinyTextStyle() {
  return tinyTextStyle;
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

  return clampNumber(Math.floor(availableHeight / lineHeight), 1, 120);
}

export function InteractiveHomeworkTextLineGuide({
  className,
  kind,
  selected = false,
  showCount = false,
  variant = "editor",
}: {
  className?: string;
  kind: InteractiveTextKind;
  selected?: boolean;
  showCount?: boolean;
  variant?: "editor" | "student";
}) {
  const guideRef = useRef<HTMLSpanElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const guideElement = guideRef.current;

    if (!guideElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    function updateLineCount() {
      if (!guideElement) {
        return;
      }

      const rect = guideElement.getBoundingClientRect();

      setLineCount(
        getInteractiveHomeworkTextLineCount(kind, {
          height: rect.height,
          width: rect.width,
        }),
      );
    }

    updateLineCount();

    const resizeObserver = new ResizeObserver(updateLineCount);
    resizeObserver.observe(guideElement);

    return () => resizeObserver.disconnect();
  }, [kind]);

  const isStudentVariant = variant === "student";
  const lineHeight =
    kind === "LONG_TEXT"
      ? `${adaptiveTextMetrics.LONG_TEXT.lineHeight}em`
      : `${adaptiveTextMetrics.SHORT_TEXT.lineHeight}em`;
  const lines = Array.from({ length: lineCount });

  return (
    <span
      ref={guideRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 block overflow-hidden rounded-[3px] px-[0.3em] py-[0.2em] transition-colors duration-200",
        selected
          ? "bg-white/50 text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"
          : isStudentVariant
            ? "bg-white/5 text-primary/45"
            : "text-primary/62",
        className,
      )}
      style={getInteractiveHomeworkTextStyle(kind)}
    >
      <span className="absolute inset-x-[0.3em] top-[0.2em] flex flex-col">
        {lines.map((_, index) => (
          <span
            key={index}
            className={cn(
              "relative block border-b border-dashed",
              selected
                ? "border-primary/50"
                : isStudentVariant
                  ? "border-primary/18"
                  : "border-primary/30",
            )}
            style={{ height: lineHeight }}
          >
            {isStudentVariant ? null : (
              <span
                className={cn(
                  "absolute left-0 top-0 font-semibold leading-none",
                  selected ? "text-primary/62" : "text-primary/42",
                )}
              >
                texto
              </span>
            )}
          </span>
        ))}
      </span>
      {showCount ? (
        <span className="absolute right-1 top-1 rounded-[3px] border border-white/70 bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground shadow-[0_4px_12px_rgba(65,42,76,0.22)]">
          {lineCount} {lineCount === 1 ? "linha" : "linhas"}
        </span>
      ) : null}
    </span>
  );
}

export function InteractiveHomeworkTinyTextPreview({
  className,
  selected = false,
  value = "A",
  variant = "editor",
}: {
  className?: string;
  selected?: boolean;
  value?: string;
  variant?: "editor" | "review";
}) {
  const text = value.trim().slice(0, TINY_TEXT_MAX_LENGTH) || "A";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none flex size-full items-center justify-center rounded-[3px] border text-center font-extrabold uppercase leading-none shadow-sm",
        selected
          ? "border-primary bg-white/70 text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"
          : variant === "review"
            ? "border-primary/18 bg-white/35 text-primary"
            : "border-primary/35 bg-white/50 text-primary/80",
        className,
      )}
      style={getInteractiveHomeworkTinyTextStyle()}
    >
      {text}
    </span>
  );
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
