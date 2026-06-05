import type { Role } from "@/lib/roles";
import type { CattyResponsePlan } from "@/lib/catty";
import { getPrisma } from "@/lib/prisma";
import {
  cattyUserMemoryStatusUpdateSchema,
  cattyUserMemoryUpsertSchema,
  cattyUserMemoryValueUpdateSchema,
  hasSensitiveCattyUserMemoryText,
  normalizeCattyUserMemoryText,
  type CattyUserMemoryCategoryInput,
  type CattyUserMemorySourceInput,
  type CattyUserMemoryStatusInput,
  type CattyUserMemoryStatusUpdateInput,
  type CattyUserMemoryUpsertInput,
  type CattyUserMemoryValueUpdateInput,
} from "@/lib/validations/catty-user-memory";

export type CattyUserMemoryPromptItem = {
  category: CattyUserMemoryCategoryInput;
  confidence: number;
  id: string;
  key: string;
  lastUsedAt?: Date | null;
  source: CattyUserMemorySourceInput;
  updatedAt?: Date | null;
  usageCount?: number;
  value: string;
};

type ActorContext = {
  actorRole: Role;
  actorUserId: string;
};

type MemoryCandidate = {
  category: CattyUserMemoryCategoryInput;
  confidence: number;
  key: string;
  value: string;
};

type UpsertCattyUserMemoryInput = CattyUserMemoryUpsertInput & ActorContext;
type UpdateCattyUserMemoryStatusInput =
  CattyUserMemoryStatusUpdateInput & ActorContext;
type UpdateCattyUserMemoryValueInput =
  CattyUserMemoryValueUpdateInput & ActorContext;

const CATTY_USER_MEMORY_PROMPT_LIMIT = 5;
const CATTY_USER_MEMORY_CANDIDATE_LIMIT = 24;
const CATTY_USER_MEMORY_CLEANUP_THRESHOLD = 40;
const CATTY_USER_MEMORY_CLEANUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CATTY_USER_MEMORY_DIFFICULTY_LIMIT = 2;
const CATTY_USER_MEMORY_INTEREST_LIMIT = 2;

const promptFriendlyIntents = new Set<CattyResponsePlan["intent"]>([
  "candy_xp",
  "confusing_question",
  "explain_word",
  "motivation",
  "out_of_scope",
  "practice_english",
]);

const difficultyFriendlyIntents = new Set<CattyResponsePlan["intent"]>([
  "correct_sentence",
  "explain_word",
  "homework_hint",
  "practice_english",
  "ready_answer_request",
  "translate_sentence",
]);

const interestMemoryCategories = new Set<CattyUserMemoryCategoryInput>([
  "FAVORITE_THEME",
  "INTEREST",
]);

const personalStyleMemoryCategories = new Set<CattyUserMemoryCategoryInput>([
  "EMOJI_PREFERENCE",
  "LEARNING_GOAL",
  "STYLE",
]);

