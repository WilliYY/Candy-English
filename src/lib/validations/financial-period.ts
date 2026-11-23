import { z } from "zod";

export const openFinancialPeriodSchema = z.object({
  confirmCreate: z.literal(true),
  studentId: z.string().trim().min(1).max(200),
  year: z.number().int().min(2026).max(2100),
  month: z.number().int().min(1).max(12),
}).strict();
export type OpenFinancialPeriodInput = z.input<typeof openFinancialPeriodSchema>;

export const financialPeriodCandidatesSchema = z.object({
  year: z.coerce.number().int().min(2026).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  unit: z.enum(["ALL", "IVATE", "DOURADINA"]).default("ALL"),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  cursor: z.string().trim().min(1).max(200).optional(),
}).strict();
