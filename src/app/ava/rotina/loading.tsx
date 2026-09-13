export default function RoutineLoading() {
  return <div role="status" aria-live="polite" className="space-y-4 p-6">
    <p className="text-sm text-muted-foreground">Carregando a rotina da Catty…</p>
    <div aria-hidden="true" className="h-24 rounded-xl bg-muted motion-safe:animate-pulse" />
    <div aria-hidden="true" className="h-64 rounded-xl bg-muted motion-safe:animate-pulse" />
  </div>;
}
