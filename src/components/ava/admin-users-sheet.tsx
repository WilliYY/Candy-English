import { ChevronDown, CircleAlert, UsersRound } from "lucide-react";
import React, { type ReactNode } from "react";

import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

export type AdminUsersSheetRow = {
  accessActions: ReactNode;
  attentionClassName: string;
  attentionLabel: string;
  contactActions: ReactNode;
  createdAtLabel: string;
  email: string;
  history: string[];
  id: string;
  initials: string;
  isActive: boolean;
  name: string;
  phone: string | null;
  profileSummary: string;
  role: Role;
};

const roleOrder: Record<Role, number> = {
  ADMIN: 0,
  TEACHER: 1,
  STUDENT: 2,
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Aluno",
};

const roleStyles: Record<Role, string> = {
  ADMIN: "border-amber-200 bg-amber-50 text-amber-900",
  TEACHER: "border-pink-200 bg-pink-50 text-pink-800",
  STUDENT: "border-sky-200 bg-sky-50 text-sky-800",
};

const roleDetailStyles: Record<
  Role,
  { history: string; profile: string }
> = {
  ADMIN: {
    history: "border-amber-200/80 bg-amber-50/70",
    profile: "border-amber-200/70 bg-amber-50/60",
  },
  TEACHER: {
    history: "border-pink-200/80 bg-pink-50/70",
    profile: "border-pink-200/70 bg-pink-50/60",
  },
  STUDENT: {
    history: "border-sky-200/80 bg-sky-50/70",
    profile: "border-sky-200/70 bg-sky-50/60",
  },
};

