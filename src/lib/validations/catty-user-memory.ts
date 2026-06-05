import { z } from "zod";

export const cattyUserMemoryCategoryValues = [
  "INTEREST",
  "LEARNING_GOAL",
  "DIFFICULTY",
  "STYLE",
  "FAVORITE_THEME",
  "EMOJI_PREFERENCE",
  "NOTE",
] as const;

export const cattyUserMemorySourceValues = [
  "USER_MESSAGE",
  "TEACHER_NOTE",
  "ADMIN_NOTE",
  "CATTY_DETECTED",
] as const;

export const cattyUserMemoryStatusValues = [
  "ACTIVE",
  "PENDING",
  "FLAGGED",
  "ARCHIVED",
] as const;

export type CattyUserMemoryCategoryInput =
  (typeof cattyUserMemoryCategoryValues)[number];
export type CattyUserMemorySourceInput =
  (typeof cattyUserMemorySourceValues)[number];
export type CattyUserMemoryStatusInput =
  (typeof cattyUserMemoryStatusValues)[number];

const sensitiveUserMemoryTerms = [
  "api key",
  "banco",
  "cartao",
  "chave",
  "contrato",
  "cpf",
  "credencial",
  "documento",
  "e-mail",
  "email",
  "endereco",
  "pagamento",
  "pix",
  "senha",
  "telefone",
  "token",
  "whatsapp",
];

export function normalizeCattyUserMemoryText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function hasSensitiveCattyUserMemoryText(text: string) {
  const normalized = normalizeCattyUserMemoryText(text);

  return sensitiveUserMemoryTerms.some((term) => normalized.includes(term));
}

function optionalMemoryText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => (value ? value : undefined));
}

export const cattyUserMemoryUpsertSchema = z
  .object({
    category: z.enum(cattyUserMemoryCategoryValues),
    confidence: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .default(70),
    flaggedReason: optionalMemoryText(
      240,
      "O motivo pode ter no maximo 240 caracteres.",
    ),
    key: z
      .string()
      .trim()
      .min(2, "Informe uma chave curta para a memoria.")
      .max(48, "A chave pode ter no maximo 48 caracteres."),
    source: z.enum(cattyUserMemorySourceValues),
    status: z.enum(cattyUserMemoryStatusValues).optional().default("PENDING"),
    targetUserId: z.string().min(1, "Usuario invalido."),
    value: z
      .string()
      .trim()
      .min(2, "Informe um resumo util para a memoria.")
      .max(160, "A memoria pessoal deve ser curta."),
  })
  .superRefine((value, ctx) => {
    const searchableContent = [
      value.flaggedReason,
      value.key,
      value.value,
    ]
      .filter(Boolean)
      .join(" ");

    if (hasSensitiveCattyUserMemoryText(searchableContent)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Nao salve senha, pagamento, contrato, documento, telefone, endereco, token, chave ou dados privados na memoria pessoal da Catty.",
        path: ["value"],
      });
    }
  });

export const cattyUserMemoryStatusUpdateSchema = z
  .object({
    flaggedReason: optionalMemoryText(
      240,
      "O motivo pode ter no maximo 240 caracteres.",
    ),
    memoryId: z.string().min(1, "Memoria invalida."),
    status: z.enum(cattyUserMemoryStatusValues),
  })
  .superRefine((value, ctx) => {
    if (
      value.flaggedReason &&
      hasSensitiveCattyUserMemoryText(value.flaggedReason)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "O motivo nao pode conter dados sensiveis.",
        path: ["flaggedReason"],
      });
    }
  });

export const cattyUserMemoryValueUpdateSchema = z
  .object({
    confidence: z.number().int().min(0).max(100).optional(),
    memoryId: z.string().min(1, "Memoria invalida."),
    value: z
      .string()
      .trim()
      .min(2, "Informe um resumo util para a memoria.")
      .max(160, "A memoria pessoal deve ser curta."),
  })
  .superRefine((value, ctx) => {
    if (hasSensitiveCattyUserMemoryText(value.value)) {
      ctx.addIssue({
        code: "custom",
        message: "A memoria nao pode conter dados sensiveis.",
        path: ["value"],
      });
    }
  });

export type CattyUserMemoryUpsertInput = z.input<
  typeof cattyUserMemoryUpsertSchema
>;
export type CattyUserMemoryStatusUpdateInput = z.input<
  typeof cattyUserMemoryStatusUpdateSchema
>;
export type CattyUserMemoryValueUpdateInput = z.input<
  typeof cattyUserMemoryValueUpdateSchema
>;
