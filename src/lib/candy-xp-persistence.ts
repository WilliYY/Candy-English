import {
  progressFromCandyXp,
  type CandyXpPersistenceSnapshot,
} from "@/lib/candy-xp";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

export type CandyXpEventKind =
  | "ADMIN_ROUTINE"
  | "BADGE_AWARDED"
  | "CANDY_XP_ACTIVITY_COMPLETED"
  | "FEEDBACK_REVIEWED"
  | "HOMEWORK_SUBMITTED"
  | "LESSON_ACTIVITY_SUBMITTED"
  | "MISSION_COMPLETED"
  | "PROFILE_READY"
  | "STREAK_BONUS"
  | "TEACHER_ROUTINE";

export type CandyXpEventInput = {
  kind: CandyXpEventKind;
  metadata?: Record<string, boolean | null | number | string>;
  occurredAt?: Date;
  sourceKey: string;
  sourceLabel: string;
  xp: number;
};

type CandyBadgeSeed = {
  description: string;
  icon: string;
  key: string;
  requiredEventCount?: number;
  requiredEventKind?: CandyXpEventKind;
  requiredLevel?: number;
  requiredStreakDays?: number;
  role: Role;
  title: string;
};

type CandyMissionSeed = {
  description: string;
  key: string;
  kind:
    | "ADMIN_ROUTINE"
    | "DAILY"
    | "FEEDBACK"
    | "GAME"
    | "HOMEWORK"
    | "LESSON"
    | "LISTENING"
    | "REVIEW"
    | "SPEAKING"
    | "VOCABULARY";
  repeatable?: boolean;
  role: Role;
  sortOrder: number;
  targetCount?: number;
  title: string;
  xpReward: number;
};

