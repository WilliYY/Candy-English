"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import React, { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type UsersViewMode = "cards" | "sheet";

export function AdminUsersView({
  cards,
  sheet,
}: {
  cards: ReactNode;
  sheet: ReactNode;
}) {
  const [view, setView] = useState<UsersViewMode>("sheet");

  return (
    <section
      aria-labelledby="admin-users-view-title"
      className="grid min-w-0 gap-3"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/10 bg-white/80 p-3 shadow-sm">
        <div className="min-w-0">
          <p
            className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55"
            id="admin-users-view-title"
          >
            Visualizacao da base
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Alterne sem perder os detalhes e as acoes dos usuarios.
          </p>
        </div>

        <div
          aria-label="Escolher visualizacao dos usuarios"
          className="inline-flex rounded-lg border border-primary/10 bg-primary/[0.035] p-1"
          role="group"
        >
          <button
            aria-pressed={view === "sheet"}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              view === "sheet"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-primary/70 hover:bg-white hover:text-primary",
            )}
            onClick={() => setView("sheet")}
            type="button"
          >
            <Table2 aria-hidden="true" className="size-4" />
            Planilha
          </button>
          <button
            aria-pressed={view === "cards"}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              view === "cards"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-primary/70 hover:bg-white hover:text-primary",
            )}
            onClick={() => setView("cards")}
            type="button"
          >
            <LayoutGrid aria-hidden="true" className="size-4" />
            Cartoes
          </button>
        </div>
      </div>

      <div className="min-w-0">
        {view === "sheet" ? sheet : cards}
      </div>
    </section>
  );
}
