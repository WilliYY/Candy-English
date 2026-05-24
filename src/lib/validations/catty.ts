import { z } from "zod";

const cattyMessageSchema = z.object({
  from: z.enum(["catty", "user"]),
  text: z.string().trim().min(1).max(900),
});

const cattyPageContextSchema = z.object({
  area: z
    .enum(["site", "login", "admin", "teacher", "student", "unknown"])
    .default("unknown"),
  task: z.string().trim().max(80).optional(),
});

export const cattyChatSchema = z.object({
  context: cattyPageContextSchema.optional(),
  history: z.array(cattyMessageSchema).max(8).optional().default([]),
  message: z.string().trim().min(1).max(600),
});

export type CattyChatInput = z.infer<typeof cattyChatSchema>;
