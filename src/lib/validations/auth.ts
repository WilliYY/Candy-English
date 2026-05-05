import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu email.")
    .email("Informe um email valido.")
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(1, "Informe sua senha.")
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(128, "A senha precisa ter no maximo 128 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
