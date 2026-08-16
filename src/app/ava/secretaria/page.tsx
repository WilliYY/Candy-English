import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  ClipboardList,
  FileText,
  KeyRound,
  LockKeyhole,
  MapPin,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { AvaWorkspaceShell } from "@/components/ava/ava-workspace-shell";
import { buildAvaCallbackUrl } from "@/lib/ava-callback-url";
import { requireAvaRole } from "@/lib/authorization";
import {
  canAccessSecretariaFeature,
  ROLE_LABELS,
  SECRETARIA_PERMISSION_MATRIX,
  type Role,
  type SecretariaAccessScope,
  type SecretariaFeature,
} from "@/lib/roles";
import {
  SECRETARIA_UNIT_FILTER_OPTIONS,
  SECRETARIA_UNIT_LABELS,
  normalizeSecretariaUnitFilter,
  withSecretariaUnitParam,
} from "@/lib/secretaria-unit-filter";

export const metadata: Metadata = {
  title: "Secretaria",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SecretariaCard = {
  adminHref: string;
  accentClassName: string;
  barClassName: string;
  badgeClassName: string;
  description: string;
  feature: SecretariaFeature;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  teacherHref?: string;
  title: string;
};

const secretariaCards: SecretariaCard[] = [
  {
    adminHref: "/ava/admin?task=aceitar-alunos",
    accentClassName: "from-sky-50 via-white to-cyan-50",
    barClassName: "from-sky-500 via-cyan-400 to-emerald-400",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-900",
    description: "Revise interessados, acompanhe status e converta em aluno.",
    feature: "pre-registrations",
    icon: UserCheck,
    iconClassName: "bg-sky-600 text-white shadow-sky-900/20",
    label: "Entrada de alunos",
    teacherHref: "/ava/teacher?task=aceitar-alunos",
    title: "Pre-cadastros",
  },
  {
    adminHref: "/ava/admin?task=agenda",
    accentClassName: "from-amber-50 via-white to-orange-50",
    barClassName: "from-amber-500 via-orange-400 to-rose-400",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-900",
    description: "Agenda interna de 2026, presenca, faltas e reposicoes.",
    feature: "agenda",
    icon: CalendarCheck2,
    iconClassName: "bg-amber-500 text-white shadow-amber-900/20",
    label: "Rotina interna",
    title: "Agenda",
  },
  {
    adminHref: "/ava/admin?task=contratos",
    accentClassName: "from-violet-50 via-white to-fuchsia-50",
    barClassName: "from-violet-500 via-fuchsia-400 to-pink-400",
    badgeClassName: "border-violet-200 bg-violet-50 text-violet-900",
    description: "Contratos PDF administrativos e arquivos protegidos.",
    feature: "contracts",
    icon: FileText,
    iconClassName: "bg-violet-600 text-white shadow-violet-900/20",
    label: "Arquivos",
    teacherHref: "/ava/teacher?task=contratos",
    title: "Contratos",
  },
  {
    adminHref: "/ava/admin?task=criar-admin",
    accentClassName: "from-rose-50 via-white to-pink-50",
    barClassName: "from-rose-500 via-pink-400 to-purple-400",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-900",
    description: "Contas administrativas e organizacao da equipe interna.",
    feature: "administration",
    icon: UserPlus,
    iconClassName: "bg-rose-600 text-white shadow-rose-900/20",
    label: "Gestao",
    title: "Administracao",
  },
  {
    adminHref: "/ava/admin?task=apis-senhas",
    accentClassName: "from-slate-50 via-white to-indigo-50",
    barClassName: "from-slate-600 via-indigo-500 to-cyan-500",
    badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-900",
    description: "Credenciais externas, manutencao e configuracoes protegidas.",
    feature: "credentials",
    icon: KeyRound,
    iconClassName: "bg-slate-700 text-white shadow-slate-900/20",
    label: "Sistema",
    title: "APIs e senhas",
  },
];

const scopeLabels: Record<SecretariaAccessScope, string> = {
  ALL: "total",
  NECESSARY_ONLY: "necessario",
  NONE: "sem acesso",
  OWN_OR_ASSIGNED: "proprio/atribuido",
};

type SecretariaPageProps = {
  searchParams?: Promise<{
    unit?: string | string[];
  }>;
};

function getCardHref(card: SecretariaCard, role: Role) {
  return role === "TEACHER" ? card.teacherHref ?? card.adminHref : card.adminHref;
}

function getSecretariaFilterHref(value: string) {
  return value === "all" ? "/ava/secretaria" : `/ava/secretaria?unit=${value}`;
}

function getUnitFilterClassName(value: string, isActive: boolean) {
  if (isActive) {
    if (value === "IVATE") {
      return "border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-900/20";
    }

    if (value === "DOURADINA") {
      return "border-rose-500 bg-rose-600 text-white shadow-md shadow-rose-900/20";
    }

    return "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20";
  }

  if (value === "IVATE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-white";
  }

  if (value === "DOURADINA") {
    return "border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-300 hover:bg-white";
  }

  return "border-primary/15 bg-[#fbf7ff] text-primary/75 hover:border-primary/30 hover:bg-white";
}

export default async function SecretariaPage({ searchParams }: SecretariaPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER"],
    buildAvaCallbackUrl("/ava/secretaria", params, ["unit"]),
  );
  const unitFilter = normalizeSecretariaUnitFilter(params?.unit);
  const unitLabel = SECRETARIA_UNIT_LABELS[unitFilter];
  const permission = SECRETARIA_PERMISSION_MATRIX[session.user.role];
  const cards = secretariaCards.filter((card) =>
    canAccessSecretariaFeature(session.user.role, card.feature),
  );
  const permissionHighlights =
    session.user.role === "ADMIN"
      ? [
          {
            className: "border-violet-200 bg-violet-50 text-violet-900",
            icon: Building2,
            label: "Todas as unidades",
          },
          {
            className: "border-sky-200 bg-sky-50 text-sky-900",
            icon: UserCheck,
            label: "Todos os pre-cadastros",
          },
          {
            className: "border-emerald-200 bg-emerald-50 text-emerald-900",
            icon: WalletCards,
            label: "Agenda e gestao interna",
          },
          {
            className: "border-amber-200 bg-amber-50 text-amber-900",
            icon: ClipboardList,
            label: "Relatorios simples",
          },
        ]
      : [
          {
            className: "border-sky-200 bg-sky-50 text-sky-900",
            icon: UserCheck,
            label: "Pre-cadastros proprios ou atribuidos",
          },
          {
            className: "border-emerald-200 bg-emerald-50 text-emerald-900",
            icon: UserPlus,
            label: "Conversao para sua teacher",
          },
          {
            className: "border-violet-200 bg-violet-50 text-violet-900",
            icon: FileText,
            label: "Contratos permitidos",
          },
          {
            className: "border-amber-200 bg-amber-50 text-amber-900",
            icon: ShieldCheck,
            label: "Sem financeiro geral nem gastos",
          },
        ];

  return (
    <AvaWorkspaceShell area="SECRETARIA" unitFilter={unitFilter}>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="secretaria-hero-panel relative overflow-hidden rounded-xl border border-primary/15 bg-[linear-gradient(115deg,#fff7ff_0%,#ffffff_42%,#fff1df_100%)] p-5 shadow-[0_24px_70px_rgba(65,42,76,0.13)] sm:p-7">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#7c3aed,#ec4899,#f59e0b,#10b981,#06b6d4)]"
          />
          <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <span className="min-w-0">
              <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/15 bg-white/84 px-3 py-2 text-sm font-semibold text-primary shadow-sm">
                <Settings aria-hidden="true" className="size-4" />
                Secretaria - {ROLE_LABELS[session.user.role]}
              </span>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-primary md:text-5xl">
                Secretaria Candy
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                Controle interno separado da rotina pedagogica. Use esta area
                para pre-cadastros, agenda, contratos e registros
                administrativos permitidos para sua role.
              </p>
            </span>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[26rem] lg:grid-cols-1">
              <span className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-3 text-violet-900 shadow-sm">
                <LockKeyhole aria-hidden="true" className="size-4 shrink-0" />
                <strong className="text-sm">Area protegida</strong>
              </span>
              <span className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-900 shadow-sm">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                <strong className="text-sm">{unitLabel}</strong>
              </span>
              <span className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900 shadow-sm">
                <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                <strong className="text-sm">
                  {session.user.role === "ADMIN" ? "Acesso total" : "Acesso limitado"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="secretaria-filter-panel overflow-hidden rounded-xl border border-primary/12 bg-[linear-gradient(115deg,#ffffff_0%,#f7fdff_48%,#fff8ec_100%)] shadow-[0_18px_46px_rgba(65,42,76,0.09)]">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <MapPin aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary/55">
                  Filtro de polo
                </span>
                <strong className="mt-1 block text-lg text-primary">
                  Filtro atual: {unitLabel}
                </strong>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  Use este filtro para abrir pre-cadastros e agenda ja no
                  escopo do polo selecionado.
                </span>
              </span>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0 lg:pb-0">
              {SECRETARIA_UNIT_FILTER_OPTIONS.map((option) => {
                const isActive = option.value === unitFilter;

                return (
                  <Link
                    key={option.value}
                    href={getSecretariaFilterHref(option.value)}
                    aria-current={isActive ? "page" : undefined}
                    className={`secretaria-filter-chip inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold transition ${getUnitFilterClassName(option.value, isActive)}`}
                    title={option.description}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {session.user.role === "TEACHER" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
            Financeiro, agenda interna, APIs e configuracoes seguem exclusivos
            de Admin.
          </div>
        ) : null}

        <div className="secretaria-permission-strip grid gap-3 rounded-xl border border-primary/12 bg-white/88 p-4 shadow-[0_16px_42px_rgba(65,42,76,0.08)] sm:grid-cols-2 lg:grid-cols-4">
          {permissionHighlights.map((item) => {
            const ItemIcon = item.icon;

            return (
              <span
                key={item.label}
                className={`flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm ${item.className}`}
              >
                <ItemIcon aria-hidden="true" className="size-4 shrink-0" />
                {item.label}
              </span>
            );
          })}
          <span className="rounded-lg border border-primary/10 bg-[linear-gradient(90deg,#fbf7ff,#ffffff,#f7fdff)] px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm sm:col-span-2 lg:col-span-4">
            Escopo: pre-cadastros {scopeLabels[permission.preRegistrations]} e
            agenda {scopeLabels[permission.agenda]}. O Financeiro fica em uma
            area propria, exclusiva do Admin.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const href = withSecretariaUnitParam(
              getCardHref(card, session.user.role),
              unitFilter,
            );

            return (
              <Link
                key={href}
                href={href}
                className="secretaria-module-card group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_16px_42px_rgba(65,42,76,0.09)] transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_28px_62px_rgba(65,42,76,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.barClassName}`}
                />
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 bg-gradient-to-br ${card.accentClassName}`}
                />
                <span className="relative z-10 flex h-full flex-col justify-between p-5">
                  <span>
                    <span className="flex items-start justify-between gap-3">
                      <span
                        className={`secretaria-module-card-icon flex size-12 shrink-0 items-center justify-center rounded-xl shadow-lg ${card.iconClassName}`}
                      >
                        <card.icon aria-hidden="true" className="size-5" />
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${card.badgeClassName}`}
                      >
                        {card.label}
                      </span>
                    </span>
                    <strong className="mt-5 block text-2xl text-primary">
                      {card.title}
                    </strong>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {card.description}
                    </span>
                    <span className="mt-4 inline-flex rounded-full border border-primary/10 bg-white/72 px-3 py-1 text-xs font-bold text-primary/65 shadow-sm">
                      {unitLabel}
                    </span>
                  </span>
                  <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_12px_24px_rgba(65,42,76,0.18)] transition group-hover:bg-primary/90">
                    Abrir modulo
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition group-hover:translate-x-0.5"
                    />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </AvaWorkspaceShell>
  );
}
