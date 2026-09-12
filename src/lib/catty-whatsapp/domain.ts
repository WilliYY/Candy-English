import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const INCOMING_MAX_AGE_MS = 5 * 60_000;
export const QUEUE_TTL_MS = 5 * 60_000;
export const LIMITS = { globalDay: 100, contactHour: 10, pending: 20 } as const;

export function normalizePhone(input: string) {
  if (!/^\+[\d ()-]+$/.test(input)) throw new Error("Use +, código do país e DDD.");
  const phone = input.replace(/\D/g, "");
  if (!/^[1-9]\d{9,14}$/.test(phone)) throw new Error("Telefone internacional inválido.");
  return phone;
}

export function secretMatches(received: string, expected: string) {
  if (expected.length < 32 || received.length > 512) return false;
  return timingSafeEqual(createHash("sha256").update(received).digest(), createHash("sha256").update(expected).digest());
}

export function isOptOut(text: string) {
  return /^(sair|parar|stop|cancelar mensagens|nao quero receber mensagens)[.!]?$/i.test(
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(),
  );
}

const eventSchema = z.object({
  event: z.enum(["messages.upsert", "MESSAGES_UPSERT"]),
  instance: z.string().min(1).max(100),
  data: z.object({
    key: z.object({ id: z.string().min(1).max(200), remoteJid: z.string().max(100),
      remoteJidAlt: z.string().max(100).optional(), fromMe: z.literal(false) }),
    messageTimestamp: z.union([z.number(), z.string().regex(/^\d{10}$/)]),
    message: z.object({ conversation: z.string().optional(),
      extendedTextMessage: z.object({ text: z.string() }).optional() }),
  }),
});

export function extractIncoming(body: unknown, instance: string, now = new Date()) {
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success || parsed.data.instance !== instance) return null;
  const { key, message, messageTimestamp } = parsed.data.data;
  const at = Number(messageTimestamp) * 1000;
  if (!Number.isSafeInteger(at) || at < now.getTime() - INCOMING_MAX_AGE_MS || at > now.getTime() + 60_000) return null;
  const jid = key.remoteJid.endsWith("@lid") ? key.remoteJidAlt : key.remoteJid;
  const match = /^([1-9]\d{9,14})@s\.whatsapp\.net$/.exec(jid ?? "");
  const text = (message.conversation ?? message.extendedTextMessage?.text ?? "").trim();
  if (!match || !text || text.length > 1000) return null;
  return { phone: match[1], text, occurredAt: new Date(at),
    eventKey: createHash("sha256").update(`${instance}:${key.id}`).digest("hex") };
}

export async function readBoundedJson(request: Request, maxBytes = 32_768): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) throw new Error("BODY_TOO_LARGE");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
