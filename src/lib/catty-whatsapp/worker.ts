import { createHash, randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import type { CattyMessage } from "@/lib/catty";
import type { WhatsappConfig } from "./config";
import { decrypt, encrypt } from "./crypto";
import { cleanupWhatsapp, lockChannel } from "./store";
import { generateWhatsappReply } from "./reply";
import { EvolutionTransport, TransportError } from "./transport";
import { isActiveWhatsappAdmin } from "./permissions";

export async function runWhatsappWorker(config: WhatsappConfig, dependencies = {
  transport: new EvolutionTransport(config), reply: generateWhatsappReply,
}) {
  const prisma = getPrisma();
  const token = randomUUID();
  const now = new Date();
  const job = await prisma.$transaction(async tx => {
    const channel = await lockChannel(tx);
    if (channel.workerLeaseUntil && channel.workerLeaseUntil > now) return null;
    await cleanupWhatsapp(tx, now);
    // A dead worker may already have sent: never repeat an uncertain delivery.
    await tx.cattyWhatsappMessage.updateMany({ where: { status: "SENDING" }, data: { status: "UNCERTAIN", errorCode: "WORKER_INTERRUPTED" } });
    await tx.cattyWhatsappMessage.updateMany({ where: { status: "PROCESSING", attempts: { lt: 3 } }, data: { status: "QUEUED" } });
    await tx.cattyWhatsappMessage.updateMany({ where: { status: { in: ["QUEUED", "PROCESSING"] }, OR: [{ expiresAt: { lte: now } }, { attempts: { gte: 3 } }] }, data: { status: "CANCELED", errorCode: "EXPIRED" } });
    await tx.cattyWhatsappChannel.update({ where: { id: "main" }, data: { lastWorkerAt: now } });
    if (channel.paused) return null;
    const row = await tx.cattyWhatsappMessage.findFirst({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, include: { contact: true } });
    if (!row) return null;
    await tx.cattyWhatsappChannel.update({ where: { id: "main" }, data: { workerToken: token, workerLeaseUntil: new Date(now.getTime() + 120_000) } });
    return tx.cattyWhatsappMessage.update({ where: { id: row.id }, data: { status: "PROCESSING", attempts: { increment: 1 } }, include: { contact: true } });
  });
  if (!job) return { processed: false };
  try {
    if (!job.contact.authorized || job.contact.optedOutAt) throw new Error("CONTACT_BLOCKED");
    let reply = job.replyCiphertext ? decrypt(job.replyCiphertext, `reply:${job.id}`, config.encryptionKey) : "";
    if (!job.manual && !reply) {
      if (!job.inputCiphertext) throw new Error("CONTENT_EXPIRED");
      const historyRows = await prisma.cattyWhatsappMessage.findMany({ where: { contactId: job.contactId, manual: false, status: "SENT", contentExpiresAt: { gt: new Date() }, createdAt: { gte: job.contact.consentAt }, inputCiphertext: { not: null }, replyCiphertext: { not: null } }, orderBy: { createdAt: "desc" }, take: 4 });
      const history: CattyMessage[] = historyRows.reverse().flatMap(row => [
        { from: "user", text: decrypt(row.inputCiphertext!, `input:${row.id}`, config.encryptionKey) },
        { from: "catty", text: decrypt(row.replyCiphertext!, `reply:${row.id}`, config.encryptionKey) },
      ]);
      reply = await dependencies.reply(decrypt(job.inputCiphertext, `input:${job.id}`, config.encryptionKey), history);
      if (!history.length) reply = `Sou a Catty, assistente com IA da Candy English.\n\n${reply}\n\nPara não receber mais mensagens, envie SAIR.`;
    }
    const sending = await prisma.$transaction(async tx => {
      const channel = await lockChannel(tx);
      const current = await tx.cattyWhatsappMessage.findUnique({ where: { id: job.id }, include: { contact: true } });
      if (channel.workerToken !== token || !channel.workerLeaseUntil || channel.workerLeaseUntil <= new Date()) return false;
      if (!current || current.status !== "PROCESSING") return false;
      const manualAuthor = current.manual && current.createdByUserId ? await tx.user.findUnique({ where: { id: current.createdByUserId }, select: { role: true, isActive: true, deletedAt: true } }) : null;
      if (channel.paused || !current.contact.authorized || current.contact.optedOutAt || current.expiresAt <= new Date() || (current.manual && !isActiveWhatsappAdmin(manualAuthor))) {
        await tx.cattyWhatsappMessage.update({ where: { id: job.id }, data: { status: "CANCELED", errorCode: "PAUSED_OR_BLOCKED" } });
        return false;
      }
      await tx.cattyWhatsappMessage.update({ where: { id: job.id }, data: { status: "SENDING", replyCiphertext: encrypt(reply, `reply:${job.id}`, config.encryptionKey) } });
      return true;
    });
    if (!sending) return { processed: true };
    const phone = decrypt(job.contact.phoneCiphertext, `phone:${job.contact.phoneHash}`, config.encryptionKey);
    const providerId = await dependencies.transport.send(phone, reply);
    await prisma.cattyWhatsappMessage.updateMany({ where: { id: job.id, status: "SENDING" }, data: { status: "SENT", providerIdHash: createHash("sha256").update(providerId).digest("hex"), errorCode: null } });
  } catch (error) {
    await prisma.$transaction(async tx => {
      const channel = await lockChannel(tx);
      if (channel.workerToken !== token || !channel.workerLeaseUntil || channel.workerLeaseUntil <= new Date()) return;
      const current = await tx.cattyWhatsappMessage.findUnique({ where: { id: job.id }, select: { status: true } });
      const uncertain = current?.status === "SENDING" && (!(error instanceof TransportError) || error.uncertain);
      await tx.cattyWhatsappMessage.updateMany({ where: { id: job.id, status: { in: ["PROCESSING", "SENDING"] } }, data: { status: uncertain ? "UNCERTAIN" : "FAILED", errorCode: uncertain ? "DELIVERY_UNCERTAIN" : "PROCESSING_FAILED" } });
    });
  } finally {
    await prisma.cattyWhatsappChannel.updateMany({ where: { id: "main", workerToken: token }, data: { workerToken: null, workerLeaseUntil: null } });
  }
  return { processed: true };
}
