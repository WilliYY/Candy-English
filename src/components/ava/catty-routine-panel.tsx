import React from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, Clock3, History, ReceiptText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoutineOverview } from "@/lib/catty-whatsapp/routine-data";
import type { RoutineStatus } from "@/lib/catty-whatsapp/routine-domain";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const instant = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const unitName = (unit: string) => unit === "IVATE" ? "Polo 1 · Ivaté" : "Polo 2 · Douradina";
const dateLabel = (date: string) => date.split("-").reverse().join("/");
const statusLabels: Record<RoutineStatus, string> = { ACTIVE: "Ativa", PAUSED: "Pausada", BLOCKED: "Indisponível", NOT_CONFIGURED: "Não configurada" };
const statusColors: Record<RoutineStatus, string> = { ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200", PAUSED: "bg-amber-50 text-amber-900 border-amber-200", BLOCKED: "bg-rose-50 text-rose-800 border-rose-200", NOT_CONFIGURED: "bg-muted text-muted-foreground border-border" };
const paymentLabels = { PAID: "Pago", PENDING: "A vencer", OVERDUE: "Vencido", INCOMPLETE: "Cadastro pendente" };
const lessonLabels: Record<string, string> = { SCHEDULED: "Presença a confirmar", MAKEUP_SCHEDULED: "Reposição prevista", ATTENDED: "Veio", MISSED: "Não veio", MAKEUP_ATTENDED: "Reposição concluída" };

function Section({ id, title, detail, children }: { id: string; title: string; detail: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-24 rounded-xl border bg-card p-4 sm:p-6">
    <h2 id={`${id}-title`} className="text-lg font-bold text-primary">{title}</h2>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    <div className="mt-5">{children}</div>
  </section>;
}

export function CattyRoutinePanel({ data, morning }: { data: RoutineOverview; morning?: React.ReactNode }) {
  const open = data.payments.filter(p => p.status !== "PAID");
  const overdue = open.filter(p => p.status === "OVERDUE").length;
  const paid = data.payments.filter(p => p.status === "PAID").length;
  const monthLabel = `${String(data.period.month).padStart(2, "0")}/${data.period.year}`;
  const financeHref = `/ava/admin?task=financeiro&month=${data.period.month}`;
  const agendaHref = `/ava/admin?task=agenda&month=${data.period.month}`;
  return <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 pb-32">
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-5 sm:p-6">
      <div className="min-w-0 flex-1 basis-64">
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-4" /> Somente admin</p>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Rotina</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">O que a Catty faz, o que está pausado e o que ainda precisa ser agendado. Agenda e financeiro em uma consulta privada.</p>
      </div>
      <Button variant="outline" asChild><Link href="/ava/whatsapp">Catty no WhatsApp <ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>
    </header>

    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
      <strong>{data.paused ? "Conversas e envios individuais pausados." : "Canal individual liberado."}</strong>{" "}
      O bom-dia no grupo tem autorização própria abaixo. Nenhum disparo agendado de aula ou pagamento. Consultar esta página não envia mensagens. Envios já em andamento podem terminar.
    </div>
    {morning}
    <nav aria-label="Seções da rotina" className="flex flex-wrap gap-2">
      {[['#programacao', 'Ações da Catty'], ['#agenda', 'Agenda do dia'], ['#financeiro', 'Financeiro'], ['#historico', 'Histórico']].map(([href, label]) => <Button key={href} variant="outline" size="sm" asChild><a href={href}>{label}</a></Button>)}
    </nav>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        { title: "Na fila agora", value: data.pendingCount, hint: "Não é um horário agendado" },
        { title: "Aulas no dia", value: data.lessons.length, hint: dateLabel(data.period.date) },
        { title: "Mensalidades vencidas", value: overdue, hint: `Competência ${monthLabel}` },
        { title: "Mensalidades pagas", value: paid, hint: `De ${data.payments.length} registros do mês` },
      ].map(card => <div key={card.title} className="min-w-0 rounded-xl border bg-card p-4"><p className="text-xs font-semibold text-muted-foreground">{card.title}</p><p className="my-2 text-2xl font-bold tabular-nums text-primary">{card.value}</p><p className="text-xs leading-relaxed text-muted-foreground">{card.hint}</p></div>)}
    </div>

    <Section id="programacao" title="Outras ações da Catty" detail="O bom-dia tem seu controle acima. Avisos de aula e pagamento continuam sem agendamento.">
      <ul className="divide-y">
        {data.activities.map(activity => <li key={activity.id} className="grid min-w-0 gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[1fr_15rem]">
          <div className="min-w-0"><h3 className="font-semibold text-primary">{activity.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{activity.description}</p><p className="mt-2 text-xs text-muted-foreground">Destino: {activity.audience}</p></div>
          <div><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColors[activity.status]}`}>{statusLabels[activity.status]}</span><p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Clock3 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{activity.cadence}</p></div>
        </li>)}
      </ul>
    </Section>

    <form action="/ava/rotina" method="get" className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <div className="min-w-0 flex-1 basis-52"><label htmlFor="routine-date" className="mb-2 block text-sm font-semibold text-primary">Consultar outro dia</label><input id="routine-date" name="date" type="date" required min="2020-01-01" max="2100-12-31" defaultValue={data.period.date} className="h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" /></div>
      <Button type="submit"><CalendarClock aria-hidden="true" className="size-4" /> Consultar</Button>
      <Button variant="outline" asChild><Link href="/ava/rotina">Hoje</Link></Button>
      <p className="w-full text-xs text-muted-foreground">Horário de São Paulo. A data seleciona o dia da agenda e o mês do financeiro; vencidos são calculados em relação a hoje.</p>
    </form>

    <Section id="agenda" title={`Agenda · ${dateLabel(data.period.date)}`} detail="Ocorrências registradas na agenda. Um horário previsto não confirma que o aluno compareceu.">
      {data.lessons.length ? <ul className="divide-y">{data.lessons.map(lesson => <li key={lesson.id} className="flex min-w-0 items-start gap-4 py-3 first:pt-0">
        <span className="rounded-lg bg-primary/5 px-3 py-2 text-sm font-bold tabular-nums text-primary">{lesson.time}</span>
        <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{lesson.name}</h3><p className="mt-1 text-xs text-muted-foreground">{unitName(lesson.unit)}</p><p className="mt-1 text-xs text-muted-foreground">{lessonLabels[lesson.status] ?? "Conferir presença na agenda"}</p></div>
      </li>)}</ul> : <p className="rounded-lg bg-muted/40 p-5 text-sm text-muted-foreground">Nenhuma aula cadastrada para este dia.</p>}
      <Button variant="outline" size="sm" className="mt-3" asChild><Link href={agendaHref}>Abrir agenda <ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>
    </Section>

    <Section id="financeiro" title={`Financeiro · ${monthLabel}`} detail="Consulta exclusiva de admin. Estes dados não são enviados à IA nem publicados no WhatsApp.">
      <h3 className="mb-3 flex items-center gap-2 font-semibold"><ReceiptText aria-hidden="true" className="size-4" /> Mensalidades em aberto</h3>
      {open.length ? <ul className="divide-y">{open.map(payment => <li key={payment.id} className="grid min-w-0 grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0"><p className="break-words text-sm font-semibold">{payment.name}</p><p className="mt-1 text-xs text-muted-foreground">{unitName(payment.unit)} · Mensalidade · {payment.status === "INCOMPLETE" ? "Concluir cadastro financeiro" : `Vencimento ${String(payment.day).padStart(2, "0")}/${monthLabel}`}</p></div>
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${payment.status === "OVERDUE" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{paymentLabels[payment.status]}</span><span className="text-sm font-semibold tabular-nums">{payment.status === "INCOMPLETE" ? "A definir" : money.format(payment.amountCents / 100)}</span></div>
      </li>)}</ul> : <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">Nenhuma mensalidade em aberto nos registros deste mês.</p>}
      <h3 className="mb-2 mt-6 font-semibold">Doces na fatura · em aberto</h3>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Valores dos doces separados das mensalidades acima. Compras vinculadas seguem o pagamento da mensalidade; compras separadas têm sua própria confirmação.</p>
      {data.sweets.length ? <ul className="space-y-3">{data.sweets.map(sale => <li key={sale.id} className="min-w-0 rounded-lg border p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="min-w-0 break-words text-sm font-semibold">{sale.name}</h4><strong className="text-sm tabular-nums">{money.format(sale.amountCents / 100)}</strong></div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{unitName(sale.unit)} · {sale.linked ? "Junto da mensalidade" : "Fatura separada"} · {sale.due ? `Vencimento ${dateLabel(sale.due)}` : "Data a definir"}</p>
        <ul className="mt-2 space-y-1 text-sm">{sale.items.map((item, index) => <li key={index} className="break-words">{item.name} · {item.quantity} un. · {money.format(item.amountCents / 100)}</li>)}</ul>
      </li>)}</ul> : <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Nenhuma compra de doces em aberto nesta competência.</p>}
      <Button variant="outline" size="sm" className="mt-4" asChild><Link href={financeHref}>Abrir financeiro <ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>
    </Section>

    <Section id="historico" title="Histórico da Catty" detail="Últimas 12 ações registradas no canal, independentemente da data consultada. Aceite pelo WhatsApp não confirma entrega ao destinatário.">
      {data.audit.length ? <ol className="space-y-4">{data.audit.map(event => <li key={event.id} className="flex min-w-0 gap-3"><History aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="break-words text-sm font-semibold">{event.label}</p><p className="mt-1 break-words text-xs text-muted-foreground">{event.actor} · <time dateTime={event.date}>{instant.format(new Date(event.date))}</time></p></div></li>)}</ol> : <p className="text-sm text-muted-foreground">Nenhuma ação recente registrada.</p>}
    </Section>
    <p className="text-xs text-muted-foreground">Atualizado em <time dateTime={data.generatedAt}>{instant.format(new Date(data.generatedAt))}</time>. A visualização não altera agenda, pagamentos ou permissões.</p>
  </div>;
}
