import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

type AlertSignatures = Record<string, string>;

type Stamp = {
  id: string;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  reviewedAt?: Date | null;
  submittedAt?: Date | null;
};

function stamp(value?: Stamp | null) {
  if (!value) {
    return "none";
  }

  const date =
    value.updatedAt ?? value.reviewedAt ?? value.createdAt ?? value.submittedAt;

  return `${value.id}:${date ? date.toISOString() : "no-date"}`;
}

function combine(...parts: string[]) {
  return parts.join("|");
}

export async function getAvaNavAlertSignatures(
  role: Role,
  userId: string,
): Promise<AlertSignatures> {
  const prisma = getPrisma();
  const alerts: AlertSignatures = {};

  if (role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return alerts;
    }

    const [live, lesson, homework, reviewed, message, contract, candyXp] =
      await Promise.all([
        prisma.liveSession.findFirst({
          where: {
            isLive: true,
            OR: [{ studentProfileId: null }, { studentProfileId: profile.id }],
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true, updatedAt: true },
        }),
        prisma.lesson.findFirst({
          where: { status: "PUBLISHED", studentProfileId: profile.id },
          orderBy: { updatedAt: "desc" },
          select: { id: true, updatedAt: true },
        }),
        prisma.homework.findFirst({
          where: {
            status: "PUBLISHED",
            lesson: { studentProfileId: profile.id },
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true, updatedAt: true },
        }),
        prisma.homeworkSubmission.findFirst({
          where: {
            status: { in: ["REVIEWED", "RETURNED"] },
            studentProfileId: profile.id,
          },
          orderBy: { submittedAt: "desc" },
          select: { id: true, reviewedAt: true, submittedAt: true },
        }),
        prisma.chatMessage.findFirst({
          where: {
            NOT: { senderUserId: userId },
            thread: { studentProfileId: profile.id },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, id: true },
        }),
        prisma.contractDocument.findFirst({
          where: {
            OR: [{ studentProfileId: null }, { studentProfileId: profile.id }],
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, id: true },
        }),
        prisma.candyXpActivity.findFirst({
          where: {
            status: "PUBLISHED",
            OR: [
              { assignments: { none: {} } },
              { assignments: { some: { studentProfileId: profile.id } } },
            ],
          },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          select: { createdAt: true, id: true, updatedAt: true },
        }),
      ]);

    alerts["/ava/student?task=aula-ao-vivo"] = stamp(live);
    alerts["/ava/student?task=aulas"] = stamp(lesson);
    alerts["/ava/student?task=homeworks"] = combine(
      stamp(homework),
      stamp(reviewed),
    );
    alerts["/ava/student?task=mensagens"] = stamp(message);
    alerts["/ava/student?task=contratos"] = stamp(contract);
    alerts["/ava/student?task=candy-xp"] = stamp(candyXp);

    return alerts;
  }

  const teacherProfile =
    role === "TEACHER"
      ? await prisma.teacherProfile.findUnique({
          where: { userId },
          select: { id: true },
        })
      : null;
  const teacherProfileId = teacherProfile?.id;
  const teacherScoped = role === "TEACHER" && teacherProfileId;

  const [
    lesson,
    homework,
    submission,
    live,
    message,
    contract,
    user,
    finance,
    agenda,
    candyXp,
  ] = await Promise.all([
      prisma.lesson.findFirst({
        where: teacherScoped ? { teacherProfileId } : {},
        orderBy: { updatedAt: "desc" },
        select: { id: true, updatedAt: true },
      }),
      prisma.homework.findFirst({
        where: teacherScoped ? { teacherProfileId } : {},
        orderBy: { updatedAt: "desc" },
        select: { id: true, updatedAt: true },
      }),
      prisma.homeworkSubmission.findFirst({
        where: teacherScoped
          ? { homework: { teacherProfileId }, status: "SUBMITTED" }
          : { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        select: { id: true, submittedAt: true },
      }),
      prisma.liveSession.findFirst({
        where: teacherScoped ? { teacherProfileId } : {},
        orderBy: { updatedAt: "desc" },
        select: { id: true, updatedAt: true },
      }),
      prisma.chatMessage.findFirst({
        where: teacherScoped
          ? {
              NOT: { senderUserId: userId },
              thread: { teacherProfileId },
            }
          : { NOT: { senderUserId: userId } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true },
      }),
      prisma.contractDocument.findFirst({
        where: teacherScoped
          ? {
              OR: [
                { studentProfileId: null },
                {
                  studentProfile: {
                    teacherAssignments: { some: { teacherProfileId } },
                  },
                },
              ],
            }
          : {},
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true },
      }),
      role === "ADMIN"
        ? prisma.user.findFirst({
            orderBy: { updatedAt: "desc" },
            select: { id: true, updatedAt: true },
          })
        : Promise.resolve(null),
      role === "ADMIN"
        ? prisma.financialLog.findFirst({
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, id: true },
          })
        : Promise.resolve(null),
      role === "ADMIN"
        ? prisma.agendaLog.findFirst({
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, id: true },
          })
        : Promise.resolve(null),
      role === "ADMIN"
        ? prisma.candyXpActivitySubmission.findFirst({
            where: { status: "SUBMITTED" },
            orderBy: { submittedAt: "desc" },
            select: { id: true, submittedAt: true },
          })
        : Promise.resolve(null),
    ]);

  alerts["/ava/teacher?task=aula-ao-vivo"] = stamp(live);
  alerts["/ava/teacher?task=criar-aula"] = stamp(lesson);
  alerts["/ava/teacher?task=criar-homework"] = stamp(homework);
  alerts["/ava/teacher?task=corrigir-respostas"] = stamp(submission);
  alerts["/ava/teacher?task=mensagens"] = stamp(message);
  alerts["/ava/teacher?task=contratos"] = stamp(contract);

  if (role === "ADMIN") {
    alerts["/ava/admin?task=usuarios"] = stamp(user);
    alerts["/ava/admin?task=contratos"] = stamp(contract);
    alerts["/ava/admin?task=vincular-aluno"] = stamp(user);
    alerts["/ava/admin?task=financeiro"] = stamp(finance);
    alerts["/ava/admin?task=agenda"] = stamp(agenda);
    alerts["/ava/admin?task=candy-xp"] = stamp(candyXp);
  }

  return alerts;
}
