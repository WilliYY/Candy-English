import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import { getStaffStudentSelectionWhere } from "@/lib/staff-student-access";

export type ChatActor = {
  role: Role;
  userId: string;
};

export type ChatPair = {
  studentProfileId: string;
  teacherProfileId: string;
};

export type SendAuthorizedChatInput = ChatPair & {
  body: string;
};

export type ChatServiceResult = {
  message: string;
  ok: boolean;
};

type ActiveChatPair = {
  hasExistingStudentAccess: boolean;
  studentUserId: string;
  teacherUserId: string;
};

export function canActorUseActiveChatPair(
  actor: ChatActor,
  pair: ActiveChatPair,
) {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "TEACHER") return pair.teacherUserId === actor.userId;
  if (actor.role === "STUDENT") {
    return (
      pair.studentUserId === actor.userId && pair.hasExistingStudentAccess
    );
  }
  return false;
}

async function actorCanUsePair(actor: ChatActor, pair: ChatPair) {
  const prisma = getPrisma();
  const [studentProfile, teacherProfile] = await Promise.all([
    prisma.studentProfile.findFirst({
      where: {
        id: pair.studentProfileId,
        user: { deletedAt: null, isActive: true, role: "STUDENT" },
      },
      select: { id: true, userId: true },
    }),
    prisma.teacherProfile.findFirst({
      where: {
        id: pair.teacherProfileId,
        user: { deletedAt: null, isActive: true, role: "TEACHER" },
      },
      select: { id: true, userId: true },
    }),
  ]);

  if (!studentProfile || !teacherProfile) {
    return false;
  }

  let hasExistingStudentAccess = false;
  if (actor.role === "STUDENT") {
    const [assignment, thread] = await Promise.all([
      prisma.studentTeacherAssignment.findUnique({
        where: { teacherProfileId_studentProfileId: pair },
        select: { id: true },
      }),
      prisma.chatThread.findUnique({
        where: { teacherProfileId_studentProfileId: pair },
        select: { id: true },
      }),
    ]);

    hasExistingStudentAccess = Boolean(assignment || thread);
  }

  return canActorUseActiveChatPair(actor, {
    hasExistingStudentAccess,
    studentUserId: studentProfile.userId,
    teacherUserId: teacherProfile.userId,
  });
}

export async function sendAuthorizedChatMessage(
  actor: ChatActor,
  input: SendAuthorizedChatInput,
): Promise<ChatServiceResult> {
  if (!(await actorCanUsePair(actor, input))) {
    return {
      message: "Você não tem acesso a esta conversa.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  const thread = await prisma.chatThread.upsert({
    where: {
      teacherProfileId_studentProfileId: {
        studentProfileId: input.studentProfileId,
        teacherProfileId: input.teacherProfileId,
      },
    },
    create: {
      studentProfileId: input.studentProfileId,
      teacherProfileId: input.teacherProfileId,
    },
    update: { updatedAt: new Date() },
    select: { id: true },
  });

  await prisma.chatMessage.create({
    data: {
      body: input.body,
      senderUserId: actor.userId,
      threadId: thread.id,
    },
  });

  return { message: "Mensagem enviada.", ok: true };
}

export async function listAuthorizedChatThreads(actor: ChatActor) {
  const prisma = getPrisma();
  const [students, teachers] = await Promise.all([
    prisma.studentProfile.findMany({
      where:
        actor.role === "STUDENT"
          ? {
              ...getStaffStudentSelectionWhere(),
              userId: actor.userId,
            }
          : getStaffStudentSelectionWhere(),
      orderBy: { user: { name: "asc" } },
      take: 100,
      select: {
        id: true,
        user: { select: { createdAt: true, name: true } },
      },
    }),
    prisma.teacherProfile.findMany({
      where: {
        ...(actor.role === "TEACHER" ? { userId: actor.userId } : {}),
        ...(actor.role === "STUDENT"
          ? {
              OR: [
                { studentAssignments: { some: { studentProfile: { userId: actor.userId } } } },
                { chatThreads: { some: { studentProfile: { userId: actor.userId } } } },
              ],
            }
          : {}),
        user: { deletedAt: null, isActive: true, role: "TEACHER" },
      },
      orderBy: { user: { name: "asc" } },
      take: 100,
      select: {
        id: true,
        user: { select: { createdAt: true, name: true } },
      },
    }),
  ]);
  const pairs = teachers
    .flatMap((teacher) =>
      students.map((student) => ({ student, teacher })),
    )
    .slice(0, 100);

  if (pairs.length === 0) {
    return [];
  }

  const threads = await prisma.chatThread.findMany({
    where: {
      OR: pairs.map(({ student, teacher }) => ({
        studentProfileId: student.id,
        teacherProfileId: teacher.id,
      })),
    },
    select: {
      messages: {
        orderBy: { createdAt: "desc" },
        select: { body: true, createdAt: true },
        take: 1,
      },
      studentProfileId: true,
      teacherProfileId: true,
      updatedAt: true,
    },
  });
  const threadsByPair = new Map(
    threads.map((thread) => [
      `${thread.teacherProfileId}:${thread.studentProfileId}`,
      thread,
    ]),
  );

  return pairs
    .map(({ student, teacher }) => {
      const thread = threadsByPair.get(
        `${teacher.id}:${student.id}`,
      );
      const peerName =
        actor.role === "STUDENT"
          ? teacher.user.name
          : student.user.name;

      return {
        id: thread?.studentProfileId
          ? `${teacher.id}:${student.id}`
          : `available:${teacher.id}:${student.id}`,
        lastMessage: thread?.messages[0]?.body ?? null,
        lastMessageAt:
          thread?.messages[0]?.createdAt.toISOString() ??
          thread?.updatedAt.toISOString() ??
          new Date(
            Math.max(
              student.user.createdAt.getTime(),
              teacher.user.createdAt.getTime(),
            ),
          ).toISOString(),
        peerName,
        studentProfileId: student.id,
        teacherProfileId: teacher.id,
      };
    })
    .sort((left, right) =>
      right.lastMessageAt.localeCompare(left.lastMessageAt),
    );
}

export async function listAuthorizedChatMessages(
  actor: ChatActor,
  pair: ChatPair,
) {
  if (!(await actorCanUsePair(actor, pair))) {
    return null;
  }

  const prisma = getPrisma();
  const thread = await prisma.chatThread.findUnique({
    where: { teacherProfileId_studentProfileId: pair },
    select: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: {
          body: true,
          createdAt: true,
          id: true,
          senderUserId: true,
          senderUser: { select: { name: true } },
        },
      },
    },
  });

  return (thread?.messages ?? []).map((message) => ({
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    id: message.id,
    isMine: message.senderUserId === actor.userId,
    senderName: message.senderUser.name,
  }));
}
