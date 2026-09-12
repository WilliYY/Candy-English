"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Pause, Play, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { whatsappAction } from "@/app/ava/whatsapp/actions";
import { Button } from "@/components/ui/button";
import { WhatsappContactForm, WhatsappSendForm } from "./catty-whatsapp-forms";

export type WhatsappPanelProps = {
  configured: boolean; paused: boolean; workerOnline: boolean; page: number; hasMore: boolean;
  contacts: { id: string; name: string; phoneMask: string; authorized: boolean; optedOut: boolean }[];
  messages: { id: string; name: string; manual: boolean; status: string; date: string; error: string | null }[];
  audit: { id: string; action: string; actor: string; date: string }[];
};
const statusLabels: Record<string, string> = { QUEUED: "Na fila", PROCESSING: "Preparando", SENDING: "Enviando", SENT: "Aceita pelo WhatsApp", FAILED: "Falhou", UNCERTAIN: "Entrega incerta — confira no celular", CANCELED: "Cancelada" };
const auditLabels: Record<string, string> = { QR_REQUESTED: "Solicitou QR Code", CHANNEL_PAUSED: "Pausou envios", CHANNEL_RESUMED: "Ativou envios", CONTACT_AUTHORIZED: "Autorizou contato", CONTACT_BLOCKED: "Bloqueou contato", CONTACT_REMOVED: "Removeu contato", CONTACT_OPT_OUT: "Contato pediu para sair", MANUAL_QUEUED: "Registrou envio manual" };
const box = "rounded-xl border bg-card p-5 sm:p-6";

