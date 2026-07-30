import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getPrisma } from "@/lib/prisma";

export type MobileOverviewMetric = {
  id: string;
  label: string;
  unit: "CENTS" | "COUNT" | "XP";
  value: number;
};

export type MobileOverview = {
  generatedAt: string;
  metrics: MobileOverviewMetric[];
  nextItem: {
    at: string | null;
    id: string;
    label: string;
    title: string;
  } | null;
  role: MobileAuthUser["role"];
};

async function getStudentOverview(
  user: MobileAuthUser,
): Promise<MobileOverview> {
  const prisma = getPrisma();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return {
      generatedAt: new Date().toISOString(),
      metrics: [
        { id: "lessons", label: "Aulas", unit: "COUNT", value: 0 },
        { id: "homeworks", label: "Tarefas", unit: "COUNT", value: 0 },
        { id: "submissions", label: "Entregas", unit: "COUNT", value: 0 },
        { id: "messages", label: "Mensagens", unit: "COUNT", value: 0 },
        { id: "xp", label: "Candy XP", unit: "XP", value: 0 },
      ],
      nextItem: null,
      role: user.role,
    };
  }

  const homeworkScope = {
    OR: [
      { lesson: { studentProfileId: profile.id } },
      { studentAssignments: { some: { studentProfileId: profile.id } } },
    ],
  };
  const [
    lessons,
    homeworks,
    submissions,
    messages,
    xpProfile,
    nextLesson,
  ] = await Promise.all([
    prisma.lesson.count({ where: { studentProfileId: profile.id } }),
    prisma.homework.count({ where: homeworkScope }),
    prisma.homeworkSubmission.count({
      where: { studentProfileId: profile.id },
    }),
    prisma.chatMessage.count({
      where: { thread: { studentProfileId: profile.id } },
    }),
    prisma.candyXpProfile.findUnique({
      where: { userId: user.id },
      select: { totalXp: true },
    }),
    prisma.lesson.findFirst({
      where: {
        scheduledAt: { gte: new Date() },
        studentProfileId: profile.id,
      },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, scheduledAt: true, title: true },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      { id: "lessons", label: "Aulas", unit: "COUNT", value: lessons },
      { id: "homeworks", label: "Tarefas", unit: "COUNT", value: homeworks },
      {
        id: "submissions",
        label: "Entregas",
        unit: "COUNT",
        value: submissions,
      },
      { id: "messages", label: "Mensagens", unit: "COUNT", value: messages },
      {
        id: "xp",
        label: "Candy XP",
        unit: "XP",
        value: xpProfile?.totalXp ?? 0,
      },
    ],
    nextItem: nextLesson
      ? {
          at: nextLesson.scheduledAt?.toISOString() ?? null,
          id: nextLesson.id,
          label: "Próxima aula",
          title: nextLesson.title,
        }
      : null,
    role: user.role,
  };
}

async function getTeacherOverview(
  user: MobileAuthUser,
): Promise<MobileOverview> {
  const prisma = getPrisma();
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return {
      generatedAt: new Date().toISOString(),
      metrics: [
        { id: "students", label: "Alunos", unit: "COUNT", value: 0 },
        { id: "lessons", label: "Aulas", unit: "COUNT", value: 0 },
        { id: "homeworks", label: "Homeworks", unit: "COUNT", value: 0 },
        { id: "submissions", label: "Correções", unit: "COUNT", value: 0 },
        { id: "secretary", label: "Secretaria", unit: "COUNT", value: 0 },
      ],
      nextItem: null,
      role: user.role,
    };
  }

  const [students, lessons, homeworks, submissions, secretary, nextLesson] =
    await Promise.all([
      prisma.studentTeacherAssignment.count({
        where: { teacherProfileId: profile.id },
      }),
      prisma.lesson.count({ where: { teacherProfileId: profile.id } }),
      prisma.homework.count({ where: { teacherProfileId: profile.id } }),
      prisma.homeworkSubmission.count({
        where: {
          homework: { teacherProfileId: profile.id },
          reviewedAt: null,
        },
      }),
      prisma.studentPreRegistration.count({
        where: {
          assignedTeacherProfileId: profile.id,
          convertedUserId: null,
        },
      }),
      prisma.lesson.findFirst({
        where: {
          scheduledAt: { gte: new Date() },
          teacherProfileId: profile.id,
        },
        orderBy: { scheduledAt: "asc" },
        select: { id: true, scheduledAt: true, title: true },
      }),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      { id: "students", label: "Alunos", unit: "COUNT", value: students },
      { id: "lessons", label: "Aulas", unit: "COUNT", value: lessons },
      { id: "homeworks", label: "Homeworks", unit: "COUNT", value: homeworks },
      {
        id: "submissions",
        label: "Correções",
        unit: "COUNT",
        value: submissions,
      },
      {
        id: "secretary",
        label: "Secretaria",
        unit: "COUNT",
        value: secretary,
      },
    ],
    nextItem: nextLesson
      ? {
          at: nextLesson.scheduledAt?.toISOString() ?? null,
          id: nextLesson.id,
          label: "Próxima aula",
          title: nextLesson.title,
        }
      : null,
    role: user.role,
  };
}

async function getAdminOverview(
  user: MobileAuthUser,
): Promise<MobileOverview> {
  const prisma = getPrisma();
  const now = new Date();
  const startOfDay = new Date(now);
  const endOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  endOfDay.setHours(23, 59, 59, 999);

  const [activeUsers, preRegistrations, agendaToday, receivables, expenses] =
    await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.studentPreRegistration.count({
        where: { convertedUserId: null },
      }),
      prisma.agendaLesson.count({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          isActive: true,
        },
      }),
      prisma.financialPayment.aggregate({
        where: {
          isActive: true,
          isPaid: false,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        _sum: { snapshotAmountCents: true },
      }),
      prisma.financialExpense.aggregate({
        where: {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        _sum: { amountCents: true },
      }),
    ]);

  return {
    generatedAt: now.toISOString(),
    metrics: [
      {
        id: "active-users",
        label: "Usuários ativos",
        unit: "COUNT",
        value: activeUsers,
      },
      {
        id: "pre-registrations",
        label: "Pré-cadastros",
        unit: "COUNT",
        value: preRegistrations,
      },
      {
        id: "agenda-today",
        label: "Agenda hoje",
        unit: "COUNT",
        value: agendaToday,
      },
      {
        id: "receivables",
        label: "A receber",
        unit: "CENTS",
        value: receivables._sum.snapshotAmountCents ?? 0,
      },
      {
        id: "expenses",
        label: "Despesas",
        unit: "CENTS",
        value: expenses._sum.amountCents ?? 0,
      },
    ],
    nextItem: null,
    role: user.role,
  };
}

export async function getMobileOverview(user: MobileAuthUser) {
  if (user.role === "ADMIN") {
    return getAdminOverview(user);
  }

  if (user.role === "TEACHER") {
    return getTeacherOverview(user);
  }

  return getStudentOverview(user);
}
