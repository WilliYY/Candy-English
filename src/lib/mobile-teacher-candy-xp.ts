import {
  applyCandyXpPersistence,
  buildCandyTeacherXpSnapshot,
  CANDY_XP_REWARDS,
} from "@/lib/candy-xp";
import {
  recordCandyXpEventsForUser,
  type CandyXpEventInput,
} from "@/lib/candy-xp-persistence";
import {
  getCandyXpRankingSnapshot,
  type CandyXpRankingSnapshot,
} from "@/lib/candy-xp-ranking";
import { toMobileCandyXpRanking } from "@/lib/mobile-candy-xp";
import { getPrisma } from "@/lib/prisma";

const MAX_TEACHER_XP_SOURCE_RECORDS = 1_000;

export type MobileTeacherCandyXpStore = Pick<
  ReturnType<typeof getPrisma>,
  | "homework"
  | "homeworkSubmission"
  | "lesson"
  | "liveSession"
  | "studentTeacherAssignment"
  | "teacherProfile"
>;

type TeacherXpEventSource = {
  homeworkIds: string[];
  lessonIds: string[];
  liveSessionIds: string[];
  profileReady: boolean;
  reviewedSubmissionIds: string[];
  studentProfileIds: string[];
  teacherProfileId: string;
};

type Options = {
  getRanking?: (input: {
    currentUserId: string;
    limit: number;
    rankingRole: "TEACHER";
  }) => Promise<CandyXpRankingSnapshot>;
  recordEvents?: typeof recordCandyXpEventsForUser;
  store?: MobileTeacherCandyXpStore;
};

export type MobileTeacherCandyXpOverview = {
  nextGoals: string[];
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
  ranking: ReturnType<typeof toMobileCandyXpRanking>;
  recentEvents: Array<{
    occurredAt: string;
    sourceLabel: string;
    xp: number;
  }>;
  sources: Array<{ label: string; value: number; xp: number }>;
  spotlightCard: {
    description: string;
    status: string;
    title: string;
    unlocked: boolean;
  };
};

export function buildTeacherCandyXpEvents(
  source: TeacherXpEventSource,
): CandyXpEventInput[] {
  const events: CandyXpEventInput[] = [];

  if (source.profileReady) {
    events.push({
      kind: "PROFILE_READY",
      sourceKey: `teacher:profile-ready:${source.teacherProfileId}`,
      sourceLabel: "Perfil preparado",
      xp: CANDY_XP_REWARDS.teacher.profileReady,
    });
  }
  for (const studentProfileId of source.studentProfileIds) {
    events.push({
      kind: "TEACHER_ROUTINE",
      sourceKey: `teacher:student-linked:${source.teacherProfileId}:${studentProfileId}`,
      sourceLabel: "Alunos vinculados",
      xp: CANDY_XP_REWARDS.teacher.studentLinked,
    });
  }
  for (const lessonId of source.lessonIds) {
    events.push({
      kind: "TEACHER_ROUTINE",
      sourceKey: `teacher:lesson-created:${lessonId}`,
      sourceLabel: "Aulas criadas",
      xp: CANDY_XP_REWARDS.teacher.lessonCreated,
    });
  }
  for (const homeworkId of source.homeworkIds) {
    events.push({
      kind: "TEACHER_ROUTINE",
      sourceKey: `teacher:homework-created:${homeworkId}`,
      sourceLabel: "Homeworks criadas",
      xp: CANDY_XP_REWARDS.teacher.homeworkCreated,
    });
  }
  for (const submissionId of source.reviewedSubmissionIds) {
    events.push({
      kind: "FEEDBACK_REVIEWED",
      sourceKey: `teacher:feedback-reviewed:${submissionId}`,
      sourceLabel: "Feedbacks dados",
      xp: CANDY_XP_REWARDS.teacher.feedbackReviewed,
    });
  }
  for (const liveSessionId of source.liveSessionIds) {
    events.push({
      kind: "TEACHER_ROUTINE",
      sourceKey: `teacher:live-session:${liveSessionId}`,
      sourceLabel: "Aulas ao vivo",
      xp: CANDY_XP_REWARDS.teacher.liveSession,
    });
  }

  return events;
}

