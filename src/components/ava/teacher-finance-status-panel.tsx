import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Info,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import type {
  TeacherFinanceRow,
  TeacherFinanceStatus,
} from "@/lib/teacher-finance";
import {
  TEACHER_FINANCE_MONTHS,
  TEACHER_FINANCE_YEAR,
} from "@/lib/teacher-finance";
import {
  SECRETARIA_UNIT_FILTER_OPTIONS,
  type SecretariaUnitFilter,
} from "@/lib/secretaria-unit-filter";
import { cn } from "@/lib/utils";

type TeacherFinanceStatusPanelProps = {
  month: number;
  rows: TeacherFinanceRow[];
  unitFilter: SecretariaUnitFilter;
};

const statusMeta: Record<
  TeacherFinanceStatus,
  {
    badge: string;
    icon: typeof CheckCircle2;
    label: string;
    row: string;
  }
> = {
  INACTIVE: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    icon: Info,
    label: "Inativo neste mes",
    row: "border-slate-200 bg-slate-50/75",
  },
  INCOMPLETE: {
    badge: "border-violet-200 bg-violet-50 text-violet-800",
    icon: Info,
    label: "Cadastro a completar",
    row: "border-violet-200 bg-violet-50/55",
  },
  OVERDUE: {
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    icon: TriangleAlert,
    label: "Em atraso",
    row: "border-rose-200 bg-rose-50/65",
  },
  PAID: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
    label: "Pago",
    row: "border-emerald-200 bg-emerald-50/65",
  },
  PENDING: {
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
    label: "Pendente",
    row: "border-amber-200 bg-amber-50/65",
  },
};

const unitMeta = {
  DOURADINA: {
    accent: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-900",
    label: "Polo 2 - Douradina",
    section: "border-sky-200 bg-sky-50/30",
  },
  IVATE: {
    accent: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
    label: "Polo 1 - Ivate",
    section: "border-emerald-200 bg-emerald-50/30",
  },
} as const;

function buildHref(month: number, unitFilter: SecretariaUnitFilter) {
  const params = new URLSearchParams({
    month: String(month),
    task: "financeiro",
  });

  if (unitFilter !== "all") {
    params.set("unit", unitFilter);
  }

  return `/ava/teacher?${params.toString()}`;
}

function formatPaidAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getTimeline(row: TeacherFinanceRow) {
  if (row.status === "PAID") {
    const paidAt = formatPaidAt(row.paidAt);
    return paidAt ? `Confirmado em ${paidAt}` : "Pagamento confirmado";
  }

  if (row.status === "INCOMPLETE") {
    return "A Secretaria ainda precisa completar o cadastro";
  }

  if (row.status === "INACTIVE") {
    return "Sem cobranca ativa nesta competencia";
  }

  return row.paymentDay ? `Vencimento no dia ${row.paymentDay}` : "Sem vencimento";
}

