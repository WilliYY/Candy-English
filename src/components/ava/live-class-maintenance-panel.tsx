import { Radio, ShieldCheck, Wrench } from "lucide-react";
import { LIVE_CLASS_MAINTENANCE_MESSAGE } from "@/lib/live-class";

export function LiveClassMaintenancePanel({
  audience,
}: {
  audience: "student" | "teacher";
}) {
  return (
    <section className="ava-soft-card overflow-hidden rounded-xl border">
      <div className="grid gap-4 bg-[linear-gradient(135deg,rgba(65,42,76,0.08),rgba(252,229,216,0.42),rgba(14,165,233,0.08))] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_12px_26px_rgb(65_42_76_/_0.2)]">
            <Wrench aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/60">
              Aula ao vivo
            </p>
            <h2 className="mt-1 text-xl font-semibold text-primary">
              Em manutencao por enquanto.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {LIVE_CLASS_MAINTENANCE_MESSAGE} As aulas continuam pelos outros
              materiais do AVA ate a equipe liberar a chamada novamente.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-amber-800 shadow-sm">
          <Radio aria-hidden="true" className="size-4" />
          Pausada
        </span>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
        <div className="rounded-lg border border-primary/10 bg-white/82 p-4 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Sem perda de dados
          </span>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Historico, alunos, aulas e materiais continuam preservados. Somente
            a sala ao vivo fica indisponivel.
          </p>
        </div>
        <div className="rounded-lg border border-primary/10 bg-white/82 p-4 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Wrench aria-hidden="true" className="size-4" />
            Proximo passo
          </span>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {audience === "teacher"
              ? "Use Aulas, Homework, Mensagens ou um link externo combinado enquanto a integracao volta."
              : "Acompanhe suas Aulas, Homework e Mensagens enquanto a sala ao vivo volta."}
          </p>
        </div>
      </div>
    </section>
  );
}
