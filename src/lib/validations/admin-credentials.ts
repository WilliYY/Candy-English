import { z } from "zod";

export const ADMIN_CREDENTIAL_KINDS = [
  "API_KEY",
  "PASSWORD",
  "TOKEN",
  "CONFIG",
  "URL",
  "OTHER",
] as const;

export const ADMIN_CREDENTIAL_KIND_LABELS = {
  API_KEY: "API key",
  CONFIG: "Configuracao",
  OTHER: "Outro",
  PASSWORD: "Senha",
  TOKEN: "Token",
  URL: "URL",
} satisfies Record<(typeof ADMIN_CREDENTIAL_KINDS)[number], string>;

function optionalText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => (value ? value : undefined));
}

const credentialBaseSchema = z.object({
  kind: z.enum(ADMIN_CREDENTIAL_KINDS),
  label: z
    .string()
    .trim()
    .min(2, "Informe um rotulo com pelo menos 2 caracteres.")
    .max(120, "O rotulo pode ter no maximo 120 caracteres."),
  notes: optionalText(1000, "As notas podem ter no maximo 1000 caracteres."),
  service: z
    .string()
    .trim()
    .min(2, "Informe o servico com pelo menos 2 caracteres.")
    .max(120, "O servico pode ter no maximo 120 caracteres."),
  url: optionalText(300, "A URL pode ter no maximo 300 caracteres."),
  username: optionalText(180, "O usuario pode ter no maximo 180 caracteres."),
});

export const adminCredentialCreateSchema = credentialBaseSchema.extend({
  secret: z
    .string()
    .min(1, "Informe o valor sensivel.")
    .max(5000, "O valor pode ter no maximo 5000 caracteres."),
});

export const adminCredentialUpdateSchema = credentialBaseSchema.extend({
  credentialId: z.string().min(1, "Credencial invalida."),
  secret: z
    .string()
    .max(5000, "O valor pode ter no maximo 5000 caracteres.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export const adminCredentialIdSchema = z.object({
  credentialId: z.string().min(1, "Credencial invalida."),
});

export type AdminCredentialCreateInput = z.input<
  typeof adminCredentialCreateSchema
>;
export type AdminCredentialUpdateInput = z.input<
  typeof adminCredentialUpdateSchema
>;
export type AdminCredentialIdInput = z.input<typeof adminCredentialIdSchema>;
