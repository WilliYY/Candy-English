import { CATTY_ARTIFACT_THEMES } from "@/lib/catty-artifacts";
import type { CattyArtifactCustomItem } from "@/lib/catty-artifacts";
import {
  getCattyArtifactEnrichmentsForUsers,
  type CattyArtifactEnrichmentRow,
} from "@/lib/catty-artifact-enrichment";
import {
  canAccessCattyUserMemoryTarget,
  upsertCattyUserMemory,
} from "@/lib/catty-user-memory";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import {
  cattyUserArtifactStatusUpdateSchema,
  cattyUserArtifactUpsertSchema,
  type CattyUserArtifactStatusInput,
  type CattyUserArtifactStatusUpdateInput,
  type CattyUserArtifactUpsertInput,
} from "@/lib/validations/catty-artifacts";
import {
  hasSensitiveCattyUserMemoryText,
  normalizeCattyUserMemoryText,
} from "@/lib/validations/catty-user-memory";

type ActorContext = {
  actorRole: Role;
  actorUserId: string;
};

type UpsertCattyUserArtifactInput =
  CattyUserArtifactUpsertInput & ActorContext;
type UpdateCattyUserArtifactStatusInput =
  CattyUserArtifactStatusUpdateInput & ActorContext;

export type CattyArtifactUserOption = {
  detectedInterests: string[];
  email: string;
  id: string;
  label: string;
  role: Role;
};

export type CattyUserArtifactRow = {
  blockedReason: string | null;
  catchphrases: string[];
  createdAt: string;
  createdByName: string | null;
  emojis: string[];
  example: string | null;
  id: string;
  label: string;
  lastUsedAt: string | null;
  sounds: string[];
  status: CattyUserArtifactStatusInput;
  themeId: string;
  toneRule: string | null;
  updatedAt: string;
  updatedByName: string | null;
  usageCount: number;
  userEmail: string;
  userId: string;
  userName: string;
  userRole: Role;
};

export type CattyArtifactRecentUsageRow = {
  artifactLabel: string;
  artifactThemeId: string;
  createdAt: string;
  id: string;
  matchedElement: string;
  textPreview: string;
  userId: string;
  userName: string;
};

export type CattyArtifactAlertRow = {
  id: string;
  message: string;
  severity: "info" | "warning" | "danger";
  userId: string;
  userName: string;
};

export type CattyArtifactThemeOption = {
  catchphrases: string[];
  emojis: string[];
  id: string;
  label: string;
  sounds: string[];
};

export type CattyArtifactManagementData = {
  alerts: CattyArtifactAlertRow[];
  artifacts: CattyUserArtifactRow[];
  enrichments: CattyArtifactEnrichmentRow[];
  recentUsages: CattyArtifactRecentUsageRow[];
  themeOptions: CattyArtifactThemeOption[];
  users: CattyArtifactUserOption[];
};

const ARTIFACT_CONTEXT_LIMIT = 8;
const ARTIFACT_PANEL_LIMIT = 260;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getUserLabel(user: { email: string; name: string | null }) {
  return user.name?.trim() || user.email;
}

