import { z } from "zod";

import { isRefreshToken } from "@/lib/mobile-auth/tokens";
import { loginSchema } from "@/lib/validations/auth";

const installationIdSchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

const mobileDeviceSchema = z
  .object({
    appVersion: z.string().trim().min(1).max(32).optional(),
    installationId: installationIdSchema,
    name: z.string().trim().min(1).max(80).optional(),
    platform: z.enum(["ANDROID", "IOS", "WEB"]),
  })
  .strict();

export const mobileLoginSchema = loginSchema
  .extend({
    device: mobileDeviceSchema,
  })
  .strict();

export const mobileRefreshSchema = z
  .object({
    installationId: installationIdSchema,
    refreshToken: z.string().refine(isRefreshToken),
  })
  .strict();

export type MobileLoginInput = z.infer<typeof mobileLoginSchema>;
export type MobileRefreshInput = z.infer<typeof mobileRefreshSchema>;