type CompleteCandyMissionInput = {
  metadata?: CandyXpEventInput["metadata"];
  missionKey: string;
  sourceKey: string;
  userId: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const saoPauloDayFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

const CANDY_BADGE_DEFINITIONS: readonly CandyBadgeSeed[] = [
  {
    description: "Chegou ao nivel 2 e começou a trilha Candy.",
    icon: "sparkles",
    key: "student-first-level-up",
    requiredLevel: 2,
    role: "STUDENT",
    title: "Primeiro doce",
  },
  {
    description: "Entregou 3 atividades ou homeworks no AVA.",
    icon: "book-open",
    key: "student-study-rhythm",
    requiredEventCount: 3,
    requiredEventKind: "HOMEWORK_SUBMITTED",
    role: "STUDENT",
    title: "Ritmo de estudo",
  },
  {
    description: "Concluiu 3 missoes Candy XP com historia e perguntas.",
    icon: "sparkles",
    key: "student-candy-xp-missions",
    requiredEventCount: 3,
    requiredEventKind: "CANDY_XP_ACTIVITY_COMPLETED",
    role: "STUDENT",
    title: "Missao Candy",
  },
  {
    description: "Manteve uma sequencia de 3 dias com XP.",
    icon: "flame",
    key: "student-three-day-streak",
    requiredStreakDays: 3,
    role: "STUDENT",
    title: "Sequencia doce",
  },
  {
    description: "Corrigiu 5 respostas com feedback para alunos.",
    icon: "clipboard-check",
    key: "teacher-feedback-hero",
    requiredEventCount: 5,
    requiredEventKind: "FEEDBACK_REVIEWED",
    role: "TEACHER",
    title: "Feedback hero",
  },
  {
    description: "Criou XP suficiente para chegar ao nivel 3 teacher.",
    icon: "graduation-cap",
    key: "teacher-level-three",
    requiredLevel: 3,
    role: "TEACHER",
    title: "Teacher em movimento",
  },
  {
    description: "Manteve uma sequencia de 3 dias com XP teacher.",
    icon: "calendar-check",
    key: "teacher-three-day-streak",
    requiredStreakDays: 3,
    role: "TEACHER",
    title: "Rotina teacher",
  },
  {
    description: "Organizou XP suficiente para chegar ao nivel 3 admin.",
    icon: "shield-check",
    key: "admin-level-three",
    requiredLevel: 3,
    role: "ADMIN",
    title: "Gestao organizada",
  },
  {
    description: "Registrou 20 eventos de rotina admin no Candy XP.",
    icon: "calendar-days",
    key: "admin-routine-keeper",
    requiredEventCount: 20,
    requiredEventKind: "ADMIN_ROUTINE",
    role: "ADMIN",
    title: "Rotina em dia",
  },
  {
    description: "Manteve uma sequencia de 3 dias com XP admin.",
    icon: "flame",
    key: "admin-three-day-streak",
    requiredStreakDays: 3,
    role: "ADMIN",
    title: "Operacao constante",
  },
] as const;

const CANDY_MISSIONS: readonly CandyMissionSeed[] = [
  {
    description: "Entregar uma homework publicada no AVA.",
    key: "student-submit-homework",
    kind: "HOMEWORK",
    role: "STUDENT",
    sortOrder: 10,
    title: "Entregar homework",
    xpReward: 50,
  },
  {
    description: "Concluir uma atividade interativa em Aulas e Materiais.",
    key: "student-finish-lesson-activity",
    kind: "LESSON",
    role: "STUDENT",
    sortOrder: 20,
    title: "Concluir aula",
    xpReward: 40,
  },
  {
    description: "Completar uma futura partida de vocabulario.",
    key: "student-vocabulary-game",
    kind: "VOCABULARY",
    repeatable: true,
    role: "STUDENT",
    sortOrder: 30,
    title: "Jogo de vocabulario",
    xpReward: 25,
  },
  {
    description: "Concluir uma historia Candy XP publicada pelo admin.",
    key: "student-candy-xp-story",
    kind: "REVIEW",
    repeatable: true,
    role: "STUDENT",
    sortOrder: 35,
    title: "Historia Candy XP",
    xpReward: 80,
  },
  {
    description: "Criar uma aula interativa para aluno vinculado.",
    key: "teacher-create-lesson",
    kind: "LESSON",
    role: "TEACHER",
    sortOrder: 10,
    title: "Criar aula",
    xpReward: 35,
  },
  {
    description: "Corrigir uma resposta enviada por aluno vinculado.",
    key: "teacher-review-feedback",
    kind: "FEEDBACK",
    role: "TEACHER",
    sortOrder: 20,
    title: "Corrigir resposta",
    xpReward: 60,
  },
  {
    description: "Preparar uma missao futura de listening ou speaking.",
    key: "teacher-game-mission",
    kind: "GAME",
    repeatable: true,
    role: "TEACHER",
    sortOrder: 30,
    title: "Missao teacher",
    xpReward: 30,
  },
  {
    description: "Manter usuarios, vinculos e contratos organizados.",
    key: "admin-organize-users",
    kind: "ADMIN_ROUTINE",
    role: "ADMIN",
    sortOrder: 10,
    title: "Organizar usuarios",
    xpReward: 24,
  },
  {
    description: "Registrar presenca, falta ou reposicao na agenda.",
    key: "admin-agenda-check",
    kind: "DAILY",
    role: "ADMIN",
    sortOrder: 20,
    title: "Cuidar da agenda",
    xpReward: 8,
  },
  {
    description: "Preparar uma futura temporada operacional da Candy.",
    key: "admin-season-mission",
    kind: "GAME",
    repeatable: true,
    role: "ADMIN",
    sortOrder: 30,
    title: "Temporada admin",
    xpReward: 20,
  },
] as const;

let catalogReady = false;

function toSaoPauloDayNumber(value: Date) {
  const parts = saoPauloDayFormatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function calculateStreakStats(dates: Date[]) {
  if (dates.length === 0) {
    return {
      longestStreakDays: 0,
      streakDays: 0,
    };
  }

  const sortedDays = Array.from(
    new Set(dates.map((date) => toSaoPauloDayNumber(date))),
  ).sort((left, right) => left - right);
  let longestStreakDays = 1;
  let currentRun = 1;

  for (let index = 1; index < sortedDays.length; index += 1) {
    if (sortedDays[index] === sortedDays[index - 1] + 1) {
      currentRun += 1;
      longestStreakDays = Math.max(longestStreakDays, currentRun);
    } else {
      currentRun = 1;
    }
  }

  const latestDay = sortedDays[sortedDays.length - 1];
  const today = toSaoPauloDayNumber(new Date());
  let streakDays = latestDay >= today - 1 ? 1 : 0;

  if (streakDays > 0) {
    for (let index = sortedDays.length - 2; index >= 0; index -= 1) {
      const expectedDay = latestDay - streakDays;

      if (sortedDays[index] !== expectedDay) {
        break;
      }

      streakDays += 1;
    }
  }

  return {
    longestStreakDays,
    streakDays,
  };
}

function normalizeEvents(events: CandyXpEventInput[]) {
  return events.filter(
    (event) =>
      event.xp > 0 &&
      event.sourceKey.trim().length > 0 &&
      event.sourceLabel.trim().length > 0,
  );
}

async function ensureCandyXpCatalog() {
  if (catalogReady) {
    return;
  }

  const prisma = getPrisma();

  await Promise.all([
    ...CANDY_BADGE_DEFINITIONS.map((badge) =>
      prisma.candyBadgeDefinition.upsert({
        where: { key: badge.key },
        create: {
          description: badge.description,
          icon: badge.icon,
          key: badge.key,
          requiredEventCount: badge.requiredEventCount ?? null,
          requiredEventKind: badge.requiredEventKind ?? null,
          requiredLevel: badge.requiredLevel ?? null,
          requiredStreakDays: badge.requiredStreakDays ?? null,
          role: badge.role,
          title: badge.title,
        },
        update: {
          description: badge.description,
          icon: badge.icon,
          isActive: true,
          requiredEventCount: badge.requiredEventCount ?? null,
          requiredEventKind: badge.requiredEventKind ?? null,
          requiredLevel: badge.requiredLevel ?? null,
          requiredStreakDays: badge.requiredStreakDays ?? null,
          role: badge.role,
          title: badge.title,
        },
      }),
    ),
    ...CANDY_MISSIONS.map((mission) =>
      prisma.candyMission.upsert({
        where: { key: mission.key },
        create: {
          description: mission.description,
          key: mission.key,
          kind: mission.kind,
          repeatable: mission.repeatable ?? false,
          role: mission.role,
          sortOrder: mission.sortOrder,
          targetCount: mission.targetCount ?? 1,
          title: mission.title,
          xpReward: mission.xpReward,
        },
        update: {
          description: mission.description,
          isActive: true,
          kind: mission.kind,
          repeatable: mission.repeatable ?? false,
          role: mission.role,
          sortOrder: mission.sortOrder,
          targetCount: mission.targetCount ?? 1,
          title: mission.title,
          xpReward: mission.xpReward,
        },
      }),
    ),
  ]);

  catalogReady = true;
}

async function awardCandyBadges(input: {
  level: number;
  role: Role;
  streakDays: number;
  userId: string;
}) {
  const prisma = getPrisma();
  const [definitions, eventCounts] = await Promise.all([
    prisma.candyBadgeDefinition.findMany({
      where: {
        isActive: true,
        OR: [{ role: input.role }, { role: null }],
      },
      select: {
        id: true,
        requiredEventCount: true,
        requiredEventKind: true,
        requiredLevel: true,
        requiredStreakDays: true,
      },
    }),
    prisma.candyXpEvent.groupBy({
      by: ["kind"],
      where: {
        userId: input.userId,
      },
      _count: {
        _all: true,
      },
    }),
  ]);
  const countByKind = new Map(
    eventCounts.map((eventCount) => [
      eventCount.kind,
      eventCount._count._all,
    ]),
  );
  const earnedBadges = definitions.filter((definition) => {
    const checks: boolean[] = [];

    if (definition.requiredLevel !== null) {
      checks.push(input.level >= definition.requiredLevel);
    }

    if (definition.requiredStreakDays !== null) {
      checks.push(input.streakDays >= definition.requiredStreakDays);
    }

    if (
      definition.requiredEventKind !== null &&
      definition.requiredEventCount !== null
    ) {
      checks.push(
        (countByKind.get(definition.requiredEventKind) ?? 0) >=
          definition.requiredEventCount,
      );
    }

    return checks.length > 0 && checks.every(Boolean);
  });

  if (earnedBadges.length === 0) {
    return;
  }

  await prisma.candyUserBadge.createMany({
    data: earnedBadges.map((badge) => ({
      badgeDefinitionId: badge.id,
      userId: input.userId,
    })),
    skipDuplicates: true,
  });
}

async function refreshCandyXpProfile(
  userId: string,
  role: Role,
): Promise<CandyXpPersistenceSnapshot> {
  const prisma = getPrisma();
  const [xpAggregate, eventDates, recentEvents, sourceStats] =
    await Promise.all([
      prisma.candyXpEvent.aggregate({
        where: {
          userId,
        },
        _max: {
          occurredAt: true,
        },
        _sum: {
          xp: true,
        },
      }),
      prisma.candyXpEvent.findMany({
        where: {
          userId,
          xp: {
            gt: 0,
          },
        },
        select: {
          occurredAt: true,
        },
        orderBy: {
          occurredAt: "asc",
        },
      }),
      prisma.candyXpEvent.findMany({
        where: {
          userId,
          xp: {
            gt: 0,
          },
        },
        select: {
          occurredAt: true,
          sourceLabel: true,
          xp: true,
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: 5,
      }),
      prisma.candyXpEvent.groupBy({
        by: ["sourceLabel"],
        where: {
          userId,
        },
        _count: {
          _all: true,
        },
        _sum: {
          xp: true,
        },
      }),
    ]);
  const totalXp = xpAggregate._sum.xp ?? 0;
  const progress = progressFromCandyXp(totalXp);
  const streakStats = calculateStreakStats(
    eventDates.map((event) => event.occurredAt),
  );

  await prisma.candyXpProfile.upsert({
    where: {
      userId,
    },
    create: {
      lastActivityDate: xpAggregate._max.occurredAt,
      lastXpEventAt: xpAggregate._max.occurredAt,
      level: progress.level,
      levelStartXp: progress.levelStartXp,
      longestStreakDays: streakStats.longestStreakDays,
      progressXp: progress.progressXp,
      requiredXp: progress.requiredXp,
      role,
      streakDays: streakStats.streakDays,
      totalXp,
      userId,
    },
    update: {
      lastActivityDate: xpAggregate._max.occurredAt,
      lastXpEventAt: xpAggregate._max.occurredAt,
      level: progress.level,
      levelStartXp: progress.levelStartXp,
      longestStreakDays: streakStats.longestStreakDays,
      progressXp: progress.progressXp,
      requiredXp: progress.requiredXp,
      role,
      streakDays: streakStats.streakDays,
      totalXp,
    },
  });

  await awardCandyBadges({
    level: progress.level,
    role,
    streakDays: streakStats.streakDays,
    userId,
  });

  const badgeCount = await prisma.candyUserBadge.count({
    where: {
      userId,
    },
  });

  return {
    badgeCount,
    longestStreakDays: streakStats.longestStreakDays,
    recentEvents: recentEvents.map((event) => ({
      occurredAt: event.occurredAt.toISOString(),
      sourceLabel: event.sourceLabel,
      xp: event.xp,
    })),
    sourceStats: Object.fromEntries(
      sourceStats.map((source) => [
        source.sourceLabel,
        {
          value: source._count._all,
          xp: source._sum.xp ?? 0,
        },
      ]),
    ),
    streakDays: streakStats.streakDays,
    totalXp,
  };
}

export async function recordCandyXpEventsForUser(input: {
  events: CandyXpEventInput[];
  role: Role;
  userId: string;
}): Promise<CandyXpPersistenceSnapshot> {
  await ensureCandyXpCatalog();

  const events = normalizeEvents(input.events);
  const prisma = getPrisma();

  await prisma.candyXpProfile.upsert({
    where: {
      userId: input.userId,
    },
    create: {
      role: input.role,
      userId: input.userId,
    },
    update: {
      role: input.role,
    },
  });

  if (events.length > 0) {
    await prisma.candyXpEvent.createMany({
      data: events.map((event) => ({
        kind: event.kind,
        metadata: event.metadata ?? undefined,
        occurredAt: event.occurredAt ?? new Date(),
        role: input.role,
        sourceKey: event.sourceKey,
        sourceLabel: event.sourceLabel,
        userId: input.userId,
        xp: event.xp,
      })),
      skipDuplicates: true,
    });
  }

  return refreshCandyXpProfile(input.userId, input.role);
}

export async function completeCandyMission({
  metadata,
  missionKey,
  sourceKey,
  userId,
}: CompleteCandyMissionInput) {
  await ensureCandyXpCatalog();

  const prisma = getPrisma();
  const [user, mission] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
    prisma.candyMission.findUnique({
      where: { key: missionKey },
      select: {
        id: true,
        isActive: true,
        key: true,
        role: true,
        title: true,
        xpReward: true,
      },
    }),
  ]);

  if (!user || !mission || !mission.isActive) {
    return null;
  }

  if (mission.role !== null && mission.role !== user.role) {
    return null;
  }

  const normalizedSourceKey = sourceKey.trim();

  if (!normalizedSourceKey) {
    return null;
  }

  const attemptKey = `${mission.key}:${userId}:${normalizedSourceKey}`;
  const xpSourceKey = `mission:${mission.key}:${normalizedSourceKey}`;
  const attempt = await prisma.candyMissionAttempt.upsert({
    where: {
      attemptKey,
    },
    create: {
      attemptKey,
      completedAt: new Date(),
      missionId: mission.id,
      progressCount: 1,
      sourceKey: normalizedSourceKey,
      userId,
    },
    update: {},
    select: {
      id: true,
    },
  });
  const persistence = await recordCandyXpEventsForUser({
    events: [
      {
        kind: "MISSION_COMPLETED",
        metadata,
        sourceKey: xpSourceKey,
        sourceLabel: mission.title,
        xp: mission.xpReward,
      },
    ],
    role: user.role,
    userId,
  });

  return {
    attemptId: attempt.id,
    persistence,
  };
}
