import { z } from "zod";
import { ROLES } from "@/lib/roles";

function optionalText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => (value ? value : undefined));
}

function parseMoneyToCents(value: string) {
  const compactValue = value.replace(/\s/g, "").replace(/^R\$/i, "");
  const normalizedValue = compactValue.includes(",")
    ? compactValue.replace(/\./g, "").replace(",", ".")
    : compactValue;
  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.round(numericValue * 100);
}

const moneySchema = z
  .string()
  .trim()
  .min(1, "Informe o valor pago.")
  .refine((value) => {
    const cents = parseMoneyToCents(value);

    return cents !== null && cents > 0;
  }, "Informe um valor valido maior que zero.")
  .transform((value) => parseMoneyToCents(value) ?? 0);

const optionalDateSchema = z
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
        message: "Informe uma data valida.",
      });
      return z.NEVER;
    }

    return date;
  });

const optionalEmailSchema = z
  .string()
  .trim()
  .max(180, "O email pode ter no maximo 180 caracteres.")
  .optional()
  .transform((value) => (value ? value.toLowerCase() : undefined))
  .refine(
    (value) => !value || z.email().safeParse(value).success,
    "Informe um email valido.",
  );

export const FINANCIAL_PAYMENT_METHODS = [
  "PIX",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "CASH",
  "OTHER",
] as const;

const year2026Schema = z.literal(2026);

const financeMonthSchema = z
  .number()
  .int("Selecione um mes valido.")
  .min(1, "Selecione um mes valido.")
  .max(12, "Selecione um mes valido.");

const financialStudentBaseSchema = z.object({
  address: optionalText(240, "O endereco pode ter no maximo 240 caracteres."),
  amount: moneySchema,
  cpf: optionalText(32, "O CPF pode ter no maximo 32 caracteres."),
  email: optionalEmailSchema,
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome com pelo menos 2 caracteres.")
    .max(120, "O nome pode ter no maximo 120 caracteres."),
  paymentDay: z
    .number()
    .int("Informe um dia valido.")
    .min(1, "O dia precisa estar entre 1 e 31.")
    .max(31, "O dia precisa estar entre 1 e 31."),
  paymentMethod: z.enum(FINANCIAL_PAYMENT_METHODS),
  phone: optionalText(40, "O telefone pode ter no maximo 40 caracteres."),
});

export const adminCreateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome com pelo menos 2 caracteres.")
      .max(120, "O nome pode ter no maximo 120 caracteres."),
    email: z
      .string()
      .trim()
      .email("Informe um email valido.")
      .max(180, "O email pode ter no maximo 180 caracteres.")
      .transform((email) => email.toLowerCase()),
    password: z
      .string()
      .min(8, "A senha temporaria precisa ter pelo menos 8 caracteres.")
      .max(120, "A senha temporaria pode ter no maximo 120 caracteres."),
    role: z.enum(ROLES),
    level: optionalText(80, "O nivel pode ter no maximo 80 caracteres."),
    guardianDocument: optionalText(
      180,
      "O documento ou responsavel pode ter no maximo 180 caracteres.",
    ),
    studentPhone: optionalText(
      40,
      "O telefone principal pode ter no maximo 40 caracteres.",
    ),
    studentPhoneAlt: optionalText(
      40,
      "O telefone secundario pode ter no maximo 40 caracteres.",
    ),
    motherName: optionalText(
      120,
      "O nome da mae pode ter no maximo 120 caracteres.",
    ),
    motherPhone: optionalText(
      40,
      "O telefone da mae pode ter no maximo 40 caracteres.",
    ),
    birthDate: z
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

        return date;
      }),
    notes: optionalText(1000, "As notas podem ter no maximo 1000 caracteres."),
    bio: optionalText(1000, "A bio pode ter no maximo 1000 caracteres."),
  })
  .superRefine((data, ctx) => {
    if (data.role === "TEACHER" && data.level) {
      ctx.addIssue({
        code: "custom",
        message: "Nivel e usado apenas para alunos.",
        path: ["level"],
      });
    }

    if (data.role === "STUDENT" && data.bio) {
      ctx.addIssue({
        code: "custom",
        message: "Bio e usada apenas para teachers.",
        path: ["bio"],
      });
    }

    if (data.role !== "STUDENT") {
      (
        [
          "guardianDocument",
          "studentPhone",
          "studentPhoneAlt",
          "motherName",
          "motherPhone",
        ] as const
      ).forEach((field) => {
        if (data[field]) {
          ctx.addIssue({
            code: "custom",
            message: "Este campo e usado apenas para alunos.",
            path: [field],
          });
        }
      });
    }
  });

