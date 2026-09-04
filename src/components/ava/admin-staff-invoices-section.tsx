"use client";

import { GraduationCap, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { settleProductInvoice } from "@/app/ava/admin/actions";
import { Button } from "@/components/ui/button";
import {
  groupStaffInvoices,
  type StaffInvoiceSale,
  type StaffInvoiceSummary,
  type StaffInvoiceUnit,
} from "@/lib/staff-invoices";
import { cn } from "@/lib/utils";

type StaffInvoiceUnitFilter = "ALL" | StaffInvoiceUnit;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function StaffInvoicePaymentButton({
  invoice,
  month,
}: {
  invoice: StaffInvoiceSummary;
  month: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const willMarkPaid = invoice.pendingSaleIds.length > 0;
  const saleIds = willMarkPaid ? invoice.pendingSaleIds : invoice.paidSaleIds;

  function handleClick() {
    const confirmed = window.confirm(
      willMarkPaid
        ? `Confirmar o recebimento de ${formatCurrency(invoice.pendingTotalCents)} da fatura de ${invoice.buyerName}?`
        : `Reabrir como pendente a fatura de ${invoice.buyerName}?`,
    );

    if (!confirmed) return;

    setMessage(null);
    startTransition(async () => {
      const result = await settleProductInvoice({
        buyerUserId: invoice.buyerUserId,
        isPaid: willMarkPaid,
        month,
        saleIds,
        year: 2026,
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <span className="grid gap-1.5">
      <Button
        className={cn(
          "w-full",
          willMarkPaid
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
        )}
        disabled={isPending || saleIds.length === 0}
        onClick={handleClick}
        type="button"
        variant={willMarkPaid ? "default" : "outline"}
      >
        {isPending
          ? "Atualizando..."
          : willMarkPaid
            ? "Confirmar pagamento"
            : "Reabrir fatura"}
      </Button>
      {message ? (
        <span aria-live="polite" className="text-xs font-semibold text-primary">
          {message}
        </span>
      ) : null}
    </span>
  );
}

export function AdminProductInvoicesSection({
  month,
  sales,
  unitFilter,
}: {
  month: number;
  sales: StaffInvoiceSale[];
  unitFilter: StaffInvoiceUnitFilter;
}) {
  const invoices = groupStaffInvoices(
    unitFilter === "ALL"
      ? sales
      : sales.filter((sale) => sale.unit === unitFilter),
    2026,
    month,
  );
  const pendingTotal = invoices.reduce(
    (total, invoice) => total + invoice.pendingTotalCents,
    0,
  );

  return (
    <section className="mx-4 mb-4 overflow-hidden rounded-lg border border-fuchsia-200 bg-white shadow-sm sm:mx-5 sm:mb-5">
      <div className="grid gap-3 border-b border-fuchsia-100 bg-gradient-to-r from-fuchsia-50 via-white to-amber-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-fuchsia-700 text-white shadow-md shadow-fuchsia-900/15">
            <UserRound aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-fuchsia-700">
              Faturas separadas
            </span>
            <strong className="mt-1 block text-lg text-primary">
              Produtos de alunos e professores
            </strong>
            <span className="mt-1 block text-sm text-muted-foreground">
              Quando nao ha mensalidade aberta, a compra continua visivel e cobravel aqui.
            </span>
          </span>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900">
          {formatCurrency(pendingTotal)} pendente
        </span>
      </div>

      {invoices.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          Nenhuma fatura separada de produtos nesta competencia.
        </p>
      ) : (
        <div className="grid gap-3 p-4 xl:grid-cols-2">
          {invoices.map((invoice) => (
            <article
              className={cn(
                "overflow-hidden rounded-lg border",
                invoice.buyerRole === "STUDENT"
                  ? "border-cyan-200 bg-cyan-50/35"
                  : "border-fuchsia-100 bg-[#fffafd]",
              )}
              key={invoice.buyerUserId}
            >
              <div className={cn("flex min-w-0 items-start justify-between gap-3 border-b bg-white p-3", invoice.buyerRole === "STUDENT" ? "border-cyan-100" : "border-fuchsia-100")}>
                <span className="flex min-w-0 items-start gap-2.5">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-md", invoice.buyerRole === "STUDENT" ? "bg-cyan-100 text-cyan-800" : "bg-fuchsia-100 text-fuchsia-800")}>
                    {invoice.buyerRole === "STUDENT" ? <UserRound aria-hidden="true" className="size-4" /> : <GraduationCap aria-hidden="true" className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block break-words text-primary">
                      {invoice.buyerName}
                    </strong>
                    <span className="block break-all text-xs text-muted-foreground">
                      {invoice.buyerEmail}
                    </span>
                    <span className={cn("mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.62rem] font-extrabold uppercase", invoice.buyerRole === "STUDENT" ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800")}>
                      {invoice.buyerRole === "STUDENT" ? "Aluno" : "Professor"}
                    </span>
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase",
                    invoice.pendingTotalCents > 0
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800",
                  )}
                >
                  {invoice.pendingTotalCents > 0 ? "Pendente" : "Pago"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-px bg-fuchsia-100 text-xs">
                <span className="bg-slate-50 p-2.5">
                  <small className="block font-bold uppercase text-slate-500">
                    Mensalidade
                  </small>
                  <strong className="mt-1 block text-slate-700">
                    {invoice.buyerRole === "STUDENT" ? "Ja fechada ou ausente" : "Nao se aplica"}
                  </strong>
                </span>
                <span className="bg-fuchsia-50 p-2.5">
                  <small className="block font-bold uppercase text-fuchsia-700">
                    Doces
                  </small>
                  <strong className="mt-1 block tabular-nums text-fuchsia-950">
                    {formatCurrency(invoice.totalCents)}
                  </strong>
                </span>
                <span className="bg-primary p-2.5 text-white">
                  <small className="block font-bold uppercase text-white/70">
                    A pagar
                  </small>
                  <strong className="mt-1 block tabular-nums">
                    {formatCurrency(invoice.pendingTotalCents)}
                  </strong>
                </span>
              </div>

              <div className="grid gap-1.5 p-3">
                {invoice.items.map((item) => (
                  <span
                    className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-fuchsia-100 bg-white px-2.5 py-2 text-xs"
                    key={item.id}
                  >
                    <span className="min-w-0 break-words">
                      Doce · {item.quantity}x {item.productNameSnapshot}
                    </span>
                    <strong className="shrink-0 tabular-nums">
                      {formatCurrency(item.lineTotalCents)}
                    </strong>
                  </span>
                ))}
              </div>

              <div className="border-t border-fuchsia-100 bg-white p-3">
                <StaffInvoicePaymentButton invoice={invoice} month={month} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
