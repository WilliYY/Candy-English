import {
  CATTY_HISTORY_HEAVY_BYTES,
  CATTY_HISTORY_HEAVY_MESSAGE_COUNT,
  CATTY_HISTORY_STORAGE_LIMIT,
  estimateCattyConversationBytes,
} from "@/lib/catty-history";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import {
  hasSensitiveCattyUserMemoryText,
  type CattyUserMemoryCategoryInput,
  type CattyUserMemorySourceInput,
  type CattyUserMemoryStatusInput,
} from "@/lib/validations/catty-user-memory";

export type CattyMemoryUserOption = {
  email: string;
  id: string;
  label: string;
  role: Role;
};

export type CattyMemoryEventRow = {
  action: string;
  createdAt: string;
  createdByName: string | null;
  id: string;
  nextValue: string | null;
  note: string | null;
  previousValue: string | null;
  status: CattyUserMemoryStatusInput | null;
};

export type CattyMemoryRow = {
  category: CattyUserMemoryCategoryInput;
  confidence: number;
  createdAt: string;
  createdByName: string | null;
  flaggedReason: string | null;
  id: string;
  key: string;
  lastUsedAt: string | null;
  recentEvents: CattyMemoryEventRow[];
  source: CattyUserMemorySourceInput;
  status: CattyUserMemoryStatusInput;
  updatedAt: string;
  usageCount: number;
  userEmail: string;
  userId: string;
  userName: string;
  userRole: Role;
  value: string;
};

export type CattyConversationSummaryRow = {
  approxBytes: number;
  area: string;
  contextKey: string;
  id: string;
  isHeavy: boolean;
  messageCount: number;
  task: string | null;
  updatedAt: string;
  userEmail: string;
  userId: string;
  userName: string;
  userRole: Role;
};

export type CattyMemoryAlertRow = {
  id: string;
  kind: "CONFLICT" | "HEAVY_CONTEXT" | "OLD_UNUSED" | "SENSITIVE" | "TOO_MANY";
  message: string;
  severity: "info" | "warning" | "danger";
  userId: string;
  userName: string;
};

export type CattyMemoryManagementData = {
  alerts: CattyMemoryAlertRow[];
  conversations: CattyConversationSummaryRow[];
  memories: CattyMemoryRow[];
  users: CattyMemoryUserOption[];
};

const CATTY_MEMORY_CONTEXT_REVIEW_MESSAGE_COUNT = 20000;
const CATTY_MEMORY_USER_ITEM_WARNING = 40;
const CATTY_MEMORY_OLD_UNUSED_DAYS = 180;
const MANAGEMENT_RESULT_LIMIT = 220;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getUserLabel(user: { email: string; name: string | null }) {
  return user.name?.trim() || user.email;
}

function getOldUnusedCutoff() {
  return new Date(
    Date.now() - CATTY_MEMORY_OLD_UNUSED_DAYS * 24 * 60 * 60 * 1000,
  );
}

