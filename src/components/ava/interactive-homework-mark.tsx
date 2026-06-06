"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function getInteractiveHomeworkMarkStyle(): CSSProperties {
  return {
    fontSize: "clamp(0.7rem, min(72cqw, 82cqh), 1.15rem)",
    lineHeight: 1,
  };
}

export function InteractiveHomeworkMark({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none select-none font-black uppercase leading-none",
        className,
      )}
      style={getInteractiveHomeworkMarkStyle()}
    >
      X
    </span>
  );
}