export type AdminCreateUserInput = z.input<typeof adminCreateUserSchema>;
export type AdminCreateUserData = z.output<typeof adminCreateUserSchema>;

export const adminToggleUserStatusSchema = z.object({
  isActive: z.boolean(),
  userId: z.string().min(1, "Usuario invalido."),
});

export const adminAssignTeacherSchema = z.object({
  studentProfileId: z.string().min(1, "Selecione um aluno."),
  teacherProfileId: z.string().min(1, "Selecione uma teacher."),
});

export const adminSiteContentSchema = z.object({
  ctaLabel: optionalText(80, "O texto do botao pode ter no maximo 80 caracteres."),
  description: z
    .string()
    .trim()
    .min(10, "Informe uma descricao com pelo menos 10 caracteres.")
    .max(900, "A descricao pode ter no maximo 900 caracteres."),
  slug: z.enum(["home", "sobre", "metodologia", "planos", "contato"]),
  title: z
    .string()
    .trim()
    .min(3, "Informe um titulo com pelo menos 3 caracteres.")
    .max(180, "O titulo pode ter no maximo 180 caracteres."),
});

export const adminMaintenanceSchema = z.object({
  enabled: z.boolean(),
});

export const adminFinanceStudentCreateSchema = financialStudentBaseSchema.extend({
  month: financeMonthSchema,
  note: optionalText(1000, "A observacao pode ter no maximo 1000 caracteres."),
  paidAt: optionalDateSchema,
  year: year2026Schema,
});

export const adminFinanceStudentUpdateSchema = financialStudentBaseSchema.extend({
  studentId: z.string().min(1, "Aluno financeiro invalido."),
});

export const adminFinancePaymentUpdateSchema = z.object({
  month: financeMonthSchema,
  note: optionalText(1000, "A observacao pode ter no maximo 1000 caracteres."),
  paidAt: optionalDateSchema,
  studentId: z.string().min(1, "Aluno financeiro invalido."),
  year: year2026Schema,
});

export const adminFinanceStatusSchema = z.object({
  isPaid: z.boolean(),
  month: financeMonthSchema,
  studentId: z.string().min(1, "Aluno financeiro invalido."),
  year: year2026Schema,
});

export const adminFinanceStudentDeleteSchema = z.object({
  studentId: z.string().min(1, "Aluno financeiro invalido."),
});

export const adminFinanceExportLogSchema = z.object({
  format: z.enum(["PDF", "EXCEL"]),
  month: financeMonthSchema,
  year: year2026Schema,
});

export type AdminToggleUserStatusInput = z.input<
  typeof adminToggleUserStatusSchema
>;
export type AdminAssignTeacherInput = z.input<typeof adminAssignTeacherSchema>;
export type AdminSiteContentInput = z.input<typeof adminSiteContentSchema>;
export type AdminMaintenanceInput = z.input<typeof adminMaintenanceSchema>;
export type AdminFinanceStudentCreateInput = z.input<
  typeof adminFinanceStudentCreateSchema
>;
export type AdminFinanceStudentUpdateInput = z.input<
  typeof adminFinanceStudentUpdateSchema
>;
export type AdminFinancePaymentUpdateInput = z.input<
  typeof adminFinancePaymentUpdateSchema
>;
export type AdminFinanceStatusInput = z.input<typeof adminFinanceStatusSchema>;
export type AdminFinanceStudentDeleteInput = z.input<
  typeof adminFinanceStudentDeleteSchema
>;
export type AdminFinanceExportLogInput = z.input<
  typeof adminFinanceExportLogSchema
>;
