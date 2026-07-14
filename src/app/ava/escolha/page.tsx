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
      accent: "from-[#f8fdff] via-white to-[#ebfbff]",
      bar: "from-[#18a8c9] via-[#44c4a1] to-[#7c4dff]",
      cta: "Entrar no AVA",
      description:
        "Rotina pedagogica para aulas, materiais, homework, feedback, mensagens, Catty, Candy XP e alunos do AVA.",
      feature:
        "border-cyan-200/70 bg-white/86 text-cyan-950 shadow-[0_8px_20px_rgba(14,116,144,0.06)]",
      href: getPedagogicalAvaPath(session.user.role),
      icon: BookOpen,
      iconStyle:
        "bg-[#155e75] text-white shadow-[0_18px_30px_rgba(21,94,117,0.28)]",
      items: avaItems,
      label: "Area pedagogica",
      labelStyle: "border-cyan-200 bg-cyan-50 text-cyan-900",
      pulse: "Aulas, tarefas e progresso",
      stats: ["6 atalhos", "Foco pedagogico"],
      title: "AVA",
    },
    {
      accent: "from-[#fff8fb] via-white to-[#fff0df]",
      bar: "from-[#8b3fb6] via-[#e0528d] to-[#f59e0b]",
      cta: "Entrar na Secretaria",
      description:
        "Controle interno para pre-cadastros, financeiro, agenda, unidades, pagamentos, contratos administrativos e relatorios simples.",
      feature:
        "border-rose-200/70 bg-white/86 text-[#4b244e] shadow-[0_8px_20px_rgba(224,82,141,0.06)]",
      href: getSecretariaPath(session.user.role),
      icon: Building2,
      iconStyle:
        "bg-[#4b244e] text-white shadow-[0_18px_30px_rgba(75,36,78,0.28)]",
      items: secretariaItems,
      label: "Area administrativa",
      labelStyle: "border-rose-200 bg-rose-50 text-rose-900",
      pulse: "Controle, polos e financeiro",
      stats: ["4 modulos", "Controle interno"],
      title: "Secretaria",
    },
  ];

  return (
    <section className="min-h-screen w-full overflow-hidden bg-[linear-gradient(115deg,#fff7fb_0%,#ffffff_34%,#effcff_68%,#fff3e7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col justify-center gap-5 sm:gap-6">
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white/90 shadow-[0_24px_70px_rgba(65,42,76,0.12)]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#7c3aed,#06b6d4,#10b981,#f59e0b,#ec4899)]"
          />
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <span className="min-w-0">
              <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/15 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary shadow-sm">
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
            <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:min-w-96">
              {["Pedagogico", "Administrativo", "Candy English"].map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-primary/12 bg-[#fbf7ff] px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-primary/75 shadow-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {areas.map((area) => (
            <Link
              key={area.title}
              href={area.href}
              className="group relative flex min-h-[410px] overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_20px_58px_rgba(65,42,76,0.12)] transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_30px_70px_rgba(65,42,76,0.17)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <div
                className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${area.bar}`}
                aria-hidden="true"
              />
              <div
                className={`flex w-full flex-col bg-gradient-to-br ${area.accent} p-5 sm:p-6`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${area.iconStyle}`}
                  >
                    <area.icon aria-hidden="true" className="size-7" />
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${area.labelStyle}`}
                  >
                    {area.label}
                  </span>
                </div>

                <div className="mt-7">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/55">
                    {area.pulse}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal text-primary sm:text-4xl">
                    {area.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                    {area.description}
                  </p>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {area.items.map((item) => (
                    <span
                      key={item.label}
                      className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold leading-5 ${area.feature}`}
                    >
                      <item.icon
                        aria-hidden="true"
                        className="size-4 shrink-0 opacity-80"
                      />
                      <span className="min-w-0 break-words">{item.label}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:items-end sm:justify-between">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {area.stats.map((stat) => (
                      <span
                        key={stat}
                        className="rounded-lg border border-primary/10 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-primary/65"
                      >
                        {stat}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_12px_26px_rgba(65,42,76,0.22)] transition group-hover:bg-primary/90">
                    {area.cta}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
