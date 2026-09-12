import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AvaWorkspaceShell } from "@/components/ava/ava-workspace-shell";
import { CattyWhatsappPanel } from "@/components/ava/catty-whatsapp-panel";
import { requireAvaRole } from "@/lib/authorization";
import { requireWhatsappAdmin } from "@/lib/catty-whatsapp/admin";
import { getWhatsappConfig } from "@/lib/catty-whatsapp/config";
import { getPrisma } from "@/lib/prisma";
export const metadata: Metadata = { title: "Catty no WhatsApp" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
export default async function WhatsappPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  await requireAvaRole(["ADMIN"], "/ava/whatsapp");
  try { await requireWhatsappAdmin(); } catch { redirect("/ava/login"); }
  const params = await searchParams;
  const requested = Number(params?.page ?? 1);
  const page = Number.isInteger(requested) && requested >= 1 && requested <= 1000 ? requested : 1;
  const configured = Boolean(getWhatsappConfig());
  const prisma = getPrisma();
  const [channel, contacts, messages, audit] = configured ? await Promise.all([
    prisma.cattyWhatsappChannel.findUnique({ where: { id: "main" } }),
    prisma.cattyWhatsappContact.findMany({ take: 100, orderBy: { name: "asc" }, select: { id: true, name: true, phoneMask: true, authorized: true, optedOutAt: true } }),
    prisma.cattyWhatsappMessage.findMany({ take: 31, skip: (page - 1) * 30, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, contact: { select: { name: true } }, manual: true, status: true, createdAt: true, errorCode: true } }),
    prisma.cattyWhatsappAudit.findMany({ take: 15, orderBy: { createdAt: "desc" } }),
  ]) : [null, [], [], []] as const;
  const actorIds = [...new Set(audit.flatMap(a => a.actorUserId ? [a.actorUserId] : []))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  return <AvaWorkspaceShell area="AVA"><CattyWhatsappPanel
    configured={configured} paused={channel?.paused ?? true} workerOnline={Boolean(channel?.lastWorkerAt && Date.now() - channel.lastWorkerAt.getTime() < 120_000)} page={page} hasMore={messages.length > 30}
    contacts={contacts.map(c => ({ ...c, optedOut: Boolean(c.optedOutAt) }))}
    messages={messages.slice(0, 30).map(m => ({ id: m.id, name: m.contact.name, manual: m.manual, status: m.status, date: dateFormat.format(m.createdAt), error: m.errorCode }))}
    audit={audit.map(a => ({ id: a.id, action: a.action, actor: a.actorUserId ? actors.find(u => u.id === a.actorUserId)?.name ?? "Admin removido" : "Contato / sistema", date: dateFormat.format(a.createdAt) }))}
  /></AvaWorkspaceShell>;
}
