import React from "react";
import type { MorningOverview } from "@/lib/catty-whatsapp/morning-data";

const format = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const labels: Record<string, string> = { PROCESSING: "Preparando", SENDING: "Enviando", SENT: "Aceita pelo WhatsApp", FAILED: "Falhou — não será reenviada", CANCELED: "Cancelada", UNCERTAIN: "Entrega incerta — confira no grupo; sem reenvio", QUEUED: "Na fila" };

export function CattyMorningPanel({ data, controls }: { data: MorningOverview; controls?: React.ReactNode }) {
  return <section aria-labelledby="morning-title" className="min-w-0 rounded-xl border bg-card p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grupo Interno · Somente bom-dia</p>
        <h2 id="morning-title" className="mt-1 text-xl font-bold text-primary">Um bom começo, todos os dias</h2></div>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${data.enabled ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>{data.enabled ? "Rotina ativada" : "Rotina pausada"}</span>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Todos os dias às <strong className="text-foreground">08:00, horário de São Paulo</strong>, inclusive fins de semana. Inglês simples, mensagens novas, dia da semana correto e um emoji. Sem dados de alunos, agenda ou financeiro.</p>
    <p className="mt-2 text-sm">{data.nextAt ? <>Próxima tentativa: <strong>{format.format(new Date(data.nextAt))}</strong>.</> : "Sem próximo envio enquanto estiver pausada."}</p>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">A autorização desta rotina é separada das conversas privadas. Janela de envio até 08:15; dias perdidos não são acumulados. Consultar esta página não envia mensagens.</p>
    {controls}
    <details className="mt-4 border-t pt-4"><summary className="cursor-pointer py-2 text-sm font-semibold">Últimos envios do bom-dia ({data.runs.length})</summary>
      {data.runs.length ? <ol className="mt-3 space-y-3">{data.runs.map(run => <li key={run.id} className="min-w-0 rounded-lg border p-3">
        <p className="text-sm font-semibold">{run.date.split("-").reverse().join("/")} · {labels[run.status] ?? "Conferir status"}</p>
        {run.text && <p lang="en" className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed">{run.text}</p>}
      </li>)}</ol> : <p className="mt-3 text-sm text-muted-foreground">Nenhuma tentativa registrada. A rotina só envia depois da ativação explícita.</p>}
      <p className="mt-3 text-xs text-muted-foreground">Aceite não comprova entrega ou leitura. Histórico cifrado por até 45 dias; esta lista mostra as últimas 7 tentativas.</p>
    </details>
  </section>;
}
