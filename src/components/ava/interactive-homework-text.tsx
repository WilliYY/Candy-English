"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type InteractiveTextKind = "LONG_TEXT" | "SHORT_TEXT";

const adaptiveTextStyles = {
  LONG_TEXT: {
    fontSize: "clamp(9px, min(18cqh, 7cqw), 18px)",
    lineHeight: "1.22",
  },
  SHORT_TEXT: {
    fontSize: "clamp(9px, min(62cqh, 14cqw), 22px)",
    lineHeight: "1",
  },
} satisfies Record<InteractiveTextKind, CSSProperties>;

export function getInteractiveHomeworkTextStyle(kind: InteractiveTextKind) {
  return adaptiveTextStyles[kind];
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
