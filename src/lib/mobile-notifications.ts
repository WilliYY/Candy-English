import type { Prisma } from "@/generated/prisma/client";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getMobileStudentLessonScope } from "@/lib/mobile-lesson";
import { getPrisma } from "@/lib/prisma";

const notificationLessonSelect = {
  id: true,
  title: true,
  updatedAt: true,
} satisfies Prisma.LessonSelect;

const notificationHomeworkSelect = {
  id: true,
  submissions: {
    select: { status: true },
    take: 1,
  },
  title: true,
  updatedAt: true,
} satisfies Prisma.HomeworkSelect;

const notificationFeedbackSelect = {
  homework: {
    select: {
      id: true,
      title: true,
    },
  },
  id: true,
  reviewedAt: true,
  status: true,
} satisfies Prisma.HomeworkSubmissionSelect;

const notificationXpSelect = {
  id: true,
  kind: true,
  occurredAt: true,
  sourceLabel: true,
  xp: true,
} satisfies Prisma.CandyXpEventSelect;

type NotificationLesson = Prisma.LessonGetPayload<{
  select: typeof notificationLessonSelect;
}>;

type NotificationHomework = Prisma.HomeworkGetPayload<{
  select: typeof notificationHomeworkSelect;
}>;

type NotificationFeedback = Prisma.HomeworkSubmissionGetPayload<{
  select: typeof notificationFeedbackSelect;
}>;

type NotificationXpEvent = Prisma.CandyXpEventGetPayload<{
  select: typeof notificationXpSelect;
}>;

export type MobileNotificationStore = Pick<
  ReturnType<typeof getPrisma>,
  | "candyXpEvent"
  | "homework"
  | "homeworkSubmission"
  | "lesson"
  | "studentProfile"
>;

type MobileNotificationOptions = {
  now?: Date;
  store?: MobileNotificationStore;
};

export type MobileNotificationType =
  | "ACHIEVEMENT"
  | "CLASS"
  | "FEEDBACK"
  | "HOMEWORK";

export type MobileNotificationTarget =
  | { id: null; kind: "CANDY_XP" }
  | { id: string; kind: "HOMEWORK" | "LESSON" };

export type MobileNotification = {
  eventAt: string;
  id: string;
  summary: string;
  target: MobileNotificationTarget;
  title: string;
  type: MobileNotificationType;
};

export type MobileNotificationInbox = {
  generatedAt: string;
  items: MobileNotification[];
};

export class MobileNotificationError extends Error {
  constructor(readonly code: "NOTIFICATIONS_FORBIDDEN") {
    super(code);
    this.name = "MobileNotificationError";
  }
}

const achievementKinds = [
  "BADGE_AWARDED",
  "CANDY_XP_ACTIVITY_COMPLETED",
  "FEEDBACK_REVIEWED",
  "MISSION_COMPLETED",
  "PROFILE_READY",
  "STREAK_BONUS",
] as const;

function notificationTitle(prefix: string, value: string) {
  const normalized = `${prefix}: ${value}`.replace(/\s+/g, " ").trim();

  return normalized.length <= 160
    ? normalized
    : `${normalized.slice(0, 159).trimEnd()}…`;
}

function lessonNotification(lesson: NotificationLesson): MobileNotification {
  return {
    eventAt: lesson.updatedAt.toISOString(),
    id: `lesson:${lesson.id}`,
    summary: "Uma aula foi liberada ou atualizada para voce.",
    target: { id: lesson.id, kind: "LESSON" },
    title: notificationTitle("Aula", lesson.title),
    type: "CLASS",
  };
}

function homeworkNotification(
  homework: NotificationHomework,
): MobileNotification | null {
  const status = homework.submissions[0]?.status;

  if (status === "SUBMITTED" || status === "REVIEWED") {
    return null;
  }

  return {
    eventAt: homework.updatedAt.toISOString(),
    id: `homework:${homework.id}`,
    summary:
      status === "RETURNED"
        ? "Sua tarefa precisa de ajustes antes do novo envio."
        : "Uma tarefa esta disponivel para voce.",
    target: { id: homework.id, kind: "HOMEWORK" },
    title:
      status === "RETURNED"
        ? notificationTitle("Ajuste solicitado", homework.title)
        : notificationTitle("Tarefa", homework.title),
    type: "HOMEWORK",
  };
}

function feedbackNotification(
  submission: NotificationFeedback,
): MobileNotification | null {
  if (!submission.reviewedAt) {
    return null;
  }

  return {
    eventAt: submission.reviewedAt.toISOString(),
    id: `feedback:${submission.id}`,
    summary: "Abra a tarefa para consultar o feedback da teacher.",
    target: { id: submission.homework.id, kind: "HOMEWORK" },
    title: notificationTitle(
      "Correcao disponivel",
      submission.homework.title,
    ),
    type: "FEEDBACK",
  };
}

function achievementNotification(
  event: NotificationXpEvent,
): MobileNotification {
  return {
    eventAt: event.occurredAt.toISOString(),
    id: `achievement:${event.id}`,
    summary: `Voce ganhou ${event.xp} XP no Candy English.`,
    target: { id: null, kind: "CANDY_XP" },
    title: notificationTitle("Conquista", event.sourceLabel),
    type: "ACHIEVEMENT",
  };
}

function newestFirst(
  left: MobileNotification,
  right: MobileNotification,
) {
  const dateDifference =
    Date.parse(right.eventAt) - Date.parse(left.eventAt);

  return dateDifference || left.id.localeCompare(right.id);
}

export async function getMobileStudentNotifications(
  user: MobileAuthUser,
  options: MobileNotificationOptions = {},
): Promise<MobileNotificationInbox> {
  if (user.role !== "STUDENT") {
    throw new MobileNotificationError("NOTIFICATIONS_FORBIDDEN");
  }

  const generatedAt = (options.now ?? new Date()).toISOString();
  const store = options.store ?? getPrisma();
  const profile = await store.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return { generatedAt, items: [] };
  }

  const [lessons, homeworks, feedbacks, xpEvents] = await Promise.all([
    store.lesson.findMany({
      where: getMobileStudentLessonScope(profile.id),
      orderBy: { updatedAt: "desc" },
      select: notificationLessonSelect,
      take: 12,
    }),
    store.homework.findMany({
      where: {
        OR: [
          { lesson: { studentProfileId: profile.id } },
          {
            studentAssignments: {
              some: { studentProfileId: profile.id },
            },
          },
        ],
        status: "PUBLISHED",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        ...notificationHomeworkSelect,
        submissions: {
          ...notificationHomeworkSelect.submissions,
          where: { studentProfileId: profile.id },
        },
      },
      take: 15,
    }),
    store.homeworkSubmission.findMany({
      where: {
        reviewedAt: { not: null },
        status: { in: ["RETURNED", "REVIEWED"] },
        studentProfileId: profile.id,
      },
      orderBy: { reviewedAt: "desc" },
      select: notificationFeedbackSelect,
      take: 15,
    }),
    store.candyXpEvent.findMany({
      where: {
        kind: { in: [...achievementKinds] },
        role: "STUDENT",
        userId: user.id,
        xp: { gt: 0 },
      },
      orderBy: { occurredAt: "desc" },
      select: notificationXpSelect,
      take: 15,
    }),
  ]);

  const items = [
    ...lessons.map(lessonNotification),
    ...homeworks.map(homeworkNotification).filter((item) => item !== null),
    ...feedbacks.map(feedbackNotification).filter((item) => item !== null),
    ...xpEvents.map(achievementNotification),
  ]
    .sort(newestFirst)
    .slice(0, 50);

  return { generatedAt, items };
}