export function AdminUsersSheet({ rows }: { rows: AdminUsersSheetRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="ava-soft-card flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <UsersRound aria-hidden="true" className="size-5" />
        </span>
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-primary">
            Nenhum usuario cadastrado ainda.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use as opcoes da lateral para criar o primeiro acesso do AVA.
          </p>
        </div>
      </div>
    );
  }

  const orderedRows = [...rows].sort(
    (left, right) =>
      roleOrder[left.role] - roleOrder[right.role] ||
      left.name.localeCompare(right.name, "pt-BR"),
  );

  return (
    <section
      aria-labelledby="admin-users-sheet-title"
      className="min-w-0 overflow-hidden rounded-lg border border-primary/15 bg-white shadow-[0_18px_46px_rgba(65,42,76,0.08)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/15 bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary-foreground/65">
            Base operacional
          </p>
          <h2
            className="mt-0.5 text-base font-semibold"
            id="admin-users-sheet-title"
          >
            Planilha de usuarios
          </h2>
        </div>
        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
          {orderedRows.length} linha(s)
        </span>
      </div>

      <div
        aria-label="Planilha de usuarios com rolagem horizontal"
        className="overflow-x-auto"
        role="region"
        tabIndex={0}
      >
        <div className="min-w-[1040px]">
          <div className="grid grid-cols-[3rem_minmax(13rem,1.5fr)_7.5rem_7rem_minmax(12rem,1.15fr)_minmax(10rem,1fr)_minmax(9rem,0.85fr)_7.5rem_4.5rem] border-b border-primary/10 bg-[#f7f1f8] text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary/55">
            <span className="px-3 py-2.5 text-center">#</span>
            <span className="px-3 py-2.5">Usuario</span>
            <span className="px-3 py-2.5">Role</span>
            <span className="px-3 py-2.5">Status</span>
            <span className="px-3 py-2.5">Contato</span>
            <span className="px-3 py-2.5">Perfil</span>
            <span className="px-3 py-2.5">Sinal</span>
            <span className="px-3 py-2.5">Cadastro</span>
            <span className="px-3 py-2.5 text-center">Acao</span>
          </div>

          <div className="divide-y divide-primary/10">
            {orderedRows.map((row, index) => {
              const detailStyles = roleDetailStyles[row.role];

              return (
                <details
                  className="group/sheet-row bg-white open:bg-primary/[0.025]"
                  key={row.id}
                >
                  <summary
                    aria-label={`Abrir detalhes e acoes de ${row.name}, ${roleLabels[row.role]}, ${row.isActive ? "ativo" : "inativo"}, ${row.attentionLabel}`}
                    className="grid min-h-16 cursor-pointer list-none grid-cols-[3rem_minmax(13rem,1.5fr)_7.5rem_7rem_minmax(12rem,1.15fr)_minmax(10rem,1fr)_minmax(9rem,0.85fr)_7.5rem_4.5rem] items-center text-sm transition-colors hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25 [&::-webkit-details-marker]:hidden"
                  >
                    <span className="px-3 text-center font-mono text-xs text-primary/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 items-center gap-2.5 px-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                          roleStyles[row.role],
                        )}
                      >
                        {row.initials}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate font-semibold text-primary">
                          {row.name}
                        </strong>
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.email}
                        </span>
                      </span>
                    </span>
                    <span className="px-3">
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
                          roleStyles[row.role],
                        )}
                      >
                        {roleLabels[row.role]}
                      </span>
                    </span>
                    <span className="px-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold",
                          row.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-50 text-slate-700",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-1.5 rounded-full",
                            row.isActive ? "bg-emerald-500" : "bg-slate-400",
                          )}
                        />
                        {row.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </span>
                    <span className="min-w-0 px-3 text-xs text-muted-foreground">
                      <span className="block truncate" title={row.email}>
                        {row.email}
                      </span>
                      <span
                        className="mt-0.5 block truncate"
                        title={row.phone ?? ""}
                      >
                        {row.phone ?? "Sem telefone"}
                      </span>
                    </span>
                    <span className="truncate px-3 text-xs font-medium text-foreground/80">
                      {row.profileSummary}
                    </span>
                    <span className="px-3">
                      <span
                        className={cn(
                          "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold",
                          row.attentionClassName,
                        )}
                      >
                        <CircleAlert
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate">{row.attentionLabel}</span>
                      </span>
                    </span>
                    <span className="px-3 text-xs text-muted-foreground">
                      {row.createdAtLabel}
                    </span>
                    <span className="flex items-center justify-center gap-1 px-3 text-xs font-semibold text-primary">
                      Abrir
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 transition-transform group-open/sheet-row:rotate-180 motion-reduce:transition-none"
                      />
                    </span>
                  </summary>

                  <div className="border-t border-primary/10 bg-[#fcfafc] p-4">
                    <div className="grid gap-3 lg:grid-cols-3">
                      <div
                        className={cn(
                          "rounded-lg border p-3 shadow-sm",
                          detailStyles.profile,
                        )}
                      >
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                          Perfil
                        </p>
                        <p className="mt-1 text-sm text-foreground/85">
                          {row.profileSummary}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-lg border p-3 shadow-sm",
                          row.attentionClassName,
                        )}
                      >
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                          Sinal
                        </p>
                        <p className="mt-1 text-sm text-foreground/85">
                          {row.attentionLabel}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-lg border p-3 shadow-sm",
                          detailStyles.history,
                        )}
                      >
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                          Historico rapido
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-foreground/85">
                          {row.history.join(" · ")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {row.contactActions}
                      <div
                        aria-label={`Acoes de acesso de ${row.name}`}
                        className={cn(
                          "grid content-start gap-3 rounded-lg border border-primary/10 bg-white p-3 shadow-sm",
                          !row.contactActions ? "lg:col-span-2" : null,
                        )}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/55">
                          Acoes de acesso
                        </p>
                        {row.accessActions}
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
      <p className="border-t border-primary/10 bg-primary/[0.025] px-4 py-2.5 text-xs text-muted-foreground">
        No celular, deslize para os lados. Abra uma linha para editar contato,
        acesso ou senha.
      </p>
    </section>
  );
}
