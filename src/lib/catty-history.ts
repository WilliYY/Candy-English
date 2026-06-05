import type { CattyMessage, CattyPageContext } from "@/lib/catty";
import { getPrisma } from "@/lib/prisma";

export const CATTY_HISTORY_DISPLAY_LIMIT = 50;
export const CATTY_AI_CONTEXT_LIMIT = 8;

export type CattyStoredReplySource = "FALLBACK" | "GEMINI" | "OPENAI";

type PersistCattyExchangeInput = {
  cattyReply: string;
  context?: CattyPageContext;
  source: CattyStoredReplySource;
  userId: string;
  userMessage: string;
};

function normalizeStoredText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 700);
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
      skip: CATTY_HISTORY_DISPLAY_LIMIT,
      take: CATTY_HISTORY_DISPLAY_LIMIT,
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
