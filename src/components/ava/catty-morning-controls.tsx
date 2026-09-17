"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { morningRoutineAction } from "@/app/ava/rotina/actions";

export function CattyMorningControls({ enabled, version, configured }: { enabled: boolean; version: string | null; configured: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  return <div className="mt-4 space-y-2">
    <Button className="min-h-11" variant={enabled ? "outline" : "default"} disabled={pending || !configured} onClick={() => {
      if (!window.confirm(enabled ? "Pausar o bom-dia diário no grupo Interno? Um envio já em transmissão pode terminar." : "Ativar o bom-dia no grupo Interno todos os dias às 8h, a partir do próximo horário? Conversas privadas não serão alteradas.")) return;
      startTransition(async () => {
        try { const result = await morningRoutineAction({ enabled: !enabled, expectedVersion: version, confirm: true }); setMessage(result.message); router.refresh(); }
        catch { setMessage("Conexão interrompida. Atualize a página antes de tentar novamente."); }
      });
    }}>{pending ? "Salvando…" : enabled ? "Pausar bom-dia" : "Ativar bom-dia às 8h"}</Button>
    <p role="status" aria-live="polite" className="text-sm leading-relaxed">{message}</p>
  </div>;
}
