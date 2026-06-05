import type { CattyMessage, CattyPageContext } from "@/lib/catty";
import { canAccessCattyUserMemoryTarget } from "@/lib/catty-user-memory";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

export const CATTY_HISTORY_DISPLAY_LIMIT = 120;
export const CATTY_AI_CONTEXT_LIMIT = 8;
export const CATTY_HISTORY_MESSAGE_MAX_LENGTH = 700;
export const CATTY_HISTORY_STORAGE_LIMIT = 50000;
export const CATTY_HISTORY_HEAVY_BYTES = 500 * 1024 * 1024;
export const CATTY_HISTORY_HEAVY_MESSAGE_COUNT = Math.floor(
  CATTY_HISTORY_HEAVY_BYTES / CATTY_HISTORY_MESSAGE_MAX_LENGTH,
);

export type CattyStoredReplySource = "FALLBACK" | "GEMINI" | "OPENAI";

type PersistCattyExchangeInput = {
  cattyReply: string;
  context?: CattyPageContext;
  source: CattyStoredReplySource;
  userId: string;
  userMessage: string;
};

function normalizeStoredText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CATTY_HISTORY_MESSAGE_MAX_LENGTH);
}

function normalizeTask(task?: string) {
  const clean = task?.replace(/\s+/g, " ").trim();

  return clean ? clean.slice(0, 80) : null;
}

export function getCattyHistoryContext(context?: CattyPageContext) {
  const area = context?.area ?? "unknown";
  const task = normalizeTask(context?.task);
  const contextKey = task ? `${area}:${task}` : `${area}:default`;

  return {
    area,
    contextKey: contextKey.slice(0, 120),
    task,
  };
}

export function estimateCattyConversationBytes(messageCount: number) {
  return Math.max(messageCount, 0) * CATTY_HISTORY_MESSAGE_MAX_LENGTH;
}

export async function getCattyConversationMessages(input: {
  context?: CattyPageContext;
  take?: number;
  userId: string;
}): Promise<CattyMessage[]> {
  const prisma = getPrisma();
  const { contextKey } = getCattyHistoryContext(input.context);
  const take = Math.min(
    Math.max(input.take ?? CATTY_HISTORY_DISPLAY_LIMIT, 1),
    CATTY_HISTORY_DISPLAY_LIMIT,
  );
  const conversation = await prisma.cattyConversation.findUnique({
    where: {
      userId_contextKey: {
        contextKey,
        userId: input.userId,
      },
    },
    select: {
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          role: true,
          text: true,
        },
        take,
      },
    },
  });

  if (!conversation) {
    return [];
  }

  return [...conversation.messages]
    .reverse()
    .map((message) => ({
      from: message.role === "CATTY" ? "catty" : "user",
      id: message.id,
      text: message.text,
    }));
}

export async function persistCattyExchange({
  cattyReply,
  context,
  source,
  userId,
  userMessage,
}: PersistCattyExchangeInput) {
  const cleanUserMessage = normalizeStoredText(userMessage);
  const cleanCattyReply = normalizeStoredText(cattyReply);

  if (!cleanUserMessage || !cleanCattyReply) {
    return;
  }

  const prisma = getPrisma();
  const historyContext = getCattyHistoryContext(context);

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.cattyConversation.upsert({
      where: {
        userId_contextKey: {
          contextKey: historyContext.contextKey,
          userId,
        },
      },
      create: {
        area: historyContext.area,
        contextKey: historyContext.contextKey,
        task: historyContext.task,
        userId,
      },
      update: {
        area: historyContext.area,
        task: historyContext.task,
      },
      select: {
        id: true,
      },
    });

    const userStoredMessage = await tx.cattyMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        text: cleanUserMessage,
      },
      select: {
        id: true,
      },
    });
    const cattyStoredMessage = await tx.cattyMessage.create({
      data: {
        conversationId: conversation.id,
        role: "CATTY",
        source,
        text: cleanCattyReply,
      },
      select: {
        id: true,
      },
    });

    const staleMessages = await tx.cattyMessage.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
      },
      skip: CATTY_HISTORY_STORAGE_LIMIT,
      take: 1000,
      where: {
        conversationId: conversation.id,
      },
    });

    if (staleMessages.length > 0) {
      await tx.cattyMessage.deleteMany({
        where: {
          id: {
            in: staleMessages.map((message) => message.id),
          },
        },
      });
    }

    return {
      cattyMessageId: cattyStoredMessage.id,
      conversationId: conversation.id,
      userMessageId: userStoredMessage.id,
    };
  });
}

export async function clearCattyConversationMessages(input: {
  actorRole: Role;
  actorUserId: string;
  conversationId: string;
}) {
  const prisma = getPrisma();
  const conversation = await prisma.cattyConversation.findUnique({
    select: {
      id: true,
      userId: true,
    },
    where: {
      id: input.conversationId,
    },
  });

  if (!conversation) {
    return {
      ok: false,
      message: "Nao encontrei esse historico da Catty.",
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: conversation.userId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para limpar esse historico da Catty.",
    };
  }

  const deleted = await prisma.cattyMessage.deleteMany({
    where: {
      conversationId: conversation.id,
    },
  });

  return {
    ok: true,
    message: `Historico da Catty limpo: ${deleted.count} mensagem(ns) removida(s).`,
  };
}
