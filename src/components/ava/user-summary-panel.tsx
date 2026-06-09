import { Mail, Medal, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { SignOutButton } from "@/components/ava/sign-out-button";
import { UserAvatar } from "@/components/ava/user-avatar";
import type { CandyXpSnapshot } from "@/lib/candy-xp";
import type { CandyXpCurrentUserRanking } from "@/lib/candy-xp-ranking";

type UserSummaryPanelProps = {
  avatarPath?: string | null;
  email: string;
  name?: string | null;
  ranking?: CandyXpCurrentUserRanking | null;
  role: Role;
  userId?: string | null;
  xp?: CandyXpSnapshot | null;
};

const xpFormatter = new Intl.NumberFormat("pt-BR");

export function UserSummaryPanel({
  avatarPath,
  email,
  name,
  ranking,
  role,
  userId,
  xp,
}: UserSummaryPanelProps) {
  const displayName = name ?? "Sem nome";
  const xpToNextLevel = xp
    ? Math.max(0, xp.requiredXp - xp.progressXp)
    : 0;

  return (
    <section className="ava-profile-summary-card rounded-2xl border p-4 shadow-sm sm:p-5">
      <div className="relative z-10 flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
          <UserAvatar
            avatarPath={avatarPath}
            className="size-14 rounded-2xl shadow-md shadow-primary/15 ring-2 ring-white/80 sm:size-16"
            iconClassName="size-6"
            userId={userId}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-primary/60">
                Meu perfil
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/90 px-2.5 py-1 text-[0.68rem] font-bold text-secondary-foreground shadow-sm shadow-primary/5">
                <Sparkles aria-hidden="true" className="size-3" />
                Candy
              </span>
            </div>
            <p className="mt-1 truncate text-xl font-semibold leading-tight text-foreground">
              {displayName}
            </p>
            <p
              className="mt-2 inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-primary/10 bg-white/78 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm shadow-primary/5"
              title={email}
            >
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">
                {email}
              </span>
            </p>
          </div>
        </div>

        {xp ? (
          <div className="ava-user-xp-panel rounded-2xl border border-amber-300/70 p-3.5 sm:p-4">
            <div className="relative z-10 flex items-start justify-between gap-3">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                  <Trophy aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-amber-800">
                    <Zap aria-hidden="true" className="size-3" />
                    Candy XP
                  </span>
                  <strong className="mt-0.5 block text-sm leading-tight text-primary">
                    Nivel {xp.level}
                  </strong>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-bold text-amber-900 shadow-sm ring-1 ring-amber-500/10 sm:px-3">
                <span className="sm:hidden">{xp.percent}%</span>
                <span className="hidden sm:inline">{xp.percent}% completo</span>
              </span>
            </div>

            <div
              aria-label={`Nivel ${xp.level}, ${xp.percent}% completo, ${xpFormatter.format(xp.totalXp)} XP total`}
              className="relative z-10 mt-3 h-3.5 overflow-hidden rounded-full border border-amber-500/25 bg-amber-950/10 p-0.5"
              role="progressbar"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={xp.percent}
            >
              <div
                aria-hidden="true"
                className="candy-xp-progress-fill candy-user-xp-progress-fill h-full rounded-full"
                style={{ width: `${xp.percent}%` }}
              />
            </div>

            <div className="relative z-10 mt-3 grid grid-cols-2 gap-2 text-[0.72rem] font-semibold text-muted-foreground">
              <span className="rounded-lg border border-amber-500/15 bg-white/62 px-2.5 py-2">
                <span className="block text-[0.62rem] uppercase tracking-[0.16em] text-primary/50">
                  Total
                </span>
                {xpFormatter.format(xp.totalXp)} XP
              </span>
              <span className="rounded-lg border border-amber-500/15 bg-white/62 px-2.5 py-2 text-right">
                <span className="block text-[0.62rem] uppercase tracking-[0.16em] text-primary/50">
                  Proximo
                </span>
                {xpFormatter.format(xpToNextLevel)} XP
              </span>
            </div>

            {ranking ? (
              <div className="relative z-10 mt-3 rounded-xl border border-primary/12 bg-white/78 p-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                      <Medal aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.62rem] font-bold uppercase tracking-[0.16em] text-primary/55">
                        {ranking.categoryTitle}
                      </span>
                      <strong className="block truncate text-sm leading-tight text-primary">
                        {ranking.hasXp && ranking.position
                          ? `#${ranking.position} no Ranking Candy`
                          : "Entre no ranking"}
                      </strong>
                    </span>
                  </span>
                  {ranking.hasXp && ranking.position ? (
                    <span className="w-fit rounded-full border border-primary/12 bg-primary/8 px-2.5 py-1 text-[0.68rem] font-bold text-primary">
                      {ranking.totalInCategory} {ranking.categoryLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {ranking.hasXp && ranking.position
                    ? `Voce esta em #${ranking.position} entre os ${ranking.categoryLabel}.`
                    : "Comece uma missao para entrar no ranking."}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[0.68rem] font-semibold text-muted-foreground">
                  <span className="rounded-lg border border-primary/10 bg-primary/[0.035] px-2.5 py-2">
                    <span className="block text-[0.58rem] uppercase tracking-[0.12em] text-primary/45">
                      XP total
                    </span>
                    {xpFormatter.format(ranking.totalXp)} XP
                  </span>
                  <span className="rounded-lg border border-primary/10 bg-primary/[0.035] px-2.5 py-2 text-right">
                    <span className="block text-[0.58rem] uppercase tracking-[0.12em] text-primary/45">
                      Falta
                    </span>
                    {xpFormatter.format(ranking.xpToNextLevel)} XP
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2 border-t border-primary/10 pt-3 sm:grid-cols-[1fr_auto]">
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary shadow-sm sm:justify-start">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {ROLE_LABELS[role]}
          </span>
          <SignOutButton className="w-full sm:w-auto" />
        </div>
      </div>
    </section>
  );
}