function assertWithinLimit(collections: unknown[][]) {
  if (
    collections.some(
      (collection) => collection.length > MAX_TEACHER_XP_SOURCE_RECORDS,
    )
  ) {
    throw new Error("TEACHER_XP_LIMIT_EXCEEDED");
  }
}

export async function getMobileTeacherCandyXpOverview(
  userId: string,
  options: Options = {},
): Promise<MobileTeacherCandyXpOverview | null> {
  const store = options.store ?? getPrisma();
  const teacher = await store.teacherProfile.findFirst({
    where: {
      userId,
      user: { is: { isActive: true, role: "TEACHER" } },
    },
    select: {
      id: true,
      user: { select: { avatarPath: true, phone: true } },
    },
  });
  if (!teacher) return null;

  const take = MAX_TEACHER_XP_SOURCE_RECORDS + 1;
  const [assignments, lessons, homeworks, submissions, liveSessions] =
    await Promise.all([
      store.studentTeacherAssignment.findMany({
        where: { teacherProfileId: teacher.id },
        orderBy: { studentProfileId: "asc" },
        take,
        select: { studentProfileId: true },
      }),
      store.lesson.findMany({
        where: { teacherProfileId: teacher.id },
        orderBy: { id: "asc" },
        take,
        select: { id: true },
      }),
      store.homework.findMany({
        where: { teacherProfileId: teacher.id },
        orderBy: { id: "asc" },
        take,
        select: { id: true },
      }),
      store.homeworkSubmission.findMany({
        where: {
          homework: { teacherProfileId: teacher.id },
          status: { not: "DRAFT" },
        },
        orderBy: { id: "asc" },
        take,
        select: { id: true, status: true },
      }),
      store.liveSession.findMany({
        where: { teacherProfileId: teacher.id },
        orderBy: { id: "asc" },
        take,
        select: { id: true },
      }),
    ]);

  assertWithinLimit([
    assignments,
    lessons,
    homeworks,
    submissions,
    liveSessions,
  ]);
  const reviewedSubmissionIds = submissions
    .filter((submission) => submission.status === "REVIEWED")
    .map((submission) => submission.id);
  const profileReady = Boolean(teacher.user.avatarPath || teacher.user.phone);
  const events = buildTeacherCandyXpEvents({
    homeworkIds: homeworks.map((homework) => homework.id),
    lessonIds: lessons.map((lesson) => lesson.id),
    liveSessionIds: liveSessions.map((session) => session.id),
    profileReady,
    reviewedSubmissionIds,
    studentProfileIds: assignments.map(
      (assignment) => assignment.studentProfileId,
    ),
    teacherProfileId: teacher.id,
  });
  const recordEvents = options.recordEvents ?? recordCandyXpEventsForUser;
  const persistence = await recordEvents({
    events,
    role: "TEACHER",
    userId,
  });
  const getRanking = options.getRanking ?? getCandyXpRankingSnapshot;
  const ranking = await getRanking({
    currentUserId: userId,
    limit: 10,
    rankingRole: "TEACHER",
  });
  const snapshot = applyCandyXpPersistence(
    buildCandyTeacherXpSnapshot({
      homeworksCount: homeworks.length,
      lessonsCount: lessons.length,
      liveSessionsCount: liveSessions.length,
      pendingSubmissionsCount: submissions.filter(
        (submission) => submission.status === "SUBMITTED",
      ).length,
      profileReady,
      reviewedSubmissionsCount: reviewedSubmissionIds.length,
      studentsCount: assignments.length,
    }),
    persistence,
  );

  return {
    nextGoals: snapshot.nextGoals,
    profile: {
      badgeCount: snapshot.badgeCount,
      level: snapshot.level,
      longestStreakDays: snapshot.longestStreakDays,
      progressPercent: snapshot.percent,
      progressXp: snapshot.progressXp,
      requiredXp: snapshot.requiredXp,
      streakDays: snapshot.streakDays,
      totalXp: snapshot.totalXp,
      xpToNextLevel: Math.max(0, snapshot.requiredXp - snapshot.progressXp),
    },
    ranking: toMobileCandyXpRanking(ranking),
    recentEvents: snapshot.recentEvents,
    sources: snapshot.sources.map(({ label, value, xp }) => ({
      label,
      value,
      xp,
    })),
    spotlightCard: snapshot.spotlightCard,
  };
}
