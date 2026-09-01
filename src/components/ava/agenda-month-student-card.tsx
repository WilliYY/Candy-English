"use client";

import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AgendaMonthStudentCardProps = {
  attendedCount: number;
  initials: string;
  isSelected: boolean;
  missedCount: number;
  nextLessonLabel: string;
  onOpen: () => void;
  pendingCount: number;
  phone: string | null;
  scheduleLabel: string;
  studentName: string;
  unitLabel: string;
  unitToneClassName: string;
};

export function AgendaMonthStudentCard({
  attendedCount,
  initials,
  isSelected,
  missedCount,
  nextLessonLabel,
  onOpen,
  pendingCount,
  phone,
  scheduleLabel,
  studentName,
  unitLabel,
  unitToneClassName,
}: AgendaMonthStudentCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-primary/15 bg-white p-3 shadow-sm transition-colors",
        isSelected && "border-primary/35 bg-primary/[0.035]",
      )}
    >
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={onOpen}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm text-primary">
            {studentName}
          </strong>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {phone || "Sem telefone"}
          </span>
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-full border px-2 py-1 text-[0.68rem] font-bold",
            unitToneClassName,
          )}
        >
          {unitLabel}
        </span>
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-primary/10 py-3">
        <span className="text-center">
          <span className="block text-[0.62rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
            Vieram
          </span>
          <strong className="mt-1 block text-base text-emerald-800 tabular-nums">
            {attendedCount}
          </strong>
        </span>
        <span className="border-x border-primary/10 text-center">
          <span className="block text-[0.62rem] font-bold uppercase tracking-[0.08em] text-red-700">
            Faltas
          </span>
          <strong className="mt-1 block text-base text-red-800 tabular-nums">
            {missedCount}
          </strong>
        </span>
        <span className="text-center">
          <span className="block text-[0.62rem] font-bold uppercase tracking-[0.08em] text-amber-700">
            Confirmar
          </span>
          <strong className="mt-1 block text-base text-amber-900 tabular-nums">
            {pendingCount}
          </strong>
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 text-xs">
          <span className="block font-bold text-primary">{scheduleLabel}</span>
          <span className="mt-1 block text-muted-foreground">
            {nextLessonLabel}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className="h-11 shrink-0"
          onClick={onOpen}
        >
          {isSelected ? "Aberto" : "Abrir"}
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </article>
  );
}
