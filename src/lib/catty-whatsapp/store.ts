import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { encrypt, phoneHash } from "./crypto";
import { extractIncoming, isOptOut, LIMITS, QUEUE_TTL_MS } from "./domain";
import type { WhatsappConfig } from "./config";

export type WhatsappTx = Prisma.TransactionClient;
export async function lockChannel(tx: WhatsappTx) {
  await tx.$queryRaw`SELECT "id" FROM "CattyWhatsappChannel" WHERE "id" = 'main' FOR UPDATE`;
  return tx.cattyWhatsappChannel.findUniqueOrThrow({ where: { id: "main" } });
}
export async function hasQueueCapacity(tx: WhatsappTx, contactId: string, now: Date) {
  const [day, hour, pending] = await Promise.all([
    tx.cattyWhatsappMessage.count({ where: { createdAt: { gte: new Date(now.getTime() - 86_400_000) } } }),
    tx.cattyWhatsappMessage.count({ where: { contactId, createdAt: { gte: new Date(now.getTime() - 3_600_000) } } }),
    tx.cattyWhatsappMessage.count({ where: { status: { in: ["QUEUED", "PROCESSING", "SENDING"] } } }),
  ]);
  return day < LIMITS.globalDay && hour < LIMITS.contactHour && pending < LIMITS.pending;
}
export async function receiveWhatsapp(body: unknown, config: WhatsappConfig) {
  const now = new Date();
  const incoming = extractIncoming(body, config.instance, now);
  if (!incoming) return "ignored";
  const hash = phoneHash(incoming.phone, config.encryptionKey);
  return getPrisma().$transaction(async tx => {
    const channel = await lockChannel(tx);
    const contact = await tx.cattyWhatsappContact.findUnique({ where: { phoneHash: hash } });
    if (!contact || incoming.occurredAt < contact.consentAt) return "ignored";
    // STOP remains effective while paused and never calls an AI provider.
    if (isOptOut(incoming.text)) {
      if (contact.authorized) {
        await tx.cattyWhatsappContact.update({ where: { id: contact.id }, data: { authorized: false, optedOutAt: now } });
        await tx.cattyWhatsappMessage.updateMany({ where: { contactId: contact.id, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "CANCELED", errorCode: "OPT_OUT" } });
        await tx.cattyWhatsappAudit.create({ data: { action: "CONTACT_OPT_OUT", contactId: contact.id } });
      }
      return "ignored";
    }
    if (channel.paused || !contact.authorized || contact.optedOutAt || incoming.occurredAt < contact.consentAt) return "ignored";
    if (await tx.cattyWhatsappMessage.findUnique({ where: { eventKey: incoming.eventKey }, select: { id: true } })) return "duplicate";
    if (!await hasQueueCapacity(tx, contact.id, now)) return "limited";
    const id = randomUUID();
    await tx.cattyWhatsappMessage.create({ data: {
      id, eventKey: incoming.eventKey, contactId: contact.id,
      inputCiphertext: encrypt(incoming.text, `input:${id}`, config.encryptionKey),
      expiresAt: new Date(now.getTime() + QUEUE_TTL_MS), contentExpiresAt: new Date(now.getTime() + 86_400_000),
    } });
    return "queued";
  });
}

export async function cleanupWhatsapp(tx: WhatsappTx, now: Date) {
  await tx.cattyWhatsappMessage.updateMany({ where: { contentExpiresAt: { lte: now }, OR: [{ inputCiphertext: { not: null } }, { replyCiphertext: { not: null } }] }, data: { inputCiphertext: null, replyCiphertext: null } });
  const cutoff = new Date(now.getTime() - 30 * 86_400_000);
  await tx.cattyWhatsappMessage.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await tx.cattyWhatsappAudit.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
