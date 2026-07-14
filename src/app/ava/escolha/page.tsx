import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  Sparkles,
  UserCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { requireAvaRole } from "@/lib/authorization";
import {
  getPedagogicalAvaPath,
  getSecretariaPath,
  ROLE_LABELS,
} from "@/lib/roles";

export const metadata: Metadata = {
  title: "Escolha sua area",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const avaItems = [
  { icon: BookOpen, label: "Aulas e materiais" },
  { icon: ClipboardCheck, label: "Homework e correcoes" },
  { icon: MessageSquareText, label: "Mensagens pedagogicas" },
  { icon: Sparkles, label: "Candy XP" },
  { icon: BrainCircuit, label: "Catty" },
  { icon: UsersRound, label: "Alunos do AVA" },
];

const secretariaItems = [
  { icon: UserCheck, label: "Pre-cadastros" },
  { icon: WalletCards, label: "Financeiro e gastos" },
  { icon: CalendarCheck2, label: "Agenda interna" },
  { icon: FileText, label: "Contratos administrativos" },
];

export default async function AvaAreaChoicePage() {
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER", "STUDENT"],
    "/ava/escolha",
  );

  if (session.user.role === "STUDENT") {
    redirect("/ava/student");
  }

  const areas = [
    {
      accent: "from-[#fff7fb] via-white to-[#eef9ff]",
      cta: "Entrar no AVA",
      description:
        "Rotina pedagogica para aulas, materiais, homework, feedback, mensagens, Catty, Candy XP e alunos do AVA.",
      href: getPedagogicalAvaPath(session.user.role),
      icon: BookOpen,
      items: avaItems,
      label: "Area pedagogica",
      title: "AVA",
    },
    {
      accent: "from-[#f6e6ff] via-white to-[#fce5d8]/80",
      cta: "Entrar na Secretaria",
      description:
        "Controle interno para pre-cadastros, financeiro, agenda, unidades, pagamentos, contratos administrativos e relatorios simples.",
      href: getSecretariaPath(session.user.role),
      icon: Building2,
      items: secretariaItems,
      label: "Area administrativa",
      title: "Secretaria",
    },
  ];

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 bg-background px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="rounded-2xl border border-primary/15 bg-white/84 p-5 shadow-[0_20px_60px_rgba(65,42,76,0.1)] sm:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <span className="min-w-0">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/15 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              {ROLE_LABELS[session.user.role]}
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-normal text-primary md:text-5xl">
              Escolha sua area
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Separe a rotina pedagogica do controle interno antes de abrir as
              tarefas do dia.
            </p>
          </span>
          <span className="w-fit rounded-full border border-primary/12 bg-[#fbf7ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
            Candy English
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {areas.map((area) => (
          <Link
            key={area.title}
            href={area.href}
            className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-[0_18px_48px_rgba(65,42,76,0.1)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_26px_60px_rgba(65,42,76,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <div className={`bg-gradient-to-br ${area.accent} p-5 sm:p-6`}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <area.icon aria-hidden="true" className="size-7" />
                </span>
                <span className="rounded-full border border-primary/12 bg-white/80 px-3 py-1 text-xs font-bold uppercase text-primary">
                  {area.label}
                </span>
              </div>
              <div className="mt-8">
                <h2 className="text-3xl font-semibold tracking-normal text-primary">
                  {area.title}
                </h2>
                <p className="mt-3 min-h-20 text-sm leading-6 text-muted-foreground sm:text-base">
                  {area.description}
                </p>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {area.items.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-primary/10 bg-white/78 px-3 py-2 text-sm font-semibold text-primary/80"
                  >
                    <item.icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                ))}
              </div>
              <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition group-hover:bg-primary/90">
                {area.cta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
