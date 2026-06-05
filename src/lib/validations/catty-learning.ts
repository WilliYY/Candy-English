import { z } from "zod";

export const cattyLearningCategoryValues = [
  "PERSONALITY_RULE",
  "IDEAL_REPLY",
  "BAD_REPLY",
  "VOCABULARY",
  "COMMON_QUESTION",
  "HOMEWORK_EXAMPLE",
  "TEACHER_GUIDANCE",
  "STUDENT_GUIDANCE",
  "CATTY_PHRASE",
  "APPROVED_CORRECTION",
  "CANDY_CONTEXT",
] as const;

export const cattyLearningStatusValues = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

export const cattyLearningFeedbackKindValues = [
  "LIKED",
  "DISLIKED",
  "CONFUSING",
  "SHOULD_ANSWER",
  "PATTERN_SUGGESTION",
] as const;

export const cattyLearningIntentValues = [
  "ava_help",
  "candy_xp",
  "code_api_request",
  "complex_question",
  "confusing_question",
  "correct_sentence",
  "explain_word",
  "homework_hint",
  "lesson_material",
  "motivation",
  "out_of_scope",
  "practice_english",
  "ready_answer_request",
  "teacher_activity_creation",
  "teacher_feedback",
  "teacher_message",
  "translate_sentence",
] as const;

export type CattyLearningCategoryInput =
  (typeof cattyLearningCategoryValues)[number];
export type CattyLearningStatusInput =
  (typeof cattyLearningStatusValues)[number];
export type CattyLearningFeedbackKindInput =
  (typeof cattyLearningFeedbackKindValues)[number];
export type CattyLearningIntentInput =
  (typeof cattyLearningIntentValues)[number];

const sensitiveLearningTerms = [
  "api key",
  "chave",
  "contrato",
  "cpf",
  "credencial",
  "documento",
  "e-mail",
  "email",
  "pagamento",
  "senha",
  "telefone",
  "token",
  "whatsapp",
];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function hasSensitiveCattyLearningText(text: string) {
  const normalized = normalizeText(text);

  return sensitiveLearningTerms.some((term) => normalized.includes(term));
}

function optionalText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => (value ? value : undefined));
}

function normalizeTags(tags?: string[]) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
        .slice(0, 8),
    ),
  );
}

export const cattyLearningCreateSchema = z
  .object({
    badReply: optionalText(
      700,
      "A resposta ruim pode ter no maximo 700 caracteres.",
    ),
    category: z.enum(cattyLearningCategoryValues),
    idealReply: optionalText(
      1000,
      "A resposta ideal pode ter no maximo 1000 caracteres.",
    ),
    intent: z
      .enum(cattyLearningIntentValues)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value ? value : undefined)),
    notes: optionalText(
      1000,
      "A observacao pode ter no maximo 1000 caracteres.",
    ),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(32, "Cada tag pode ter no maximo 32 caracteres."),
      )
      .max(8, "Use no maximo 8 tags.")
      .optional()
      .transform(normalizeTags),
    title: z
      .string()
      .trim()
      .min(3, "Informe um titulo curto para o aprendizado.")
      .max(120, "O titulo pode ter no maximo 120 caracteres."),
    userPrompt: optionalText(
      500,
      "A pergunta do usuario pode ter no maximo 500 caracteres.",
    ),
  })
  .superRefine((value, ctx) => {
    const searchableContent = [
      value.badReply,
      value.idealReply,
      value.notes,
      value.title,
      value.userPrompt,
      ...(value.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ");

    if (!value.userPrompt && !value.idealReply && !value.notes) {
      ctx.addIssue({
        code: "custom",
        message:
          "Informe pelo menos uma pergunta, resposta ideal ou observacao util.",
        path: ["userPrompt"],
      });
    }

    if (hasSensitiveCattyLearningText(searchableContent)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Nao salve senha, pagamento, contrato, telefone, documento, token, chave ou dados privados na memoria da Catty.",
        path: ["notes"],
      });
    }
  });

