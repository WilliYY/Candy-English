import {
  CANDY_XP_REWARDS,
  progressFromCandyXp,
} from "@/lib/candy-xp";
import {
  recordCandyXpEventsForUser,
  type CandyXpEventInput,
} from "@/lib/candy-xp-persistence";
import {
  getCandyXpRankingSnapshot,
  type CandyXpRankingSnapshot,
} from "@/lib/candy-xp-ranking";
import { getPrisma } from "@/lib/prisma";
import { getStudentProfileCompletion } from "@/lib/student-profile-completion";

type MobileCandyXpSubmission = {
  autoScorePercent: number | null;
  awardedXp: number | null;
  feedback: string | null;
  id: string;
  status: string;
  submittedAt: string | null;
};

export type MobileCandyXpActivity = {
  assetKind: "IMAGE" | "PDF" | null;
  assetPageCount: number | null;
  category: string;
  description: string | null;
  id: string;
  interactiveFieldCount: number;
  level: string;
  questionCount: number;
  submission: MobileCandyXpSubmission | null;
  title: string;
  xpReward: number;
};

export type MobileCandyXpOverview = {
  activities: MobileCandyXpActivity[];
  profile: {
    badgeCount: number;
    level: number;
    longestStreakDays: number;
    progressPercent: number;
    progressXp: number;
    requiredXp: number;
    streakDays: number;
    totalXp: number;
    xpToNextLevel: number;
  };
  ranking: {
    currentUser: {
      hasXp: boolean;
      position: number | null;
      totalInCategory: number;
      totalXp: number;
      xpToNextLevel: number;
    } | null;
    generatedAt: string;
    topEntries: Array<{
      isCurrentUser: boolean;
      level: number;
      name: string;
      position: number;
      progressPercent: number;
      totalXp: number;
      xpToNextLevel: number;
    }>;
    totalRanked: number;
  };
  recentEvents: Array<{
    occurredAt: string;
    sourceLabel: string;
    xp: number;
  }>;
  sources: Array<{
    label: string;
    value: number;
    xp: number;
  }>;
};

type StudentProfileForCandyXp = {
  address: string | null;
  avatarPath: string | null;
  birthDate: Date | null;
  guardianDocument: string | null;
  id: string;
  motherName: string | null;
  motherPhone: string | null;
  name: string;
  phone: string | null;
  studentPhone: string | null;
};

type ActivityForMobileCandyXp = {
  _count: {
    interactiveFields: number;
    questions: number;
  };
  assetMimeType: string | null;
  assetPageCount: number | null;
  category: string;
  description: string | null;
  id: string;
  level: string;
  submissions: Array<{
    autoScorePercent: number | null;
    awardedXp: number | null;
    feedback: string | null;
    id: string;
    status: string;
    submittedAt: Date | null;
  }>;
  title: string;
  xpReward: number;
};

export function buildMobileStudentProfileXpEvents(
  profile: StudentProfileForCandyXp,
): CandyXpEventInput[] {
  const completion = getStudentProfileCompletion(profile);
  const events: CandyXpEventInput[] = [];

  if (completion.xp > 0) {
    events.push({
      kind: "PROFILE_READY",
      metadata: {
        completedFields: completion.completedCount,
        percent: completion.percent,
        totalFields: completion.totalCount,
      },
      sourceKey: `student:profile-ready:${profile.id}`,
      sourceLabel: "Perfil preparado",
      xp: completion.xp,
    });
  }

  if (profile.avatarPath) {
    events.push({
      kind: "PROFILE_READY",
      metadata: {
        firstPhotoBonus: true,
      },
      sourceKey: `student:profile-photo:first:${profile.id}`,
      sourceLabel: "Foto do perfil",
      xp: CANDY_XP_REWARDS.student.profilePhoto,
    });
  }

  return events;
}

export function toMobileCandyXpActivity(
  activity: ActivityForMobileCandyXp,
): MobileCandyXpActivity {
  const submission = activity.submissions[0];

  return {
    assetKind: activity.assetMimeType
      ? activity.assetMimeType.startsWith("image/")
        ? "IMAGE"
        : "PDF"
      : null,
    assetPageCount: activity.assetPageCount,
    category: activity.category,
    description: activity.description,
    id: activity.id,
    interactiveFieldCount: activity._count.interactiveFields,
    level: activity.level,
    questionCount: activity._count.questions,
    submission: submission
      ? {
          autoScorePercent: submission.autoScorePercent,
          awardedXp: submission.awardedXp,
          feedback: submission.feedback,
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
        }
      : null,
    title: activity.title,
    xpReward: activity.xpReward,
  };
}

