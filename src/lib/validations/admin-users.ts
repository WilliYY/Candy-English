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

export type AdminToggleUserStatusInput = z.input<
  typeof adminToggleUserStatusSchema
>;
export type AdminAssignTeacherInput = z.input<typeof adminAssignTeacherSchema>;
