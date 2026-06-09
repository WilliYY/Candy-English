import {
  Medal,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";
import { UserAvatar } from "@/components/ava/user-avatar";
import type {
  CandyXpRankingEntry,
  CandyXpRankingSnapshot,
} from "@/lib/candy-xp-ranking";
import { cn } from "@/lib/utils";

type CandyXpRankingCardProps = {
  className?: string;
  ranking: CandyXpRankingSnapshot;
};

const xpFormatter = new Intl.NumberFormat("pt-BR");

const podiumStyles = [
  {
    badge: "border-amber-300 bg-amber-100 text-amber-950",
    card: "border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white shadow-amber-900/10",
    icon: "bg-amber-400 text-amber-950",
    ring: "ring-amber-300/70",
  },
  {
    badge: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-950",
    card: "border-fuchsia-300/70 bg-gradient-to-br from-fuchsia-50 via-white to-white shadow-fuchsia-900/10",
    icon: "bg-fuchsia-400 text-white",
    ring: "ring-fuchsia-300/70",
  },
  {
    badge: "border-sky-300 bg-sky-50 text-sky-950",
    card: "border-sky-300/70 bg-gradient-to-br from-sky-50 via-white to-white shadow-sky-900/10",
    icon: "bg-sky-400 text-white",
    ring: "ring-sky-300/70",
  },
] as const;

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function RankingAvatar({
  entry,
  className,
}: {
  className?: string;
  entry: CandyXpRankingEntry;
}) {
  return (
    <span className="relative shrink-0">
      <UserAvatar
        avatarPath={entry.avatarPath}
        className={cn("size-12 rounded-xl", className)}
        iconClassName={entry.avatarPath ? "size-5" : "hidden"}
        userId={entry.userId}
      />
      {!entry.avatarPath ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs font-bold text-primary-foreground">
          {getInitials(entry.name)}
        </span>
      ) : null}
    </span>
  );
}

function RoleChip({ entry }: { entry: CandyXpRankingEntry }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em]",
        entry.role === "TEACHER"
          ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800"
          : "border-sky-200 bg-sky-50 text-sky-800",
      )}
    >
      {entry.role === "TEACHER" ? (
        <Sparkles aria-hidden="true" className="size-3" />
      ) : (
        <UserRound aria-hidden="true" className="size-3" />
      )}
      {entry.roleLabel}
    </span>
  );
}

function RankingMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="rounded-lg border border-primary/10 bg-white/74 px-3 py-2 shadow-sm">
      <span className="block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary/50">
        {label}
      </span>
      <strong className="mt-1 block text-sm leading-none text-primary">
        {value}
      </strong>
    </span>
  );
}

function PodiumEntry({
  entry,
  index,
}: {
  entry: CandyXpRankingEntry;
  index: number;
}) {
  const style = podiumStyles[index] ?? podiumStyles[2];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border p-4 shadow-lg transition duration-200",
        style.card,
        entry.isCurrentUser && "outline outline-2 outline-primary/35",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#412a4c,#e57cd8,#f6c65b)]"
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold shadow-sm",
            style.badge,
          )}
        >
          <Trophy aria-hidden="true" className="size-3.5" />
          #{entry.position}
        </span>
        {entry.isCurrentUser ? (
          <span className="rounded-full border border-primary/15 bg-primary px-2.5 py-1 text-[0.68rem] font-bold text-primary-foreground shadow-sm">
            voce
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex min-w-0 items-center gap-3">
        <RankingAvatar
          entry={entry}
          className={cn("size-14 ring-2", style.ring)}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-primary">
            {entry.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RoleChip entry={entry} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.68rem] font-bold text-amber-900">
              <Zap aria-hidden="true" className="size-3" />
              Nivel {entry.level}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <RankingMetric
          label="Total"
          value={`${xpFormatter.format(entry.totalXp)} XP`}
        />
        <RankingMetric
          label="Proximo"
          value={`${xpFormatter.format(entry.xpToNextLevel)} XP`}
        />
      </div>
    </article>
  );
}

function CompactEntry({ entry }: { entry: CandyXpRankingEntry }) {
  return (
    <article
      className={cn(
        "grid gap-3 rounded-lg border border-primary/10 bg-white/86 p-3 shadow-sm transition hover:border-primary/25 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
        entry.isCurrentUser &&
          "border-primary/35 bg-primary/[0.065] shadow-primary/10",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/12 bg-primary/8 text-sm font-bold text-primary">
          #{entry.position}
        </span>
        <RankingAvatar entry={entry} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-primary">
            {entry.name}
          </p>
          {entry.isCurrentUser ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold text-primary-foreground">
              voce
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <RoleChip entry={entry} />
          <span className="text-xs font-semibold text-muted-foreground">
            Nivel {entry.level}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:min-w-48">
        <RankingMetric
          label="XP"
          value={xpFormatter.format(entry.totalXp)}
        />
        <RankingMetric
          label="Falta"
          value={xpFormatter.format(entry.xpToNextLevel)}
        />
      </div>
    </article>
  );
}

export function CandyXpRankingCard({
  className,
  ranking,
}: CandyXpRankingCardProps) {
  const podium = ranking.topEntries.slice(0, 3);
  const remainingEntries = ranking.topEntries.slice(3);
  const titleId = "ranking-candy-title";

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "overflow-hidden rounded-lg border border-primary/15 bg-[linear-gradient(135deg,#fffdfa_0%,#f8f1ff_48%,#effaff_100%)] text-foreground shadow-xl shadow-primary/10",
        className,
      )}
    >
      <div className="grid gap-4 border-b border-primary/10 bg-white/72 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Medal aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/60">
              Ranking Candy XP
            </p>
            <h2
              id={titleId}
              className="mt-1 text-xl font-semibold tracking-normal text-primary sm:text-2xl"
            >
              Quem mais juntou XP no AVA
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Ranking interno com alunos e profs, sem email ou dados sensiveis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <span className="rounded-lg border border-primary/10 bg-white/82 px-3 py-2 text-sm shadow-sm">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary/50">
              Participantes
            </span>
            <strong className="text-primary">{ranking.totalRanked}</strong>
          </span>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-sm">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.12em]">
              Top
            </span>
            <strong>{ranking.topEntries.length}</strong>
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        {ranking.topEntries.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/20 bg-white/70 p-6 text-center">
            <UsersRound aria-hidden="true" className="size-6 text-primary" />
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              O ranking aparece quando alunos ou profs tiverem XP sincronizado.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              {podium.map((entry, index) => (
                <PodiumEntry
                  key={entry.userId}
                  entry={entry}
                  index={index}
                />
              ))}
            </div>

            {remainingEntries.length > 0 ? (
              <ol className="grid gap-2">
                {remainingEntries.map((entry) => (
                  <li key={entry.userId}>
                    <CompactEntry entry={entry} />
                  </li>
                ))}
              </ol>
            ) : null}

            {ranking.currentUserEntry ? (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.055] p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary/70">
                  Sua posicao fora do top
                </p>
                <CompactEntry entry={ranking.currentUserEntry} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
