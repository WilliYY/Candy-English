import {
  type CattyIntent,
  type CattyResponsePlan,
  hasDisallowedCattyText,
  sanitizeCattyReply,
} from "@/lib/catty";
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

function scoreLearningItem(
  item: CattyLearningPromptItem,
  input: CattyLearningContextInput,
) {
  let score = 0;
  const messageTokens = new Set(getTokens(input.message));
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
    score += 6;
  } else if (item.intent) {
    score -= 2;
  }

  for (const token of messageTokens) {
    if (token.length >= 4 && itemTokens.has(token)) {
      score += 1;
    }
  }

  for (const tag of item.tags) {
    if (normalizeText(input.message).includes(normalizeText(tag))) {
      score += 2;
    }
  }

  if (item.category === "PERSONALITY_RULE" || item.category === "CATTY_PHRASE") {
    score += 1;
  }

  return score;
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
    take: 40,
    where: {
      status: "APPROVED",
    },
  });

  return items
    .map((item) => ({
      ...item,
      tags: item.tags.slice(0, 8),
    }))
    .sort(
      (first, second) =>
        scoreLearningItem(second, input) - scoreLearningItem(first, input),
    )
    .slice(0, input.limit ?? 5);
}

export function formatCattyLearningPromptContext(
  items: CattyLearningPromptItem[],
) {
  if (items.length === 0) {
    return "Sem memoria aprovada relevante.";
  }

  return items
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
