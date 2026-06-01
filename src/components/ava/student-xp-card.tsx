import {
  CheckCircle2,
  Flag,
  Gamepad2,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import type { CandyXpSnapshot } from "@/lib/candy-xp";
import { cn } from "@/lib/utils";

type CandyXpCardProps = {
  badgeLabel?: string;
  className?: string;
  description: string;
  title: string;
  xp: CandyXpSnapshot;
};

type StudentXpCardProps = {
  xp: CandyXpSnapshot;
};

const xpFormatter = new Intl.NumberFormat("pt-BR");

const spotlightIcons = {
  admin: ShieldCheck,
  student: Gamepad2,
  teacher: GraduationCap,
} as const;

export function CandyXpCard({
  badgeLabel = "Candy XP",
  className,
  description,
  title,
  xp,
}: CandyXpCardProps) {
  const missingXp = Math.max(0, xp.requiredXp - xp.progressXp);
  const titleId = `candy-xp-title-${xp.role}`;
  const SpotlightIcon = spotlightIcons[xp.role];

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "overflow-hidden rounded-lg border border-primary/15 bg-[linear-gradient(135deg,#fffdfa_0%,#fff4fb_46%,#f6e7ff_100%)] shadow-xl shadow-primary/10",
        className,
      )}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="relative isolate overflow-hidden p-5 sm:p-6">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(65,42,76,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(65,42,76,0.055)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-900 shadow-sm">
                  <Zap aria-hidden="true" className="size-3.5" />
                  {badgeLabel}
                </span>
                <h2
                  id={titleId}
                  className="mt-3 text-2xl font-semibold tracking-normal text-primary sm:text-3xl"
                >
                  {title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 rounded-lg border border-primary/15 bg-white/80 px-4 py-3 text-primary shadow-sm">
                <span className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Trophy aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Total
                  </span>
                  <strong className="text-xl leading-none">
                    {xpFormatter.format(xp.totalXp)} XP
                  </strong>
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-primary/15 bg-white/82 p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    Nivel {xp.level} para nivel {xp.nextLevel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Faltam {xpFormatter.format(missingXp)} XP para a proxima
                    evolucao.
                  </p>
                </div>
                <strong className="text-sm text-amber-800">
                  {xp.percent}% completo
                </strong>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full border border-amber-500/30 bg-amber-950/10 p-0.5">
                <div
                  aria-hidden="true"
                  className="candy-xp-progress-fill h-full rounded-full"
                  style={{ width: `${xp.percent}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{xpFormatter.format(xp.progressXp)} XP</span>
                <span>{xpFormatter.format(xp.requiredXp)} XP</span>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {xp.track.map((item) => (
                  <div
                    key={item.level}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center rounded-md border px-1 text-center",
                      item.status === "done" &&
                        "border-emerald-300 bg-emerald-50 text-emerald-800",
                      item.status === "current" &&
                        "border-amber-300 bg-amber-100 text-amber-950 shadow-sm",
                      item.status === "next" &&
                        "border-primary/10 bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em]">
                      Nv
                    </span>
                    <strong className="text-sm leading-none">
                      {item.level}
                    </strong>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                A trilha nao tem teto: cada novo nivel recalcula uma meta maior.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {xp.sources.map((source) => (
                <div
                  key={source.label}
                  className="rounded-lg border border-primary/12 bg-white/76 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {source.label}
                    </span>
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                      +{xpFormatter.format(source.xp)}
                    </span>
                  </div>
                  <strong className="mt-3 block text-2xl text-primary">
                    {source.value}
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {source.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="border-t border-primary/10 bg-primary/[0.045] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="grid gap-4">
            <div className="rounded-lg border border-amber-400/50 bg-[linear-gradient(135deg,#fff8db,#ffe8a4_54%,#fff1bd)] p-4 text-amber-950 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white shadow-md shadow-amber-600/20">
                    <SpotlightIcon aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{xp.spotlightCard.title}</h3>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                      {xp.spotlightCard.status}
                    </p>
                  </div>
                </div>
                {xp.spotlightCard.unlocked ? (
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                ) : (
                  <Lock aria-hidden="true" className="size-5" />
                )}
              </div>
              <p className="mt-3 text-sm leading-6">
                {xp.spotlightCard.description}
              </p>
            </div>

            <div className="rounded-lg border border-primary/15 bg-white/78 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-primary">Roadmap Candy</h3>
                  <p className="text-xs text-muted-foreground">
                    Evolucao pensada para estudo e jogos.
                  </p>
                </div>
                <Sparkles aria-hidden="true" className="size-5 text-accent" />
              </div>

              <ol className="mt-4 grid gap-3">
                {xp.roadmap.map((item) => {
                  const isDone = item.status === "done";
                  const isActive = item.status === "active";

                  return (
                    <li
                      key={item.title}
                      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3"
                    >
                      <span
                        className={`mt-0.5 flex size-9 items-center justify-center rounded-md border text-sm font-bold ${
                          isDone
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : isActive
                              ? "border-amber-300 bg-amber-100 text-amber-900"
                              : "border-primary/15 bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 aria-hidden="true" className="size-4" />
                        ) : isActive ? (
                          <Star aria-hidden="true" className="size-4" />
                        ) : (
                          <Flag aria-hidden="true" className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-primary">
                            Nivel {item.level}: {item.title}
                          </strong>
                          {isActive ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-amber-900">
                              agora
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="rounded-lg border border-primary/12 bg-white/70 p-4">
              <h3 className="text-sm font-semibold text-primary">
                Proximos XP
              </h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {xp.nextGoals.map((goal) => (
                  <li key={goal} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500"
                    />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function StudentXpCard({ xp }: StudentXpCardProps) {
  return (
    <CandyXpCard
      description="Ganhe XP ao concluir aulas, entregar homeworks e receber feedback da teacher."
      title={`Nivel ${xp.level} de estudo`}
      xp={xp}
    />
  );
}