function normalizeArtifactThemeId(value: string) {
  return normalizeCattyUserMemoryText(value)
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function compactText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function joinArtifactText(input: {
  catchphrases: string[];
  emojis: string[];
  example?: string | null;
  label: string;
  sounds: string[];
  themeId: string;
  toneRule?: string | null;
}) {
  return [
    input.themeId,
    input.label,
    ...input.emojis,
    ...input.catchphrases,
    ...input.sounds,
    input.example ?? "",
    input.toneRule ?? "",
  ].join(" ");
}

function getStatusForActor(input: {
  actorRole: Role;
  requestedStatus: CattyUserArtifactStatusInput;
}) {
  if (input.actorRole === "STUDENT") {
    return input.requestedStatus === "DISABLED" ? "DISABLED" : "PENDING";
  }

  return input.requestedStatus;
}

function getMemorySourceForActor(role: Role) {
  if (role === "ADMIN") return "ADMIN_NOTE" as const;
  if (role === "TEACHER") return "TEACHER_NOTE" as const;
  return "USER_MESSAGE" as const;
}

async function getAccessibleStudentUserIds(input: ActorContext) {
  const prisma = getPrisma();

  if (input.actorRole === "ADMIN") {
    const users = await prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
      },
      take: 500,
      where: {
        role: "STUDENT",
      },
    });

    return users.map((user) => user.id);
  }

  if (input.actorRole === "TEACHER") {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: {
        userId: input.actorUserId,
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

    return (
      teacherProfile?.studentAssignments.map(
        (assignment) => assignment.studentProfile.userId,
      ) ?? []
    );
  }

  return [input.actorUserId];
}

async function syncArtifactMemory(input: {
  actorRole: Role;
  actorUserId: string;
  label: string;
  status: CattyUserArtifactStatusInput;
  targetUserId: string;
  themeId: string;
}) {
  if (input.status === "ACTIVE") {
    await upsertCattyUserMemory({
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      category: "FAVORITE_THEME",
      confidence: input.actorRole === "STUDENT" ? 70 : 86,
      key: `artifact_${input.themeId}`,
      source: getMemorySourceForActor(input.actorRole),
      status: "ACTIVE",
      targetUserId: input.targetUserId,
      value: `gosta de ${input.label}`,
    });
  }

  if (input.status === "DISABLED") {
    await upsertCattyUserMemory({
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      category: "STYLE",
      confidence: 94,
      key: `avoid_${input.themeId}`,
      source: getMemorySourceForActor(input.actorRole),
      status: "ACTIVE",
      targetUserId: input.targetUserId,
      value: `evitar artefatos de ${input.label}`,
    });
  }
}

export async function upsertCattyUserArtifact(
  input: UpsertCattyUserArtifactInput,
) {
  const parsed = cattyUserArtifactUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise o artefato da Catty antes de salvar.",
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: parsed.data.targetUserId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para ajustar esse estilo da Catty.",
    };
  }

  const themeId = normalizeArtifactThemeId(parsed.data.themeId);
  const status = getStatusForActor({
    actorRole: input.actorRole,
    requestedStatus: parsed.data.status,
  });
  const prisma = getPrisma();
  const existing = await prisma.cattyUserArtifact.findUnique({
    where: {
      userId_themeId: {
        themeId,
        userId: parsed.data.targetUserId,
      },
    },
  });

  const artifactText = joinArtifactText({
    catchphrases: parsed.data.catchphrasesText,
    emojis: parsed.data.emojisText,
    example: parsed.data.example,
    label: parsed.data.label,
    sounds: parsed.data.soundsText,
    themeId,
    toneRule: parsed.data.toneRule,
  });

  if (hasSensitiveCattyUserMemoryText(artifactText)) {
    return {
      ok: false,
      message: "Esse artefato contem dado sensivel. Ajuste antes de salvar.",
    };
  }

  const blockedReason =
    status === "DISABLED"
      ? parsed.data.blockedReason ?? "Tema marcado para nao usar."
      : status === "ARCHIVED"
        ? parsed.data.blockedReason ?? "Artefato arquivado por revisao humana."
        : null;
  const data = {
    blockedReason,
    catchphrases: parsed.data.catchphrasesText,
    emojis: parsed.data.emojisText,
    example: parsed.data.example ?? null,
    label: compactText(parsed.data.label, 64),
    sounds: parsed.data.soundsText,
    status,
    toneRule: parsed.data.toneRule ?? null,
    updatedByUserId: input.actorUserId,
  };
  const artifact = existing
    ? await prisma.cattyUserArtifact.update({
        data,
        where: {
          id: existing.id,
        },
      })
    : await prisma.cattyUserArtifact.create({
        data: {
          ...data,
          createdByUserId: input.actorUserId,
          themeId,
          userId: parsed.data.targetUserId,
        },
      });

  await syncArtifactMemory({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    label: parsed.data.label,
    status,
    targetUserId: parsed.data.targetUserId,
    themeId,
  });

  return {
    artifactId: artifact.id,
    ok: true,
    message:
      input.actorRole === "STUDENT" && status === "PENDING"
        ? "Sugestao enviada. A Candy precisa aprovar antes da Catty usar."
        : existing
          ? "Artefato da Catty atualizado."
          : "Artefato da Catty salvo.",
  };
}

