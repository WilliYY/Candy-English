import { z } from "zod";

export const morningBodySchema = z.object({
  sentences: z.array(z.string().trim().min(12).max(190)
    .regex(/^[A-Za-z][A-Za-z ,;:'’“”"\-–—]*[.!?]$/)).min(2).max(4),
}).strict();

export const morningActionSchema = z.object({
  enabled: z.boolean(),
  expectedVersion: z.string().datetime().nullable(),
  confirm: z.literal(true),
}).strict();
