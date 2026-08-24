import { z } from "zod";
import { hasSensitiveCattyUserMemoryText } from "@/lib/validations/catty-user-memory";

export const PRE_REGISTRATION_STATUSES = [
  "PENDING",
  "CONTACTED",
  "WAITING_PAYMENT",
  "READY_TO_CONVERT",
  "APPROVED",
  "REJECTED",
] as const;

export const SECRETARIA_PRE_REGISTRATION_STATUSES = [
  "PENDING",
  "CONTACTED",
  "WAITING_PAYMENT",
  "READY_TO_CONVERT",
  "REJECTED",
] as const;

export const PRE_REGISTRATION_PAYMENT_METHODS = [
  "PIX",
  "DINHEIRO",
  "CARTAO",
  "OUTRO",
] as const;

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

function optionalInteger({
  max,
  maxMessage,
  min,
  minMessage,
}: {
  max: number;
  maxMessage: string;
  min: number;
  minMessage: string;
}) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) {
        return undefined;
      }

      const parsed = Number(value);

      if (!Number.isInteger(parsed)) {
        ctx.addIssue({
          code: "custom",
          message: "Informe um numero inteiro valido.",
        });
        return z.NEVER;
      }

      if (parsed < min) {
        ctx.addIssue({
          code: "custom",
          message: minMessage,
        });
        return z.NEVER;
      }

      if (parsed > max) {
        ctx.addIssue({
          code: "custom",
          message: maxMessage,
        });
        return z.NEVER;
      }

      return parsed;
    });
}

function optionalEmail() {
  return z
    .string()
    .trim()
    .max(180, "O email pode ter no maximo 180 caracteres.")
    .optional()
    .transform((value, ctx) => {
      if (!value) {
        return undefined;
      }

      const parsed = z.string().email("Informe um email valido.").safeParse(value);

      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: "Informe um email valido.",
        });
        return z.NEVER;
      }

      return parsed.data.toLowerCase();
    });
}

function requiredEmail() {
  return z
    .string()
    .trim()
    .min(1, "Informe o email/login do aluno.")
    .max(180, "O email pode ter no maximo 180 caracteres.")
    .email("Informe um email valido.")
    .transform((value) => value.toLowerCase());
}

function optionalMoneyCents() {
  return z
    .string()
    .trim()
    .max(32, "O valor pode ter no maximo 32 caracteres.")
    .optional()
    .transform((value, ctx) => {
      if (!value) {
        return undefined;
      }

      const normalized = value
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const parsed = Number(normalized);

      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Informe um valor valido.",
        });
        return z.NEVER;
      }

      return Math.round(parsed * 100);
    });
}

