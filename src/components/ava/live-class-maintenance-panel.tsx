import { Wrench } from "lucide-react";

export function LiveClassMaintenancePanel() {
  return (
    <section className="ava-soft-card overflow-hidden rounded-xl border">
      <div className="bg-[linear-gradient(135deg,rgba(65,42,76,0.08),rgba(252,229,216,0.38),rgba(14,165,233,0.06))] p-5 sm:p-6">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_12px_26px_rgb(65_42_76_/_0.2)]">
            <Wrench aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/60">
              Aula ao vivo
            </p>
            <h2 className="mt-1 text-xl font-semibold text-primary">
              Em manutencao.
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}
