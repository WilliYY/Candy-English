import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WalletCards,
} from "lucide-react";
import { BrandLogo } from "@/components/site/brand-logo";
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
  { icon: ClipboardCheck, label: "Homework" },
  { icon: MessageSquareText, label: "Mensagens" },
  { icon: Sparkles, label: "Catty e Candy XP" },
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

  const isAdmin = session.user.role === "ADMIN";

  const areas = [
    {
      accent: "from-[#f8fdff] via-white to-[#ebfbff]",
      bar: "from-[#18a8c9] via-[#44c4a1] to-[#7c4dff]",
      cta: "Entrar no AVA",
      description:
        "Rotina pedagogica para aulas, materiais, homework, feedback e progresso dos alunos.",
      details: isAdmin
        ? [
            "Usuarios, teachers, alunos, aulas e progresso no mesmo fluxo.",
            "Catty, mensagens e Candy XP ficam junto da rotina pedagogica.",
          ]
        : [
            "Aulas, homework, feedback e mensagens dos seus alunos.",
            "Catty e Candy XP acompanham o progresso pedagogico.",
          ],
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
      stats: ["Pedagogico", isAdmin ? "Admin AVA" : "Meus alunos"],
      title: "AVA",
    },
    {
      accent: "from-[#fff8fb] via-white to-[#fff0df]",
      bar: "from-[#8b3fb6] via-[#e0528d] to-[#f59e0b]",
      cta: "Entrar na Secretaria",
      description:
        "Controle interno para pre-cadastros, agenda, contratos e rotina administrativa permitida.",
      details: isAdmin
        ? [
            "Pre-cadastros, financeiro, agenda e contratos administrativos.",
            "Controle por polos sem misturar a rotina pedagogica.",
          ]
        : [
            "Pre-cadastros proprios ou atribuidos, com conversao segura.",
            "Acesso limitado para proteger financeiro geral e outros polos.",
          ],
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
      stats: ["Interno", isAdmin ? "Todos os polos" : "Limitado"],
      title: "Secretaria",
    },
  ];

  return (
    <section className="min-h-screen w-full overflow-hidden bg-[linear-gradient(115deg,#fff7fb_0%,#ffffff_34%,#effcff_68%,#fff3e7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center gap-4 sm:gap-5">
        <div className="flex justify-center">
          <BrandLogo
            className="h-20 w-[16rem] justify-center overflow-visible rounded-none"
            imageClassName="w-[250px] drop-shadow-[0_18px_32px_rgba(65,42,76,0.18)]"
            markClassName="overflow-visible"
          />
        </div>

        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white/92 shadow-[0_20px_58px_rgba(65,42,76,0.11)]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#7c3aed,#06b6d4,#10b981,#f59e0b,#ec4899)]"
          />
          <div className="flex flex-col items-center gap-4 px-5 py-5 text-center sm:px-7 sm:py-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/15 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary shadow-sm">
              <ShieldCheck aria-hidden="true" className="size-4" />
              {ROLE_LABELS[session.user.role]}
            </span>
            <span className="min-w-0">
              <h1 className="text-3xl font-semibold leading-none tracking-normal text-primary md:text-4xl">
                Escolha sua area
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Primeiro escolha o ambiente certo para abrir as tarefas do dia
                sem misturar rotina pedagogica e controle interno.
              </p>
            </span>
            <div className="grid w-full max-w-2xl min-w-0 gap-2 sm:grid-cols-3">
              {[
                { icon: GraduationCap, label: "Pedagogico" },
                { icon: Layers3, label: "Administrativo" },
                { icon: Sparkles, label: "Candy English" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-primary/12 bg-[#fbf7ff] px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-primary/75 shadow-sm"
                >
                  <chip.icon aria-hidden="true" className="size-3.5 shrink-0" />
                  {chip.label}
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
              className="group relative flex min-h-[350px] overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_18px_48px_rgba(65,42,76,0.11)] transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_28px_64px_rgba(65,42,76,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
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
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${area.iconStyle}`}
                  >
                    <area.icon aria-hidden="true" className="size-6" />
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${area.labelStyle}`}
                  >
                    {area.label}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/55">
                    {area.pulse}
                  </p>
                  <div className="mt-2">
                    <h2 className="text-3xl font-semibold tracking-normal text-primary sm:text-4xl">
                      {area.title}
                    </h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                    {area.description}
                  </p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
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

                <div className="mt-4 grid gap-2 rounded-lg border border-primary/10 bg-white/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                  {area.details.map((detail) => (
                    <span
                      key={detail}
                      className="flex items-start gap-2 text-sm font-semibold leading-5 text-primary/75"
                    >
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      />
                      {detail}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {area.stats.map((stat) => (
                      <span
                        key={stat}
                        className="rounded-lg border border-primary/10 bg-white/72 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-primary/65"
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
