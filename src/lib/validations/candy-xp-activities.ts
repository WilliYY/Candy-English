import { z } from "zod";
import { LISTENING_SENTENCE_MAX_LENGTH } from "@/lib/interactive-homework-fields";

export const CANDY_XP_ACTIVITY_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export const CANDY_XP_QUESTION_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "MATCHING",
] as const;

export const CANDY_XP_SUBMISSION_OUTCOMES = ["APPROVE", "RETURN"] as const;
export const CANDY_XP_INTERACTIVE_FIELD_TYPES = [
  "TINY_TEXT",
  "SHORT_TEXT",
  "LONG_TEXT",
  "CHECKBOX",
  "DRAWING",
] as const;

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : undefined));

export const candyXpQuestionOptionSchema = z.object({
  match: optionalText(300, "O par pode ter no maximo 300 caracteres."),
  text: z
    .string()
    .trim()
    .min(1, "Informe a alternativa.")
    .max(300, "A alternativa pode ter no maximo 300 caracteres."),
});

export const candyXpActivityQuestionSchema = z
  .object({
    correctAnswers: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Informe a resposta correta.")
          .max(300, "A resposta correta pode ter no maximo 300 caracteres."),
      )
      .max(20, "Use no maximo 20 respostas corretas.")
      .default([]),
    options: z
      .array(candyXpQuestionOptionSchema)
      .max(20, "Use no maximo 20 alternativas.")
      .default([]),
    prompt: z
      .string()
      .trim()
      .min(2, "Escreva o enunciado da pergunta.")
      .max(1000, "O enunciado pode ter no maximo 1000 caracteres."),
    required: z.boolean().default(true),
    type: z.enum(CANDY_XP_QUESTION_TYPES),
  })
  .superRefine((question, ctx) => {
    if (question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOX") {
      if (question.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Cadastre pelo menos duas alternativas.",
          path: ["options"],
        });
      }

      if (question.correctAnswers.length < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Marque pelo menos uma resposta correta.",
          path: ["correctAnswers"],
        });
      }
    }

    if (
      question.type === "MULTIPLE_CHOICE" &&
      question.correctAnswers.length > 1
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Multipla escolha aceita uma resposta correta.",
        path: ["correctAnswers"],
      });
    }

    if (question.type === "MATCHING") {
      if (question.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Cadastre pelo menos dois pares para ligar.",
          path: ["options"],
        });
      }

      if (question.options.some((option) => !option.match)) {
        ctx.addIssue({
          code: "custom",
          message: "Cada item de matching precisa ter um par usando =.",
          path: ["options"],
        });
      }
    }
  });

export const candyXpActivityCreateSchema = z
  .object({
    category: z
      .string()
      .trim()
      .min(2, "Informe a categoria.")
      .max(80, "A categoria pode ter no maximo 80 caracteres."),
    description: optionalText(
      1600,
      "A descricao pode ter no maximo 1600 caracteres.",
    ),
    level: z
      .string()
      .trim()
      .min(1, "Informe o nivel.")
      .max(80, "O nivel pode ter no maximo 80 caracteres."),
    questions: z
      .array(candyXpActivityQuestionSchema)
      .max(30, "Use no maximo 30 perguntas por atividade.")
      .default([]),
    releaseMode: z.enum(["ALL", "STUDENT"]),
    status: z.enum(["DRAFT", "PUBLISHED"]),
    studentProfileId: optionalText(80, "Selecione um aluno valido."),
    title: z
      .string()
      .trim()
      .min(3, "Informe um titulo com pelo menos 3 caracteres.")
      .max(160, "O titulo pode ter no maximo 160 caracteres."),
    xpReward: z.coerce
      .number()
      .int("Informe um XP inteiro.")
      .min(1, "A atividade precisa gerar pelo menos 1 XP.")
      .max(500, "Use ate 500 XP por atividade."),
  })
  .superRefine((activity, ctx) => {
    if (activity.releaseMode === "STUDENT" && !activity.studentProfileId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione o aluno liberado.",
        path: ["studentProfileId"],
      });
    }
  });

