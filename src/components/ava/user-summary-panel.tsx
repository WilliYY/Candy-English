import { Mail, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { SignOutButton } from "@/components/ava/sign-out-button";
import { UserAvatar } from "@/components/ava/user-avatar";
import type { CandyXpSnapshot } from "@/lib/candy-xp";

type UserSummaryPanelProps = {
  avatarPath?: string | null;
  email: string;
  name?: string | null;
  role: Role;
  userId?: string | null;
  xp?: CandyXpSnapshot | null;
};

const xpFormatter = new Intl.NumberFormat("pt-BR");

export function UserSummaryPanel({
  avatarPath,
  email,
  name,
  role,
  userId,
  xp,
}: UserSummaryPanelProps) {
  const displayName = name ?? "Sem nome";
  const xpToNextLevel = xp
    ? Math.max(0, xp.requiredXp - xp.progressXp)
    : 0;

  return (
    <section className="ava-profile-summary-card rounded-2xl border p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <UserAvatar
            avatarPath={avatarPath}
            className="size-14 rounded-2xl"
            iconClassName="size-6"
            userId={userId}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-primary/60">
                Meu perfil
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-1 text-[0.68rem] font-bold text-secondary-foreground">
                <Sparkles aria-hidden="true" className="size-3" />
                Candy
              </span>
            </div>
            <p className="mt-1 truncate text-lg font-semibold leading-tight text-foreground">
              {displayName}
            </p>
            <p
              className="mt-2 flex min-w-0 items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-2.5 py-1.5 text-sm font-medium text-muted-foreground"
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
          <div className="ava-user-xp-panel rounded-xl border border-amber-300/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
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
              <span className="shrink-0 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-sm">
                {xp.percent}%
              </span>
            </div>

            <div
              aria-label={`Nivel ${xp.level}, ${xp.percent}% completo, ${xpFormatter.format(xp.totalXp)} XP total`}
              className="mt-3 h-3 overflow-hidden rounded-full border border-amber-500/25 bg-amber-950/10 p-0.5"
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

            <div className="mt-2 flex items-center justify-between gap-3 text-[0.72rem] font-medium text-muted-foreground">
              <span>{xpFormatter.format(xp.totalXp)} XP total</span>
              <span className="text-right">
                faltam {xpFormatter.format(xpToNextLevel)} XP
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary shadow-sm">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {ROLE_LABELS[role]}
          </span>
          <SignOutButton className="w-full sm:w-auto" />
        </div>
      </div>
    </section>
  );
}
