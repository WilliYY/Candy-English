import { z } from "zod";
import { hasSensitiveCattyUserMemoryText } from "@/lib/validations/catty-user-memory";

export const cattyUserArtifactStatusValues = [
  "ACTIVE",
  "PENDING",
  "DISABLED",
  "ARCHIVED",
] as const;

export type CattyUserArtifactStatusInput =
  (typeof cattyUserArtifactStatusValues)[number];

const blockedArtifactTerms = [
  "aposta",
  "arma",
  "bebida",
  "crime",
  "droga",
  "odio",
  "ofensa",
  "politica",
  "religiao",
  "sexo",
  "violencia",
];

function normalizeArtifactValidationText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasBlockedArtifactText(text: string) {
  const normalized = normalizeArtifactValidationText(text);

  return blockedArtifactTerms.some((term) => normalized.includes(term));
}

function compactText(text: string, maxLength: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function splitTextList(value: string, maxItems: number, maxItemLength: number) {
  return [
    ...new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => compactText(item, maxItemLength))
        .filter(Boolean),
    ),
  ].slice(0, maxItems);
}

function splitEmojiList(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  const items = /[\s,;\n]/.test(trimmed)
    ? splitTextList(trimmed, 8, 8)
    : Array.from(trimmed)
        .filter((item) => item.trim() && item !== "\ufe0f")
        .slice(0, 8);

  return [
    ...new Set(
      items
        .map((item) => item.replace(/\ufe0f/g, "").trim())
        .filter(Boolean),
    ),
  ].slice(0, 8);
}

const optionalArtifactText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => (value ? value : undefined));

export const cattyUserArtifactUpsertSchema = z
  .object({
    blockedReason: optionalArtifactText(
      220,
      "O motivo pode ter no maximo 220 caracteres.",
    ),
    catchphrasesText: z
      .string()
      .trim()
      .max(420, "Use no maximo 420 caracteres em bordoes.")
      .optional()
      .default("")
      .transform((value) => splitTextList(value, 8, 48)),
    emojisText: z
      .string()
      .trim()
      .max(80, "Use poucos emojis por tema.")
      .optional()
      .default("")
      .transform(splitEmojiList),
    example: optionalArtifactText(
      140,
      "O exemplo pode ter no maximo 140 caracteres.",
    ),
    label: z
      .string()
      .trim()
      .min(2, "Informe o nome do tema.")
      .max(64, "O nome do tema pode ter no maximo 64 caracteres."),
    soundsText: z
      .string()
      .trim()
      .max(180, "Use no maximo 180 caracteres em sons.")
      .optional()
      .default("")
      .transform((value) => splitTextList(value, 6, 28)),
    status: z.enum(cattyUserArtifactStatusValues).optional().default("PENDING"),
    targetUserId: z.string().min(1, "Usuario invalido."),
    themeId: z
      .string()
      .trim()
      .min(2, "Informe uma chave do tema.")
      .max(48, "A chave do tema pode ter no maximo 48 caracteres.")
      .regex(
        /^[a-z0-9][a-z0-9_-]*$/,
        "Use apenas letras minusculas, numeros, _ ou - na chave.",
      ),
    toneRule: optionalArtifactText(
      220,
      "A regra do tom pode ter no maximo 220 caracteres.",
    ),
  })
  .superRefine((value, ctx) => {
    const searchableContent = [
      value.blockedReason,
      value.catchphrasesText.join(" "),
      value.emojisText.join(" "),
      value.example,
      value.label,
      value.soundsText.join(" "),
      value.themeId,
      value.toneRule,
    ]
      .filter(Boolean)
      .join(" ");

    if (hasSensitiveCattyUserMemoryText(searchableContent)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Nao salve senha, pagamento, contrato, documento, telefone, endereco, token, chave ou dados privados em artefatos da Catty.",
        path: ["label"],
      });
    }

    if (hasBlockedArtifactText(searchableContent)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Esse tema parece sensivel ou inadequado para a Catty. Use um interesse leve e seguro.",
        path: ["label"],
      });
    }

    const hasUsefulArtifact =
      value.emojisText.length > 0 ||
      value.catchphrasesText.length > 0 ||
      value.soundsText.length > 0 ||
      Boolean(value.example);

    if (
      !hasUsefulArtifact &&
      value.status !== "DISABLED" &&
      value.status !== "ARCHIVED"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Informe pelo menos um emoji, bordao, som ou exemplo.",
        path: ["catchphrasesText"],
      });
    }
  });

export const cattyUserArtifactStatusUpdateSchema = z
  .object({
    artifactId: z.string().min(1, "Artefato invalido."),
    blockedReason: optionalArtifactText(
      220,
      "O motivo pode ter no maximo 220 caracteres.",
    ),
    status: z.enum(cattyUserArtifactStatusValues),
  })
  .superRefine((value, ctx) => {
    if (
      value.blockedReason &&
      (hasSensitiveCattyUserMemoryText(value.blockedReason) ||
        hasBlockedArtifactText(value.blockedReason))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "O motivo nao pode conter dado sensivel ou tema inadequado.",
        path: ["blockedReason"],
      });
    }
  });

export type CattyUserArtifactUpsertInput = z.input<
  typeof cattyUserArtifactUpsertSchema
>;
export type CattyUserArtifactUpsertData = z.output<
  typeof cattyUserArtifactUpsertSchema
>;
export type CattyUserArtifactStatusUpdateInput = z.input<
  typeof cattyUserArtifactStatusUpdateSchema
>;
