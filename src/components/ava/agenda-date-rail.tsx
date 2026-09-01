"use client";

import React, { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type AgendaDateRailDay = {
  attendedCount: number;
  dateLabel: string;
  day: number;
  key: string;
  lessonCount: number;
  missedCount: number;
  pendingCount: number;
  weekdayLabel: string;
  weekdayLongLabel: string;
};

type AgendaDateRailProps = {
  days: AgendaDateRailDay[];
  onSelectDay: (dayKey: string) => void;
  selectedDayKey: string;
  todayKey: string;
};

function getLessonCountLabel(count: number) {
  if (count === 0) return "Sem aulas";
  return `${count} ${count === 1 ? "aula" : "aulas"}`;
}

export function AgendaDateRail({
  days,
  onSelectDay,
  selectedDayKey,
  todayKey,
}: AgendaDateRailProps) {
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedButtonRef.current?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
  }, [selectedDayKey]);

  return (
    <ol
      aria-label="Dias do mes"
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-0.5 pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const isSelected = day.key === selectedDayKey;
        const isToday = day.key === todayKey;

        return (
          <li key={day.key} className="shrink-0 snap-center">
            <button
              ref={isSelected ? selectedButtonRef : undefined}
              type="button"
              aria-current={isToday ? "date" : undefined}
              aria-label={`Selecionar ${day.weekdayLongLabel}, ${day.dateLabel}: ${getLessonCountLabel(day.lessonCount)}`}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex min-h-20 w-[4.35rem] touch-manipulation flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(65,42,76,0.2)]"
                  : "border-primary/15 bg-white text-primary shadow-sm hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.035] hover:shadow-md motion-reduce:hover:translate-y-0",
                isToday && !isSelected && "border-violet-400 ring-2 ring-violet-100",
              )}
              onClick={() => onSelectDay(day.key)}
            >
              <span
                className={cn(
                  "text-[0.64rem] font-bold uppercase tracking-[0.12em]",
                  isSelected ? "text-white/70" : "text-primary/55",
                )}
              >
                {day.weekdayLabel}
              </span>
              <strong className="mt-0.5 text-xl leading-none tabular-nums">
                {day.day}
              </strong>
              <span
                className={cn(
                  "mt-1 text-[0.66rem] font-semibold",
                  isSelected ? "text-white/80" : "text-muted-foreground",
                )}
              >
                {getLessonCountLabel(day.lessonCount)}
              </span>
              {day.lessonCount > 0 ? (
                <span aria-hidden="true" className="mt-1.5 flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 rounded-full bg-emerald-500",
                      day.attendedCount > 0 ? "w-3" : "w-1.5 opacity-25",
                    )}
                  />
                  <span
                    className={cn(
                      "h-1.5 rounded-full bg-red-500",
                      day.missedCount > 0 ? "w-3" : "w-1.5 opacity-25",
                    )}
                  />
                  <span
                    className={cn(
                      "h-1.5 rounded-full bg-amber-400",
                      day.pendingCount > 0 ? "w-3" : "w-1.5 opacity-25",
                    )}
                  />
                </span>
              ) : null}
              {isToday ? (
                <span
                  className={cn(
                    "absolute -top-2 rounded-full border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] shadow-sm",
                    isSelected
                      ? "border-white/30 bg-white text-primary"
                      : "border-violet-200 bg-violet-600 text-white",
                  )}
                >
                  Hoje
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
