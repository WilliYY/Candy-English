"use client";

import {
  ChevronDown,
  CircleAlert,
  KeyRound,
  MapPin,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import React, { type ReactNode, useMemo, useState } from "react";

import type {
  AdminUserPoloTone,
  AdminUserPoloUnit,
} from "@/lib/admin-user-polo";
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
  poloLabel: string;
  poloTone: AdminUserPoloTone;
  poloUnits: AdminUserPoloUnit[];
  profileSummary: string;
  role: Role;
};

type RoleFilter = "ALL" | Role;
type PoloFilter = "ALL" | AdminUserPoloUnit | "NONE";

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

const poloStyles: Record<AdminUserPoloTone, string> = {
  all: "border-violet-200 bg-violet-50 text-violet-800",
  ivate: "border-cyan-200 bg-cyan-50 text-cyan-800",
  douradina: "border-amber-200 bg-amber-50 text-amber-900",
  multiple: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  none: "border-slate-200 bg-slate-50 text-slate-600",
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function filterAdminUsersSheetRows(
  rows: AdminUsersSheetRow[],
  {
    poloFilter,
    query,
    roleFilter,
  }: {
    poloFilter: PoloFilter;
    query: string;
    roleFilter: RoleFilter;
  },
) {
  const normalizedQuery = normalizeSearchText(query.trim());

  return rows.filter((row) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      normalizeSearchText(
        [
          row.name,
          row.email,
          row.phone ?? "",
          row.profileSummary,
          row.attentionLabel,
          row.poloLabel,
          roleLabels[row.role],
        ].join(" "),
      ).includes(normalizedQuery);
    const matchesRole = roleFilter === "ALL" || row.role === roleFilter;
    const matchesPolo =
      poloFilter === "ALL" ||
      (poloFilter === "NONE"
        ? row.poloUnits.length === 0
        : row.poloUnits.includes(poloFilter));

    return matchesQuery && matchesRole && matchesPolo;
  });
}

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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [poloFilter, setPoloFilter] = useState<PoloFilter>("ALL");

  const orderedRows = useMemo(
    () =>
      [...rows].sort(
        (left, right) =>
          roleOrder[left.role] - roleOrder[right.role] ||
          left.name.localeCompare(right.name, "pt-BR"),
      ),
    [rows],
  );

  const visibleRows = useMemo(() => {
    return filterAdminUsersSheetRows(orderedRows, {
      poloFilter,
      query,
      roleFilter,
    });
  }, [orderedRows, poloFilter, query, roleFilter]);

  const hasActiveFilters =
    query.trim().length > 0 || roleFilter !== "ALL" || poloFilter !== "ALL";

  function clearFilters() {
    setQuery("");
    setRoleFilter("ALL");
    setPoloFilter("ALL");
  }

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
        <span
          aria-live="polite"
          className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold"
        >
          {visibleRows.length} de {orderedRows.length} linha(s)
        </span>
      </div>

      <div className="grid gap-3 border-b border-primary/10 bg-[#fcfafc] p-3 lg:grid-cols-[minmax(16rem,1fr)_auto_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-primary/70">
          Buscar na base
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/45"
            />
            <input
              className="h-10 w-full rounded-md border border-primary/15 bg-white pl-9 pr-3 text-sm font-normal text-foreground outline-none transition focus:border-primary/35 focus:ring-2 focus:ring-primary/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nome, e-mail ou telefone"
              type="search"
              value={query}
            />
          </span>
        </label>

        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-xs font-semibold text-primary/70">
            Role
          </legend>
          <div className="inline-flex min-h-10 flex-wrap rounded-md border border-primary/15 bg-white p-1">
            {(
              [
                ["ALL", "Todos"],
                ["ADMIN", "Admins"],
                ["TEACHER", "Teachers"],
                ["STUDENT", "Alunos"],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-pressed={roleFilter === value}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
                  roleFilter === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary/65 hover:bg-primary/5 hover:text-primary",
                )}
                key={value}
                onClick={() => setRoleFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex min-w-0 items-end gap-2">
          <label className="grid min-w-52 flex-1 gap-1.5 text-xs font-semibold text-primary/70">
            Polo
            <select
              className="h-10 rounded-md border border-primary/15 bg-white px-3 text-sm font-normal text-foreground outline-none transition focus:border-primary/35 focus:ring-2 focus:ring-primary/10"
              onChange={(event) =>
                setPoloFilter(event.target.value as PoloFilter)
              }
              value={poloFilter}
            >
              <option value="ALL">Todos os polos</option>
              <option value="IVATE">Polo 1 · Ivaté</option>
              <option value="DOURADINA">Polo 2 · Douradina</option>
              <option value="NONE">Sem polo vinculado</option>
            </select>
          </label>
          {hasActiveFilters ? (
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-white text-primary/65 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              onClick={clearFilters}
              title="Limpar filtros"
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Limpar filtros</span>
            </button>
          ) : null}
        </div>
      </div>

      <div
        aria-label="Planilha de usuarios com rolagem horizontal"
        className="overflow-x-auto"
        role="region"
        tabIndex={0}
      >
        <div className="min-w-[1520px]">
          <div className="grid grid-cols-[3rem_minmax(18rem,1.35fr)_7rem_6.5rem_11.5rem_minmax(18rem,1fr)_minmax(12rem,0.9fr)_minmax(12rem,0.9fr)_8rem_7.5rem] border-b border-primary/10 bg-[#f7f1f8] text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary/55">
            <span className="px-3 py-2.5 text-center">#</span>
            <span className="px-3 py-2.5">Nome completo</span>
            <span className="px-3 py-2.5">Role</span>
            <span className="px-3 py-2.5">Status</span>
            <span className="px-3 py-2.5">Polo</span>
            <span className="px-3 py-2.5">Contato</span>
            <span className="px-3 py-2.5">Perfil</span>
            <span className="px-3 py-2.5">Sinal</span>
            <span className="px-3 py-2.5">Cadastro</span>
            <span className="sticky right-0 bg-[#f7f1f8] px-3 py-2.5 text-center shadow-[-10px_0_16px_-16px_rgba(65,42,76,0.5)]">
              Ações
            </span>
          </div>

          <div className="divide-y divide-primary/10">
            {visibleRows.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center bg-white px-6 text-center">
                <div className="max-w-sm">
                  <p className="font-semibold text-primary">
                    Nenhum usuário encontrado.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajuste a busca ou limpe os filtros para ver toda a base.
                  </p>
                  <button
                    className="mt-3 rounded-md border border-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                    onClick={clearFilters}
                    type="button"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
            ) : (
              visibleRows.map((row, index) => {
              const detailStyles = roleDetailStyles[row.role];

              return (
                <details
                  className="group/sheet-row bg-white open:bg-primary/[0.025]"
                  key={row.id}
                >
                  <summary
                    aria-label={`Abrir detalhes e acoes de ${row.name}, ${roleLabels[row.role]}, ${row.isActive ? "ativo" : "inativo"}, ${row.poloLabel}, ${row.attentionLabel}`}
                    className="grid min-h-16 cursor-pointer list-none grid-cols-[3rem_minmax(18rem,1.35fr)_7rem_6.5rem_11.5rem_minmax(18rem,1fr)_minmax(12rem,0.9fr)_minmax(12rem,0.9fr)_8rem_7.5rem] items-center text-sm transition-colors hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25 [&::-webkit-details-marker]:hidden"
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
                      <span className="min-w-0 py-2">
                        <strong className="block whitespace-normal break-words font-semibold leading-5 text-primary">
                          {row.name}
                        </strong>
                        <span className="mt-0.5 block break-all text-xs leading-4 text-muted-foreground">
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
                    <span className="min-w-0 px-3">
                      <span
                        className={cn(
                          "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold",
                          poloStyles[row.poloTone],
                        )}
                        title={row.poloLabel}
                      >
                        <MapPin
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span className="whitespace-normal text-left leading-4">
                          {row.poloLabel}
                        </span>
                      </span>
                    </span>
                    <span className="min-w-0 px-3 text-xs text-muted-foreground">
                      <span className="block break-all leading-4" title={row.email}>
                        {row.email}
                      </span>
                      <span
                        className="mt-1 block whitespace-normal break-words leading-4"
                        title={row.phone ?? ""}
                      >
                        {row.phone ?? "Sem telefone"}
                      </span>
                    </span>
                    <span className="whitespace-normal break-words px-3 py-2 text-xs font-medium leading-4 text-foreground/80">
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
                        <span className="whitespace-normal text-left leading-4">
                          {row.attentionLabel}
                        </span>
                      </span>
                    </span>
                    <span className="px-3 text-xs text-muted-foreground">
                      {row.createdAtLabel}
                    </span>
                    <span className="sticky right-0 flex self-stretch items-center justify-center gap-1 bg-white px-3 text-xs font-semibold text-primary shadow-[-10px_0_16px_-16px_rgba(65,42,76,0.5)] group-open/sheet-row:bg-[#fcfafc]">
                      Gerenciar
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 transition-transform group-open/sheet-row:rotate-180 motion-reduce:transition-none"
                      />
                    </span>
                  </summary>

                  <div className="border-t border-primary/10 bg-[#fcfafc] p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-lg border border-primary/15 bg-white p-3 shadow-sm">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                          Identificação
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold leading-5 text-primary">
                          {row.name}
                        </p>
                        <p className="mt-1 break-all text-xs leading-4 text-muted-foreground">
                          {row.email}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-muted-foreground">
                          {row.phone ?? "Sem telefone"}
                        </p>
                      </div>
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
                          poloStyles[row.poloTone],
                        )}
                      >
                        <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/55">
                          <MapPin aria-hidden="true" className="size-3.5" />
                          Polo
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground/85">
                          {row.poloLabel}
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
                          Histórico rápido
                        </p>
                        <ul className="mt-2 grid gap-1.5 text-sm leading-5 text-foreground/85">
                          {row.history.map((item) => (
                            <li className="flex items-start gap-2" key={`${row.id}-${item}`}>
                              <span
                                aria-hidden="true"
                                className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-45"
                              />
                              <span className="break-words">{item}</span>
                            </li>
                          ))}
                        </ul>
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
                        <p className="flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-5 text-violet-900">
                          <KeyRound
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                          <span>
                            <strong>Senha protegida.</strong> A senha atual não é
                            exibida. Use a redefinição para gerar uma senha
                            temporária segura.
                          </span>
                        </p>
                        {row.accessActions}
                      </div>
                    </div>
                  </div>
                </details>
              );
              })
            )}
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