export const candyXpActivityUpdateSchema = z.object({
  activityId: z.string().min(1, "Atividade invalida."),
  category: z
    .string()
    .trim()
    .min(2, "Informe a categoria.")
    .max(80, "A categoria pode ter no maximo 80 caracteres."),
  description: optionalText(
    1600,
    "A descricao pode ter no maximo 1600 caracteres.",
  ),
  level: z
    .string()
    .trim()
    .min(1, "Informe o nivel.")
    .max(80, "O nivel pode ter no maximo 80 caracteres."),
  status: z.enum(CANDY_XP_ACTIVITY_STATUSES),
  title: z
    .string()
    .trim()
    .min(3, "Informe um titulo com pelo menos 3 caracteres.")
    .max(160, "O titulo pode ter no maximo 160 caracteres."),
  xpReward: z.coerce
    .number()
    .int("Informe um XP inteiro.")
    .min(1, "A atividade precisa gerar pelo menos 1 XP.")
    .max(500, "Use ate 500 XP por atividade."),
});

export const candyXpActivityDeleteSchema = z.object({
  activityId: z.string().min(1, "Atividade invalida."),
});

export const candyXpActivityInteractiveFieldSchema = z.object({
  height: z.coerce.number().min(1, "Altura minima 1%.").max(100),
  id: z.string().optional(),
  label: z
    .string()
    .trim()
    .max(80, "O rotulo pode ter no maximo 80 caracteres.")
    .optional(),
  page: z.coerce.number().int().min(1).max(20),
  placeholder: z
    .string()
    .trim()
    .max(
      LISTENING_SENTENCE_MAX_LENGTH,
      `O texto do campo pode ter no maximo ${LISTENING_SENTENCE_MAX_LENGTH} caracteres.`,
    )
    .optional(),
  required: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(200).default(0),
  type: z.enum(CANDY_XP_INTERACTIVE_FIELD_TYPES),
  width: z.coerce.number().min(1, "Largura minima 1%.").max(100),
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
});

export const saveCandyXpActivityInteractiveFieldsSchema = z.object({
  activityId: z.string().min(1, "Atividade invalida."),
  fields: z
    .array(candyXpActivityInteractiveFieldSchema)
    .max(120, "Use no maximo 120 areas por atividade Candy XP."),
});

export const candyXpActivityAnswerSchema = z.object({
  activityId: z.string().min(1, "Atividade invalida."),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, "Pergunta invalida."),
        value: z
          .string()
          .max(20000, "Cada resposta pode ter no maximo 20000 caracteres."),
      }),
    )
    .max(140, "Use no maximo 140 respostas."),
});

export const candyXpActivityReviewSchema = z.object({
  feedback: z
    .string()
    .trim()
    .max(3000, "O feedback pode ter no maximo 3000 caracteres.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  outcome: z.enum(CANDY_XP_SUBMISSION_OUTCOMES),
  submissionId: z.string().min(1, "Envio invalido."),
});

export type CandyXpActivityQuestionInput = z.input<
  typeof candyXpActivityQuestionSchema
>;
export type CandyXpActivityCreateInput = z.input<
  typeof candyXpActivityCreateSchema
>;
export type CandyXpActivityUpdateInput = z.input<
  typeof candyXpActivityUpdateSchema
>;
export type CandyXpActivityDeleteInput = z.input<
  typeof candyXpActivityDeleteSchema
>;
export type SaveCandyXpActivityInteractiveFieldsInput = z.input<
  typeof saveCandyXpActivityInteractiveFieldsSchema
>;
export type SaveCandyXpActivityInteractiveFieldsOutput = z.output<
  typeof saveCandyXpActivityInteractiveFieldsSchema
>;
export type CandyXpActivityAnswerInput = z.input<
  typeof candyXpActivityAnswerSchema
>;
export type CandyXpActivityReviewInput = z.input<
  typeof candyXpActivityReviewSchema
>;
