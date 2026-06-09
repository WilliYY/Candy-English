import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

export type CandyXpRankingRole = Extract<Role, "STUDENT" | "TEACHER">;

export type CandyXpRankingEntry = {
  avatarPath: string | null;
  isCurrentUser: boolean;
  lastXpEventAt: string | null;
  level: number;
  name: string;
  position: number;
  role: CandyXpRankingRole;
  roleLabel: string;
  totalXp: number;
  userId: string;
  xpToNextLevel: number;
};

export type CandyXpRankingSnapshot = {
  currentUserEntry: CandyXpRankingEntry | null;
  generatedAt: string;
  topEntries: CandyXpRankingEntry[];
  totalRanked: number;
};

const RANKABLE_ROLE_VALUES: CandyXpRankingRole[] = ["STUDENT", "TEACHER"];
const MIN_RANKING_LIMIT = 3;
const MAX_RANKING_LIMIT = 20;

const rankingProfileSelect = {
  lastXpEventAt: true,
  level: true,
  progressXp: true,
  requiredXp: true,
  totalXp: true,
  user: {
    select: {
      avatarPath: true,
      id: true,
      name: true,
      role: true,
    },
  },
  userId: true,
} as const;

function getRoleLabel(role: CandyXpRankingRole) {
  return role === "TEACHER" ? "Prof" : "Aluno";
}

function getSafeName(name?: string | null) {
  const normalized = name?.trim();

  return normalized && normalized.length > 0 ? normalized : "Candy learner";
}

function getRankableUserFilter() {
  return {
    isActive: true,
    role: {
      in: RANKABLE_ROLE_VALUES,
    },
  };
}

function getRankableProfileWhere() {
  return {
    user: {
      is: getRankableUserFilter(),
    },
  };
}

function buildEntry({
  currentUserId,
  position,
  profile,
}: {
  currentUserId: string;
  position: number;
  profile: {
    lastXpEventAt: Date | null;
    level: number;
    progressXp: number;
    requiredXp: number;
    totalXp: number;
    user: {
      avatarPath: string | null;
      id: string;
      name: string;
      role: Role;
    };
    userId: string;
  };
}) {
  const role = profile.user.role as CandyXpRankingRole;

  return {
    avatarPath: profile.user.avatarPath,
    isCurrentUser: profile.userId === currentUserId,
    lastXpEventAt: profile.lastXpEventAt?.toISOString() ?? null,
    level: profile.level,
    name: getSafeName(profile.user.name),
    position,
    role,
    roleLabel: getRoleLabel(role),
    totalXp: profile.totalXp,
    userId: profile.user.id,
    xpToNextLevel: Math.max(0, profile.requiredXp - profile.progressXp),
  };
}

function getSameLastXpFilter(lastXpEventAt: Date | null) {
  return lastXpEventAt ? { lastXpEventAt } : { lastXpEventAt: null };
}

function getMoreRecentLastXpFilter(lastXpEventAt: Date | null) {
  return lastXpEventAt
    ? { lastXpEventAt: { gt: lastXpEventAt } }
    : { lastXpEventAt: { not: null } };
}

export async function getCandyXpRankingSnapshot({
  currentUserId,
  limit = 10,
}: {
  currentUserId: string;
  limit?: number;
}): Promise<CandyXpRankingSnapshot> {
  const prisma = getPrisma();
  const normalizedLimit = Math.min(
    MAX_RANKING_LIMIT,
    Math.max(MIN_RANKING_LIMIT, Math.floor(limit)),
  );
  const rankableProfileWhere = getRankableProfileWhere();
  const [topProfiles, totalRanked, currentUserProfile] = await Promise.all([
    prisma.candyXpProfile.findMany({
      where: rankableProfileWhere,
      take: normalizedLimit,
      orderBy: [
        {
          totalXp: "desc",
        },
        {
          level: "desc",
        },
        {
          lastXpEventAt: {
            nulls: "last",
            sort: "desc",
          },
        },
        {
          user: {
            name: "asc",
          },
        },
      ],
      select: rankingProfileSelect,
    }),
    prisma.candyXpProfile.count({
      where: rankableProfileWhere,
    }),
    prisma.candyXpProfile.findFirst({
      where: {
        userId: currentUserId,
        ...rankableProfileWhere,
      },
      select: rankingProfileSelect,
    }),
  ]);

  const topEntries = topProfiles.map((profile, index) =>
    buildEntry({
      currentUserId,
      position: index + 1,
      profile,
    }),
  );
  const currentUserIsInTop = topEntries.some(
    (entry) => entry.userId === currentUserId,
  );
  let currentUserEntry: CandyXpRankingEntry | null = null;

  if (currentUserProfile && !currentUserIsInTop) {
    const entriesAhead = await prisma.candyXpProfile.count({
      where: {
        ...rankableProfileWhere,
        OR: [
          {
            totalXp: {
              gt: currentUserProfile.totalXp,
            },
          },
          {
            level: {
              gt: currentUserProfile.level,
            },
            totalXp: currentUserProfile.totalXp,
          },
          {
            ...getMoreRecentLastXpFilter(currentUserProfile.lastXpEventAt),
            level: currentUserProfile.level,
            totalXp: currentUserProfile.totalXp,
          },
          {
            ...getSameLastXpFilter(currentUserProfile.lastXpEventAt),
            level: currentUserProfile.level,
            totalXp: currentUserProfile.totalXp,
            user: {
              is: {
                ...getRankableUserFilter(),
                name: {
                  lt: currentUserProfile.user.name,
                },
              },
            },
          },
        ],
      },
    });

    currentUserEntry = buildEntry({
      currentUserId,
      position: entriesAhead + 1,
      profile: currentUserProfile,
    });
  }

  return {
    currentUserEntry,
    generatedAt: new Date().toISOString(),
    topEntries,
    totalRanked,
  };
}
