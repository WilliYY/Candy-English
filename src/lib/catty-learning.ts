import {
  type CattyPageContext,
  type CattyIntent,
  type CattyResponsePlan,
  hasDisallowedCattyText,
  sanitizeCattyReply,
} from "@/lib/catty";
import { getCattyHistoryContext } from "@/lib/catty-history";
import {
  type CattyLearningCategoryInput,
  hasSensitiveCattyLearningText,
} from "@/lib/validations/catty-learning";
import { hasTooManyCattyCatchphrases } from "@/lib/catty-personality";
import { getPrisma } from "@/lib/prisma";

export type CattyLearningPromptItem = {
  badReply?: string | null;
  category: CattyLearningCategoryInput;
  idealReply?: string | null;
  intent?: string | null;
  notes?: string | null;
  tags: string[];
  title: string;
  userPrompt?: string | null;
};

type CattyLearningContextInput = {
  intent: CattyIntent;
  limit?: number;
  message: string;
};

type CattyLearningAutoSuggestionInput = {
  context?: CattyPageContext;
  learningContext: CattyLearningPromptItem[];
  message: string;
  plan: CattyResponsePlan;
  reply: string;
  source: "fallback" | "gemini" | "openai";
  userId: string;
};

type CattyNegativeFeedbackSuggestionInput = {
  context: CattyPageContext;
  intent: CattyIntent;
  message?: string | null;
  userId: string;
};

export const CATTY_LEARNING_PROMPT_LIMIT = 3;
const CATTY_LEARNING_CANDIDATE_LIMIT = 40;
const AUTO_SUGGESTION_WINDOW_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_FEEDBACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const NEGATIVE_FEEDBACK_THRESHOLD = 3;

const fallbackFriendlyCategories: CattyLearningCategoryInput[] = [
  "APPROVED_CORRECTION",
  "CANDY_CONTEXT",
  "COMMON_QUESTION",
  "HOMEWORK_EXAMPLE",
  "IDEAL_REPLY",
  "STUDENT_GUIDANCE",
  "TEACHER_GUIDANCE",
  "VOCABULARY",
];

const intentCategoryHints: Partial<
  Record<CattyIntent, CattyLearningCategoryInput[]>
> = {
  ava_help: ["CANDY_CONTEXT", "COMMON_QUESTION", "STUDENT_GUIDANCE"],
  candy_xp: ["CANDY_CONTEXT", "COMMON_QUESTION", "STUDENT_GUIDANCE"],
  code_api_request: ["IDEAL_REPLY", "PERSONALITY_RULE", "STUDENT_GUIDANCE"],
  complex_question: ["IDEAL_REPLY", "STUDENT_GUIDANCE", "TEACHER_GUIDANCE"],
  confusing_question: ["IDEAL_REPLY", "COMMON_QUESTION", "STUDENT_GUIDANCE"],
  correct_sentence: ["APPROVED_CORRECTION", "IDEAL_REPLY"],
  explain_word: ["VOCABULARY", "COMMON_QUESTION"],
  homework_hint: ["HOMEWORK_EXAMPLE", "STUDENT_GUIDANCE", "IDEAL_REPLY"],
  lesson_material: ["COMMON_QUESTION", "STUDENT_GUIDANCE", "TEACHER_GUIDANCE"],
  motivation: ["CATTY_PHRASE", "STUDENT_GUIDANCE"],
  out_of_scope: ["IDEAL_REPLY", "PERSONALITY_RULE", "STUDENT_GUIDANCE"],
  practice_english: ["STUDENT_GUIDANCE", "VOCABULARY", "IDEAL_REPLY"],
  ready_answer_request: ["HOMEWORK_EXAMPLE", "IDEAL_REPLY", "STUDENT_GUIDANCE"],
  teacher_activity_creation: ["TEACHER_GUIDANCE", "CANDY_CONTEXT"],
  teacher_feedback: ["TEACHER_GUIDANCE", "IDEAL_REPLY"],
  teacher_message: ["TEACHER_GUIDANCE", "IDEAL_REPLY"],
  translate_sentence: ["VOCABULARY", "COMMON_QUESTION", "IDEAL_REPLY"],
};

const autoSuggestionIntents = new Set<CattyIntent>([
  "code_api_request",
  "complex_question",
  "confusing_question",
  "out_of_scope",
  "ready_answer_request",
]);

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getTokens(text: string) {
  return normalizeText(text).match(/[a-z0-9]+/g) ?? [];
}

function compactText(text?: string | null, maxLength = 220) {
  return text?.replace(/\s+/g, " ").trim().slice(0, maxLength) || "";
}

function normalizeMemoryText(text?: string | null, maxLength = 700) {
  return compactText(text, maxLength);
}

function hasSensitiveAutoSuggestionContent(
  ...values: Array<string | null | undefined>
) {
  return hasSensitiveCattyLearningText(values.filter(Boolean).join(" "));
}

