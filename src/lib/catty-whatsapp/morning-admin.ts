import { createHmac } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { morningActionSchema } from "@/lib/validations/catty-morning";
import { getWhatsappConfig, type WhatsappConfig } from "./config";
import { encrypt } from "./crypto";
import { MORNING_ID, morningContext, nextMorningAt } from "./morning-domain";
import { isActiveWhatsappAdmin } from "./permissions";
import { lockChannel } from "./store";
import { EvolutionTransport } from "./transport";

export class MorningAdminError extends Error {}
export async function configureMorningRoutine(actorId: string, input: unknown, options: {
  store?: ReturnType<typeof getPrisma>; config?: WhatsappConfig;
  transport?: Pick<EvolutionTransport, "state" | "groups">; now?: Date;
  lateToday?: boolean; // Operator-only explicit one-off, not accepted from the web form.
} = {}) {
  const data = morningActionSchema.parse(input);
  const store = options.store ?? getPrisma();
  const config = options.config ?? getWhatsappConfig();
  if (!config) throw new MorningAdminError("Configure a conexão da Catty antes de ativar a rotina.");
  const actor = await store.user.findUnique({ where: { id: actorId }, select: { role: true, isActive: true, deletedAt: true } });
  if (!isActiveWhatsappAdmin(actor)) throw new MorningAdminError("Acesso restrito ao administrador ativo.");
  const transport = options.transport ?? new EvolutionTransport(config);
  let group: { id: string; subject: string } | undefined;
  if (data.enabled) {
    if (await transport.state() !== "open") throw new MorningAdminError("Conecte o WhatsApp antes de ativar a rotina.");
    const matches = (await transport.groups()).filter(group => group.subject === "Interno");
    if (matches.length !== 1) throw new MorningAdminError("É necessário encontrar um único grupo Interno. Confira os grupos antes de ativar.");
    group = matches[0];
  }
  return store.$transaction(async tx => {
    const channel = await lockChannel(tx);
    const currentActor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, isActive: true, deletedAt: true } });
    if (!isActiveWhatsappAdmin(currentActor)) throw new MorningAdminError("Conta sem permissão ativa.");
    const current = await tx.cattyMorningRoutine.findUnique({ where: { id: MORNING_ID } });
    if ((current?.updatedAt.toISOString() ?? null) !== data.expectedVersion) throw new MorningAdminError("A rotina mudou. Atualize a página antes de tentar novamente.");
    const now = options.now ?? new Date();
    if (!data.enabled) {
      if (current) await tx.cattyMorningRoutine.update({ where: { id: MORNING_ID }, data: { enabled: false, lateDate: null, lateUntil: null } });
      await tx.cattyMorningRun.updateMany({ where: { routineId: MORNING_ID, status: "PROCESSING" }, data: { status: "CANCELED", errorCode: "ADMIN_PAUSED" } });
    } else {
      if (!channel.lastWorkerAt || now.getTime() - channel.lastWorkerAt.getTime() > 120_000) throw new MorningAdminError("Processador offline. Confira o serviço antes de ativar.");
      const hash = createHmac("sha256", Buffer.from(config.encryptionKey, "hex")).update(`morning-group:${group!.id}`).digest("hex");
      // A changed group identity must never inherit the previous group's permission.
      if (current && current.groupHash !== hash) throw new MorningAdminError("O identificador do grupo mudou. É necessária uma revisão administrativa.");
      const fields = { enabled: true, groupName: "Interno", groupHash: hash, groupCiphertext: encrypt(group!.id, `morning-group:${hash}`, config.encryptionKey), authorizedByUserId: actorId,
        startsAt: nextMorningAt(now), lateDate: options.lateToday ? morningContext(now).date : null,
        lateUntil: options.lateToday ? new Date(now.getTime() + 30 * 60_000) : null };
      await tx.cattyMorningRoutine.upsert({ where: { id: MORNING_ID }, create: { id: MORNING_ID, ...fields }, update: fields });
    }
    await tx.cattyWhatsappAudit.create({ data: { action: data.enabled ? "MORNING_ENABLED" : "MORNING_PAUSED", actorUserId: actorId } });
    if (data.enabled && options.lateToday) await tx.cattyWhatsappAudit.create({ data: { action: "MORNING_LATE_AUTHORIZED", actorUserId: actorId } });
    return { message: data.enabled ? "Bom-dia ativado: todos os dias às 8h, no grupo Interno. Conversas privadas não foram alteradas." : "Bom-dia pausado. Um envio já em transmissão pode terminar." };
  });
}