export async function updateCattyUserArtifactStatus(
  input: UpdateCattyUserArtifactStatusInput,
) {
  const parsed = cattyUserArtifactStatusUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Status invalido para o artefato da Catty.",
    };
  }

  const prisma = getPrisma();
  const artifact = await prisma.cattyUserArtifact.findUnique({
    select: {
      id: true,
      label: true,
      status: true,
      themeId: true,
      userId: true,
    },
    where: {
      id: parsed.data.artifactId,
    },
  });

  if (!artifact) {
    return {
      ok: false,
      message: "Nao encontrei esse artefato da Catty.",
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: artifact.userId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para alterar esse artefato.",
    };
  }

  if (input.actorRole === "STUDENT" && parsed.data.status === "ACTIVE") {
    return {
      ok: false,
      message: "Aluno pode sugerir ou desativar tema, mas nao aprovar sozinho.",
    };
  }

  const status = getStatusForActor({
    actorRole: input.actorRole,
    requestedStatus: parsed.data.status,
  });

  await prisma.cattyUserArtifact.update({
    data: {
      blockedReason:
        status === "DISABLED"
          ? parsed.data.blockedReason ?? "Tema marcado para nao usar."
          : status === "ARCHIVED"
            ? parsed.data.blockedReason ?? "Artefato arquivado."
            : null,
      status,
      updatedByUserId: input.actorUserId,
    },
    where: {
      id: artifact.id,
    },
  });

  await syncArtifactMemory({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    label: artifact.label,
    status,
    targetUserId: artifact.userId,
    themeId: artifact.themeId,
  });

  return {
    artifactId: artifact.id,
    ok: true,
    message: "Status do artefato da Catty atualizado.",
  };
}