export function CattyWhatsappPanel(props: WhatsappPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [connection, setConnection] = useState("Não consultada");
  useEffect(() => { if (!qr) return; const timer = setTimeout(() => setQr(null), 45_000); return () => clearTimeout(timer); }, [qr]);
  useEffect(() => { if (!props.configured) return; const timer = setInterval(() => router.refresh(), 15_000); return () => clearInterval(timer); }, [props.configured, router]);
  async function run(action: string, input?: unknown) {
    let ok = false;
    await new Promise<void>(resolve => startTransition(async () => {
      try {
        const result = await whatsappAction(action, input);
        setFeedback(result); ok = result.ok;
        if (result.qr) setQr(result.qr);
        if (result.state) { setConnection(({ open: "Conectado", close: "Desconectado", connecting: "Aguardando leitura" } as Record<string, string>)[result.state] ?? "Indisponível"); if (result.state === "open") setQr(null); }
        router.refresh();
      } catch { setFeedback({ ok: false, message: "Conexão interrompida. Consulte o histórico antes de repetir um envio." }); }
      finally { resolve(); }
    }));
    return ok;
  }
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-32 sm:p-6 sm:pb-32">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"><MessageSquareText className="size-4" />CATTY · WHATSAPP</p>
        <h1 className="text-3xl font-bold tracking-tight">Conversas com cuidado</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Uma conexão exclusiva da Candy. Você escolhe quem pode conversar e quando os envios ficam ativos.</p></div>
      <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${props.paused ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950"}`}>{props.paused ? "Envios pausados" : "Envios ativos"}</span>
    </header>
    {!props.configured && <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h2 className="font-semibold">Falta configurar o transporte no servidor</h2><p className="mt-2 text-sm leading-relaxed">O painel está instalado, mas ainda não envia mensagens. Configure os serviços e os segredos exclusivos da Catty conforme a documentação; depois conecte o número aqui. A instalação Miauby não é utilizada.</p></section>}
    <section className={box} aria-labelledby="wa-connection"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="wa-connection" className="text-lg font-semibold">1. Conecte o número</h2><p className="mt-1 text-sm text-muted-foreground">WhatsApp: {connection} · Processador: {props.workerOnline ? "online" : "aguardando serviço"}</p></div>
      <div className="flex flex-wrap gap-2"><Button disabled={pending || !props.configured} variant="outline" onClick={() => run("state")}><RefreshCw />Consultar conexão</Button><Button disabled={pending || !props.configured} onClick={() => run("connect")}><QrCode />Gerar QR Code</Button>
        <Button disabled={pending || !props.configured} variant={props.paused ? "outline" : "destructive"} onClick={() => { if (props.paused && !window.confirm("Ativar respostas e envios somente para os contatos autorizados?")) return; void run(props.paused ? "resume" : "pause"); }}>{props.paused ? <Play /> : <Pause />}{props.paused ? "Ativar envios" : "Pausar envios"}</Button></div></div>
      {qr && <div className="mt-5 flex flex-wrap items-center gap-6 rounded-lg border bg-background p-4"><Image src={qr} alt="QR Code temporário para conectar o WhatsApp exclusivo da Catty" width={256} height={256} unoptimized className="h-auto w-full max-w-64" /><div className="max-w-sm space-y-2 text-sm"><p className="font-semibold">No celular: Aparelhos conectados → Conectar aparelho</p><p className="text-muted-foreground">O código some desta tela em 45 segundos. Não compartilhe capturas. Depois da leitura, consulte a conexão e ative os envios quando estiver pronto.</p><Button variant="outline" onClick={() => setQr(null)}>Ocultar código</Button></div></div>}
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />O pareamento não ativa respostas. A pausa cancela a fila ainda não enviada; uma mensagem já em transmissão pode terminar.</p>
    </section>
    <div role="status" aria-live="polite" aria-busy={pending}>{pending ? <p className="rounded-lg border p-3 text-sm">Processando…</p> : feedback && <p className={`rounded-lg border p-3 text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}>{feedback.message}</p>}</div>
    <div className="grid items-start gap-6 lg:grid-cols-2"><section className={box}><h2 className="mb-4 text-lg font-semibold">2. Autorize uma pessoa</h2><WhatsappContactForm submit={run} disabled={pending || !props.configured} /></section>
      <section className={box}><h2 className="mb-4 text-lg font-semibold">3. Envie uma mensagem</h2>{props.paused && <p className="mb-4 text-sm text-muted-foreground">Ative os envios depois de conectar o número. Nenhuma mensagem sai enquanto o canal estiver pausado.</p>}<WhatsappSendForm contacts={props.contacts.filter(c => c.authorized && !c.optedOut)} submit={run} disabled={pending || !props.configured || props.paused} /></section></div>
    <section className={box}><h2 className="text-lg font-semibold">Contatos autorizados <span className="text-sm font-normal text-muted-foreground">({props.contacts.length}/100)</span></h2>
      {!props.contacts.length ? <p className="mt-4 text-sm text-muted-foreground">Nenhum contato cadastrado. Ninguém receberá respostas automáticas até ser autorizado.</p> : <ul className="mt-4 divide-y">{props.contacts.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="break-words font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.phoneMask} · {c.optedOut ? "Pediu para sair" : c.authorized ? "Autorizado" : "Bloqueado"}</p></div><div className="flex gap-2"><Button variant="outline" disabled={pending || !c.authorized} onClick={() => run("block", c.id)}>Bloquear</Button><Button variant="ghost" disabled={pending} onClick={() => { if (window.confirm(`Remover ${c.name}, seu telefone e o histórico de mensagens da Catty? A auditoria mínima permanece por 30 dias.`)) void run("remove", c.id); }}>Remover</Button></div></li>)}</ul>}
    </section>
    <section className={box}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Histórico de envios</h2><p className="text-xs text-muted-foreground">Até 100 mensagens/dia · 10 por pessoa/hora</p></div><p className="mt-2 text-sm text-muted-foreground">“Aceita” confirma o retorno do transporte, não a leitura pelo destinatário. Entrega incerta exige conferir o celular; não há reenvio automático.</p>
      {!props.messages.length ? <p className="py-6 text-sm text-muted-foreground">Nenhuma mensagem registrada nesta página.</p> : <ul className="mt-4 divide-y">{props.messages.map(m => <li key={m.id} className="grid gap-1 py-4 sm:grid-cols-2"><div><p className="break-words font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.date} · {m.manual ? "Envio manual" : "Resposta da Catty"}</p></div><p className={`text-sm font-medium sm:text-right ${m.status === "UNCERTAIN" || m.status === "FAILED" ? "text-destructive" : "text-foreground"}`}>{statusLabels[m.status] ?? m.status}</p></li>)}</ul>}
      <nav aria-label="Páginas do histórico" className="mt-4 flex items-center justify-between text-sm">{props.page > 1 ? <Link className="underline" href={`/ava/whatsapp?page=${props.page - 1}`}>Anterior</Link> : <span />}<span>Página {props.page}</span>{props.hasMore ? <Link className="underline" href={`/ava/whatsapp?page=${props.page + 1}`}>Próxima</Link> : <span />}</nav>
    </section>
    <details className={box}><summary className="cursor-pointer font-semibold">Auditoria e cuidados do canal</summary><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Só o admin gerencia este painel. A Catty não acessa financeiro, contratos ou dados do AVA pelo WhatsApp. Conteúdo fica cifrado por até 24 horas; metadados, por até 30 dias. A conexão não oficial pode sofrer desconexões ou bloqueios. Não use para disparos.</p><ul className="mt-4 space-y-2 text-sm">{props.audit.map(a => <li key={a.id}>{a.date} · {auditLabels[a.action] ?? "Operação do canal"} · {a.actor}</li>)}</ul></details>
  </main>;
}
