import { getPrisma } from "@/lib/prisma";
import { getWhatsappConfig } from "./config";
import { isActiveWhatsappAdmin } from "./permissions";
import { getRoutineActivities, getRoutinePaymentStatus, getRoutinePeriod, routineAuditLabel, routineDateKey } from "./routine-domain";

export type RoutineStore = Pick<ReturnType<typeof getPrisma>, "agendaLesson" | "financialPayment" | "sale" | "cattyWhatsappChannel" | "cattyWhatsappMessage" | "cattyWhatsappAudit" | "user">;
type Actor = { role: string; isActive: boolean; deletedAt: Date | null } | null;

/** Read-only projection. The caller must load the actor from the current session/database. */
export async function getAdminRoutineOverview(actor: Actor, date?: string, options: { store?: RoutineStore; now?: Date; configured?: boolean } = {}) {
  if (!isActiveWhatsappAdmin(actor)) throw new Error("Acesso restrito ao administrador ativo.");
  const now = options.now ?? new Date();
  const period = getRoutinePeriod(date, now);
  const store = options.store ?? getPrisma();
  const configured = options.configured ?? Boolean(getWhatsappConfig());
  const [lessons, payments, sweets, channel, pendingCount, audit] = await Promise.all([
    store.agendaLesson.findMany({
      where: { year: period.year, month: period.month, isActive: true, student: { isActive: true } },
      orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }], take: 2001,
      select: { id: true, date: true, time: true, status: true, student: { select: { name: true, unit: true } } },
    }),
    store.financialPayment.findMany({
      where: { year: period.year, month: period.month, isActive: true },
      orderBy: [{ snapshotPaymentDay: "asc" }, { snapshotName: "asc" }, { id: "asc" }], take: 501,
      select: { id: true, year: true, month: true, snapshotName: true, snapshotUnit: true, snapshotAmountCents: true, snapshotPaymentDay: true, snapshotPaymentMethod: true, isPaid: true },
    }),
    store.sale.findMany({
      where: { invoiceYear: period.year, invoiceMonth: period.month, status: "COMPLETED", settlementType: "MONTHLY_INVOICE", OR: [
        { financialPaymentId: null, paidAt: null },
        { financialPayment: { isActive: true, isPaid: false } },
      ] },
      orderBy: [{ buyerNameSnapshot: "asc" }, { createdAt: "asc" }], take: 501,
      select: { id: true, buyerNameSnapshot: true, unit: true, totalCents: true, invoiceDueDate: true, financialPaymentId: true,
        items: { select: { productNameSnapshot: true, quantity: true, lineTotalCents: true } } },
    }),
    configured ? store.cattyWhatsappChannel.findUnique({ where: { id: "main" }, select: { paused: true, lastWorkerAt: true } }) : null,
    configured ? store.cattyWhatsappMessage.count({ where: { status: { in: ["QUEUED", "PROCESSING", "SENDING"] } } }) : 0,
    configured ? store.cattyWhatsappAudit.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 12, select: { id: true, action: true, actorUserId: true, createdAt: true } }) : [],
  ]);
  if (lessons.length > 2000 || payments.length > 500 || sweets.length > 500) {
    throw new Error("Consulte os módulos de Agenda e Financeiro para este volume de registros.");
  }
  const actorIds = [...new Set(audit.flatMap(a => a.actorUserId ? [a.actorUserId] : []))];
  const actors = actorIds.length ? await store.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const actorNames = new Map(actors.map(a => [a.id, a.name]));
  const paused = channel?.paused ?? true;
  const workerOnline = Boolean(channel?.lastWorkerAt && now.getTime() - channel.lastWorkerAt.getTime() < 120_000);
  return {
    period, generatedAt: now.toISOString(), configured, paused, workerOnline, pendingCount,
    activities: getRoutineActivities({ configured, paused, workerOnline }),
    lessons: lessons.filter(l => routineDateKey(l.date) === period.date).map(l => ({ id: l.id, name: l.student.name, unit: l.student.unit, time: l.time, status: l.status })),
    payments: payments.map(p => ({ id: p.id, name: p.snapshotName, unit: p.snapshotUnit, amountCents: p.snapshotAmountCents, day: Math.min(p.snapshotPaymentDay, new Date(Date.UTC(p.year, p.month, 0)).getUTCDate()), status: getRoutinePaymentStatus(p, now) })),
    // @db.Date is a calendar date, not a São Paulo instant: keep its UTC date key.
    sweets: sweets.map(s => ({ id: s.id, name: s.buyerNameSnapshot, unit: s.unit, amountCents: s.totalCents, due: s.invoiceDueDate?.toISOString().slice(0, 10) ?? null, linked: Boolean(s.financialPaymentId), items: s.items.map(i => ({ name: i.productNameSnapshot, quantity: i.quantity, amountCents: i.lineTotalCents })) })),
    audit: audit.map(a => ({ id: a.id, label: routineAuditLabel(a.action), actor: a.actorUserId ? actorNames.get(a.actorUserId) ?? "Admin removido" : "Contato / sistema", date: a.createdAt.toISOString() })),
  };
}

export type RoutineOverview = Awaited<ReturnType<typeof getAdminRoutineOverview>>;