export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

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
    "O responsavel pode ter no maximo 120 caracteres.",
  ),
  guardianPhone: optionalText(
    40,
    "O telefone do responsavel pode ter no maximo 40 caracteres.",
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

export const secretariaPreRegistrationSchema = z.object({
  assignedTeacherProfileId: optionalText(
    80,
    "Teacher responsavel invalida.",
  ),
  birthDate: optionalBirthDateSchema,
  city: optionalText(120, "Cidade pode ter no maximo 120 caracteres."),
  email: optionalEmail(),
  englishGoal: z
    .string()
    .trim()
    .min(5, "Conte um pouquinho do objetivo com o ingles.")
    .max(1000, "O objetivo pode ter no maximo 1000 caracteres."),
  estimatedLevel: optionalText(
    80,
    "Nivel estimado pode ter no maximo 80 caracteres.",
  ),
  fullName: z
    .string()
    .trim()
    .min(2, "Informe o nome completo.")
    .max(120, "O nome pode ter no maximo 120 caracteres."),
  guardianName: optionalText(
    120,
    "O responsavel pode ter no maximo 120 caracteres.",
  ),
  installmentsTotal: optionalInteger({
    max: 60,
    maxMessage: "A quantidade de parcelas deve ser ate 60.",
    min: 1,
    minMessage: "A quantidade de parcelas deve ser maior que zero.",
  }),
  intendedTime: optionalText(
    20,
    "Horario pretendido pode ter no maximo 20 caracteres.",
  ),
  intendedWeekdayMask: z.coerce
    .number()
    .int("Dias pretendidos invalidos.")
    .min(0, "Dias pretendidos invalidos.")
    .max(127, "Dias pretendidos invalidos.")
    .default(0),
  notes: optionalText(
    1000,
    "As observacoes podem ter no maximo 1000 caracteres.",
  ),
  paymentDay: optionalInteger({
    max: 31,
    maxMessage: "O dia de pagamento deve ser no maximo 31.",
    min: 1,
    minMessage: "O dia de pagamento deve ser maior que zero.",
  }),
  paymentMethod: z.enum(PRE_REGISTRATION_PAYMENT_METHODS).optional(),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone para contato.")
    .max(40, "O telefone pode ter no maximo 40 caracteres.")
    .refine(
      (value) => normalizePhoneDigits(value).length >= 8,
      "Informe um telefone com DDD.",
    ),
  status: z.enum(SECRETARIA_PRE_REGISTRATION_STATUSES).default("PENDING"),
  tuitionAmount: optionalMoneyCents(),
  unit: z.enum(["IVATE", "DOURADINA"], {
    message: "Selecione a unidade.",
  }),
});

export const secretariaPreRegistrationUpdateSchema =
  secretariaPreRegistrationSchema.omit({ status: true }).extend({
    requestId: z.string().min(1, "Pre-cadastro invalido."),
  });

export const secretariaStudentRegistrationSchema =
  secretariaPreRegistrationSchema
    .omit({ email: true, status: true })
    .extend({
      email: requiredEmail(),
      initialPassword: z
        .string()
        .trim()
        .min(8, "A senha inicial precisa ter pelo menos 8 caracteres.")
        .max(120, "A senha inicial pode ter no maximo 120 caracteres."),
      initialPasswordConfirmation: z
        .string()
        .trim()
        .min(1, "Confirme a senha inicial."),
    })
    .superRefine((data, ctx) => {
      if (data.initialPassword !== data.initialPasswordConfirmation) {
        ctx.addIssue({
          code: "custom",
          message: "As senhas precisam ser iguais.",
          path: ["initialPasswordConfirmation"],
        });
      }
    });

export type StudentPreRegistrationInput = z.input<
  typeof studentPreRegistrationSchema
>;
export type StudentPreRegistrationData = z.output<
  typeof studentPreRegistrationSchema
>;
export type SecretariaPreRegistrationInput = z.input<
  typeof secretariaPreRegistrationSchema
>;
export type SecretariaPreRegistrationData = z.output<
  typeof secretariaPreRegistrationSchema
>;
export type SecretariaPreRegistrationUpdateInput = z.input<
  typeof secretariaPreRegistrationUpdateSchema
>;
export type SecretariaStudentRegistrationInput = z.input<
  typeof secretariaStudentRegistrationSchema
>;

export const studentPreRegistrationStatusSchema = z.enum(
  PRE_REGISTRATION_STATUSES,
);

export const preRegistrationReviewSchema = z.object({
  requestId: z.string().min(1, "Solicitacao invalida."),
  status: z.enum([
    "CONTACTED",
    "WAITING_PAYMENT",
    "READY_TO_CONVERT",
    "REJECTED",
  ]),
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
    confirmConversion: z.boolean().refine((value) => value, {
      message: "Confirme a conversao do pre-cadastro.",
    }),
    confirmMissingAgendaData: z.boolean().optional().default(false),
    emailForLogin: requiredEmail(),
    initialPassword: z
      .string()
      .trim()
      .min(8, "A senha inicial precisa ter pelo menos 8 caracteres.")
      .max(120, "A senha inicial pode ter no maximo 120 caracteres."),
    requestId: z.string().min(1, "Solicitacao invalida."),
    teacherProfileIdForConversion: optionalText(
      80,
      "Teacher para vinculo invalida.",
    ),
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
