import { TeacherPaymentButton } from "@/components/ava/teacher-payment-button";
import { groupTeacherProductPayments, type TeacherProductPaymentRow } from "@/lib/teacher-finance-payment";
import { TEACHER_FINANCE_MONTHS, TEACHER_FINANCE_YEAR } from "@/lib/teacher-finance";
import { getSecretariaSelectedUnit, type SecretariaUnitFilter } from "@/lib/secretaria-unit-filter";

export function TeacherProductPayments({ rows, month, unitFilter }: {
  rows: TeacherProductPaymentRow[]; month: number; unitFilter: SecretariaUnitFilter;
}) {
  const period = `${TEACHER_FINANCE_MONTHS[month - 1]} de ${TEACHER_FINANCE_YEAR}`;
  const unit = getSecretariaSelectedUnit(unitFilter);
  const invoices = groupTeacherProductPayments(rows).filter((invoice) => !unit || invoice.units.includes(unit));
  return <section className="rounded-lg border border-fuchsia-200 bg-white p-4 shadow-sm sm:p-5">
    <h3 className="text-lg font-bold text-primary">Doces · faturas separadas</h3>
    <p className="mt-1 text-sm text-muted-foreground">{period}. Fatura completa de cada pessoa, incluindo compras em outros polos. Sem valores. Doces vinculados à mensalidade aparecem junto ao aluno abaixo.</p>
    <div className="mt-4 grid gap-3">
      {invoices.length ? invoices.map((invoice) => <article key={invoice.id} className="grid min-w-0 gap-3 rounded-lg border border-primary/10 bg-primary/[0.02] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <h4 className="break-words font-bold text-primary">{invoice.name}</h4>
          <p className="text-xs text-muted-foreground">{invoice.role === "TEACHER" ? "Professor(a)" : "Aluno(a)"} · {invoice.units.map((value) => value === "IVATE" ? "Polo 1 · Ivaté" : "Polo 2 · Douradina").join(" / ")}</p>
          <ul className="mt-2 space-y-1 text-sm text-primary">{invoice.items.map((item, index) => <li key={index} className="break-words">{item.name} · {item.quantity} unidade(s) · <strong className={item.isPaid ? "text-emerald-800" : "text-amber-800"}>{item.isPaid ? "Pago" : "Pendente"}</strong></li>)}</ul>
        </div>
        <div className="grid gap-2">
          {invoice.pendingSales.length > 0 ? <TeacherPaymentButton command={{ kind: "PRODUCT", id: invoice.id, month, year: TEACHER_FINANCE_YEAR, sales: invoice.pendingSales, isPaid: true, confirm: true }} label={`${invoice.name} · doces · ${period}`} /> : null}
          {invoice.paidSales.length > 0 ? <TeacherPaymentButton command={{ kind: "PRODUCT", id: invoice.id, month, year: TEACHER_FINANCE_YEAR, sales: invoice.paidSales, isPaid: false, confirm: true }} label={`${invoice.name} · doces · ${period}`} /> : null}
        </div>
      </article>) : <p className="py-5 text-sm text-muted-foreground">Nenhuma fatura separada nesta seleção.</p>}
    </div>
  </section>;
}
