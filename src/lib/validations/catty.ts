import { z } from "zod";

const cattyMessageSchema = z.object({
  from: z.enum(["catty", "user"]),
  text: z.string().trim().min(1).max(900),
});

export const cattyChatSchema = z.object({
  history: z.array(cattyMessageSchema).max(8).optional().default([]),
  message: z.string().trim().min(1).max(600),
});

export type CattyChatInput = z.infer<typeof cattyChatSchema>;