export function TeacherFinanceStatusPanel({
  month,
  rows,
  unitFilter,
}: TeacherFinanceStatusPanelProps) {
  const counts = rows.reduce(
    (total, row) => ({
      ...total,
      [row.status]: total[row.status] + 1,
    }),
    {
      INACTIVE: 0,
      INCOMPLETE: 0,
      OVERDUE: 0,
      PAID: 0,
      PENDING: 0,
    } satisfies Record<TeacherFinanceStatus, number>,
  );
  const previousMonth = month === 1 ? 12 : month - 1;
  const nextMonth = month === 12 ? 1 : month + 1;

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-lg border border-cyan-200 bg-[linear-gradient(110deg,#ecfeff_0%,#ffffff_46%,#f0fdf4_100%)] shadow-sm">
        <div className="h-1 bg-[linear-gradient(90deg,#0891b2,#10b981,#f59e0b)]" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-cyan-700 text-white shadow-lg shadow-cyan-900/15">
              <GraduationCap aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase text-cyan-800">
                Visao protegida da teacher
              </p>
              <h2 className="mt-1 text-xl font-bold text-primary">
                Acompanhamento de mensalidades
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Consulte somente a situacao mensal dos alunos vinculados a voce.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Dados financeiros restritos
          </span>
        </div>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        <span className="flex items-start gap-2">
          <Info aria-hidden="true" className="mt-1 size-4 shrink-0" />
          <span>
            Esta tela nao mostra valores, formas de pagamento, gastos, vendas,
            contatos, observacoes ou exportacoes. Alteracoes financeiras continuam
            exclusivas do Admin.
          </span>
        </span>
      </div>

      <section className="rounded-lg border border-primary/12 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-primary/10 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase text-primary/65">
              <CalendarDays aria-hidden="true" className="size-4" />
              Competencia
            </span>
            <strong className="mt-1 block text-lg text-primary">
              {TEACHER_FINANCE_MONTHS[month - 1]} de {TEACHER_FINANCE_YEAR}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={buildHref(previousMonth, unitFilter)}
              aria-label="Mes anterior"
              className="flex size-10 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary shadow-sm transition-colors hover:bg-primary/5"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href={buildHref(nextMonth, unitFilter)}
              aria-label="Proximo mes"
              className="flex size-10 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary shadow-sm transition-colors hover:bg-primary/5"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto p-3 [scrollbar-width:thin]">
          {TEACHER_FINANCE_MONTHS.map((label, index) => {
            const itemMonth = index + 1;
            const active = itemMonth === month;

            return (
              <Link
                key={label}
                href={buildHref(itemMonth, unitFilter)}
                className={cn(
                  "flex min-w-24 shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-center text-xs font-bold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-primary/10 bg-white text-primary hover:border-primary/25 hover:bg-primary/5",
                )}
              >
                {label.slice(0, 3)}
                <span className={cn("mt-0.5 text-[0.65rem]", active ? "text-white/75" : "text-muted-foreground")}>
                  {TEACHER_FINANCE_YEAR}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { className: "border-cyan-200 bg-cyan-50 text-cyan-950", label: "Alunos vinculados", value: rows.length },
          { className: "border-emerald-200 bg-emerald-50 text-emerald-950", label: "Pagos", value: counts.PAID },
          { className: "border-amber-200 bg-amber-50 text-amber-950", label: "Pendentes", value: counts.PENDING },
          { className: "border-rose-200 bg-rose-50 text-rose-950", label: "Em atraso", value: counts.OVERDUE },
        ].map((item) => (
          <div key={item.label} className={cn("min-w-0 rounded-lg border p-4 shadow-sm", item.className)}>
            <span className="text-xs font-extrabold uppercase opacity-70">{item.label}</span>
            <strong className="mt-1 block text-2xl">{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-primary/12 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-primary">Filtrar por polo</h3>
            <p className="text-sm text-muted-foreground">Somente alunos vinculados permanecem visiveis.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SECRETARIA_UNIT_FILTER_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={buildHref(month, option.value)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                  unitFilter === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/12 bg-white text-primary hover:bg-primary/5",
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-cyan-200 bg-cyan-50/55 px-5 py-10 text-center">
          <UserRound aria-hidden="true" className="mx-auto size-7 text-cyan-700" />
          <strong className="mt-3 block text-primary">Nenhum aluno vinculado nesta selecao</strong>
          <p className="mt-1 text-sm text-muted-foreground">Troque o polo ou confirme os vinculos dos alunos.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {(["IVATE", "DOURADINA"] as const).map((unit) => {
            const unitRows = rows.filter((row) => row.unit === unit);
            const meta = unitMeta[unit];

            if (unitRows.length === 0) {
              return null;
            }

            return (
              <section key={unit} className={cn("overflow-hidden rounded-lg border", meta.section)}>
                <div className="relative flex items-center justify-between gap-3 border-b border-current/10 bg-white/80 px-4 py-3">
                  <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", meta.accent)} />
                  <span className="flex min-w-0 items-center gap-2 pl-2 font-bold text-primary">
                    <MapPin aria-hidden="true" className="size-4 shrink-0" />
                    {meta.label}
                  </span>
                  <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold", meta.badge)}>
                    {unitRows.length} aluno(s)
                  </span>
                </div>

                <div className="grid gap-2 p-3">
                  {unitRows.map((row) => {
                    const metaStatus = statusMeta[row.status];
                    const StatusIcon = metaStatus.icon;

                    return (
                      <article
                        key={row.id}
                        className={cn(
                          "grid min-h-20 gap-3 rounded-lg border px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4",
                          metaStatus.row,
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white text-sm font-extrabold text-primary shadow-sm">
                            {row.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate font-bold text-primary">{row.name}</h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">{getTimeline(row)}</p>
                          </div>
                        </div>
                        <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", metaStatus.badge)}>
                          <StatusIcon aria-hidden="true" className="size-3.5" />
                          {metaStatus.label}
                        </span>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
