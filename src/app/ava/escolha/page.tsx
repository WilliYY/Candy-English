import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Clock3,
  ShieldCheck,
  Store,
  WalletCards,
} from "lucide-react";
import { BrandLogo } from "@/components/site/brand-logo";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";
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

export default async function AvaAreaChoicePage() {
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER", "STUDENT"],
    "/ava/escolha",
  );

  if (session.user.role === "STUDENT") {
    redirect("/ava/student");
  }

  const isAdmin = session.user.role === "ADMIN";
  const timeClockProfile = isAdmin
    ? null
    : await getPrisma().timeClockProfile.findUnique({
        where: { userId: session.user.id },
        select: { isActive: true },
      });
  const canAccessTimeClock = isAdmin || Boolean(timeClockProfile?.isActive);
  const areas = [
    {
      accent: "border-cyan-200 bg-cyan-50/72 text-cyan-950",
      bar: "bg-cyan-500",
      description: "Aulas, materiais e progresso dos alunos.",
      href: getPedagogicalAvaPath(session.user.role),
      icon: BookOpen,
      iconStyle: "bg-cyan-700 text-white shadow-cyan-900/20",
      title: "AVA",
    },
    {
      accent: "border-rose-200 bg-rose-50/72 text-rose-950",
      bar: "bg-rose-500",
      description: "Pre-cadastros, agenda e contratos.",
      href: getSecretariaPath(session.user.role),
      icon: Building2,
      iconStyle: "bg-rose-700 text-white shadow-rose-900/20",
      title: "SECRETARIA",
    },
    ...(isAdmin
      ? [
          {
            accent: "border-emerald-200 bg-emerald-50/72 text-emerald-950",
            bar: "bg-emerald-500",
            description: "Mensalidades e pagamentos por polo.",
            href: "/ava/admin?task=financeiro",
            icon: WalletCards,
            iconStyle:
              "bg-emerald-700 text-white shadow-emerald-900/20",
            title: "FINANCEIRO",
          },
        ]
       : []),
    {
      accent: "border-sky-200 bg-sky-50/72 text-sky-950",
      bar: "bg-sky-500",
      description: "PDV, produtos, estoque e faturas do mês.",
      href: "/ava/vendas",
      icon: Store,
      iconStyle: "bg-sky-700 text-white shadow-sky-900/20",
      title: "VENDAS",
    },
    ...(canAccessTimeClock
      ? [
          {
            accent: "border-violet-200 bg-violet-50/72 text-violet-950",
            bar: "bg-violet-500",
            description: "Entradas, saidas e espelho mensal da equipe.",
            href: "/ava/ponto",
            icon: Clock3,
            iconStyle: "bg-violet-700 text-white shadow-violet-900/20",
            title: "PONTO",
          },
        ]
      : []),
  ];

  return (
    <section className="min-h-screen w-full overflow-hidden bg-[linear-gradient(125deg,#fff8fb_0%,#ffffff_42%,#f0fbff_72%,#f4fff8_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-7">
        <header className="flex flex-col items-center text-center">
          <BrandLogo
            className="h-20 w-[15rem] justify-center overflow-visible rounded-none"
            imageClassName="w-[232px] drop-shadow-[0_16px_28px_rgba(65,42,76,0.16)]"
            markClassName="overflow-visible"
          />
          <span className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/12 bg-white/85 px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {ROLE_LABELS[session.user.role]}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-primary sm:text-4xl">
            Escolha sua area
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Abra somente o ambiente que voce precisa agora.
          </p>
        </header>

        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {areas.map((area) => (
            <Link
              key={area.title}
              href={area.href}
              className={`group relative flex min-h-52 flex-col overflow-hidden rounded-lg border p-5 shadow-[0_16px_38px_rgba(65,42,76,0.09)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(65,42,76,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${area.accent}`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-1 ${area.bar}`}
              />
              <span
                className={`flex size-11 items-center justify-center rounded-lg shadow-lg ${area.iconStyle}`}
              >
                <area.icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-7 text-2xl font-extrabold tracking-normal">
                {area.title}
              </h2>
              <p className="mt-2 text-sm leading-6 opacity-75">
                {area.description}
              </p>
              <span className="mt-auto flex items-center justify-between pt-6 text-sm font-bold">
                Abrir area
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/85 shadow-sm transition-transform group-hover:translate-x-1">
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
