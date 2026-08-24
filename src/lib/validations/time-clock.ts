import { z } from "zod";

export const TIME_CLOCK_ENTRY_TYPES = ["ENTRY", "EXIT"] as const;

const optionalJustification = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || undefined);

const occurredAtSchema = z.string().datetime();

export const timeClockPunchSchema = z.object({
  justification: optionalJustification,
  operationId: z.string().trim().min(8).max(100),
  type: z.enum(TIME_CLOCK_ENTRY_TYPES),
});

export const timeClockProfileCreateSchema = z.object({
  userId: z.string().trim().min(1),
});

export const timeClockProfileStatusSchema = z.object({
  isActive: z.boolean(),
  profileId: z.string().trim().min(1),
});

export const timeClockManualEntrySchema = z.object({
  justification: optionalJustification,
  occurredAt: occurredAtSchema,
  profileId: z.string().trim().min(1),
  type: z.enum(TIME_CLOCK_ENTRY_TYPES),
});

export const timeClockEntryCorrectionSchema = z.object({
  correctionReason: z.string().trim().min(3).max(300),
  entryId: z.string().trim().min(1),
  expectedUpdatedAt: z.string().datetime(),
  justification: optionalJustification,
  occurredAt: occurredAtSchema,
  type: z.enum(TIME_CLOCK_ENTRY_TYPES),
});

export const timeClockReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  profileId: z.string().trim().min(1),
  year: z.coerce.number().int().min(2020).max(2200),
});

export type TimeClockEntryCorrectionInput = z.input<
  typeof timeClockEntryCorrectionSchema
>;
export type TimeClockManualEntryInput = z.input<
  typeof timeClockManualEntrySchema
>;
export type TimeClockProfileCreateInput = z.input<
  typeof timeClockProfileCreateSchema
>;
export type TimeClockProfileStatusInput = z.input<
  typeof timeClockProfileStatusSchema
>;
export type TimeClockPunchInput = z.input<typeof timeClockPunchSchema>;
