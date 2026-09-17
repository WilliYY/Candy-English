import { createHash, randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import type { WhatsappConfig } from "./config";
import { encrypt, decrypt } from "./crypto";
import { lockChannel } from "./store";
import { isActiveWhatsappAdmin } from "./permissions";
import { morningContext, morningDue, MORNING_ID } from "./morning-domain";
import { generateMorningMessage } from "./morning-reply";
import { EvolutionTransport, TransportError } from "./transport";

type Dependencies = {
  store?: ReturnType<typeof getPrisma>;
  transport?: Pick<EvolutionTransport, "state" | "groups" | "sendGroup">;
  generate?: typeof generateMorningMessage;
  now?: () => Date;
};

/** Separate explicit authorization from private-chat pause; never consumes group messages. */
export async function runMorningWorker(config: WhatsappConfig, dependencies: Dependencies = {}) {
  const store = dependencies.store ?? getPrisma();
  const transport = dependencies.transport ?? new EvolutionTransport(config);
  const generate = dependencies.generate ?? generateMorningMessage;
  const clock = dependencies.now ?? (() => new Date());
  const now = clock();
  const job = await store.$transaction(async tx => {
    await lockChannel(tx);
    await tx.cattyMorningRun.updateMany({ where: { status: "SENDING", expiresAt: { lte: now } }, data: { status: "UNCERTAIN", errorCode: "WORKER_INTERRUPTED" } });
    await tx.cattyMorningRun.updateMany({ where: { status: "PROCESSING", expiresAt: { lte: now } }, data: { status: "FAILED", errorCode: "GENERATION_INTERRUPTED" } });
    await tx.cattyMorningRun.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 45 * 86_400_000) } } });
    const routine = await tx.cattyMorningRoutine.findUnique({ where: { id: MORNING_ID } });
    if (!routine || !morningDue(routine, now)) return null;
    const dateKey = morningContext(now).date;
    if (await tx.cattyMorningRun.findUnique({ where: { routineId_dateKey: { routineId: routine.id, dateKey } } })) return null;
    const actor = await tx.user.findUnique({ where: { id: routine.authorizedByUserId }, select: { role: true, isActive: true, deletedAt: true } });
    const allowed = isActiveWhatsappAdmin(actor);
    const run = await tx.cattyMorningRun.create({ data: {
      id: randomUUID(), routineId: routine.id, dateKey, routineVersion: routine.updatedAt,
      status: allowed ? "PROCESSING" : "CANCELED", errorCode: allowed ? null : "ADMIN_BLOCKED",
      expiresAt: new Date(now.getTime() + 120_000),
    } });
    await tx.cattyWhatsappAudit.create({ data: { action: allowed ? "MORNING_RESERVED" : "MORNING_BLOCKED", actorUserId: routine.authorizedByUserId, messageId: run.id } });
    return allowed ? { ...run, routine } : null;
  });
  if (!job) return { processed: false };
  try {
    if (await transport.state() !== "open") throw new Error("MORNING_DISCONNECTED");
    const jid = decrypt(job.routine.groupCiphertext, `morning-group:${job.routine.groupHash}`, config.encryptionKey);
    const groups = await transport.groups();
    if (!groups.some(group => group.id === jid && group.subject === "Interno")) throw new Error("MORNING_GROUP_BLOCKED");
    const rows = await store.cattyMorningRun.findMany({ where: { routineId: MORNING_ID, status: { in: ["SENT", "UNCERTAIN"] }, replyCiphertext: { not: null } }, orderBy: { createdAt: "desc" }, take: 30 });
    const recent = rows.map(row => decrypt(row.replyCiphertext!, `morning-reply:${row.id}`, config.encryptionKey));
    const text = await generate(now, recent);
    const sending = await store.$transaction(async tx => {
      await lockChannel(tx);
      const current = await tx.cattyMorningRun.findUniqueOrThrow({ where: { id: job.id }, include: { routine: true } });
      if (current.status !== "PROCESSING") return false;
      const actor = await tx.user.findUnique({ where: { id: current.routine.authorizedByUserId }, select: { role: true, isActive: true, deletedAt: true } });
      const valid = current.routine.updatedAt.getTime() === job.routineVersion.getTime() &&
        isActiveWhatsappAdmin(actor) && morningDue(current.routine, clock()) &&
        morningContext(clock()).date === job.dateKey && current.expiresAt > clock();
      if (!valid) {
        await tx.cattyMorningRun.update({ where: { id: job.id }, data: { status: "CANCELED", errorCode: "PAUSED_OR_EXPIRED" } });
        return false;
      }
      await tx.cattyMorningRun.update({ where: { id: job.id }, data: { status: "SENDING", replyCiphertext: encrypt(text, `morning-reply:${job.id}`, config.encryptionKey) } });
      return true;
    });
    if (!sending) return { processed: true };
    const providerId = await transport.sendGroup(jid, text);
    await store.$transaction(async tx => {
      const changed = await tx.cattyMorningRun.updateMany({ where: { id: job.id, status: "SENDING" }, data: { status: "SENT", providerIdHash: createHash("sha256").update(providerId).digest("hex") } });
      if (changed.count) await tx.cattyWhatsappAudit.create({ data: { action: "MORNING_ACCEPTED", messageId: job.id } });
    });
  } catch (error) {
    await store.$transaction(async tx => {
      await lockChannel(tx);
      const current = await tx.cattyMorningRun.findUnique({ where: { id: job.id } });
      if (!current || !["PROCESSING", "SENDING"].includes(current.status)) return;
      const uncertain = current.status === "SENDING" && (!(error instanceof TransportError) || error.uncertain);
      await tx.cattyMorningRun.update({ where: { id: job.id }, data: { status: uncertain ? "UNCERTAIN" : "FAILED", errorCode: uncertain ? "DELIVERY_UNCERTAIN" : "PREPARATION_OR_SEND_FAILED" } });
      await tx.cattyWhatsappAudit.create({ data: { action: uncertain ? "MORNING_UNCERTAIN" : "MORNING_FAILED", messageId: job.id } });
    });
  }
  return { processed: true };
}
