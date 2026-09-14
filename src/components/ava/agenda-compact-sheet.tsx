"use client";

import { Clock, Pencil } from "lucide-react";
import React, { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AgendaTimeEditor, type AgendaTimeEditorValues, type AgendaTimeSaveResult } from "@/components/ava/agenda-time-editor";
import type { AgendaTimeChangeInput } from "@/lib/agenda-time-change";

export type AgendaCompactRow = {
  id: string; unit: "IVATE" | "DOURADINA"; name: string; phone: string | null;
  time: string; detail: string; notes?: string | null; statusLabel: string; statusClassName: string;
  attendance?: ReactNode; totals?: { lessons: number; attended: number; missed: number; pending: number };
  onOpen: () => void;
  edit?: Omit<AgendaTimeChangeInput, "scope" | "time" | "confirmChange"> & { allowRoutine: boolean };
};
const units = [
  { id: "IVATE", label: "Polo 1 · Ivaté", color: "border-cyan-200 bg-cyan-50 text-cyan-950" },
  { id: "DOURADINA", label: "Polo 2 · Douradina", color: "border-rose-200 bg-rose-50 text-rose-950" },
] as const;

export function AgendaCompactSheet({ rows, mode, onSave, onEditingChange }: {
  rows: AgendaCompactRow[]; mode: "DAY" | "MONTH";
  onSave: (row: AgendaCompactRow, values: AgendaTimeEditorValues) => Promise<AgendaTimeSaveResult>;
  onEditingChange?: (editing: boolean) => void;
}) {
  // Guarda a versão vista ao abrir; refresh de presença não substitui o rascunho.
  const [editing, setEditing] = useState<AgendaCompactRow | null>(null);
  const [message, setMessage] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const finish = () => { setEditing(null); onEditingChange?.(false); };
  useEffect(() => {
    if (!editing) { trigger.current?.focus(); return; }
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing]);
  return (
    <div className="agenda-compact-sheet" data-editing={!!editing}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
        <p className="text-sm text-muted-foreground"><Pencil aria-hidden="true" className="mr-1 inline size-3.5" />Clique no horário para editar na linha.</p>
        <span className="text-xs font-semibold text-primary">{rows.length} {mode === "DAY" ? "aula(s)" : "aluno(s)"}</span>
      </div>
      {message && <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      {!rows.length && <p role="status" className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhum aluno neste filtro. Ajuste a busca, o dia ou o polo.</p>}
      {units.map(unit => {
        const group = rows.filter(row => row.unit === unit.id);
        if (!group.length) return null;
        return (
          <section key={unit.id} className="mb-4 min-w-0 overflow-hidden rounded-lg border border-primary/15 bg-white">
            <h4 className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 text-sm font-bold", unit.color)}>
              {unit.label}<span className="text-xs font-medium">{group.length} {mode === "DAY" ? "aulas" : "alunos"}</span>
            </h4>
            <div role="table" aria-label={`${unit.label} · ${mode === "DAY" ? "Agenda do dia" : "Rotina mensal"}`}>
              <div role="rowgroup" className="agenda-sheet-heading">
                <div role="row" className="agenda-sheet-row">
                  {["Aluno", mode === "DAY" ? "Horário" : "Rotina / horário", mode === "DAY" ? "Situação" : "Próxima aula", mode === "DAY" ? "Presença" : "Resumo do mês", "Ficha"].map(label => <span key={label} role="columnheader">{label}</span>)}
                </div>
              </div>
              <div role="rowgroup">
                {group.map(row => (
                  <Fragment key={row.id}>
                    <div role="row" className={cn("agenda-sheet-row", editing?.id === row.id && "bg-primary/5")}>
                      <div role="cell" className="agenda-sheet-name">
                        <button type="button" className="block min-h-11 w-full text-left text-sm font-semibold text-primary [overflow-wrap:anywhere] focus-visible:outline-primary" onClick={row.onOpen}>
                          {row.name}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">{row.phone || "Sem telefone"}</span>
                        </button>
                        {row.notes && <details className="mt-1 text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer content-center">Observação</summary><p className="pb-2 [overflow-wrap:anywhere]">{row.notes}</p></details>}
                      </div>
                      <div role="cell" className="agenda-sheet-time">
                        {mode === "MONTH" && <span className="block text-xs text-muted-foreground">{row.detail}</span>}
                        {row.edit ? <button type="button" aria-label={`Editar horário de ${row.name}`} aria-expanded={editing?.id === row.id} disabled={!!editing} onClick={event => { trigger.current = event.currentTarget; setMessage(""); setEditing(row); onEditingChange?.(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary/20 bg-white px-2.5 text-sm font-bold text-primary tabular-nums hover:bg-primary/5 focus-visible:outline-primary disabled:opacity-60"><Clock aria-hidden="true" className="size-3.5" />{row.time}<Pencil aria-hidden="true" className="size-3" /></button> : <span className="inline-flex min-h-11 items-center font-semibold tabular-nums text-primary">{row.time || "Sem horário"}</span>}
                      </div>
                      <div role="cell" className="agenda-sheet-status"><span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-medium [overflow-wrap:anywhere]", row.statusClassName)}>{row.statusLabel}</span></div>
                      <div role="cell" className="agenda-sheet-attendance">
                        {row.attendance}
                        {row.totals && <div className="flex flex-wrap gap-1.5 text-xs tabular-nums">
                          <span className="rounded bg-primary/5 px-2 py-1">{row.totals.lessons} aulas</span>
                          <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">{row.totals.attended} pres.</span>
                          <span className="rounded bg-red-50 px-2 py-1 text-red-800">{row.totals.missed} faltas</span>
                          <span className="rounded bg-amber-50 px-2 py-1 text-amber-900">{row.totals.pending} pend.</span>
                        </div>}
                      </div>
                      <div role="cell" className="agenda-sheet-open"><button type="button" className="min-h-11 whitespace-nowrap rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-primary" onClick={row.onOpen} aria-label={`Abrir ficha de ${row.name}`}>Ficha →</button></div>
                    </div>
                    {editing?.id === row.id && editing.edit && <div role="row"><div role="cell" aria-colspan={5}>
                      <AgendaTimeEditor name={editing.name} time={editing.time} mode={mode} allowRoutine={editing.edit.allowRoutine} fromDate={editing.edit.fromDate} onCancel={finish} onSave={values => onSave(editing, values)} onSaved={text => { setMessage(text); finish(); }} />
                    </div></div>}
                  </Fragment>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