function compactText(text: string, maxLength: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeMemoryKey(value: string) {
  const normalized = normalizeCattyUserMemoryText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return normalized || "note";
}

function cleanMemoryValue(value: string) {
  return compactText(
    value
      .replace(/["'`<>]/g, "")
      .replace(/\b(minha|minhas|meu|meus|eu)\b/gi, "")
      .replace(/\s+/g, " "),
    160,
  );
}

function getMemoryTokens(value: string) {
  return normalizeCattyUserMemoryText(value)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length >= 3)
    .slice(0, 24);
}

function getMemoryTimestampScore(date?: Date | null) {
  if (!date) {
    return 0;
  }

  const ageInDays = Math.max(
    (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000),
    0,
  );

  if (ageInDays <= 7) return 2;
  if (ageInDays <= 30) return 1;
  if (ageInDays <= 90) return 0.5;

  return 0;
}

function getMemoryIntentScore(
  memory: CattyUserMemoryPromptItem,
  intent?: CattyResponsePlan["intent"],
) {
  if (!intent) {
    return 0;
  }

  if (memory.category === "DIFFICULTY") {
    return difficultyFriendlyIntents.has(intent) ? 7 : 2;
  }

  if (interestMemoryCategories.has(memory.category)) {
    return promptFriendlyIntents.has(intent) ? 6 : 1.5;
  }

  if (memory.category === "LEARNING_GOAL") {
    return ["candy_xp", "motivation", "practice_english"].includes(intent)
      ? 5
      : 1;
  }

  if (memory.category === "STYLE" || memory.category === "EMOJI_PREFERENCE") {
    return ["complex_question", "confusing_question", "explain_word"].includes(
      intent,
    )
      ? 4
      : 1.5;
  }

  return 0.5;
}

function scoreCattyUserMemory(input: {
  intent?: CattyResponsePlan["intent"];
  memory: CattyUserMemoryPromptItem;
  message?: string;
}) {
  const memory = input.memory;
  const normalizedMessage = normalizeCattyUserMemoryText(input.message ?? "");
  const tokens = getMemoryTokens(
    `${memory.category} ${memory.key} ${memory.value}`,
  );
  const tokenHits = tokens.filter((token) =>
    normalizedMessage.includes(token),
  ).length;

  return (
    getMemoryIntentScore(memory, input.intent) +
    tokenHits * 3 +
    Math.min(memory.confidence / 25, 4) +
    Math.min(memory.usageCount ?? 0, 8) * 0.25 +
    getMemoryTimestampScore(memory.updatedAt) +
    getMemoryTimestampScore(memory.lastUsedAt) * 0.5
  );
}

function isUsefulMemoryValue(value: string) {
  const normalized = normalizeCattyUserMemoryText(value);

  if (value.length < 2 || value.length > 160) {
    return false;
  }

  if (hasSensitiveCattyUserMemoryText(value)) {
    return false;
  }

  return /[a-z0-9]/.test(normalized);
}

function captureNormalizedValue(
  normalizedText: string,
  patterns: RegExp[],
  maxWords = 8,
) {
  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    const rawValue = match?.[1]?.trim();

    if (!rawValue) {
      continue;
    }

    const value = rawValue
      .split(/\s+/)
      .slice(0, maxWords)
      .join(" ")
      .replace(/[.!?,;:]+$/g, "")
      .trim();

    if (isUsefulMemoryValue(value)) {
      return value;
    }
  }

  return null;
}

export function extractCattyUserMemoryCandidates(
  message: string,
): MemoryCandidate[] {
  const normalized = normalizeCattyUserMemoryText(message);
  const candidates: MemoryCandidate[] = [];
  const animal = captureNormalizedValue(normalized, [
    /\b(?:meu animal favorito|animal favorito) (?:e|eh|seria) ([a-z0-9 _-]{2,80})/,
    /\b(?:gosto de|adoro|amo) (capivara|gato|gatinho|cachorro|coelho|raposa|panda|animal fofo[a-z0-9 _-]*)/,
  ]);
  const theme = captureNormalizedValue(normalized, [
    /\b(?:meu tema favorito|tema favorito) (?:e|eh|seria) ([a-z0-9 _-]{2,80})/,
    /\b(?:gosto de|adoro|amo) (pokemon|filmes|series|jogos|anime|musica|kpop|disney|harry potter|minecraft|roblox|livros[a-z0-9 _-]*)/,
  ]);
  const character = captureNormalizedValue(normalized, [
    /\b(?:personagem favorito|personagem favorita) (?:e|eh|seria) ([a-z0-9 _-]{2,80})/,
  ]);
  const interest = captureNormalizedValue(normalized, [
    /\b(?:eu gosto de|gosto de|adoro|amo|curto) ([a-z0-9 _-]{2,80})/,
  ]);
  const difficulty = captureNormalizedValue(normalized, [
    /\b(?:tenho dificuldade com|minha dificuldade (?:e|eh)|eu confundo|confundo) ([a-z0-9 _-]{2,80})/,
  ]);
  const learningGoal = captureNormalizedValue(normalized, [
    /\b(?:meu objetivo (?:e|eh)|quero aprender ingles para|estudo ingles para) ([a-z0-9 _-]{2,100})/,
  ]);
  const style = captureNormalizedValue(normalized, [
    /\b(?:prefiro exemplos|gosto de exemplos|me explica melhor com|explica melhor com) ([a-z0-9 _-]{2,100})/,
  ]);

  if (animal) {
    candidates.push({
      category: "INTEREST",
      confidence: 88,
      key: "animal",
      value: cleanMemoryValue(animal),
    });
  }

  if (theme) {
    candidates.push({
      category: "FAVORITE_THEME",
      confidence: 82,
      key: "theme",
      value: cleanMemoryValue(theme),
    });
  }

  if (character) {
    candidates.push({
      category: "FAVORITE_THEME",
      confidence: 82,
      key: "character",
      value: cleanMemoryValue(character),
    });
  }

  if (interest && !animal && !theme) {
    candidates.push({
      category: "INTEREST",
      confidence: 74,
      key: "topic",
      value: cleanMemoryValue(interest),
    });
  }

  if (difficulty) {
    candidates.push({
      category: "DIFFICULTY",
      confidence: 86,
      key: "english",
      value: cleanMemoryValue(difficulty),
    });
  }

  if (learningGoal) {
    candidates.push({
      category: "LEARNING_GOAL",
      confidence: 84,
      key: "goal",
      value: cleanMemoryValue(learningGoal),
    });
  }

  if (style) {
    candidates.push({
      category: "STYLE",
      confidence: 80,
      key: "examples",
      value: cleanMemoryValue(style),
    });
  }

  const contradictions = extractCattyUserMemoryContradictions(message);

  return candidates.filter((candidate, index, list) => {
    if (!isUsefulMemoryValue(candidate.value)) {
      return false;
    }

    if (
      contradictions.some((value) =>
        memoryValuesConflict(candidate.value, value),
      )
    ) {
      return false;
    }

    return (
      list.findIndex(
        (item) =>
          item.category === candidate.category && item.key === candidate.key,
      ) === index
    );
  });
}

export function extractCattyUserMemoryContradictions(message: string) {
  const normalized = normalizeCattyUserMemoryText(message);
  const values: string[] = [];
  const patterns = [
    /\b(?:nao gosto mais de|nao curto mais|parei de gostar de|nao amo mais) ([a-z0-9 _-]{2,80})/,
    /\b(?:nao gosto de|nao curto|nao amo) ([a-z0-9 _-]{2,80})/,
    /\b(?:meu animal favorito nao e|meu animal favorito nao eh|animal favorito nao e|animal favorito nao eh) ([a-z0-9 _-]{2,80})/,
    /\b(?:meu tema favorito nao e|meu tema favorito nao eh|tema favorito nao e|tema favorito nao eh) ([a-z0-9 _-]{2,80})/,
  ];

  for (const pattern of patterns) {
    const value = captureNormalizedValue(normalized, [pattern], 8);

    if (value) {
      values.push(cleanMemoryValue(value));
    }
  }

  return [...new Set(values)].filter((value) => value.length > 0).slice(0, 4);
}

function memoryValuesConflict(memoryValue: string, contradictionValue: string) {
  const memory = normalizeCattyUserMemoryText(memoryValue);
  const contradiction = normalizeCattyUserMemoryText(contradictionValue);

  if (memory.length < 3 || contradiction.length < 3) {
    return false;
  }

  return memory.includes(contradiction) || contradiction.includes(memory);
}

export function selectRelevantCattyUserMemories(input: {
  intent?: CattyResponsePlan["intent"];
  limit?: number;
  memories: CattyUserMemoryPromptItem[];
  message?: string;
}) {
  const limit = Math.min(
    Math.max(input.limit ?? CATTY_USER_MEMORY_PROMPT_LIMIT, 1),
    CATTY_USER_MEMORY_PROMPT_LIMIT,
  );
  const safeMemories = input.memories.filter(
    (memory) => !hasSensitiveCattyUserMemoryText(memory.value),
  );
  const sortedMemories = safeMemories
    .map((memory) => ({
      memory,
      score: scoreCattyUserMemory({
        intent: input.intent,
        memory,
        message: input.message,
      }),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const usageDiff = (b.memory.usageCount ?? 0) - (a.memory.usageCount ?? 0);

      if (usageDiff !== 0) {
        return usageDiff;
      }

      return (
        (b.memory.updatedAt?.getTime() ?? 0) -
        (a.memory.updatedAt?.getTime() ?? 0)
      );
    });
  const selected: CattyUserMemoryPromptItem[] = [];
  let difficultyCount = 0;
  let interestCount = 0;

  for (const { memory } of sortedMemories) {
    if (
      memory.category === "DIFFICULTY" &&
      difficultyCount >= CATTY_USER_MEMORY_DIFFICULTY_LIMIT
    ) {
      continue;
    }

    if (
      interestMemoryCategories.has(memory.category) &&
      interestCount >= CATTY_USER_MEMORY_INTEREST_LIMIT
    ) {
      continue;
    }

    selected.push(memory);

    if (memory.category === "DIFFICULTY") {
      difficultyCount += 1;
    }

    if (interestMemoryCategories.has(memory.category)) {
      interestCount += 1;
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

async function getTeacherProfileId(userId: string) {
  const prisma = getPrisma();
  const profile = await prisma.teacherProfile.findUnique({
    select: {
      id: true,
    },
    where: {
      userId,
    },
  });

  return profile?.id ?? null;
}

export async function canAccessCattyUserMemoryTarget(input: {
  actorRole: Role;
  actorUserId: string;
  targetUserId: string;
}) {
  if (input.actorRole === "ADMIN" || input.actorUserId === input.targetUserId) {
    return true;
  }

  if (input.actorRole !== "TEACHER") {
    return false;
  }

  const teacherProfileId = await getTeacherProfileId(input.actorUserId);

  if (!teacherProfileId) {
    return false;
  }

  const prisma = getPrisma();
  const targetUser = await prisma.user.findUnique({
    select: {
      studentProfile: {
        select: {
          teacherAssignments: {
            select: {
              teacherProfileId: true,
            },
          },
        },
      },
    },
    where: {
      id: input.targetUserId,
    },
  });

  return (
    targetUser?.studentProfile?.teacherAssignments.some(
      (assignment) => assignment.teacherProfileId === teacherProfileId,
    ) ?? false
  );
}

function canUseMemorySource(input: {
  actorRole: Role;
  actorUserId: string;
  source: CattyUserMemorySourceInput;
  targetUserId: string;
}) {
  if (input.source === "ADMIN_NOTE") {
    return input.actorRole === "ADMIN";
  }

  if (input.source === "TEACHER_NOTE") {
    return input.actorRole === "TEACHER" || input.actorRole === "ADMIN";
  }

  if (input.source === "USER_MESSAGE") {
    return input.actorUserId === input.targetUserId;
  }

  return input.actorUserId === input.targetUserId || input.actorRole === "ADMIN";
}

async function createMemoryEvent(input: {
  action: string;
  category?: CattyUserMemoryCategoryInput;
  createdByUserId?: string | null;
  key?: string | null;
  memoryId?: string | null;
  nextValue?: string | null;
  note?: string | null;
  previousValue?: string | null;
  source: CattyUserMemorySourceInput;
  status?: CattyUserMemoryStatusInput | null;
  userId: string;
}) {
  const prisma = getPrisma();

  await prisma.cattyMemoryEvent.create({
    data: {
      action: input.action,
      category: input.category ?? null,
      createdByUserId: input.createdByUserId ?? null,
      key: input.key ?? null,
      memoryId: input.memoryId ?? null,
      nextValue: input.nextValue ?? null,
      note: input.note ?? null,
      previousValue: input.previousValue ?? null,
      source: input.source,
      status: input.status ?? null,
      userId: input.userId,
    },
  });
}

async function maybeCreateCleanupSuggestion(userId: string) {
  const prisma = getPrisma();
  const memoryCount = await prisma.cattyUserMemory.count({
    where: {
      status: {
        in: ["ACTIVE", "PENDING"],
      },
      userId,
    },
  });

  if (memoryCount <= CATTY_USER_MEMORY_CLEANUP_THRESHOLD) {
    return;
  }

  const since = new Date(Date.now() - CATTY_USER_MEMORY_CLEANUP_WINDOW_MS);
  const duplicate = await prisma.cattyMemoryEvent.findFirst({
    select: {
      id: true,
    },
    where: {
      action: "CLEANUP_SUGGESTED",
      createdAt: {
        gte: since,
      },
      userId,
    },
  });

  if (duplicate) {
    return;
  }

  await createMemoryEvent({
    action: "CLEANUP_SUGGESTED",
    note:
      "Memoria pessoal da Catty passou do limite recomendado. Revisar e arquivar itens antigos.",
    source: "CATTY_DETECTED",
    status: "FLAGGED",
    userId,
  });
}

export async function upsertCattyUserMemory(
  input: UpsertCattyUserMemoryInput,
) {
  const parsed = cattyUserMemoryUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise a memoria pessoal da Catty antes de salvar.",
    };
  }

  if (
    !canUseMemorySource({
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      source: parsed.data.source,
      targetUserId: parsed.data.targetUserId,
    })
  ) {
    return {
      ok: false,
      message: "Voce nao tem permissao para usar essa origem de memoria.",
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
      message: "Voce nao tem permissao para alterar essa memoria da Catty.",
    };
  }

  const category = parsed.data.category;
  const key = normalizeMemoryKey(parsed.data.key);
  const value = cleanMemoryValue(parsed.data.value);
  const prisma = getPrisma();
  const existing = await prisma.cattyUserMemory.findUnique({
    where: {
      userId_category_key: {
        category,
        key,
        userId: parsed.data.targetUserId,
      },
    },
  });

  if (existing?.status === "FLAGGED" && parsed.data.status === "ACTIVE") {
    return {
      ok: false,
      message:
        "Essa memoria esta marcada para revisao. Arquive ou corrija antes de reativar.",
    };
  }

  const memory = existing
    ? await prisma.cattyUserMemory.update({
        data: {
          confidence: parsed.data.confidence,
          createdByUserId: existing.createdByUserId ?? input.actorUserId,
          flaggedReason:
            parsed.data.status === "FLAGGED"
              ? parsed.data.flaggedReason ?? existing.flaggedReason
              : null,
          source: parsed.data.source,
          status: parsed.data.status,
          value,
        },
        where: {
          id: existing.id,
        },
      })
    : await prisma.cattyUserMemory.create({
        data: {
          category,
          confidence: parsed.data.confidence,
          createdByUserId: input.actorUserId,
          flaggedReason:
            parsed.data.status === "FLAGGED"
              ? parsed.data.flaggedReason ?? null
              : null,
          key,
          source: parsed.data.source,
          status: parsed.data.status,
          userId: parsed.data.targetUserId,
          value,
        },
      });

  await createMemoryEvent({
    action: existing ? "UPDATED" : "CREATED",
    category,
    createdByUserId: input.actorUserId,
    key,
    memoryId: memory.id,
    nextValue: value,
    previousValue: existing?.value ?? null,
    source: parsed.data.source,
    status: parsed.data.status,
    userId: parsed.data.targetUserId,
  });
  await maybeCreateCleanupSuggestion(parsed.data.targetUserId);

  return {
    memoryId: memory.id,
    ok: true,
    message: existing
      ? "Memoria pessoal da Catty atualizada."
      : "Memoria pessoal da Catty salva.",
  };
}

export async function updateCattyUserMemoryStatus(
  input: UpdateCattyUserMemoryStatusInput,
) {
  const parsed = cattyUserMemoryStatusUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Status invalido para a memoria da Catty.",
    };
  }

  const prisma = getPrisma();
  const memory = await prisma.cattyUserMemory.findUnique({
    select: {
      category: true,
      id: true,
      key: true,
      source: true,
      status: true,
      userId: true,
      value: true,
    },
    where: {
      id: parsed.data.memoryId,
    },
  });

  if (!memory) {
    return {
      ok: false,
      message: "Nao encontrei essa memoria da Catty.",
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: memory.userId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para alterar essa memoria da Catty.",
    };
  }

  const updated = await prisma.cattyUserMemory.update({
    data: {
      flaggedReason:
        parsed.data.status === "FLAGGED"
          ? parsed.data.flaggedReason ?? "Revisar memoria pessoal."
          : null,
      status: parsed.data.status,
    },
    where: {
      id: memory.id,
    },
  });

  await createMemoryEvent({
    action: "STATUS_UPDATED",
    category: memory.category,
    createdByUserId: input.actorUserId,
    key: memory.key,
    memoryId: memory.id,
    nextValue: parsed.data.status,
    previousValue: memory.status,
    source: memory.source,
    status: parsed.data.status,
    userId: memory.userId,
  });

  return {
    memoryId: updated.id,
    ok: true,
    message: "Status da memoria pessoal da Catty atualizado.",
  };
}

export async function updateCattyUserMemoryValue(
  input: UpdateCattyUserMemoryValueInput,
) {
  const parsed = cattyUserMemoryValueUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise a memoria pessoal antes de salvar.",
    };
  }

  const prisma = getPrisma();
  const memory = await prisma.cattyUserMemory.findUnique({
    select: {
      category: true,
      id: true,
      key: true,
      source: true,
      userId: true,
      value: true,
    },
    where: {
      id: parsed.data.memoryId,
    },
  });

  if (!memory) {
    return {
      ok: false,
      message: "Nao encontrei essa memoria da Catty.",
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: memory.userId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para corrigir essa memoria da Catty.",
    };
  }

  const nextValue = cleanMemoryValue(parsed.data.value);
  const updated = await prisma.cattyUserMemory.update({
    data: {
      confidence: parsed.data.confidence,
      status: "ACTIVE",
      value: nextValue,
    },
    where: {
      id: memory.id,
    },
  });

  await createMemoryEvent({
    action: "VALUE_UPDATED",
    category: memory.category,
    createdByUserId: input.actorUserId,
    key: memory.key,
    memoryId: memory.id,
    nextValue,
    previousValue: memory.value,
    source: memory.source,
    status: "ACTIVE",
    userId: memory.userId,
  });

  return {
    memoryId: updated.id,
    ok: true,
    message: "Memoria pessoal da Catty corrigida.",
  };
}