async function getAccessibleUserIds(input: {
  viewerRole: Role;
  viewerUserId: string;
}) {
  const prisma = getPrisma();

  if (input.viewerRole === "ADMIN") {
    const users = await prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
      },
      take: 500,
    });

    return users.map((user) => user.id);
  }

  if (input.viewerRole === "TEACHER") {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: {
        userId: input.viewerUserId,
      },
      select: {
        studentAssignments: {
          select: {
            studentProfile: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    return [
      input.viewerUserId,
      ...(teacherProfile?.studentAssignments.map(
        (assignment) => assignment.studentProfile.userId,
      ) ?? []),
    ];
  }

  return [input.viewerUserId];
}

function buildMemoryAlerts(input: {
  conversations: CattyConversationSummaryRow[];
  memories: CattyMemoryRow[];
}) {
  const alerts: CattyMemoryAlertRow[] = [];
  const oldUnusedCutoff = getOldUnusedCutoff();
  const memoryCountsByUser = new Map<string, number>();
  const userNamesById = new Map<string, string>();

  for (const memory of input.memories) {
    userNamesById.set(memory.userId, memory.userName);

    if (memory.status === "ACTIVE" || memory.status === "PENDING") {
      memoryCountsByUser.set(
        memory.userId,
        (memoryCountsByUser.get(memory.userId) ?? 0) + 1,
      );
    }

    if (
      hasSensitiveCattyUserMemoryText(
        `${memory.category} ${memory.key} ${memory.value} ${memory.flaggedReason ?? ""}`,
      )
    ) {
      alerts.push({
        id: `sensitive:${memory.id}`,
        kind: "SENSITIVE",
        message: `Possivel dado sensivel detectado em memoria de ${memory.userName}: revisar e remover.`,
        severity: "danger",
        userId: memory.userId,
        userName: memory.userName,
      });
    }

    if (
      memory.status === "FLAGGED" &&
      (memory.flaggedReason?.toLowerCase().includes("contradiz") ||
        memory.recentEvents.some((event) => event.action === "CONFLICT_FLAGGED"))
    ) {
      alerts.push({
        id: `conflict:${memory.id}`,
        kind: "CONFLICT",
        message: `Memoria contraditoria detectada para ${memory.userName}: ${memory.key} / ${memory.value}.`,
        severity: "warning",
        userId: memory.userId,
        userName: memory.userName,
      });
    }

    const lastUsefulDate = new Date(memory.lastUsedAt ?? memory.updatedAt);

    if (memory.status === "ACTIVE" && lastUsefulDate < oldUnusedCutoff) {
      alerts.push({
        id: `old:${memory.id}`,
        kind: "OLD_UNUSED",
        message: `Memoria antiga sem uso para ${memory.userName}: sugerir arquivamento se nao fizer mais sentido.`,
        severity: "info",
        userId: memory.userId,
        userName: memory.userName,
      });
    }
  }

  for (const [userId, count] of memoryCountsByUser.entries()) {
    if (count > CATTY_MEMORY_USER_ITEM_WARNING) {
      alerts.push({
        id: `many:${userId}`,
        kind: "TOO_MANY",
        message: `Memoria pesada demais para ${userNamesById.get(userId) ?? "usuario"}: ${count} itens ativos/pendentes para revisar contexto.`,
        severity: "warning",
        userId,
        userName: userNamesById.get(userId) ?? "Usuario",
      });
    }
  }

  for (const conversation of input.conversations) {
    if (
      conversation.approxBytes >= CATTY_HISTORY_HEAVY_BYTES ||
      conversation.messageCount >= CATTY_HISTORY_HEAVY_MESSAGE_COUNT
    ) {
      alerts.push({
        id: `heavy-bytes:${conversation.id}`,
        kind: "HEAVY_CONTEXT",
        message: `Memoria pesada demais para ${conversation.userName}: historico estimado passou de 500 MB. Revisar e limpar contexto manualmente.`,
        severity: "danger",
        userId: conversation.userId,
        userName: conversation.userName,
      });
    } else if (
      conversation.messageCount >= CATTY_MEMORY_CONTEXT_REVIEW_MESSAGE_COUNT ||
      conversation.messageCount >= CATTY_HISTORY_STORAGE_LIMIT * 0.8
    ) {
      alerts.push({
        id: `heavy-count:${conversation.id}`,
        kind: "HEAVY_CONTEXT",
        message: `Contexto longo para ${conversation.userName}: ${conversation.messageCount} mensagens neste espaco da Catty.`,
        severity: "warning",
        userId: conversation.userId,
        userName: conversation.userName,
      });
    }
  }

  return alerts.slice(0, 60);
}

export async function getCattyMemoryManagementData(input: {
  viewerRole: Role;
  viewerUserId: string;
}): Promise<CattyMemoryManagementData> {
  const prisma = getPrisma();
  const accessibleUserIds = [...new Set(await getAccessibleUserIds(input))];

  if (accessibleUserIds.length === 0) {
    return {
      alerts: [],
      conversations: [],
      memories: [],
      users: [],
    };
  }

  const [users, memories, conversations] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        email: true,
        id: true,
        name: true,
        role: true,
      },
      where: {
        id: {
          in: accessibleUserIds,
        },
      },
    }),
    prisma.cattyUserMemory.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        category: true,
        confidence: true,
        createdAt: true,
        createdByUser: {
          select: {
            name: true,
          },
        },
        events: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            action: true,
            createdAt: true,
            createdByUser: {
              select: {
                name: true,
              },
            },
            id: true,
            nextValue: true,
            note: true,
            previousValue: true,
            status: true,
          },
          take: 3,
        },
        flaggedReason: true,
        id: true,
        key: true,
        lastUsedAt: true,
        source: true,
        status: true,
        updatedAt: true,
        usageCount: true,
        user: {
          select: {
            email: true,
            id: true,
            name: true,
            role: true,
          },
        },
        userId: true,
        value: true,
      },
      take: MANAGEMENT_RESULT_LIMIT,
      where: {
        userId: {
          in: accessibleUserIds,
        },
      },
    }),
    prisma.cattyConversation.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        _count: {
          select: {
            messages: true,
          },
        },
        area: true,
        contextKey: true,
        id: true,
        task: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
            id: true,
            name: true,
            role: true,
          },
        },
        userId: true,
      },
      take: MANAGEMENT_RESULT_LIMIT,
      where: {
        userId: {
          in: accessibleUserIds,
        },
      },
    }),
  ]);

  const userOptions = users.map((user) => ({
    email: user.email,
    id: user.id,
    label: getUserLabel(user),
    role: user.role,
  }));
  const memoryRows: CattyMemoryRow[] = memories.map((memory) => ({
    category: memory.category,
    confidence: memory.confidence,
    createdAt: memory.createdAt.toISOString(),
    createdByName: memory.createdByUser?.name ?? null,
    flaggedReason: memory.flaggedReason,
    id: memory.id,
    key: memory.key,
    lastUsedAt: toIso(memory.lastUsedAt),
    recentEvents: memory.events.map((event) => ({
      action: event.action,
      createdAt: event.createdAt.toISOString(),
      createdByName: event.createdByUser?.name ?? null,
      id: event.id,
      nextValue: event.nextValue,
      note: event.note,
      previousValue: event.previousValue,
      status: event.status,
    })),
    source: memory.source,
    status: memory.status,
    updatedAt: memory.updatedAt.toISOString(),
    usageCount: memory.usageCount,
    userEmail: memory.user.email,
    userId: memory.userId,
    userName: getUserLabel(memory.user),
    userRole: memory.user.role,
    value: memory.value,
  }));
  const conversationRows: CattyConversationSummaryRow[] = conversations.map(
    (conversation) => {
      const messageCount = conversation._count.messages;
      const approxBytes = estimateCattyConversationBytes(messageCount);

      return {
        approxBytes,
        area: conversation.area,
        contextKey: conversation.contextKey,
        id: conversation.id,
        isHeavy:
          approxBytes >= CATTY_HISTORY_HEAVY_BYTES ||
          messageCount >= CATTY_MEMORY_CONTEXT_REVIEW_MESSAGE_COUNT,
        messageCount,
        task: conversation.task,
        updatedAt: conversation.updatedAt.toISOString(),
        userEmail: conversation.user.email,
        userId: conversation.userId,
        userName: getUserLabel(conversation.user),
        userRole: conversation.user.role,
      };
    },
  );

  return {
    alerts: buildMemoryAlerts({
      conversations: conversationRows,
      memories: memoryRows,
    }),
    conversations: conversationRows,
    memories: memoryRows,
    users: userOptions,
  };
}