export const cattyLearningStatusUpdateSchema = z.object({
  itemId: z.string().min(1, "Aprendizado invalido."),
  status: z.enum(cattyLearningStatusValues),
});

export const cattyLearningFeedbackCreateSchema = z
  .object({
    cattyMessageId: z.string().min(1, "Resposta da Catty invalida."),
    idealReply: optionalText(
      1000,
      "A resposta ideal pode ter no maximo 1000 caracteres.",
    ),
    kind: z.enum(cattyLearningFeedbackKindValues),
    note: optionalText(500, "A observacao pode ter no maximo 500 caracteres."),
  })
  .superRefine((value, ctx) => {
    const searchableContent = [value.idealReply, value.note]
      .filter(Boolean)
      .join(" ");

    if (value.kind === "SHOULD_ANSWER" && !value.idealReply) {
      ctx.addIssue({
        code: "custom",
        message: "Escreva como a Catty deveria responder.",
        path: ["idealReply"],
      });
    }

    if (searchableContent && hasSensitiveCattyLearningText(searchableContent)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Nao salve senha, pagamento, contrato, telefone, documento, token, chave ou dados privados na memoria da Catty.",
        path: ["idealReply"],
      });
    }
  });

export const cattyLearningFeedbackStatusUpdateSchema = z.object({
  feedbackId: z.string().min(1, "Feedback invalido."),
  status: z.enum(cattyLearningStatusValues),
});

export const cattyLearningFromFeedbackSchema = z
  .object({
    badReply: optionalText(
      700,
      "A resposta ruim pode ter no maximo 700 caracteres.",
    ),
    category: z.enum(cattyLearningCategoryValues),
    feedbackId: z.string().min(1, "Feedback invalido."),
    idealReply: optionalText(
      1000,
      "A resposta ideal pode ter no maximo 1000 caracteres.",
    ),
    intent: z
      .enum(cattyLearningIntentValues)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value ? value : undefined)),
    notes: optionalText(
      1000,
      "A observacao pode ter no maximo 1000 caracteres.",
    ),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(32, "Cada tag pode ter no maximo 32 caracteres."),
      )
      .max(8, "Use no maximo 8 tags.")
      .optional()
      .transform(normalizeTags),
    title: z
      .string()
      .trim()
      .min(3, "Informe um titulo curto para o aprendizado.")
      .max(120, "O titulo pode ter no maximo 120 caracteres."),
    userPrompt: optionalText(
      500,
      "A pergunta do usuario pode ter no maximo 500 caracteres.",
    ),
  })
  .superRefine((value, ctx) => {
    const searchableContent = [
      value.badReply,
      value.idealReply,
      value.notes,
      value.title,
      value.userPrompt,
      ...(value.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ");

    if (!value.userPrompt && !value.idealReply && !value.notes && !value.badReply) {
      ctx.addIssue({
        code: "custom",
        message:
          "Informe pergunta, resposta ideal, resposta ruim ou observacao util.",
        path: ["userPrompt"],
      });
    }

    if (hasSensitiveCattyLearningText(searchableContent)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Nao salve senha, pagamento, contrato, telefone, documento, token, chave ou dados privados na memoria da Catty.",
        path: ["notes"],
      });
    }
  });

export type CattyLearningCreateInput = z.input<
  typeof cattyLearningCreateSchema
>;
export type CattyLearningCreateData = z.output<
  typeof cattyLearningCreateSchema
>;
export type CattyLearningStatusUpdateInput = z.input<
  typeof cattyLearningStatusUpdateSchema
>;
export type CattyLearningFeedbackCreateInput = z.input<
  typeof cattyLearningFeedbackCreateSchema
>;
export type CattyLearningFeedbackStatusUpdateInput = z.input<
  typeof cattyLearningFeedbackStatusUpdateSchema
>;
export type CattyLearningFromFeedbackInput = z.input<
  typeof cattyLearningFromFeedbackSchema
>;
