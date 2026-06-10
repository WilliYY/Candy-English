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
  progressPercent: number;
  progressXp: number;
  requiredXp: number;
  role: CandyXpRankingRole;
  roleLabel: string;
  totalXp: number;
  userId: string;
  xpToNextLevel: number;
};

export type CandyXpCurrentUserRanking = {
  categoryLabel: string;
  categoryTitle: string;
  hasXp: boolean;
  position: number | null;
  totalInCategory: number;
  totalXp: number;
  xpToNextLevel: number;
};

export type CandyXpRankingSnapshot = {
  currentUserRanking: CandyXpCurrentUserRanking | null;
  currentUserEntry: CandyXpRankingEntry | null;
  generatedAt: string;
  topEntries: CandyXpRankingEntry[];
  totalRanked: number;
};

const RANKABLE_ROLE_VALUES: CandyXpRankingRole[] = ["STUDENT", "TEACHER"];
const MIN_RANKING_LIMIT = 3;
const MAX_RANKING_LIMIT = 100;

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

function getCategoryLabel(role: CandyXpRankingRole) {
  return role === "TEACHER" ? "teachers" : "alunos";
}

function getCategoryTitle(role: CandyXpRankingRole) {
  return role === "TEACHER" ? "Ranking Teacher" : "Ranking Candy";
}

function getSafeName(name?: string | null) {
  const normalized = name?.trim();

  return normalized && normalized.length > 0 ? normalized : "Candy learner";
}

function getRankableUserFilter(role?: CandyXpRankingRole) {
  const roleFilter = role
    ? {
        role,
      }
    : {
        role: {
          in: RANKABLE_ROLE_VALUES,
        },
      };

  return {
    isActive: true,
    ...roleFilter,
  };
}

function getRankableProfileWhere({
  role,
  withXpOnly = false,
}: {
  role?: CandyXpRankingRole;
  withXpOnly?: boolean;
} = {}) {
  return {
    ...(withXpOnly
      ? {
          totalXp: {
            gt: 0,
          },
        }
      : {}),
    user: {
      is: getRankableUserFilter(role),
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
    progressPercent: Math.min(
      100,
      Math.round((profile.progressXp / Math.max(1, profile.requiredXp)) * 100),
    ),
    progressXp: profile.progressXp,
    requiredXp: profile.requiredXp,
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
  const rankingProfileWhere = getRankableProfileWhere({ withXpOnly: true });
  const rankableProfileWhere = getRankableProfileWhere();
  const [topProfiles, totalRanked, currentUserProfile] = await Promise.all([
    prisma.candyXpProfile.findMany({
      where: rankingProfileWhere,
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
      where: rankingProfileWhere,
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
  let currentUserRanking: CandyXpCurrentUserRanking | null = null;

  if (currentUserProfile) {
    const currentUserRole = currentUserProfile.user.role as CandyXpRankingRole;
    const categoryProfileWhere = getRankableProfileWhere({
      role: currentUserRole,
      withXpOnly: true,
    });
    const shouldRankCurrentUser = currentUserProfile.totalXp > 0;
    const [totalInCategory, entriesAhead] = await Promise.all([
      prisma.candyXpProfile.count({
        where: categoryProfileWhere,
      }),
      shouldRankCurrentUser
        ? prisma.candyXpProfile.count({
            where: {
              ...categoryProfileWhere,
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
                      ...getRankableUserFilter(currentUserRole),
                      name: {
                        lt: currentUserProfile.user.name,
                      },
                    },
                  },
                },
              ],
            },
          })
        : Promise.resolve(null),
    ]);

    currentUserRanking = {
      categoryLabel: getCategoryLabel(currentUserRole),
      categoryTitle: getCategoryTitle(currentUserRole),
      hasXp: shouldRankCurrentUser,
      position: entriesAhead === null ? null : entriesAhead + 1,
      totalInCategory,
      totalXp: currentUserProfile.totalXp,
      xpToNextLevel: Math.max(
        0,
        currentUserProfile.requiredXp - currentUserProfile.progressXp,
      ),
    };
  }

  if (
    currentUserProfile &&
    currentUserProfile.totalXp > 0 &&
    !currentUserIsInTop
  ) {
    const entriesAhead = await prisma.candyXpProfile.count({
      where: {
        ...rankableProfileWhere,
        totalXp: {
          gt: 0,
        },
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
    currentUserRanking,
    currentUserEntry,
    generatedAt: new Date().toISOString(),
    topEntries,
    totalRanked,
  };
}
