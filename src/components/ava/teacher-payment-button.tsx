"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { setTeacherPaymentStatus } from "@/app/ava/teacher/finance-actions";
import { Button } from "@/components/ui/button";
import type { TeacherPaymentStatusInput } from "@/lib/validations/teacher-finance";

export function TeacherPaymentButton({ command, label }: {
  command: TeacherPaymentStatusInput; label: string;
}) {
  const isPaid = !command.isPaid;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function submit() {
    if (!window.confirm(`${isPaid ? "Cancelar a confirmação de pagamento" : "Marcar como pago"}: ${label}?\n${command.kind === "TUITION" ? "Inclui os doces vinculados à mensalidade.\n" : "Inclui todas as compras exibidas neste status, em todos os polos.\n"}Seu nome e horário serão registrados e o administrador receberá um aviso no Financeiro. Não movimenta dinheiro nem estorna a venda.`)) return;
    startTransition(async () => {
      try {
        setResult(await setTeacherPaymentStatus(command));
      } catch {
        setResult({ ok: false, message: "Falha de conexão. Atualize a tela e confira o status antes de tentar novamente." });
      }
      router.refresh();
    });
  }

  return <div className="grid min-w-0 gap-2">
    <Button aria-label={`${isPaid ? "Cancelar pagamento" : "Marcar como pago"} de ${label}`} disabled={pending} onClick={submit} type="button" variant={isPaid ? "outline" : "default"} className="min-h-10 h-auto whitespace-normal">
      {pending ? <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" /> : isPaid ? <Undo2 aria-hidden className="size-4" /> : <CheckCircle2 aria-hidden className="size-4" />}
      {pending ? "Registrando…" : isPaid ? "Cancelar pagamento" : "Marcar como pago"}
    </Button>
    <p role="status" aria-live="polite" className="max-w-sm text-xs leading-5 text-muted-foreground">{result?.message}</p>
  </div>;
}
