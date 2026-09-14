"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const schema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  scope: z.enum(["LESSON", "ROUTINE"]),
});
export type AgendaTimeEditorValues = z.infer<typeof schema>;
export type AgendaTimeSaveResult = { ok: boolean; message: string };

export function AgendaTimeEditor({ name, time, mode, allowRoutine, fromDate, onCancel, onSave, onSaved }: {
  name: string; time: string; mode: "DAY" | "MONTH"; allowRoutine: boolean; fromDate: string;
  onCancel: () => void; onSave: (values: AgendaTimeEditorValues) => Promise<AgendaTimeSaveResult>;
  onSaved: (message: string) => void;
}) {
  const id = useId();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const form = useForm<AgendaTimeEditorValues>({
    resolver: zodResolver(schema), defaultValues: { time, scope: mode === "DAY" ? "LESSON" : "ROUTINE" },
  });
  const scope = form.watch("scope");
  return (
    <form className="agenda-time-editor" aria-label={`Editar horário de ${name}`} onSubmit={form.handleSubmit(values => {
      setMessage("");
      startTransition(async () => {
        try {
          const result = await onSave(values);
          if (result.ok) onSaved(result.message);
          else setMessage(result.message);
        } catch {
          setMessage("Não foi possível confirmar o salvamento. Atualize a agenda antes de tentar novamente.");
        }
      });
    })}>
      <div className="min-w-0">
        <strong className="block text-sm text-primary">Editar horário · {name}</strong>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {scope === "LESSON" ? "Somente esta aula. A rotina semanal não muda." : `Aulas previstas de ${fromDate.split("-").reverse().join("/")} em diante e horário padrão. Dias da semana não mudam.`}
          {" "}Presenças, faltas e histórico são preservados.
        </p>
      </div>
      <div className="agenda-time-fields">
        <label htmlFor={`${id}-time`} className="grid min-w-0 gap-1 text-xs font-medium">
          Novo horário
          <Input id={`${id}-time`} type="time" className="h-11 w-full min-w-0 bg-white text-base" autoFocus disabled={pending} aria-invalid={!!form.formState.errors.time} {...form.register("time")} />
        </label>
        <label htmlFor={`${id}-scope`} className="grid min-w-0 gap-1 text-xs font-medium">
          Aplicar em
          <NativeSelect id={`${id}-scope`} className="h-11 w-full min-w-0 bg-white" disabled={pending} {...form.register("scope")}>
            {mode === "DAY" && <option value="LESSON">Somente esta aula</option>}
            {(mode === "MONTH" || allowRoutine) && <option value="ROUTINE">Rotina futura</option>}
          </NativeSelect>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit" className="h-11" disabled={pending}>{pending ? "Salvando…" : "Salvar horário"}</Button>
          <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
      {form.formState.errors.time && <p role="alert" className="text-sm text-red-700">{form.formState.errors.time.message}</p>}
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    </form>
  );
}
