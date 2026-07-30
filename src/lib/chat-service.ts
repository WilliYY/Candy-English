import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

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

async function actorCanUsePair(actor: ChatActor, pair: ChatPair) {
  const prisma = getPrisma();
  const assignment = await prisma.studentTeacherAssignment.findUnique({
    where: { teacherProfileId_studentProfileId: pair },
    select: { id: true },
  });

  if (!assignment) {
    return false;
  }

  if (actor.role === "ADMIN") {
    return true;
  }

  if (actor.role === "TEACHER") {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    return profile?.id === pair.teacherProfileId;
  }

  if (actor.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    return profile?.id === pair.studentProfileId;
  }

  return false;
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
  const profileScope =
    actor.role === "ADMIN"
      ? {}
      : actor.role === "TEACHER"
        ? { teacherProfile: { userId: actor.userId } }
        : { studentProfile: { userId: actor.userId } };
  const assignments = await prisma.studentTeacherAssignment.findMany({
    where: profileScope,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      createdAt: true,
      id: true,
      studentProfile: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
      teacherProfile: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  if (assignments.length === 0) {
    return [];
  }

  const pairs = assignments.map((assignment) => ({
    studentProfileId: assignment.studentProfile.id,
    teacherProfileId: assignment.teacherProfile.id,
  }));
  const threads = await prisma.chatThread.findMany({
    where: { OR: pairs },
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

  return assignments
    .map((assignment) => {
      const thread = threadsByPair.get(
        `${assignment.teacherProfile.id}:${assignment.studentProfile.id}`,
      );
      const peerName =
        actor.role === "STUDENT"
          ? assignment.teacherProfile.user.name
          : assignment.studentProfile.user.name;

      return {
        id: assignment.id,
        lastMessage: thread?.messages[0]?.body ?? null,
        lastMessageAt:
          thread?.messages[0]?.createdAt.toISOString() ??
          thread?.updatedAt.toISOString() ??
          assignment.createdAt.toISOString(),
        peerName,
        studentProfileId: assignment.studentProfile.id,
        teacherProfileId: assignment.teacherProfile.id,
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
