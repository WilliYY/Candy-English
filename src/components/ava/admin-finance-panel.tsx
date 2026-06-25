"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createFinancialStudent,
  deleteFinancialStudent,
  recordFinancialExport,
  toggleFinancialPaymentStatus,
  updateFinancialPaymentDetails,
  updateFinancialStudent,
} from "@/app/ava/admin/actions";
import {
  FINANCIAL_PAYMENT_METHODS,
  adminFinancePaymentUpdateSchema,
  adminFinanceStudentCreateSchema,
  adminFinanceStudentUpdateSchema,
  type AdminFinanceExportLogInput,
  type AdminFinancePaymentUpdateInput,
  type AdminFinanceStudentCreateInput,
  type AdminFinanceStudentDeleteInput,
  type AdminFinanceStudentUpdateInput,
} from "@/lib/validations/admin-users";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type PaymentMethod = (typeof FINANCIAL_PAYMENT_METHODS)[number];
type FinanceStatus = "paid" | "pending" | "overdue" | "inactive";

export type AdminFinancePaymentRow = {
  id: string;
  isActive: boolean;
  isPaid: boolean;
  month: number;
  note: string | null;
  paidAt: string | null;
  snapshotAddress: string | null;
  snapshotAmountCents: number;
  snapshotCpf: string | null;
  snapshotEmail: string | null;
  snapshotInstallmentNumber: number | null;
  snapshotInstallmentsTotal: number | null;
  snapshotName: string;
  snapshotPaymentDay: number;
  snapshotPaymentMethod: string;
  snapshotPhone: string | null;
  updatedAt: string;
  year: number;
};

export type AdminFinanceStudentRow = {
  address: string | null;
  amountCents: number;
  cpf: string | null;
  email: string | null;
  id: string;
  installmentsTotal: number | null;
  name: string;
  paymentDay: number;
  paymentMethod: string;
  payments: AdminFinancePaymentRow[];
  phone: string | null;
};

export type AdminFinanceLogRow = {
  action: string;
  createdAt: string;
  description: string;
  id: string;
  studentName: string | null;
};

type FinanceMonthRow = AdminFinanceStudentRow & {
  isOverdue: boolean;
  isPaid: boolean;
  note: string | null;
  paidAt: string | null;
  payment: AdminFinancePaymentRow;
  status: Exclude<FinanceStatus, "inactive">;
};

type AdminFinancePanelProps = {
  initialMonth: number;
  logs: AdminFinanceLogRow[];
  students: AdminFinanceStudentRow[];
};

const months = [
  { label: "Janeiro", shortLabel: "Jan", value: 1 },
  { label: "Fevereiro", shortLabel: "Fev", value: 2 },
  { label: "Marco", shortLabel: "Mar", value: 3 },
  { label: "Abril", shortLabel: "Abr", value: 4 },
  { label: "Maio", shortLabel: "Mai", value: 5 },
  { label: "Junho", shortLabel: "Jun", value: 6 },
  { label: "Julho", shortLabel: "Jul", value: 7 },
  { label: "Agosto", shortLabel: "Ago", value: 8 },
  { label: "Setembro", shortLabel: "Set", value: 9 },
  { label: "Outubro", shortLabel: "Out", value: 10 },
  { label: "Novembro", shortLabel: "Nov", value: 11 },
  { label: "Dezembro", shortLabel: "Dez", value: 12 },
];

const days = Array.from({ length: 31 }, (_, index) => index + 1);

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  OTHER: "Outros",
  PIX: "Pix",
};

