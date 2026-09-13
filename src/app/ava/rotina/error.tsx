"use client";

import { Button } from "@/components/ui/button";

export default function RoutineError({ reset }: { reset: () => void }) {
  return <section className="rounded-xl border bg-card p-6">
    <h1 className="text-2xl font-bold">Rotina temporariamente indisponível</h1>
    <p role="alert" className="my-4 text-sm text-muted-foreground">Não foi possível concluir a consulta. Nenhuma mensagem foi enviada e nenhum pagamento foi alterado.</p>
    <Button onClick={reset}>Tentar novamente</Button>
  </section>;
}
