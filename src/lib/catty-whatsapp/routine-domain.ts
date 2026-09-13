import { hasCompleteFinancialRegistration } from "@/lib/financial-completeness";
import { routineDateSchema } from "@/lib/validations/catty-routine";

const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});

export function routineDateKey(now: Date) {
  const parts = Object.fromEntries(localDate.formatToParts(now).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getRoutinePeriod(value?: string, now = new Date()) {
  const date = routineDateSchema.parse(value || routineDateKey(now));
  return { date, year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export type RoutineStatus = "ACTIVE" | "PAUSED" | "BLOCKED" | "NOT_CONFIGURED";
export type RoutineActivity = {
  id: string; title: string; description: string; cadence: string;
  audience: string; status: RoutineStatus; nextRunAt: string | null;
};

export function getRoutineActivities(state: { configured: boolean; paused: boolean; workerOnline: boolean }): RoutineActivity[] {
  const ready = state.configured && state.workerOnline;
  return [
    { id: "replies", title: "Conversas da Catty", description: "Respostas a mensagens dos contatos autorizados. A liberação por conta do AVA ainda está em preparação.", cadence: "Ao receber uma mensagem", audience: "Contatos autorizados", nextRunAt: null,
      status: !state.configured ? "NOT_CONFIGURED" : state.paused ? "PAUSED" : ready ? "ACTIVE" : "BLOCKED" },
    { id: "maintenance", title: "Manutenção do canal", description: "Verifica a fila e remove conteúdo expirado. Não é um envio de lembrete.", cadence: "Ciclos com intervalo de 10 segundos", audience: "Sistema interno", nextRunAt: null,
      status: ready ? "ACTIVE" : state.configured ? "BLOCKED" : "NOT_CONFIGURED" },
    { id: "lessons", title: "Avisos de aula", description: "Ainda depende da escolha de horário, antecedência e destinatários. A agenda abaixo é somente consulta.", cadence: "Sem horário definido", audience: "A definir pelo admin", status: "NOT_CONFIGURED", nextRunAt: null },
    { id: "payments", title: "Avisos de pagamento", description: "Nenhuma cobrança automática cadastrada. Consultar pendências não envia mensagens.", cadence: "Sem horário definido", audience: "A definir pelo admin", status: "NOT_CONFIGURED", nextRunAt: null },
    { id: "group", title: "Lembretes no grupo Interno", description: "O teste pontual não ativa uma rotina. Conteúdo e frequência ainda serão escolhidos.", cadence: "Sem horário definido", audience: "Grupo Interno", status: "NOT_CONFIGURED", nextRunAt: null },
  ];
}

type RoutinePayment = {
  year: number; month: number; snapshotPaymentDay: number; snapshotAmountCents: number;
  snapshotPaymentMethod: string; isPaid: boolean;
};

export function getRoutinePaymentStatus(payment: RoutinePayment, now = new Date()) {
  if (!hasCompleteFinancialRegistration({ amountCents: payment.snapshotAmountCents, paymentDay: payment.snapshotPaymentDay, paymentMethod: payment.snapshotPaymentMethod })) return "INCOMPLETE" as const;
  if (payment.isPaid) return "PAID" as const;
  const day = Math.min(payment.snapshotPaymentDay, new Date(Date.UTC(payment.year, payment.month, 0)).getUTCDate());
  const dueDate = `${payment.year}-${String(payment.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return routineDateKey(now) > dueDate ? "OVERDUE" as const : "PENDING" as const;
}

export function routineAuditLabel(action: string) {
  const labels: Record<string, string> = {
    GROUP_TEST_STARTED: "Teste no grupo iniciado",
    GROUP_TEST_ACCEPTED: "Teste no grupo aceito pelo WhatsApp",
    GROUP_TEST_FAILED: "Teste no grupo rejeitado",
    GROUP_TEST_UNCERTAIN: "Teste no grupo com entrega incerta",
    CHANNEL_PAUSED: "Envios pausados pelo admin",
    CHANNEL_RESUMED: "Envios ativados pelo admin",
    CONTACT_AUTHORIZED: "Contato autorizado",
    CONTACT_BLOCKED: "Contato bloqueado",
    CONTACT_REMOVED: "Contato removido",
    MANUAL_QUEUED: "Mensagem manual adicionada à fila",
    QR_REQUESTED: "Código de conexão solicitado",
    OPT_OUT: "Contato pediu para não receber mensagens",
  };
  return Object.hasOwn(labels, action) ? labels[action] : "Evento operacional";
}
