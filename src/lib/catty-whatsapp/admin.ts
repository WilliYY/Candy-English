import { createHash, randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { whatsappContactSchema, whatsappSendSchema } from "@/lib/validations/catty-whatsapp";
import { getWhatsappConfig } from "./config";
import { encrypt, phoneHash } from "./crypto";
import { normalizePhone, QUEUE_TTL_MS } from "./domain";
import { hasQueueCapacity, lockChannel } from "./store";
import { EvolutionTransport } from "./transport";
import { isActiveWhatsappAdmin } from "./permissions";

export class WhatsappAdminError extends Error {}
export async function requireWhatsappAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new WhatsappAdminError("Acesso restrito ao administrador.");
  const user = await getPrisma().user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, isActive: true, deletedAt: true } });
  if (!user || !isActiveWhatsappAdmin(user)) throw new WhatsappAdminError("Conta sem permissão ativa.");
  return user;
}
export async function manageWhatsapp(actorId: string, action: string, input: unknown) {
  const actor = await getPrisma().user.findUnique({ where: { id: actorId }, select: { role: true, isActive: true, deletedAt: true } });
  if (!isActiveWhatsappAdmin(actor)) throw new WhatsappAdminError("Conta sem permissão ativa.");
  const config = getWhatsappConfig();
  if (!config) throw new WhatsappAdminError("Integração ainda não configurada no servidor. Nenhuma mensagem foi enviada.");
  const prisma = getPrisma();
  if (action === "state" || action === "connect") {
    const transport = new EvolutionTransport(config);
    if (action === "state") return { message: "Status atualizado.", state: await transport.state() };
    await prisma.$transaction(async tx => {
      await lockChannel(tx);
      if (await tx.cattyWhatsappAudit.count({ where: { action: "QR_REQUESTED", createdAt: { gt: new Date(Date.now() - 30_000) } } })) throw new WhatsappAdminError("Aguarde 30 segundos antes de gerar outro QR.");
      await tx.cattyWhatsappAudit.create({ data: { action: "QR_REQUESTED", actorUserId: actorId } });
    });
    await transport.prepare();
    if (await transport.state() === "open") return { message: "WhatsApp já conectado. Respostas continuam sob controle da pausa.", state: "open" };
    return { message: "Escaneie em WhatsApp → Aparelhos conectados. O QR expira rapidamente.", qr: await transport.connect(), state: "connecting" };
  }
  if (action === "resume") {
    if (await new EvolutionTransport(config).state() !== "open") throw new WhatsappAdminError("Conecte o WhatsApp antes de ativar os envios.");
  }
  return prisma.$transaction(async tx => {
    const channel = await lockChannel(tx);
    const now = new Date();
    if (action === "pause" || action === "resume") {
      if (action === "resume" && (!channel.lastWorkerAt || now.getTime() - channel.lastWorkerAt.getTime() > 120_000)) throw new WhatsappAdminError("O processador está offline. Verifique o serviço antes de ativar.");
      await tx.cattyWhatsappChannel.update({ where: { id: "main" }, data: { paused: action === "pause" } });
      await tx.cattyWhatsappMessage.updateMany({ where: { status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "CANCELED", errorCode: "CHANNEL_PAUSED" } });
      await tx.cattyWhatsappAudit.create({ data: { action: action === "pause" ? "CHANNEL_PAUSED" : "CHANNEL_RESUMED", actorUserId: actorId } });
      return { message: action === "pause" ? "Envios pausados. A fila não enviada foi cancelada; envios já em andamento podem terminar." : "Canal ativo apenas para contatos autorizados." };
    }
    if (action === "contact") {
      const parsed = whatsappContactSchema.safeParse(input);
      if (!parsed.success) throw new WhatsappAdminError("Confira nome, telefone com + e autorização.");
      const phone = normalizePhone(parsed.data.phone);
      const hash = phoneHash(phone, config.encryptionKey);
      const existing = await tx.cattyWhatsappContact.findUnique({ where: { phoneHash: hash } });
      if (!existing && await tx.cattyWhatsappContact.count() >= 100) throw new WhatsappAdminError("Limite de 100 contatos atingido.");
      const data = { name: parsed.data.name, phoneCiphertext: encrypt(phone, `phone:${hash}`, config.encryptionKey), phoneMask: `+${phone.slice(0, 2)} ••••• ${phone.slice(-4)}`, consentAt: now, authorized: true, optedOutAt: null };
      const contact = await tx.cattyWhatsappContact.upsert({ where: { phoneHash: hash }, update: data, create: { ...data, phoneHash: hash, createdByUserId: actorId } });
      await tx.cattyWhatsappAudit.create({ data: { action: "CONTACT_AUTHORIZED", contactId: contact.id, actorUserId: actorId } });
      return { message: "Contato autorizado. Nenhuma mensagem foi enviada." };
    }
    if (action === "block" || action === "remove") {
      if (typeof input !== "string" || input.length > 100) throw new WhatsappAdminError("Contato inválido.");
      if (action === "remove") await tx.cattyWhatsappContact.delete({ where: { id: input } });
      else {
        await tx.cattyWhatsappContact.update({ where: { id: input }, data: { authorized: false } });
        await tx.cattyWhatsappMessage.updateMany({ where: { contactId: input, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "CANCELED", errorCode: "CONTACT_BLOCKED" } });
      }
      await tx.cattyWhatsappAudit.create({ data: { action: action === "remove" ? "CONTACT_REMOVED" : "CONTACT_BLOCKED", contactId: input, actorUserId: actorId } });
      return { message: action === "remove" ? "Contato e histórico de mensagens removidos. A auditoria mínima permanece por 30 dias." : "Contato bloqueado; mensagens ainda na fila foram canceladas." };
    }
    if (action === "send") {
      const parsed = whatsappSendSchema.safeParse(input);
      if (!parsed.success) throw new WhatsappAdminError("Confira o destinatário, o texto e a confirmação.");
      const data = parsed.data;
      const eventKey = `manual:${createHash("sha256").update(`${actorId}:${data.operationId}`).digest("hex")}`;
      if (await tx.cattyWhatsappMessage.findUnique({ where: { eventKey } })) return { message: "Esta operação já foi registrada. Consulte o histórico." };
      const contact = await tx.cattyWhatsappContact.findUnique({ where: { id: data.contactId } });
      if (channel.paused || !contact?.authorized || contact.optedOutAt) throw new WhatsappAdminError("Envio bloqueado: canal pausado ou contato sem autorização.");
      if (!channel.lastWorkerAt || now.getTime() - channel.lastWorkerAt.getTime() > 120_000) throw new WhatsappAdminError("Processador offline. Nenhuma mensagem foi adicionada.");
      if (!await hasQueueCapacity(tx, contact.id, now)) throw new WhatsappAdminError("Limite temporário atingido. Aguarde antes de enviar novamente.");
      const id = randomUUID();
      await tx.cattyWhatsappMessage.create({ data: { id, eventKey, contactId: contact.id, manual: true, createdByUserId: actorId, replyCiphertext: encrypt(`${data.text}\n\nCandy English • Para parar, envie SAIR.`, `reply:${id}`, config.encryptionKey), expiresAt: new Date(now.getTime() + QUEUE_TTL_MS), contentExpiresAt: new Date(now.getTime() + 86_400_000) } });
      await tx.cattyWhatsappAudit.create({ data: { action: "MANUAL_QUEUED", actorUserId: actorId, contactId: contact.id, messageId: id } });
      return { message: "Mensagem adicionada à fila. Acompanhe o status abaixo; isto ainda não confirma entrega." };
    }
    throw new WhatsappAdminError("Ação não reconhecida.");
  });
}