export async function removeSensitiveCattyUserMemoryValue(input: {
  actorRole: Role;
  actorUserId: string;
  memoryId: string;
}) {
  const prisma = getPrisma();
  const memory = await prisma.cattyUserMemory.findUnique({
    select: {
      category: true,
      id: true,
      key: true,
      source: true,
      userId: true,
    },
    where: {
      id: input.memoryId,
    },
  });

  if (!memory) {
    return {
      ok: false,
      message: "Nao encontrei essa memoria da Catty.",
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: memory.userId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para remover essa memoria da Catty.",
    };
  }

  const note = "Dado sensivel removido por revisao humana.";
  const updated = await prisma.cattyUserMemory.update({
    data: {
      confidence: 0,
      flaggedReason: note,
      status: "ARCHIVED",
      value: "[dado sensivel removido]",
    },
    where: {
      id: memory.id,
    },
  });

  await createMemoryEvent({
    action: "SENSITIVE_REMOVED",
    category: memory.category,
    createdByUserId: input.actorUserId,
    key: memory.key,
    memoryId: memory.id,
    nextValue: "[dado sensivel removido]",
    note,
    previousValue: null,
    source: memory.source,
    status: "ARCHIVED",
    userId: memory.userId,
  });

  return {
    memoryId: updated.id,
    ok: true,
    message: "Dado sensivel removido e memoria arquivada.",
  };
}

