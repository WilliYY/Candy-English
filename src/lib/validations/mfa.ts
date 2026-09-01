import { z } from "zod";

export const mfaCodeSchema = z
  .string()
  .trim()
  .min(6, "Informe o codigo do autenticador ou de recuperacao.")
  .max(32, "O codigo de seguranca e invalido.");

export const confirmAdminMfaSchema = z.object({
  code: mfaCodeSchema,
});

export const beginAdminMfaSchema = z.object({
  password: z
    .string()
    .min(8, "Informe sua senha atual.")
    .max(128, "A senha atual e invalida."),
});

export const disableAdminMfaSchema = z.object({
  code: mfaCodeSchema,
  password: z
    .string()
    .min(8, "Informe sua senha atual.")
    .max(128, "A senha atual e invalida."),
});

export type ConfirmAdminMfaInput = z.infer<typeof confirmAdminMfaSchema>;
export type BeginAdminMfaInput = z.infer<typeof beginAdminMfaSchema>;
export type DisableAdminMfaInput = z.infer<typeof disableAdminMfaSchema>;