export async function getCattyUserArtifactContext(input: {
  userId: string;
}): Promise<CattyArtifactCustomItem[]> {
  const prisma = getPrisma();
  const artifacts = await prisma.cattyUserArtifact.findMany({
    orderBy: [
      {
        usageCount: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    select: {
      catchphrases: true,
      emojis: true,
      example: true,
      id: true,
      label: true,
      sounds: true,
      themeId: true,
      toneRule: true,
    },
    take: ARTIFACT_CONTEXT_LIMIT,
    where: {
      status: "ACTIVE",
      userId: input.userId,
    },
  });

  return artifacts;
}

export async function recordCattyUserArtifactUsage(artifactId?: string | null) {
  if (!artifactId) {
    return;
  }

  const prisma = getPrisma();

  await prisma.cattyUserArtifact.updateMany({
    data: {
      lastUsedAt: new Date(),
      usageCount: {
        increment: 1,
      },
    },
    where: {
      id: artifactId,
      status: "ACTIVE",
    },
  });
}

function getArtifactTerms(artifact: {
  catchphrases: string[];
  emojis: string[];
  label: string;
  sounds: string[];
  themeId: string;
}) {
  return [
    ...artifact.emojis,
    ...artifact.catchphrases,
    ...artifact.sounds,
    artifact.label,
    artifact.themeId,
  ]
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function matchRecentArtifactUsage(input: {
  artifact: CattyUserArtifactRow;
  message: {
    createdAt: Date;
    id: string;
    text: string;
    userId: string;
    userName: string;
  };
}) {
  const normalizedText = normalizeCattyUserMemoryText(input.message.text);

  for (const term of getArtifactTerms(input.artifact)) {
    if (
      input.message.text.includes(term) ||
      normalizedText.includes(normalizeCattyUserMemoryText(term))
    ) {
      return {
        artifactLabel: input.artifact.label,
        artifactThemeId: input.artifact.themeId,
        createdAt: input.message.createdAt.toISOString(),
        id: `${input.message.id}:${input.artifact.id}:${term}`,
        matchedElement: term,
        textPreview: compactText(input.message.text, 110),
        userId: input.message.userId,
        userName: input.message.userName,
      } satisfies CattyArtifactRecentUsageRow;
    }
  }

  return null;
}

function isCattyArtifactRecentUsageRow(
  value: CattyArtifactRecentUsageRow | null,
): value is CattyArtifactRecentUsageRow {
  return value !== null;
}

function buildArtifactAlerts(input: {
  artifacts: CattyUserArtifactRow[];
  recentUsages: CattyArtifactRecentUsageRow[];
}) {
  const alerts: CattyArtifactAlertRow[] = [];
  const pendingByUser = new Map<string, { count: number; userName: string }>();
  const recentByArtifact = new Map<
    string,
    { count: number; element: string; userId: string; userName: string }
  >();

  for (const artifact of input.artifacts) {
    if (artifact.status === "PENDING") {
      const current = pendingByUser.get(artifact.userId) ?? {
        count: 0,
        userName: artifact.userName,
      };

      current.count += 1;
      pendingByUser.set(artifact.userId, current);
    }

    const text = joinArtifactText(artifact);

    if (hasSensitiveCattyUserMemoryText(text)) {
      alerts.push({
        id: `sensitive:${artifact.id}`,
        message: `Possivel dado sensivel em artefato de ${artifact.userName}: revisar e arquivar.`,
        severity: "danger",
        userId: artifact.userId,
        userName: artifact.userName,
      });
    }
  }

  for (const usage of input.recentUsages) {
    const key = `${usage.userId}:${usage.artifactThemeId}:${usage.matchedElement}`;
    const current = recentByArtifact.get(key) ?? {
      count: 0,
      element: usage.matchedElement,
      userId: usage.userId,
      userName: usage.userName,
    };

    current.count += 1;
    recentByArtifact.set(key, current);
  }

  for (const [userId, value] of pendingByUser.entries()) {
    alerts.push({
      id: `pending:${userId}`,
      message: `${value.userName} tem ${value.count} sugestao(oes) de estilo da Catty pendente(s).`,
      severity: "info",
      userId,
      userName: value.userName,
    });
  }

  for (const [key, value] of recentByArtifact.entries()) {
    if (value.count >= 3) {
      alerts.push({
        id: `repeat:${key}`,
        message: `Repeticao detectada para ${value.userName}: "${value.element}" apareceu ${value.count} vez(es) recentemente.`,
        severity: "warning",
        userId: value.userId,
        userName: value.userName,
      });
    }
  }

  return alerts.slice(0, 50);
}

export async function getCattyArtifactManagementData(
  input: ActorContext,
): Promise<CattyArtifactManagementData> {
  const prisma = getPrisma();
  const accessibleUserIds = [...new Set(await getAccessibleStudentUserIds(input))];

  if (accessibleUserIds.length === 0) {
    return {
      alerts: [],
      artifacts: [],
      enrichments: [],
      recentUsages: [],
      themeOptions: CATTY_ARTIFACT_THEMES.map((theme) => ({
        catchphrases: theme.catchphrases,
        emojis: theme.emojis,
        id: theme.id,
        label: theme.label,
        sounds: theme.sounds,
      })),
      users: [],
    };
  }

  const [users, artifacts, enrichments, messages] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        cattyUserMemories: {
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            category: true,
            key: true,
            value: true,
          },
          take: 8,
          where: {
            category: {
              in: ["INTEREST", "FAVORITE_THEME", "EMOJI_PREFERENCE", "STYLE"],
            },
            status: {
              in: ["ACTIVE", "PENDING"],
            },
          },
        },
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
    prisma.cattyUserArtifact.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        blockedReason: true,
        catchphrases: true,
        createdAt: true,
        createdByUser: {
          select: {
            name: true,
          },
        },
        emojis: true,
        example: true,
        id: true,
        label: true,
        lastUsedAt: true,
        sounds: true,
        status: true,
        themeId: true,
        toneRule: true,
        updatedAt: true,
        updatedByUser: {
          select: {
            name: true,
          },
        },
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
      },
      take: ARTIFACT_PANEL_LIMIT,
      where: {
        userId: {
          in: accessibleUserIds,
        },
      },
    }),
    getCattyArtifactEnrichmentsForUsers(accessibleUserIds),
    prisma.cattyMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        conversation: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            userId: true,
          },
        },
        createdAt: true,
        id: true,
        text: true,
      },
      take: 140,
      where: {
        conversation: {
          userId: {
            in: accessibleUserIds,
          },
        },
        role: "CATTY",
      },
    }),
  ]);

  const userRows: CattyArtifactUserOption[] = users.map((user) => ({
    detectedInterests: user.cattyUserMemories
      .map((memory) =>
        compactText(`${memory.category}/${memory.key}: ${memory.value}`, 90),
      )
      .slice(0, 5),
    email: user.email,
    id: user.id,
    label: getUserLabel(user),
    role: user.role,
  }));
  const artifactRows: CattyUserArtifactRow[] = artifacts.map((artifact) => ({
    blockedReason: artifact.blockedReason,
    catchphrases: artifact.catchphrases,
    createdAt: artifact.createdAt.toISOString(),
    createdByName: artifact.createdByUser?.name ?? null,
    emojis: artifact.emojis,
    example: artifact.example,
    id: artifact.id,
    label: artifact.label,
    lastUsedAt: toIso(artifact.lastUsedAt),
    sounds: artifact.sounds,
    status: artifact.status,
    themeId: artifact.themeId,
    toneRule: artifact.toneRule,
    updatedAt: artifact.updatedAt.toISOString(),
    updatedByName: artifact.updatedByUser?.name ?? null,
    usageCount: artifact.usageCount,
    userEmail: artifact.user.email,
    userId: artifact.userId,
    userName: getUserLabel(artifact.user),
    userRole: artifact.user.role,
  }));
  const artifactsByUserId = artifactRows.reduce(
    (map, artifact) => {
      const list = map.get(artifact.userId) ?? [];

      list.push(artifact);
      map.set(artifact.userId, list);

      return map;
    },
    new Map<string, CattyUserArtifactRow[]>(),
  );
  const recentUsages = messages
    .flatMap((message) => {
      const userId = message.conversation.userId;
      const userName = getUserLabel(message.conversation.user);

      return (artifactsByUserId.get(userId) ?? [])
        .map((artifact) =>
          matchRecentArtifactUsage({
            artifact,
            message: {
              createdAt: message.createdAt,
              id: message.id,
              text: message.text,
              userId,
              userName,
            },
          }),
        )
        .filter(isCattyArtifactRecentUsageRow);
    })
    .slice(0, 40);

  return {
    alerts: buildArtifactAlerts({
      artifacts: artifactRows,
      recentUsages,
    }),
    artifacts: artifactRows,
    enrichments,
    recentUsages,
    themeOptions: CATTY_ARTIFACT_THEMES.map((theme) => ({
      catchphrases: theme.catchphrases,
      emojis: theme.emojis,
      id: theme.id,
      label: theme.label,
      sounds: theme.sounds,
    })),
    users: userRows,
  };
}