export async function getCattyUserMemoryContext(input: {
  intent?: CattyResponsePlan["intent"];
  limit?: number;
  message?: string;
  userId: string;
}): Promise<CattyUserMemoryPromptItem[]> {
  const limit = Math.min(
    Math.max(input.limit ?? CATTY_USER_MEMORY_PROMPT_LIMIT, 1),
    CATTY_USER_MEMORY_PROMPT_LIMIT,
  );
  const prisma = getPrisma();
  const memories = await prisma.cattyUserMemory.findMany({
    orderBy: [
      {
        usageCount: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    take: CATTY_USER_MEMORY_CANDIDATE_LIMIT,
    where: {
      status: "ACTIVE",
      userId: input.userId,
    },
    select: {
      category: true,
      confidence: true,
      id: true,
      key: true,
      lastUsedAt: true,
      source: true,
      updatedAt: true,
      usageCount: true,
      value: true,
    },
  });
  const selectedMemories = selectRelevantCattyUserMemories({
    intent: input.intent,
    limit,
    memories,
    message: input.message,
  });

  if (selectedMemories.length > 0) {
    await prisma.cattyUserMemory.updateMany({
      data: {
        lastUsedAt: new Date(),
        usageCount: {
          increment: 1,
        },
      },
      where: {
        id: {
          in: selectedMemories.map((memory) => memory.id),
        },
      },
    });
  }

  if (memories.length >= CATTY_USER_MEMORY_CANDIDATE_LIMIT) {
    await maybeCreateCleanupSuggestion(input.userId);
  }

  return selectedMemories;
}

export function formatCattyUserMemoryPromptContext(
  memories: CattyUserMemoryPromptItem[],
) {
  if (memories.length === 0) {
    return "Sem memoria pessoal ativa para este usuario.";
  }

  return memories
    .slice(0, CATTY_USER_MEMORY_PROMPT_LIMIT)
    .map(
      (memory, index) =>
        `${index + 1}. ${memory.category}/${memory.key}: ${compactText(memory.value, 120)} (confianca ${memory.confidence}; origem ${memory.source})`,
    )
    .join("\n")
    .slice(0, 1000);
}

function getFriendlyMemoryHint(memories: CattyUserMemoryPromptItem[]) {
  return (
    memories.find((memory) => interestMemoryCategories.has(memory.category)) ??
    memories.find((memory) =>
      personalStyleMemoryCategories.has(memory.category),
    )
  );
}

function getDifficultyMemoryHint(memories: CattyUserMemoryPromptItem[]) {
  return memories.find((memory) => memory.category === "DIFFICULTY");
}

function getEnglishMemoryExampleValue(value: string) {
  const normalized = normalizeCattyUserMemoryText(value);

  if (normalized.includes("capivara")) return "capybara";
  if (normalized.includes("pokemon")) return "Pokemon";
  if (normalized.includes("animal fofo")) return "cute animal";
  if (normalized.includes("gato") || normalized.includes("gatinho")) {
    return "cat";
  }

  return compactText(value, 40);
}

function getMemoryFallbackHint(input: {
  memory: CattyUserMemoryPromptItem;
  plan: CattyResponsePlan;
}) {
  const value = compactText(input.memory.value, 64);

  if (input.memory.category === "DIFFICULTY") {
    return difficultyFriendlyIntents.has(input.plan.intent)
      ? ` Pss pss, lembro que ${value} costuma pegar; vamos olhar so essa parte.`
      : "";
  }

  if (!promptFriendlyIntents.has(input.plan.intent)) {
    return "";
  }

  if (input.plan.intent === "confusing_question") {
    return ` Vamos no modo ${value} calma.`;
  }

  if (input.plan.intent === "practice_english") {
    return ` Exemplo com ${value}: I like ${getEnglishMemoryExampleValue(value)}.`;
  }

  if (input.memory.category === "STYLE") {
    return ` Posso usar exemplos com ${value}.`;
  }

  return ` Vou puxar exemplos com ${value} quando combinar.`;
}

export function applyCattyUserMemoryToFallbackReply(input: {
  memories: CattyUserMemoryPromptItem[];
  plan: CattyResponsePlan;
  reply: string;
}) {
  if (
    !promptFriendlyIntents.has(input.plan.intent) &&
    !difficultyFriendlyIntents.has(input.plan.intent)
  ) {
    return input.reply;
  }

  const memory =
    getDifficultyMemoryHint(input.memories) ??
    getFriendlyMemoryHint(input.memories);

  if (!memory || input.reply.includes(memory.value)) {
    return input.reply;
  }

  const hint = getMemoryFallbackHint({
    memory,
    plan: input.plan,
  });

  return hint ? compactText(`${input.reply}${hint}`, 700) : input.reply;
}

async function flagContradictoryCattyUserMemoriesFromMessage(input: {
  message: string;
  userId: string;
}) {
  const contradictions = extractCattyUserMemoryContradictions(input.message);

  if (contradictions.length === 0) {
    return [];
  }

  const prisma = getPrisma();
  const memories = await prisma.cattyUserMemory.findMany({
    select: {
      category: true,
      id: true,
      key: true,
      source: true,
      userId: true,
      value: true,
    },
    take: 60,
    where: {
      status: "ACTIVE",
      userId: input.userId,
    },
  });
  const conflictingMemories = memories.filter((memory) =>
    contradictions.some((value) =>
      memoryValuesConflict(memory.value, value),
    ),
  );

  if (conflictingMemories.length === 0) {
    return [];
  }

  const flaggedReason =
    "A mensagem mais recente contradiz esta memoria pessoal. Revisar antes de reutilizar.";

  await prisma.cattyUserMemory.updateMany({
    data: {
      flaggedReason,
      status: "FLAGGED",
    },
    where: {
      id: {
        in: conflictingMemories.map((memory) => memory.id),
      },
    },
  });

  for (const memory of conflictingMemories) {
    await createMemoryEvent({
      action: "CONFLICT_FLAGGED",
      category: memory.category,
      createdByUserId: input.userId,
      key: memory.key,
      memoryId: memory.id,
      nextValue: "FLAGGED",
      note: flaggedReason,
      previousValue: memory.value,
      source: "CATTY_DETECTED",
      status: "FLAGGED",
      userId: memory.userId,
    });
  }

  return conflictingMemories.map((memory) => memory.id);
}

export async function maybeCreateCattyUserMemoryFromMessage(input: {
  actorRole: Role;
  message: string;
  userId: string;
}) {
  await flagContradictoryCattyUserMemoriesFromMessage({
    message: input.message,
    userId: input.userId,
  });

  const candidates = extractCattyUserMemoryCandidates(input.message);

  if (candidates.length === 0) {
    return [];
  }

  const savedIds: string[] = [];

  for (const candidate of candidates.slice(0, 2)) {
    const result = await upsertCattyUserMemory({
      actorRole: input.actorRole,
      actorUserId: input.userId,
      category: candidate.category,
      confidence: candidate.confidence,
      key: candidate.key,
      source: "USER_MESSAGE",
      status: "ACTIVE",
      targetUserId: input.userId,
      value: candidate.value,
    });

    if (result.ok && result.memoryId) {
      savedIds.push(result.memoryId);
    }
  }

  return savedIds;
}
