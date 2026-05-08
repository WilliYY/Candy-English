import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalDateTime = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Informe data e horario validos.",
      });
      return z.NEVER;
    }

    return date;
  });

function canParseUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const updateProfileSchema = z.object({
  address: optionalText(300, "O endereco pode ter no maximo 300 caracteres."),
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
  guardianDocument: optionalText(
    180,
    "O documento ou responsavel pode ter no maximo 180 caracteres.",
  ),
  gender: optionalText(40, "A identificacao pode ter no maximo 40 caracteres."),
  motherName: optionalText(
    120,
    "O nome da mae pode ter no maximo 120 caracteres.",
  ),
  motherPhone: optionalText(
    40,
    "O telefone da mae pode ter no maximo 40 caracteres.",
  ),
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome com pelo menos 2 caracteres.")
    .max(120, "O nome pode ter no maximo 120 caracteres."),
  notes: optionalText(1000, "As notas podem ter no maximo 1000 caracteres."),
  phone: optionalText(40, "O telefone pode ter no maximo 40 caracteres."),
  studentPhone: optionalText(
    40,
    "O telefone principal pode ter no maximo 40 caracteres.",
  ),
  studentPhoneAlt: optionalText(
    40,
    "O telefone secundario pode ter no maximo 40 caracteres.",
  ),
});

export const createLiveSessionSchema = z.object({
  endsAt: optionalDateTime,
  meetUrl: z
    .string()
    .trim()
    .max(500, "O link pode ter no maximo 500 caracteres.")
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((url) => !url || canParseUrl(url), {
      message: "Informe um link valido.",
    })
    .refine(
      (url) => {
        if (!url) {
          return true;
        }

        const host = new URL(url).hostname.toLowerCase();
        return (
          host === "meet.google.com" ||
          host.endsWith(".meet.google.com") ||
          host === "meet.jit.si"
        );
      },
      {
        message: "Use um link do Google Meet ou Jitsi Meet.",
      },
    ),
  startsAt: optionalDateTime,
  studentProfileId: optionalText(80, "Aluno invalido."),
  teacherProfileId: z.string().min(1, "Selecione uma teacher."),
  title: z
    .string()
    .trim()
    .min(3, "Informe um titulo com pelo menos 3 caracteres.")
    .max(160, "O titulo pode ter no maximo 160 caracteres."),
});

export const toggleLiveSessionSchema = z.object({
  isLive: z.boolean(),
  liveSessionId: z.string().min(1, "Aula ao vivo invalida."),
});

export const updateStudentLevelSchema = z.object({
  level: optionalText(80, "O nivel pode ter no maximo 80 caracteres."),
  studentProfileId: z.string().min(1, "Selecione um aluno."),
});

export const uploadContractSchema = z.object({
  studentProfileId: optionalText(80, "Aluno invalido."),
  title: z
    .string()
    .trim()
    .min(3, "Informe um titulo com pelo menos 3 caracteres.")
    .max(160, "O titulo pode ter no maximo 160 caracteres."),
});

export const sendChatMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Escreva uma mensagem.")
    .max(1000, "A mensagem pode ter no maximo 1000 caracteres."),
  studentProfileId: z.string().min(1, "Selecione um aluno."),
  teacherProfileId: z.string().min(1, "Selecione uma teacher."),
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type CreateLiveSessionInput = z.input<typeof createLiveSessionSchema>;
export type ToggleLiveSessionInput = z.input<typeof toggleLiveSessionSchema>;
export type UpdateStudentLevelInput = z.input<typeof updateStudentLevelSchema>;
export type UploadContractInput = z.input<typeof uploadContractSchema>;
export type SendChatMessageInput = z.input<typeof sendChatMessageSchema>;