export function toMobileCandyXpRanking(snapshot: CandyXpRankingSnapshot) {
  return {
    currentUser: snapshot.currentUserRanking
      ? {
          hasXp: snapshot.currentUserRanking.hasXp,
          position: snapshot.currentUserRanking.position,
          totalInCategory: snapshot.currentUserRanking.totalInCategory,
          totalXp: snapshot.currentUserRanking.totalXp,
          xpToNextLevel: snapshot.currentUserRanking.xpToNextLevel,
        }
      : null,
    generatedAt: snapshot.generatedAt,
    topEntries: snapshot.topEntries.map((entry) => ({
      isCurrentUser: entry.isCurrentUser,
      level: entry.level,
      name: entry.name,
      position: entry.position,
      progressPercent: entry.progressPercent,
      totalXp: entry.totalXp,
      xpToNextLevel: entry.xpToNextLevel,
    })),
    totalRanked: snapshot.totalRanked,
  };
}

export async function getMobileStudentCandyXpOverview(
  userId: string,
): Promise<MobileCandyXpOverview | null> {
  const prisma = getPrisma();
  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      userId,
      user: {
        is: {
          isActive: true,
          role: "STUDENT",
        },
      },
    },
    select: {
      birthDate: true,
      guardianDocument: true,
      id: true,
      motherName: true,
      motherPhone: true,
      studentPhone: true,
      user: {
        select: {
          address: true,
          avatarPath: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!studentProfile) {
    return null;
  }

  const activities = await prisma.candyXpActivity.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        {
          assignments: {
            none: {},
          },
        },
        {
          assignments: {
            some: {
              studentProfileId: studentProfile.id,
            },
          },
        },
      ],
    },
    orderBy: [
      {
        publishedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      _count: {
        select: {
          interactiveFields: true,
          questions: true,
        },
      },
      assetMimeType: true,
      assetPageCount: true,
      category: true,
      description: true,
      id: true,
      level: true,
      submissions: {
        where: {
          studentProfileId: studentProfile.id,
        },
        select: {
          autoScorePercent: true,
          awardedXp: true,
          feedback: true,
          id: true,
          status: true,
          submittedAt: true,
        },
        take: 1,
      },
      title: true,
      xpReward: true,
    },
  });

  const profileForXp = {
    address: studentProfile.user.address,
    avatarPath: studentProfile.user.avatarPath,
    birthDate: studentProfile.birthDate,
    guardianDocument: studentProfile.guardianDocument,
    id: studentProfile.id,
    motherName: studentProfile.motherName,
    motherPhone: studentProfile.motherPhone,
    name: studentProfile.user.name,
    phone: studentProfile.user.phone,
    studentPhone: studentProfile.studentPhone,
  };
  const persistence = await recordCandyXpEventsForUser({
    events: buildMobileStudentProfileXpEvents(profileForXp),
    role: "STUDENT",
    userId,
  });
  const ranking = await getCandyXpRankingSnapshot({
    currentUserId: userId,
    limit: 10,
    rankingRole: "STUDENT",
  });
  const progress = progressFromCandyXp(persistence.totalXp);

  return {
    activities: activities.map(toMobileCandyXpActivity),
    profile: {
      badgeCount: persistence.badgeCount,
      level: progress.level,
      longestStreakDays: persistence.longestStreakDays,
      progressPercent: progress.percent,
      progressXp: progress.progressXp,
      requiredXp: progress.requiredXp,
      streakDays: persistence.streakDays,
      totalXp: persistence.totalXp,
      xpToNextLevel: Math.max(0, progress.requiredXp - progress.progressXp),
    },
    ranking: toMobileCandyXpRanking(ranking),
    recentEvents: persistence.recentEvents,
    sources: Object.entries(persistence.sourceStats)
      .map(([label, source]) => ({
        label,
        value: source.value,
        xp: source.xp,
      }))
      .sort((left, right) => right.xp - left.xp || left.label.localeCompare(right.label)),
  };
}