function scoreLearningItem(
  item: CattyLearningPromptItem,
  input: CattyLearningContextInput,
) {
  let score = 0;
  const messageTokens = new Set(getTokens(input.message));
  const normalizedMessage = normalizeText(input.message);
  const haystack = [
    item.title,
    item.userPrompt,
    item.idealReply,
    item.notes,
    item.tags.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const itemTokens = new Set(getTokens(haystack));

  if (item.intent === input.intent) {
    score += 12;
  } else if (!item.intent) {
    score += 2;
  } else if (item.intent) {
    score -= 4;
  }

  if (intentCategoryHints[input.intent]?.includes(item.category)) {
    score += 4;
  }

  for (const token of messageTokens) {
    if (token.length >= 4 && itemTokens.has(token)) {
      score += 1;
    }
  }

  for (const tag of item.tags) {
    const normalizedTag = normalizeText(tag);

    if (normalizedTag && normalizedMessage.includes(normalizedTag)) {
      score += 4;
    }

    if (normalizedTag && normalizeText(input.intent).includes(normalizedTag)) {
      score += 2;
    }
  }

  if (item.category === "PERSONALITY_RULE" || item.category === "CATTY_PHRASE") {
    score += 1;
  }

  return score;
}

function categoryFromIntent(intent: CattyIntent): CattyLearningCategoryInput {
  const hintedCategory = intentCategoryHints[intent]?.[0];

  if (hintedCategory) {
    return hintedCategory;
  }

  return "IDEAL_REPLY";
}

function titleFromAutoSuggestion(plan: CattyResponsePlan, message: string) {
  const prompt = compactText(message, 54);

  return prompt
    ? `Auto-sugestao Catty: ${plan.label} - ${prompt}`
    : `Auto-sugestao Catty: ${plan.label}`;
}

function shouldCreateAutoSuggestion(input: CattyLearningAutoSuggestionInput) {
  if (
    hasSensitiveAutoSuggestionContent(input.message, input.reply) ||
    input.plan.intent === "ava_help"
  ) {
    return false;
  }

  if (input.source === "fallback" && input.learningContext.length === 0) {
    return true;
  }

  if (
    autoSuggestionIntents.has(input.plan.intent) &&
    input.learningContext.length === 0
  ) {
    return true;
  }

  return input.plan.confidence === "low" && input.learningContext.length <= 1;
}

function isUnsafeLearnedReply(reply: string, plan: CattyResponsePlan) {
  const normalized = normalizeText(reply);

  if (
    hasDisallowedCattyText(reply) ||
    hasTooManyCattyCatchphrases(reply) ||
    hasSensitiveCattyLearningText(reply)
  ) {
    return true;
  }

  if (
    plan.intent === "homework_hint" ||
    plan.intent === "ready_answer_request"
  ) {
    return [
      "a resposta correta",
      "a resposta e",
      "answer is",
      "correct answer",
      "gabarito",
      "the answer is",
    ].some((term) => normalized.includes(term));
  }

  if (plan.intent === "code_api_request") {
    return [
      "codigo completo",
      "const ",
      "function ",
      "endpoint pronto",
    ].some((term) => normalized.includes(term));
  }

  return false;
}

export async function getApprovedCattyLearningContext(
  input: CattyLearningContextInput,
): Promise<CattyLearningPromptItem[]> {
  const limit = Math.min(
    Math.max(input.limit ?? CATTY_LEARNING_PROMPT_LIMIT, 1),
    CATTY_LEARNING_PROMPT_LIMIT,
  );
  const prisma = getPrisma();
  const items = await prisma.cattyLearningItem.findMany({
    orderBy: [
      {
        approvedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      badReply: true,
      category: true,
      idealReply: true,
      intent: true,
      notes: true,
      tags: true,
      title: true,
      userPrompt: true,
    },
    take: CATTY_LEARNING_CANDIDATE_LIMIT,
    where: {
      status: "APPROVED",
    },
  });

  return items
    .map((item) => ({
      ...item,
      tags: item.tags.slice(0, 8),
    }))
    .map((item) => ({
      item,
      score: scoreLearningItem(item, input),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (first, second) =>
        second.score - first.score,
    )
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function formatCattyLearningPromptContext(
  items: CattyLearningPromptItem[],
) {
  if (items.length === 0) {
    return "Sem memoria aprovada relevante.";
  }

  return items
    .slice(0, CATTY_LEARNING_PROMPT_LIMIT)
    .map((item, index) => {
      const parts = [
        `${index + 1}. ${compactText(item.title, 90)} (${item.category}${item.intent ? `, ${item.intent}` : ""})`,
        item.userPrompt
          ? `pergunta: ${compactText(item.userPrompt, 160)}`
          : null,
        item.badReply ? `evitar: ${compactText(item.badReply, 160)}` : null,
        item.idealReply
          ? `resposta ideal: ${compactText(item.idealReply, 220)}`
          : null,
        item.notes ? `observacao: ${compactText(item.notes, 220)}` : null,
        item.tags.length > 0 ? `tags: ${item.tags.join(", ")}` : null,
      ].filter(Boolean);

      return parts.join("; ");
    })
    .join("\n")
    .slice(0, 1800);
}

export function pickCattyLearningFallbackReply(
  plan: CattyResponsePlan,
  items: CattyLearningPromptItem[],
  message: string,
) {
  const bestItem = items
    .slice(0, CATTY_LEARNING_PROMPT_LIMIT)
    .filter(
      (item) =>
        item.idealReply &&
        fallbackFriendlyCategories.includes(item.category) &&
        (!item.intent || item.intent === plan.intent),
    )
    .map((item) => ({
      item,
      score: scoreLearningItem(item, {
        intent: plan.intent,
        message,
      }),
    }))
    .sort((first, second) => second.score - first.score)
    .find((entry) => entry.score >= 4)?.item;

  if (!bestItem?.idealReply) {
    return null;
  }

  const reply = sanitizeCattyReply(bestItem.idealReply);

  return isUnsafeLearnedReply(reply, plan) ? null : reply;
}

export async function maybeCreateCattyLearningAutoSuggestion(
  input: CattyLearningAutoSuggestionInput,
) {
  if (!shouldCreateAutoSuggestion(input)) {
    return null;
  }

  const userPrompt = normalizeMemoryText(input.message, 500);
  const cattyReply = normalizeMemoryText(input.reply, 700);

  if (!userPrompt || !cattyReply) {
    return null;
  }

  const historyContext = getCattyHistoryContext(input.context);
  const suggestedCategory = categoryFromIntent(input.plan.intent);
  const since = new Date(Date.now() - AUTO_SUGGESTION_WINDOW_MS);
  const prisma = getPrisma();
  const duplicate = await prisma.cattyLearningFeedback.findFirst({
    select: {
      id: true,
    },
    where: {
      contextKey: historyContext.contextKey,
      createdAt: {
        gte: since,
      },
      createdByUserId: input.userId,
      kind: "PATTERN_SUGGESTION",
      status: "PENDING",
      suggestedIntent: input.plan.intent,
      userPrompt,
    },
  });

  if (duplicate) {
    return duplicate.id;
  }

  const feedback = await prisma.cattyLearningFeedback.create({
    data: {
      cattyReply,
      contextArea: historyContext.area,
      contextKey: historyContext.contextKey,
      contextTask: historyContext.task,
      createdByUserId: input.userId,
      kind: "PATTERN_SUGGESTION",
      note:
        input.source === "fallback"
          ? "Auto-sugestao: a Catty usou fallback sem memoria aprovada relevante. Revisar antes de virar aprendizado."
          : "Auto-sugestao: mensagem confusa/fora do trilho sem memoria aprovada relevante. Revisar antes de virar aprendizado.",
      status: "PENDING",
      suggestedCategory,
      suggestedIntent: input.plan.intent,
      suggestedTitle: titleFromAutoSuggestion(input.plan, userPrompt),
      userPrompt,
    },
    select: {
      id: true,
    },
  });

  return feedback.id;
}

export async function maybeCreateCattyNegativeFeedbackSuggestion(
  input: CattyNegativeFeedbackSuggestionInput,
) {
  const prompt = normalizeMemoryText(input.message, 500);

  if (prompt && hasSensitiveCattyLearningText(prompt)) {
    return null;
  }

  const historyContext = getCattyHistoryContext(input.context);
  const prisma = getPrisma();
  const since = new Date(Date.now() - NEGATIVE_FEEDBACK_WINDOW_MS);
  const negativeCount = await prisma.cattyLearningFeedback.count({
    where: {
      createdAt: {
        gte: since,
      },
      contextKey: historyContext.contextKey,
      kind: {
        in: ["DISLIKED", "CONFUSING", "SHOULD_ANSWER"],
      },
      suggestedIntent: input.intent,
    },
  });

  if (negativeCount < NEGATIVE_FEEDBACK_THRESHOLD) {
    return null;
  }

  const duplicate = await prisma.cattyLearningFeedback.findFirst({
    select: {
      id: true,
    },
    where: {
      contextKey: historyContext.contextKey,
      createdAt: {
        gte: since,
      },
      kind: "PATTERN_SUGGESTION",
      status: "PENDING",
      suggestedIntent: input.intent,
    },
  });

  if (duplicate) {
    return duplicate.id;
  }

  const feedback = await prisma.cattyLearningFeedback.create({
    data: {
      contextArea: historyContext.area,
      contextKey: historyContext.contextKey,
      contextTask: historyContext.task,
      createdByUserId: input.userId,
      kind: "PATTERN_SUGGESTION",
      note: `Auto-sugestao: ${negativeCount} feedbacks negativos recentes nessa intencao. Revisar padrao antes de aprovar memoria global.`,
      status: "PENDING",
      suggestedCategory: categoryFromIntent(input.intent),
      suggestedIntent: input.intent,
      suggestedTitle: `Auto-sugestao Catty: muitos feedbacks em ${input.intent}`,
      userPrompt: prompt || null,
    },
    select: {
      id: true,
    },
  });

  return feedback.id;
}
