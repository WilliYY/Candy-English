import { z } from "zod";
import { hasSensitiveCattyUserMemoryText } from "@/lib/validations/catty-user-memory";

function optionalText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => (value ? value : undefined));
}

const optionalBirthDateSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) {
      return undefined;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Informe uma data de nascimento valida.",
      });
      return z.NEVER;
    }

    if (date > new Date()) {
      ctx.addIssue({
        code: "custom",
        message: "A data de nascimento nao pode ser futura.",
      });
      return z.NEVER;
    }

    return date;
  });

export const studentPreRegistrationSchema = z.object({
  address: optionalText(
    240,
    "Cidade ou endereco pode ter no maximo 240 caracteres.",
  ),
  birthDate: optionalBirthDateSchema,
  email: z
    .string()
    .trim()
    .email("Informe um email valido.")
    .max(180, "O email pode ter no maximo 180 caracteres.")
    .transform((email) => email.toLowerCase()),
  englishGoal: z
    .string()
    .trim()
    .min(5, "Conte um pouquinho do seu objetivo com o ingles.")
    .max(1000, "O objetivo pode ter no maximo 1000 caracteres."),
  fullName: z
    .string()
    .trim()
    .min(2, "Informe o nome completo.")
    .max(120, "O nome pode ter no maximo 120 caracteres."),
  guardianDocument: optionalText(
    80,
    "O documento pode ter no maximo 80 caracteres.",
  ),
  guardianName: optionalText(
    120,
    "O nome da mae ou responsavel pode ter no maximo 120 caracteres.",
  ),
  guardianPhone: optionalText(
    40,
    "O telefone da mae ou responsavel pode ter no maximo 40 caracteres.",
  ),
  notes: optionalText(
    1000,
    "As observacoes podem ter no maximo 1000 caracteres.",
  ),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone para contato.")
    .max(40, "O telefone pode ter no maximo 40 caracteres."),
  secondaryContact: optionalText(
    120,
    "O segundo contato pode ter no maximo 120 caracteres.",
  ),
  studentPhone: optionalText(
    40,
    "O telefone do aluno pode ter no maximo 40 caracteres.",
  ),
});

export type StudentPreRegistrationInput = z.input<
  typeof studentPreRegistrationSchema
>;
export type StudentPreRegistrationData = z.output<
  typeof studentPreRegistrationSchema
>;

export const studentPreRegistrationStatusSchema = z.enum([
  "PENDING",
  "CONTACTED",
  "APPROVED",
  "REJECTED",
]);

export const preRegistrationReviewSchema = z.object({
  requestId: z.string().min(1, "Solicitacao invalida."),
  status: z.enum(["CONTACTED", "REJECTED"]),
  statusNote: optionalText(
    1000,
    "A observacao pode ter no maximo 1000 caracteres.",
  ),
});

export const preRegistrationAcceptSchema = z
  .object({
    cattyContext: optionalText(
      160,
      "O contexto Catty pode ter no maximo 160 caracteres.",
    ),
    initialPassword: z
      .string()
      .min(8, "A senha inicial precisa ter pelo menos 8 caracteres.")
      .max(120, "A senha inicial pode ter no maximo 120 caracteres."),
    requestId: z.string().min(1, "Solicitacao invalida."),
  })
  .superRefine((data, ctx) => {
    if (data.cattyContext && hasSensitiveCattyUserMemoryText(data.cattyContext)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Nao salve senha, pagamento, contrato, documento, telefone, endereco, token, chave ou dados privados no contexto Catty.",
        path: ["cattyContext"],
      });
    }
  });

export type StudentPreRegistrationStatusInput = z.input<
  typeof studentPreRegistrationStatusSchema
>;
export type PreRegistrationReviewInput = z.input<
  typeof preRegistrationReviewSchema
>;
export type PreRegistrationAcceptInput = z.input<
  typeof preRegistrationAcceptSchema
>;
