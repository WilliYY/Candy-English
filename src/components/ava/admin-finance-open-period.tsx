"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openAdminFinancialPeriod } from "@/app/ava/admin/finance-period-actions";
import { Button } from "@/components/ui/button";

export function AdminFinanceOpenPeriod({ students, year, month }: {
  students: { id: string; name: string }[]; year: number; month: number;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = students.find((student) => student.id === studentId);
  function openPeriod() {
    if (!selected || !window.confirm(`Criar somente a mensalidade de ${month}/${year} de ${selected.name}, com o valor recorrente atual? Isso registra uma pendencia interna. Nao envia cobranca.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await openAdminFinancialPeriod({ studentId, year, month, confirmCreate: true });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }
  return <section className="mx-4 mb-4 grid gap-3 rounded-lg border bg-white p-4 sm:mx-5" aria-label="Abrir mensalidade ausente">
    <div><h3 className="font-bold">Abrir mensalidade ausente · {month}/{year}</h3>
      <p className="text-sm text-muted-foreground">Cria somente este mes para um aluno financeiro ativo. Pagamentos existentes e historico sao preservados.</p></div>
    <label className="grid gap-1 text-sm">Aluno financeiro
      <select className="min-h-11 rounded-md border bg-white px-3" disabled={pending} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
        <option value="">Selecione o aluno</option>
        {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
      </select>
    </label>
    <Button type="button" disabled={pending || !selected} onClick={openPeriod}>{pending ? "Abrindo..." : "Abrir somente esta competencia"}</Button>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </section>;
}
