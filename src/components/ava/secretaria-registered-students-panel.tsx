"use client";

import {
  CalendarCheck2,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Search,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminStudentContactEditForm } from "@/components/ava/admin-operations";
import { Input } from "@/components/ui/input";
import type { SecretariaUnitFilter } from "@/lib/secretaria-unit-filter";
import { cn } from "@/lib/utils";

type FinancialUnit = "IVATE" | "DOURADINA";

export type SecretariaRegisteredStudentRow = {
  email: string;
  hasAgendaRecord: boolean;
  hasFinancialRecord: boolean;
  isActive: boolean;
  level: string | null;
  name: string;
  origin: "DIRECT" | "PRE_REGISTRATION";
  phone: string | null;
  teacherNames: string[];
  unit: FinancialUnit;
  userId: string | null;
};

type SecretariaRegisteredStudentsPanelProps = {
  students: SecretariaRegisteredStudentRow[];
  unitFilter: SecretariaUnitFilter;
  viewerRole: "ADMIN" | "TEACHER";
};

const unitMeta: Record<
  FinancialUnit,
  { badge: string; card: string; label: string; shortLabel: string }
> = {
  DOURADINA: {
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    card: "border-rose-200/80 bg-gradient-to-br from-white via-white to-rose-50/70",
    label: "Polo 2 - Douradina",
    shortLabel: "Polo 2",
  },
  IVATE: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    card: "border-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/70",
    label: "Polo 1 - Ivate",
    shortLabel: "Polo 1",
  },
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@.]+/g, " ")
    .trim();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "A"}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

function IntegrationStatus({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  const Icon = complete ? CheckCircle2 : CircleAlert;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-black uppercase",
        complete
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

export function SecretariaRegisteredStudentsPanel({
  students,
  unitFilter,
  viewerRole,
}: SecretariaRegisteredStudentsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = normalizeSearch(searchTerm);
  const visibleStudents = useMemo(() => {
    if (!normalizedSearch) {
      return students;
    }

    return students.filter((student) =>
      normalizeSearch(
        [
          student.name,
          student.email,
          student.phone ?? "",
          student.level ?? "",
          student.teacherNames.join(" "),
          unitMeta[student.unit].label,
        ].join(" "),
      ).includes(normalizedSearch),
    );
  }, [normalizedSearch, students]);
  const directCount = students.filter((student) => student.origin === "DIRECT").length;
  const pendingOperations = students.filter(
    (student) => !student.hasFinancialRecord || !student.hasAgendaRecord,
  ).length;
  const currentScope =
    unitFilter === "all" ? "Todos os polos" : unitMeta[unitFilter].label;

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white/95 shadow-lg shadow-violet-900/5">
      <div className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.98),rgba(255,255,255,0.98),rgba(236,253,245,0.88))] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white shadow-md shadow-violet-700/20">
              <UsersRound aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-violet-700">
                Cadastro unico
              </span>
              <h3 className="mt-1 text-xl font-black text-primary">Alunos cadastrados</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Alunos criados no Admin e alunos convertidos aparecem juntos, sem duplicar o cadastro.
              </p>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center xl:min-w-[24rem]">
            <span className="rounded-xl border border-violet-200 bg-white px-3 py-2">
              <strong className="block text-lg font-black text-violet-800">{students.length}</strong>
              <small className="text-[0.65rem] font-bold uppercase text-muted-foreground">alunos</small>
            </span>
            <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
              <strong className="block text-lg font-black text-sky-800">{directCount}</strong>
              <small className="text-[0.65rem] font-bold uppercase text-sky-800/70">diretos</small>
            </span>
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <strong className="block text-lg font-black text-amber-800">{pendingOperations}</strong>
              <small className="text-[0.65rem] font-bold uppercase text-amber-800/70">a completar</small>
            </span>
          </div>
        </div>

        <label className="relative mt-4 block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-700" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-11 border-violet-200 bg-white pl-10 shadow-sm focus-visible:ring-violet-400"
            placeholder="Buscar aluno, email, telefone, nivel ou teacher..."
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{visibleStudents.length} aluno(s) encontrado(s)</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary/75">
            <MapPin aria-hidden="true" className="size-3.5" />
            {currentScope}
          </span>
        </div>
      </div>

      {visibleStudents.length === 0 ? (
        <div className="grid min-h-52 place-items-center p-6 text-center">
          <div>
            <Search aria-hidden="true" className="mx-auto size-7 text-violet-300" />
            <p className="mt-3 font-bold text-primary">Nenhum aluno encontrado.</p>
            <p className="mt-1 text-sm text-muted-foreground">Revise a busca ou o filtro de polo.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2 sm:p-5">
          {visibleStudents.map((student) => {
            const meta = unitMeta[student.unit];
            const teacherLabel =
              student.teacherNames.length > 0
                ? student.teacherNames.join(", ")
                : "Teacher ainda nao vinculada";

            return (
              <article
                key={student.email}
                className={cn(
                  "relative min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  meta.card,
                )}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#7c3aed,#0ea5e9,#10b981,#f59e0b)]" />
                <div className="flex min-w-0 items-start gap-3 pt-1">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary font-black text-white shadow-md shadow-primary/20">
                    {getInitials(student.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="min-w-0 truncate text-base font-black text-primary">{student.name}</h4>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[0.65rem] font-black uppercase", meta.badge)}>
                        {meta.shortLabel}
                      </span>
                      <span className={cn(
                        "rounded-full border px-2 py-0.5 text-[0.65rem] font-black uppercase",
                        student.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-100 text-slate-700",
                      )}>
                        {student.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {student.origin === "PRE_REGISTRATION"
                        ? "Convertido pela Secretaria"
                        : "Criado diretamente no AVA"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <span className="inline-flex min-w-0 items-center gap-2 text-primary/80">
                    <Mail aria-hidden="true" className="size-4 shrink-0 text-violet-600" />
                    <span className="truncate">{student.email}</span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-2 text-primary/80">
                    <GraduationCap aria-hidden="true" className="size-4 shrink-0 text-sky-600" />
                    <span className="truncate">{student.level || "Nivel a definir"}</span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-2 text-primary/80 sm:col-span-2">
                    <UserRound aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
                    <span className="truncate">{teacherLabel}</span>
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-y border-primary/10 py-3">
                  <IntegrationStatus complete label="AVA pronto" />
                  <IntegrationStatus
                    complete={student.hasFinancialRecord}
                    label={student.hasFinancialRecord ? "Financeiro ligado" : "Financeiro pendente"}
                  />
                  <IntegrationStatus
                    complete={student.hasAgendaRecord}
                    label={student.hasAgendaRecord ? "Agenda ligada" : "Agenda pendente"}
                  />
                </div>

                {viewerRole === "ADMIN" && student.userId ? (
                  <div className="mt-4 grid gap-3">
                    <AdminStudentContactEditForm
                      email={student.email}
                      phone={student.phone}
                      unit={student.unit}
                      userId={student.userId}
                      userName={student.name}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/ava/admin?task=financeiro&unit=${student.unit}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
                      >
                        <WalletCards aria-hidden="true" className="size-4" />
                        Financeiro
                      </Link>
                      <Link
                        href={`/ava/admin?task=agenda&unit=${student.unit}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-black text-sky-800 transition hover:bg-sky-100"
                      >
                        <CalendarCheck2 aria-hidden="true" className="size-4" />
                        Agenda
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Link2 aria-hidden="true" className="size-4" />
                    Cadastro vinculado ao seu AVA. Edicao administrativa fica com o Admin.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