const createDefaultValues = (
  month: number,
): AdminFinanceStudentCreateInput => ({
  address: "",
  amount: "",
  cpf: "",
  email: "",
  installmentsTotal: "",
  month,
  name: "",
  note: "",
  paidAt: "",
  paymentDay: 1,
  paymentMethod: "PIX",
  phone: "",
  year: 2026,
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatAmountInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function toInputDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return dateFormatter.format(new Date(value));
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function getMonthLabel(month: number) {
  return months.find((item) => item.value === month)?.label ?? `Mes ${month}`;
}

function getFinanceInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizePaymentMethod(value: string): PaymentMethod {
  return FINANCIAL_PAYMENT_METHODS.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : "OTHER";
}

function formatPaymentMethod(value: string) {
  return paymentMethodLabels[normalizePaymentMethod(value)];
}

function getDueDate(month: number, paymentDay: number) {
  const lastDayOfMonth = new Date(2026, month, 0).getDate();
  const safeDay = Math.min(paymentDay, lastDayOfMonth);

  return new Date(2026, month - 1, safeDay, 23, 59, 59, 999);
}

function isOverduePayment(paymentDay: number, isPaid: boolean, month: number) {
  return !isPaid && new Date() > getDueDate(month, paymentDay);
}

function getPaymentStatus(payment: AdminFinancePaymentRow): FinanceStatus {
  if (!payment.isActive) {
    return "inactive";
  }

  if (payment.isPaid) {
    return "paid";
  }

  return isOverduePayment(payment.snapshotPaymentDay, payment.isPaid, payment.month)
    ? "overdue"
    : "pending";
}

function getStatusLabel(status: FinanceStatus) {
  if (status === "paid") {
    return "Pago";
  }

  if (status === "overdue") {
    return "Atrasado";
  }

  if (status === "inactive") {
    return "Inativo";
  }

  return "Pendente";
}

function getInstallmentLabel(payment: AdminFinancePaymentRow) {
  if (payment.snapshotInstallmentNumber && payment.snapshotInstallmentsTotal) {
    return `Parcela ${payment.snapshotInstallmentNumber}/${payment.snapshotInstallmentsTotal}`;
  }

  return "Mensalidade";
}

function getStatusClasses(status: FinanceStatus) {
  if (status === "paid") {
    return {
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-800 ring-emerald-200/80",
      card:
        "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 text-emerald-950",
      icon: "bg-emerald-600 text-white",
    };
  }

  if (status === "overdue") {
    return {
      badge: "border-red-200 bg-red-50 text-red-800 ring-red-200/80",
      card:
        "border-red-300 bg-gradient-to-br from-red-50 via-white to-rose-100/70 text-red-950",
      icon: "bg-red-600 text-white",
    };
  }

  if (status === "inactive") {
    return {
      badge: "border-slate-200 bg-slate-50 text-slate-600 ring-slate-200/80",
      card: "border-slate-200 bg-slate-50 text-slate-600",
      icon: "bg-slate-500 text-white",
    };
  }

  return {
    badge: "border-amber-200 bg-amber-50 text-amber-900 ring-amber-200/80",
    card:
      "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-[#f5ecff] text-primary",
    icon: "bg-amber-500 text-white",
  };
}

function buildFinanceMonthRows(
  students: AdminFinanceStudentRow[],
  activeMonth: number,
) {
  return students
    .map((student) => {
      const payment =
        student.payments.find(
          (item) => item.year === 2026 && item.month === activeMonth,
        ) ?? null;

      if (!payment || !payment.isActive) {
        return null;
      }

      const status = getPaymentStatus(payment);

      if (status === "inactive") {
        return null;
      }

      return {
        ...student,
        address: payment.snapshotAddress,
        amountCents: payment.snapshotAmountCents,
        cpf: payment.snapshotCpf,
        email: payment.snapshotEmail,
        installmentsTotal: payment.snapshotInstallmentsTotal,
        isOverdue: status === "overdue",
        isPaid: payment.isPaid,
        name: payment.snapshotName,
        note: payment.note,
        paidAt: payment.paidAt,
        payment,
        paymentDay: payment.snapshotPaymentDay,
        paymentMethod: payment.snapshotPaymentMethod,
        phone: payment.snapshotPhone,
        status,
      };
    })
    .filter((row): row is FinanceMonthRow => row !== null)
    .sort((left, right) => {
      if (left.paymentDay !== right.paymentDay) {
        return left.paymentDay - right.paymentDay;
      }

      return left.name.localeCompare(right.name, "pt-BR");
    });
}

function buildHistoryRows(row: AdminFinanceStudentRow) {
  return [...row.payments]
    .filter((payment) => payment.year === 2026)
    .sort((left, right) => left.month - right.month);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExportRows(rows: FinanceMonthRow[]) {
  return rows.map((row) => ({
    dataPaga: formatDate(row.paidAt),
    dia: String(row.paymentDay),
    forma: formatPaymentMethod(row.paymentMethod),
    nome: row.name,
    observacao: row.note ?? "",
    parcela: getInstallmentLabel(row.payment),
    status: getStatusLabel(row.status),
    telefone: row.phone ?? "",
    valor: formatCurrency(row.amountCents),
  }));
}

function buildFinanceTableHtml(rows: FinanceMonthRow[], title: string) {
  const exportRows = buildExportRows(rows);
  const headings = [
    "Nome",
    "Valor",
    "Dia",
    "Status",
    "Data paga",
    "Forma",
    "Parcela",
    "Telefone",
    "Observacao",
  ];

  const body = exportRows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.nome)}</td>
        <td>${escapeHtml(row.valor)}</td>
        <td>${escapeHtml(row.dia)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.dataPaga)}</td>
        <td>${escapeHtml(row.forma)}</td>
        <td>${escapeHtml(row.parcela)}</td>
        <td>${escapeHtml(row.telefone)}</td>
        <td>${escapeHtml(row.observacao)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #251333; }
          h1 { font-size: 20px; margin: 0 0 16px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d9cce4; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #efe7f7; color: #3b2350; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead>
            <tr>${headings.map((heading) => `<th>${heading}</th>`).join("")}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>`;
}

function exportExcel(rows: FinanceMonthRow[], activeMonthLabel: string) {
  const html = buildFinanceTableHtml(
    rows,
    `Financeiro Candy English 2026 - ${activeMonthLabel}`,
  );

  downloadBlob(
    html,
    `financeiro-candy-2026-${activeMonthLabel.toLowerCase()}.xls`,
    "application/vnd.ms-excel;charset=utf-8",
  );
}

function exportPdf(rows: FinanceMonthRow[], activeMonthLabel: string) {
  const html = buildFinanceTableHtml(
    rows,
    `Financeiro Candy English 2026 - ${activeMonthLabel}`,
  );
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    downloadBlob(
      html,
      `financeiro-candy-2026-${activeMonthLabel.toLowerCase()}.html`,
      "text/html;charset=utf-8",
    );
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function StatusPill({ status }: { status: FinanceStatus }) {
  const classes = getStatusClasses(status);
  const Icon =
    status === "paid" ? CheckCircle2 : status === "overdue" ? AlertTriangle : Clock3;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase ring-1",
        classes.badge,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {getStatusLabel(status)}
    </span>
  );
}

function FinanceStatusButton({
  isPaid,
  month,
  size = "default",
  studentId,
}: {
  isPaid: boolean;
  month: number;
  size?: "default" | "sm";
  studentId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await toggleFinancialPaymentStatus({
        isPaid: !isPaid,
        month,
        studentId,
        year: 2026,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <Button
        type="button"
        size={size}
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          handleClick();
        }}
        className={cn(
          "justify-center border text-white shadow-sm",
          isPaid
            ? "border-amber-700 bg-amber-600 hover:bg-amber-700"
            : "border-emerald-700 bg-emerald-600 hover:bg-emerald-700",
        )}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : isPaid ? (
          <RotateCcw data-icon="inline-start" />
        ) : (
          <CheckCircle2 data-icon="inline-start" />
        )}
        {isPaid ? "Desfazer" : "Pago hoje"}
      </Button>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </span>
  );
}

function FinancePaymentDetailForm({
  payment,
  studentId,
}: {
  payment: AdminFinancePaymentRow;
  studentId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminFinancePaymentUpdateInput>({
    resolver: zodResolver(adminFinancePaymentUpdateSchema, undefined, {
      raw: true,
    }),
    defaultValues: {
      amount: formatAmountInput(payment.snapshotAmountCents),
      month: payment.month,
      note: payment.note ?? "",
      paidAt: toInputDate(payment.paidAt),
      studentId,
      year: 2026,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateFinancialPaymentDetails(values);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminFinancePaymentUpdateInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form className="grid gap-3" onSubmit={onSubmit} noValidate>
      <input type="hidden" {...form.register("studentId")} />
      <input
        type="hidden"
        {...form.register("year", { valueAsNumber: true })}
      />
      <input
        type="hidden"
        {...form.register("month", { valueAsNumber: true })}
      />
      <div className="grid gap-3 md:grid-cols-[120px_150px_minmax(0,1fr)_auto] md:items-start">
        <Field data-invalid={Boolean(form.formState.errors.amount)}>
          <FieldLabel htmlFor={`finance-payment-amount-${payment.id}`}>
            Valor
          </FieldLabel>
          <Input
            id={`finance-payment-amount-${payment.id}`}
            inputMode="decimal"
            aria-invalid={Boolean(form.formState.errors.amount)}
            disabled={isPending}
            {...form.register("amount")}
          />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.paidAt)}>
          <FieldLabel htmlFor={`finance-payment-paid-at-${payment.id}`}>
            Data paga
          </FieldLabel>
          <Input
            id={`finance-payment-paid-at-${payment.id}`}
            type="date"
            aria-invalid={Boolean(form.formState.errors.paidAt)}
            disabled={isPending}
            {...form.register("paidAt")}
          />
          <FieldError errors={[form.formState.errors.paidAt]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.note)}>
          <FieldLabel htmlFor={`finance-payment-note-${payment.id}`}>
            Observacao
          </FieldLabel>
          <Textarea
            id={`finance-payment-note-${payment.id}`}
            aria-invalid={Boolean(form.formState.errors.note)}
            className="min-h-16 resize-y"
            disabled={isPending}
            placeholder="Observacao deste mes"
            {...form.register("note")}
          />
          <FieldError errors={[form.formState.errors.note]} />
        </Field>
        <Button
          type="submit"
          size="sm"
          className="mt-0 md:mt-6"
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          Salvar
        </Button>
      </div>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </form>
  );
}

function FinanceStudentEditForm({
  month,
  row,
}: {
  month: number;
  row: FinanceMonthRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminFinanceStudentUpdateInput>({
    resolver: zodResolver(adminFinanceStudentUpdateSchema, undefined, {
      raw: true,
    }),
    defaultValues: {
      address: row.address ?? "",
      amount: formatAmountInput(row.amountCents),
      cpf: row.cpf ?? "",
      email: row.email ?? "",
      installmentsTotal: row.installmentsTotal ? String(row.installmentsTotal) : "",
      month,
      name: row.name,
      paymentDay: row.paymentDay,
      paymentMethod: normalizePaymentMethod(row.paymentMethod),
      phone: row.phone ?? "",
      studentId: row.id,
      year: 2026,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateFinancialStudent(values);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminFinanceStudentUpdateInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      <input type="hidden" {...form.register("studentId")} />
      <input
        type="hidden"
        {...form.register("year", { valueAsNumber: true })}
      />
      <input
        type="hidden"
        {...form.register("month", { valueAsNumber: true })}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor={`finance-edit-name-${row.id}`}>Nome</FieldLabel>
          <Input
            id={`finance-edit-name-${row.id}`}
            aria-invalid={Boolean(form.formState.errors.name)}
            disabled={isPending}
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.amount)}>
          <FieldLabel htmlFor={`finance-edit-amount-${row.id}`}>
            Valor mensal
          </FieldLabel>
          <Input
            id={`finance-edit-amount-${row.id}`}
            inputMode="decimal"
            aria-invalid={Boolean(form.formState.errors.amount)}
            disabled={isPending}
            {...form.register("amount")}
          />
          <FieldError errors={[form.formState.errors.amount]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.paymentDay)}>
          <FieldLabel htmlFor={`finance-edit-day-${row.id}`}>
            Dia usual
          </FieldLabel>
          <NativeSelect
            id={`finance-edit-day-${row.id}`}
            aria-invalid={Boolean(form.formState.errors.paymentDay)}
            disabled={isPending}
            {...form.register("paymentDay", { valueAsNumber: true })}
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </NativeSelect>
          <FieldError errors={[form.formState.errors.paymentDay]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.paymentMethod)}>
          <FieldLabel htmlFor={`finance-edit-method-${row.id}`}>
            Forma padrao
          </FieldLabel>
          <NativeSelect
            id={`finance-edit-method-${row.id}`}
            aria-invalid={Boolean(form.formState.errors.paymentMethod)}
            disabled={isPending}
            {...form.register("paymentMethod")}
          >
            {FINANCIAL_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabels[method]}
              </option>
            ))}
          </NativeSelect>
          <FieldError errors={[form.formState.errors.paymentMethod]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.installmentsTotal)}>
          <FieldLabel htmlFor={`finance-edit-installments-${row.id}`}>
            Parcelas
          </FieldLabel>
          <Input
            id={`finance-edit-installments-${row.id}`}
            type="number"
            min={1}
            max={60}
            aria-invalid={Boolean(form.formState.errors.installmentsTotal)}
            disabled={isPending}
            placeholder="Recorrente"
            {...form.register("installmentsTotal")}
          />
          <FieldError errors={[form.formState.errors.installmentsTotal]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.phone)}>
          <FieldLabel htmlFor={`finance-edit-phone-${row.id}`}>
            Telefone
          </FieldLabel>
          <Input
            id={`finance-edit-phone-${row.id}`}
            aria-invalid={Boolean(form.formState.errors.phone)}
            disabled={isPending}
            {...form.register("phone")}
          />
          <FieldError errors={[form.formState.errors.phone]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor={`finance-edit-email-${row.id}`}>
            Email
          </FieldLabel>
          <Input
            id={`finance-edit-email-${row.id}`}
            type="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            disabled={isPending}
            {...form.register("email")}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.cpf)}>
          <FieldLabel htmlFor={`finance-edit-cpf-${row.id}`}>CPF</FieldLabel>
          <Input
            id={`finance-edit-cpf-${row.id}`}
            aria-invalid={Boolean(form.formState.errors.cpf)}
            disabled={isPending}
            {...form.register("cpf")}
          />
          <FieldError errors={[form.formState.errors.cpf]} />
        </Field>
        <Field
          className="md:col-span-2 xl:col-span-3"
          data-invalid={Boolean(form.formState.errors.address)}
        >
          <FieldLabel htmlFor={`finance-edit-address-${row.id}`}>
            Endereco
          </FieldLabel>
          <Input
            id={`finance-edit-address-${row.id}`}
            aria-invalid={Boolean(form.formState.errors.address)}
            disabled={isPending}
            {...form.register("address")}
          />
          <FieldError errors={[form.formState.errors.address]} />
        </Field>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Pencil data-icon="inline-start" />
          )}
          Salvar dados fixos
        </Button>
        {message ? (
          <span className="text-xs leading-5 text-muted-foreground">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function FinanceInactivateButtons({
  month,
  row,
}: {
  month: number;
  row: FinanceMonthRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(mode: NonNullable<AdminFinanceStudentDeleteInput["mode"]>) {
    setMessage(null);

    const confirmed = window.confirm(
      mode === "FROM_MONTH"
        ? `Encerrar ${row.name} de ${getMonthLabel(month)} em diante? O historico antigo fica preservado.`
        : `Retirar ${row.name} apenas de ${getMonthLabel(month)}?`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteFinancialStudent({
        mode,
        month,
        studentId: row.id,
        year: 2026,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          handleDelete("MONTH");
        }}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Trash2 data-icon="inline-start" />
        )}
        Inativar mes
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          handleDelete("FROM_MONTH");
        }}
      >
        Encerrar daqui
      </Button>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground sm:col-span-2">
          {message}
        </span>
      ) : null}
    </div>
  );
}

function FinanceExportButtons({
  activeMonth,
  activeMonthLabel,
  rows,
}: {
  activeMonth: number;
  activeMonthLabel: string;
  rows: FinanceMonthRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleExport(format: AdminFinanceExportLogInput["format"]) {
    if (format === "PDF") {
      exportPdf(rows, activeMonthLabel);
    } else {
      exportExcel(rows, activeMonthLabel);
    }

    startTransition(async () => {
      const result = await recordFinancialExport({
        format,
        month: activeMonth,
        year: 2026,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      <Button
        type="button"
        variant="outline"
        className="h-10 justify-start border-primary/20 bg-white/85 shadow-sm"
        disabled={isPending || rows.length === 0}
        onClick={() => handleExport("PDF")}
      >
        <FileText data-icon="inline-start" />
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 justify-start border-primary/20 bg-white/85 shadow-sm"
        disabled={isPending || rows.length === 0}
        onClick={() => handleExport("EXCEL")}
      >
        <FileSpreadsheet data-icon="inline-start" />
        Excel
      </Button>
    </div>
  );
}

export function AdminFinancePanel({
  initialMonth,
  logs,
  students,
}: AdminFinancePanelProps) {
  const router = useRouter();
  const [activeMonth, setActiveMonth] = useState(initialMonth);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FinanceStatus>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminFinanceStudentCreateInput>({
    resolver: zodResolver(adminFinanceStudentCreateSchema, undefined, {
      raw: true,
    }),
    defaultValues: createDefaultValues(initialMonth),
  });

  const monthRows = useMemo(
    () => buildFinanceMonthRows(students, activeMonth),
    [activeMonth, students],
  );

  const monthSummary = useMemo(
    () =>
      monthRows.reduce(
        (accumulator, row) => {
          accumulator.total += row.amountCents;

          if (row.isPaid) {
            accumulator.paid += row.amountCents;
            accumulator.paidCount += 1;
          } else {
            accumulator.pending += row.amountCents;
            accumulator.pendingCount += 1;
          }

          if (row.isOverdue) {
            accumulator.overdueCount += 1;
          }

          return accumulator;
        },
        {
          overdueCount: 0,
          paid: 0,
          paidCount: 0,
          pending: 0,
          pendingCount: 0,
          total: 0,
        },
      ),
    [monthRows],
  );

  const monthCounts = useMemo(
    () =>
      months.reduce<Record<number, { all: number; overdue: number }>>(
        (accumulator, month) => {
          const rows = buildFinanceMonthRows(students, month.value);

          accumulator[month.value] = {
            all: rows.length,
            overdue: rows.filter((row) => row.isOverdue).length,
          };

          return accumulator;
        },
        {},
      ),
    [students],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return monthRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.name.toLowerCase().includes(normalizedSearch) ||
        (row.phone ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        row.status === statusFilter ||
        (statusFilter === "pending" && row.status === "pending");

      return matchesSearch && matchesStatus;
    });
  }, [monthRows, searchTerm, statusFilter]);

  const selectedRow =
    monthRows.find((row) => row.id === selectedStudentId) ?? null;

  function handleMonthChange(month: number) {
    setActiveMonth(month);
    setSelectedStudentId(null);
    form.setValue("month", month);
  }

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createFinancialStudent({
        ...values,
        month: activeMonth,
        year: 2026,
      });

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminFinanceStudentCreateInput, {
                message: fieldMessage,
              });
            }
          });
        }

        setMessage(result.message);
        return;
      }

      form.reset(createDefaultValues(activeMonth));
      setMessage(result.message);
      router.refresh();
    });
  });

  const activeMonthLabel = getMonthLabel(activeMonth);

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pr-20">
      <section className="overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-white via-[#fff7fb] to-[#eef9ff] shadow-[0_20px_56px_rgba(65,42,76,0.1)]">
        <div className="flex flex-col gap-4 border-b border-primary/10 bg-white/75 p-4 xl:flex-row xl:items-center xl:justify-between">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(65,42,76,0.2)]">
              <WalletCards aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/60">
                Financeiro simples
              </span>
              <strong className="mt-1 block text-xl text-primary">
                {activeMonthLabel} de 2026
              </strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                Lista manual de alunos pagantes, parcelas e status do mes.
              </span>
            </span>
          </span>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[19rem]">
            <FinanceExportButtons
              activeMonth={activeMonth}
              activeMonthLabel={activeMonthLabel}
              rows={monthRows}
            />
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-semibold text-sky-950">
              <ReceiptText aria-hidden="true" className="size-4" />
              Total previsto
            </span>
            <strong className="mt-2 block text-2xl font-semibold text-sky-800">
              {formatCurrency(monthSummary.total)}
            </strong>
            <span className="mt-1 block text-xs text-sky-900/75">
              {monthRows.length} aluno(s) ativo(s)
            </span>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Recebido
            </span>
            <strong className="mt-2 block text-2xl font-semibold text-emerald-700">
              {formatCurrency(monthSummary.paid)}
            </strong>
            <span className="mt-1 block text-xs text-emerald-900/75">
              {monthSummary.paidCount} pago(s) no mes
            </span>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-950">
              <Clock3 aria-hidden="true" className="size-4" />
              Pendentes
            </span>
            <strong className="mt-2 block text-2xl font-semibold text-amber-800">
              {monthSummary.pendingCount}
            </strong>
            <span className="mt-1 block text-xs text-amber-900/75">
              {formatCurrency(monthSummary.pending)} em aberto
            </span>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-semibold text-red-950">
              <AlertTriangle aria-hidden="true" className="size-4" />
              Atrasados
            </span>
            <strong className="mt-2 block text-2xl font-semibold text-red-700">
              {monthSummary.overdueCount}
            </strong>
            <span className="mt-1 block text-xs text-red-900/75">
              Dia de pagamento ja passou
            </span>
          </div>
          <div className="rounded-lg border border-primary/15 bg-white p-3 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary/80">
              <CalendarDays aria-hidden="true" className="size-4" />
              Mes atual
            </span>
            <NativeSelect
              value={activeMonth}
              onChange={(event) => handleMonthChange(Number(event.target.value))}
              className="mt-2"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="border-t border-primary/10 bg-white/45 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-12">
            {months.map((month) => {
              const counts = monthCounts[month.value] ?? { all: 0, overdue: 0 };

              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => handleMonthChange(month.value)}
                  className={cn(
                    "min-w-0 rounded-lg border px-2.5 py-2.5 text-sm font-semibold transition-all",
                    activeMonth === month.value
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
                      : "border-primary/15 bg-white/90 text-primary hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10",
                  )}
                >
                  <span className="block">{month.shortLabel}</span>
                  <span className="mt-1 block text-xs opacity-85">
                    {counts.all} aluno(s)
                  </span>
                  {counts.overdue > 0 ? (
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.68rem]",
                        activeMonth === month.value
                          ? "bg-white text-red-700"
                          : "bg-red-600 text-white",
                      )}
                    >
                      {counts.overdue} venc.
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <form
        onSubmit={onSubmit}
        className="overflow-hidden rounded-lg border border-primary/20 bg-white shadow-[0_16px_44px_rgba(65,42,76,0.08)]"
        noValidate
      >
        <div className="flex flex-col gap-3 border-b border-primary/10 bg-gradient-to-r from-white via-[#fff7fb] to-[#fce5d8]/65 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Plus aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <strong className="block text-base text-primary">
                Adicionar aluno financeiro
              </strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                Preencha nome, valor, dia e forma. Parcelas sao opcionais.
              </span>
            </span>
          </span>
          <span className="w-fit rounded-full border border-primary/15 bg-white/85 px-3 py-1 text-xs font-bold uppercase text-primary">
            Rapido
          </span>
        </div>
        <FieldGroup className="gap-3 p-4">
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-[minmax(190px,1.35fr)_minmax(120px,0.65fr)_90px_minmax(150px,0.8fr)_110px_auto] xl:items-start">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="finance-student-name">Nome</FieldLabel>
              <Input
                id="finance-student-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                disabled={isPending}
                placeholder="Nome do aluno"
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.amount)}>
              <FieldLabel htmlFor="finance-amount">Valor mensal</FieldLabel>
              <Input
                id="finance-amount"
                inputMode="decimal"
                aria-invalid={Boolean(form.formState.errors.amount)}
                disabled={isPending}
                placeholder="0,00"
                {...form.register("amount")}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.paymentDay)}>
              <FieldLabel htmlFor="finance-payment-day">Dia</FieldLabel>
              <NativeSelect
                id="finance-payment-day"
                aria-invalid={Boolean(form.formState.errors.paymentDay)}
                disabled={isPending}
                {...form.register("paymentDay", { valueAsNumber: true })}
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </NativeSelect>
              <FieldError errors={[form.formState.errors.paymentDay]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.paymentMethod)}>
              <FieldLabel htmlFor="finance-payment-method">Forma</FieldLabel>
              <NativeSelect
                id="finance-payment-method"
                aria-invalid={Boolean(form.formState.errors.paymentMethod)}
                disabled={isPending}
                {...form.register("paymentMethod")}
              >
                {FINANCIAL_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabels[method]}
                  </option>
                ))}
              </NativeSelect>
              <FieldError errors={[form.formState.errors.paymentMethod]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.installmentsTotal)}>
              <FieldLabel htmlFor="finance-installments">Parcelas</FieldLabel>
              <Input
                id="finance-installments"
                type="number"
                min={1}
                max={60}
                aria-invalid={Boolean(form.formState.errors.installmentsTotal)}
                disabled={isPending}
                placeholder="Livre"
                {...form.register("installmentsTotal")}
              />
              <FieldError errors={[form.formState.errors.installmentsTotal]} />
            </Field>
            <Button
              type="submit"
              className="h-10 shadow-sm lg:mt-6 lg:w-full xl:w-auto"
              disabled={isPending}
            >
              {isPending ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              Adicionar
            </Button>
          </div>

          <details className="group rounded-lg border border-primary/15 bg-gradient-to-r from-primary/[0.04] via-white to-[#fce5d8]/45 p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-col">
                <span>Contato e observacao</span>
                <span className="mt-1 text-xs font-normal text-muted-foreground">
                  Telefone e nota ajudam no controle, sem poluir a tela.
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              <Field data-invalid={Boolean(form.formState.errors.phone)}>
                <FieldLabel htmlFor="finance-phone">Telefone</FieldLabel>
                <Input
                  id="finance-phone"
                  disabled={isPending}
                  placeholder="Telefone"
                  {...form.register("phone")}
                />
                <FieldError errors={[form.formState.errors.phone]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel htmlFor="finance-email">Email</FieldLabel>
                <Input
                  id="finance-email"
                  type="email"
                  disabled={isPending}
                  placeholder="email@exemplo.com"
                  {...form.register("email")}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.cpf)}>
                <FieldLabel htmlFor="finance-cpf">CPF</FieldLabel>
                <Input
                  id="finance-cpf"
                  disabled={isPending}
                  placeholder="Opcional"
                  {...form.register("cpf")}
                />
                <FieldError errors={[form.formState.errors.cpf]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.paidAt)}>
                <FieldLabel htmlFor="finance-paid-at">Pago em</FieldLabel>
                <Input
                  id="finance-paid-at"
                  type="date"
                  aria-invalid={Boolean(form.formState.errors.paidAt)}
                  disabled={isPending}
                  {...form.register("paidAt")}
                />
                <FieldError errors={[form.formState.errors.paidAt]} />
              </Field>
              <Field
                className="lg:col-span-2"
                data-invalid={Boolean(form.formState.errors.address)}
              >
                <FieldLabel htmlFor="finance-address">Endereco</FieldLabel>
                <Input
                  id="finance-address"
                  disabled={isPending}
                  placeholder="Opcional"
                  {...form.register("address")}
                />
                <FieldError errors={[form.formState.errors.address]} />
              </Field>
              <Field
                className="lg:col-span-2"
                data-invalid={Boolean(form.formState.errors.note)}
              >
                <FieldLabel htmlFor="finance-note">Observacao do mes</FieldLabel>
                <Textarea
                  id="finance-note"
                  aria-invalid={Boolean(form.formState.errors.note)}
                  className="min-h-20 resize-y"
                  disabled={isPending}
                  placeholder="Opcional"
                  {...form.register("note")}
                />
                <FieldError errors={[form.formState.errors.note]} />
              </Field>
            </div>
          </details>
        </FieldGroup>

        {message ? (
          <p
            className="mx-4 mb-4 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground"
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>

      <section className="overflow-hidden rounded-lg border border-primary/20 bg-white shadow-[0_22px_60px_rgba(65,42,76,0.12)]">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-primary via-[#7c3fa1] to-[#d86f9d] px-4 py-4 text-white xl:flex-row xl:items-center xl:justify-between">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/25">
              <UserRound aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-lg">
                Alunos pagantes - {activeMonthLabel}
              </strong>
              <span className="mt-1 block text-sm text-white/80">
                Clique no card para abrir historico, parcelas e observacoes.
              </span>
            </span>
          </span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px] xl:min-w-[31rem]">
            <label className="relative min-w-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/50"
              />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 border-white/40 bg-white pl-9 text-primary placeholder:text-primary/45"
                placeholder="Buscar aluno ou telefone"
              />
            </label>
            <NativeSelect
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | FinanceStatus)
              }
              className="h-10 border-white/40 bg-white text-primary"
            >
              <option value="ALL">Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
              <option value="overdue">Atrasados</option>
            </NativeSelect>
          </div>
        </div>

        <div className="grid gap-4 bg-[#fbf7ff] p-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.64fr)]">
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-primary">
                <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                {filteredRows.length} de {monthRows.length}
              </span>
              <StatusPill status="paid" />
              <StatusPill status="pending" />
              <StatusPill status="overdue" />
            </div>

            {filteredRows.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-white text-center">
                <CircleDollarSign aria-hidden="true" className="text-primary" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  Nenhum aluno financeiro encontrado para este filtro.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {filteredRows.map((row) => {
                  const classes = getStatusClasses(row.status);
                  const isSelected = selectedStudentId === row.id;

                  return (
                    <article
                      key={`${row.id}-${activeMonth}-${row.payment.updatedAt}`}
                      className={cn(
                        "group min-w-0 rounded-lg border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                        classes.card,
                        isSelected ? "ring-2 ring-primary/55" : "",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(row.id)}
                        className="flex w-full min-w-0 items-start justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase shadow-sm",
                              classes.icon,
                            )}
                          >
                            {getFinanceInitials(row.name)}
                          </span>
                          <span className="min-w-0">
                            <strong className="block truncate text-base">
                              {row.name}
                            </strong>
                            <span className="mt-1 block truncate text-xs opacity-75">
                              {row.phone || "Sem telefone"}
                            </span>
                          </span>
                        </span>
                        <StatusPill status={row.status} />
                      </button>

                      <span className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <span className="rounded-lg border border-white/70 bg-white/70 px-3 py-2">
                          <span className="block text-[0.68rem] font-bold uppercase opacity-65">
                            Valor
                          </span>
                          <span className="mt-1 block font-semibold">
                            {formatCurrency(row.amountCents)}
                          </span>
                        </span>
                        <span className="rounded-lg border border-white/70 bg-white/70 px-3 py-2">
                          <span className="block text-[0.68rem] font-bold uppercase opacity-65">
                            Dia
                          </span>
                          <span className="mt-1 block font-semibold">
                            {row.paymentDay}
                          </span>
                        </span>
                      </span>

                      <span className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="rounded-full border border-white/70 bg-white/75 px-2.5 py-1">
                          {formatPaymentMethod(row.paymentMethod)}
                        </span>
                        <span className="rounded-full border border-white/70 bg-white/75 px-2.5 py-1">
                          {getInstallmentLabel(row.payment)}
                        </span>
                      </span>

                      <span className="mt-4 grid gap-2">
                        <FinanceStatusButton
                          isPaid={row.isPaid}
                          month={activeMonth}
                          studentId={row.id}
                        />
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="min-w-0 rounded-lg border border-primary/15 bg-white shadow-sm">
            {selectedRow ? (
              <div className="grid gap-4">
                <div className="border-b border-primary/10 bg-gradient-to-r from-white via-[#fff7fb] to-[#eef9ff] p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/60">
                        Historico do aluno
                      </span>
                      <strong className="mt-1 block break-words text-xl text-primary">
                        {selectedRow.name}
                      </strong>
                    </span>
                    <StatusPill status={selectedRow.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2">
                      <CircleDollarSign
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                      {formatCurrency(selectedRow.amountCents)}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2">
                      <CalendarDays
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                      Dia {selectedRow.paymentDay}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2">
                      <WalletCards
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                      {formatPaymentMethod(selectedRow.paymentMethod)}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2">
                      <Phone
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                      <span className="truncate">
                        {selectedRow.phone || "Sem telefone"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 px-4">
                  <details className="group rounded-lg border border-primary/15 bg-[#fbf7ff] p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-primary [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2">
                        <Pencil aria-hidden="true" className="size-4" />
                        Editar dados fixos
                      </span>
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3">
                      <FinanceStudentEditForm
                        month={activeMonth}
                        row={selectedRow}
                      />
                    </div>
                  </details>

                  <div className="grid gap-2 rounded-lg border border-primary/15 bg-white p-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Mail aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">
                        {selectedRow.email || "Sem email"}
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <MapPin aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">
                        {selectedRow.address || "Sem endereco"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                      <History aria-hidden="true" className="size-4" />
                      Meses e parcelas
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {buildHistoryRows(selectedRow).length} registro(s)
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {buildHistoryRows(selectedRow).map((payment) => {
                      const status = getPaymentStatus(payment);
                      const statusClasses = getStatusClasses(status);

                      return (
                        <details
                          key={payment.id}
                          className={cn(
                            "group overflow-hidden rounded-lg border bg-white",
                            statusClasses.card,
                          )}
                        >
                          <summary className="grid cursor-pointer list-none gap-3 p-3 text-sm [&::-webkit-details-marker]:hidden sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <span className="min-w-0">
                              <span className="flex min-w-0 flex-wrap items-center gap-2">
                                <strong className="text-base">
                                  {getMonthLabel(payment.month)}
                                </strong>
                                <StatusPill status={status} />
                                <span className="rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-xs font-semibold">
                                  {getInstallmentLabel(payment)}
                                </span>
                              </span>
                              <span className="mt-2 grid gap-1 text-xs opacity-75 sm:grid-cols-2">
                                <span>{formatCurrency(payment.snapshotAmountCents)}</span>
                                <span>Pago em {formatDate(payment.paidAt)}</span>
                              </span>
                            </span>
                            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="border-t border-white/70 bg-white/75 p-3">
                            {payment.isActive ? (
                              <div className="grid gap-3">
                                <FinanceStatusButton
                                  isPaid={payment.isPaid}
                                  month={payment.month}
                                  size="sm"
                                  studentId={selectedRow.id}
                                />
                                <FinancePaymentDetailForm
                                  payment={payment}
                                  studentId={selectedRow.id}
                                />
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Este mes esta inativo para o aluno.
                              </p>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-primary/10 bg-[#fbf7ff] p-4">
                  <FinanceInactivateButtons month={activeMonth} row={selectedRow} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[22rem] flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <History aria-hidden="true" className="size-5" />
                </span>
                <strong className="text-primary">Selecione um aluno</strong>
                <p className="max-w-xs text-sm text-muted-foreground">
                  O historico, as parcelas e as observacoes aparecem aqui.
                </p>
              </div>
            )}
          </aside>
        </div>

        <div className="border-t border-primary/15 bg-gradient-to-r from-[#f6e6ff] via-white to-[#fce5d8]/70 px-4 py-3 text-sm font-bold text-primary">
          Total mensal: {formatCurrency(monthSummary.total)} | Recebido:{" "}
          {formatCurrency(monthSummary.paid)} | Em aberto:{" "}
          {formatCurrency(monthSummary.pending)}
        </div>
      </section>

      <details
        id="financeiro-log"
        className="group rounded-lg border border-primary/20 bg-white/95 p-3 shadow-[0_12px_34px_rgba(65,42,76,0.07)]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Download aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-primary">
                Log financeiro
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Criacao, edicao, status, encerramento e exportacao.
              </span>
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {logs.length}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-3">
          {logs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              Nenhuma movimentacao registrada ainda.
            </p>
          ) : (
            <ol className="grid gap-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="grid gap-1 rounded-lg border border-primary/10 bg-gradient-to-r from-primary/[0.04] to-white px-3 py-2 text-sm md:grid-cols-[180px_minmax(0,1fr)] md:items-start"
                >
                  <span className="font-semibold text-primary">
                    {formatDateTime(log.createdAt)}
                  </span>
                  <span className="min-w-0 break-words text-muted-foreground">
                    {log.description}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </div>
  );
}
