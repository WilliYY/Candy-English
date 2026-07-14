import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  FileText,
  KeyRound,
  LockKeyhole,
  Settings,
  UserCheck,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { requireAvaRole } from "@/lib/authorization";
import {
  canAccessSecretariaFeature,
  ROLE_LABELS,
  SECRETARIA_PERMISSION_MATRIX,
  type Role,
  type SecretariaAccessScope,
  type SecretariaFeature,
} from "@/lib/roles";

export const metadata: Metadata = {
  title: "Secretaria",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SecretariaCard = {
  adminHref: string;
  description: string;
  feature: SecretariaFeature;
  icon: typeof UserCheck;
  label: string;
  teacherHref?: string;
  title: string;
};

const secretariaCards: SecretariaCard[] = [
  {
    adminHref: "/ava/admin?task=aceitar-alunos",
    description: "Revise interessados, acompanhe status e converta em aluno.",
    feature: "pre-registrations",
    icon: UserCheck,
    label: "Entrada de alunos",
    teacherHref: "/ava/teacher?task=aceitar-alunos",
    title: "Pre-cadastros",
  },
  {
    adminHref: "/ava/admin?task=financeiro",
    description: "Mensalidades, unidades, parcelas, pagamentos e gastos da loja.",
    feature: "finance",
    icon: WalletCards,
    label: "Controle interno",
    title: "Financeiro",
  },
  {
    adminHref: "/ava/admin?task=agenda",
    description: "Agenda interna de 2026, presenca, faltas e reposicoes.",
    feature: "agenda",
    icon: CalendarCheck2,
    label: "Rotina interna",
    title: "Agenda",
  },
  {
    adminHref: "/ava/admin?task=contratos",
    description: "Contratos PDF administrativos e arquivos protegidos.",
    feature: "contracts",
    icon: FileText,
    label: "Arquivos",
    teacherHref: "/ava/teacher?task=contratos",
    title: "Contratos",
  },
  {
    adminHref: "/ava/admin?task=criar-admin",
    description: "Contas administrativas e organizacao da equipe interna.",
    feature: "administration",
    icon: UserPlus,
    label: "Gestao",
    title: "Administracao",
  },
  {
    adminHref: "/ava/admin?task=apis-senhas",
    description: "Credenciais externas, manutencao e configuracoes protegidas.",
    feature: "credentials",
    icon: KeyRound,
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

function getCardHref(card: SecretariaCard, role: Role) {
  return role === "TEACHER" ? card.teacherHref ?? card.adminHref : card.adminHref;
}

export default async function SecretariaPage() {
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER"],
    "/ava/secretaria",
  );
  const permission = SECRETARIA_PERMISSION_MATRIX[session.user.role];
  const cards = secretariaCards.filter((card) =>
    canAccessSecretariaFeature(session.user.role, card.feature),
  );
  const permissionHighlights =
    session.user.role === "ADMIN"
      ? [
          "Todas as unidades",
          "Todos os pre-cadastros",
          "Financeiro, agenda e gastos",
          "Relatorios simples",
        ]
      : [
          "Pre-cadastros proprios ou atribuidos",
          "Conversao para sua teacher",
          "Contratos permitidos",
          "Sem financeiro geral nem gastos",
        ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-[0_20px_60px_rgba(65,42,76,0.1)]">
        <div className="bg-gradient-to-r from-[#f6e6ff] via-white to-[#fce5d8]/80 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <span className="min-w-0">
              <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/15 bg-white/82 px-3 py-2 text-sm font-semibold text-primary">
                <Settings aria-hidden="true" className="size-4" />
                Secretaria - {ROLE_LABELS[session.user.role]}
              </span>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-primary md:text-5xl">
                Secretaria Candy
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                Controle interno separado da rotina pedagogica. Use esta area
                para pre-cadastros, financeiro, agenda, contratos e registros
                administrativos permitidos para sua role.
              </p>
            </span>
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <LockKeyhole aria-hidden="true" className="size-7" />
            </span>
          </div>
        </div>
      </div>

      {session.user.role === "TEACHER" ? (
        <div className="rounded-lg border border-primary/15 bg-white/82 px-4 py-3 text-sm font-semibold text-muted-foreground shadow-sm">
          Financeiro, agenda interna, APIs e configuracoes seguem exclusivos de
          Admin.
        </div>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-primary/12 bg-white/86 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {permissionHighlights.map((item) => (
          <span
            key={item}
            className="rounded-lg border border-primary/10 bg-[#fbf7ff] px-3 py-2 text-sm font-semibold text-primary/78"
          >
            {item}
          </span>
        ))}
        <span className="rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm font-semibold text-muted-foreground sm:col-span-2 lg:col-span-4">
          Escopo: pre-cadastros {scopeLabels[permission.preRegistrations]},
          financeiro {scopeLabels[permission.finance]}, agenda{" "}
          {scopeLabels[permission.agenda]}.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const href = getCardHref(card, session.user.role);

          return (
            <Link
              key={href}
              href={href}
              className="group flex min-h-52 flex-col justify-between rounded-2xl border border-primary/15 bg-white p-5 shadow-[0_16px_42px_rgba(65,42,76,0.09)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_54px_rgba(65,42,76,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <span>
                <span className="flex items-start justify-between gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="rounded-full border border-primary/12 bg-[#fbf7ff] px-2.5 py-1 text-xs font-bold uppercase text-primary/70">
                    {card.label}
                  </span>
                </span>
                <strong className="mt-5 block text-xl text-primary">
                  {card.title}
                </strong>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                  {card.description}
                </span>
              </span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                Abrir
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
