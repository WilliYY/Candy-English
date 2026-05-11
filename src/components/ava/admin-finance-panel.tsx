"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  IdCard,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
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

const createDefaultValues = (month: number): AdminFinanceStudentCreateInput => ({
  address: "",
  amount: "",
  cpf: "",
  email: "",
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

      const paymentDay = payment.snapshotPaymentDay;
      const isPaid = payment.isPaid;

      return {
        ...student,
        address: payment.snapshotAddress,
        amountCents: payment.snapshotAmountCents,
        cpf: payment.snapshotCpf,
        email: payment.snapshotEmail,
        isOverdue: isOverduePayment(paymentDay, isPaid, activeMonth),
        isPaid,
        name: payment.snapshotName,
        note: payment.note,
        paidAt: payment.paidAt,
        payment,
        paymentDay,
        paymentMethod: payment.snapshotPaymentMethod,
        phone: payment.snapshotPhone,
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
    cpf: row.cpf ?? "",
    dataPaga: formatDate(row.paidAt),
    dia: String(row.paymentDay),
    email: row.email ?? "",
    endereco: row.address ?? "",
    forma: formatPaymentMethod(row.paymentMethod),
    nome: row.name,
    observacao: row.note ?? "",
    status: row.isPaid ? "Pago" : "Pendente",
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
    "Telefone",
    "CPF",
    "Email",
    "Endereco",
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
        <td>${escapeHtml(row.telefone)}</td>
        <td>${escapeHtml(row.cpf)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(row.endereco)}</td>
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

function PaymentMethodSelect({
  disabled,
  id,
  register,
}: {
  disabled: boolean;
  id: string;
  register: UseFormRegister<AdminFinanceStudentCreateInput>;
}) {
  return (
    <NativeSelect id={id} disabled={disabled} {...register("paymentMethod")}>
      {FINANCIAL_PAYMENT_METHODS.map((method) => (
        <option key={method} value={method}>
          {paymentMethodLabels[method]}
        </option>
      ))}
    </NativeSelect>
  );
}

function FinanceStatusButton({
  month,
  row,
}: {
  month: number;
  row: FinanceMonthRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await toggleFinancialPaymentStatus({
        isPaid: !row.isPaid,
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
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
        Status
      </span>
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        className={cn(
          "w-full justify-center border text-white shadow-sm",
          row.isPaid
            ? "border-emerald-700 bg-emerald-600 hover:bg-emerald-700"
            : "border-red-700 bg-red-600 hover:bg-red-700",
        )}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : row.isPaid ? (
          <CheckCircle2 data-icon="inline-start" />
        ) : (
          <XCircle data-icon="inline-start" />
        )}
        {row.isPaid ? "Pago" : "Pendente"}
      </Button>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </div>
  );
}

function FinancePaidDateForm({
  month,
  row,
}: {
  month: number;
  row: FinanceMonthRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminFinancePaymentUpdateInput>({
    resolver: zodResolver(adminFinancePaymentUpdateSchema, undefined, {
      raw: true,
    }),
    defaultValues: {
      month,
      note: row.note ?? "",
      paidAt: toInputDate(row.paidAt),
      studentId: row.id,
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
    <form
      className="flex min-w-0 flex-col justify-center gap-1.5"
      onSubmit={onSubmit}
      noValidate
    >
      <input type="hidden" {...form.register("studentId")} />
      <input type="hidden" {...form.register("year", { valueAsNumber: true })} />
      <input type="hidden" {...form.register("month", { valueAsNumber: true })} />
      <input type="hidden" {...form.register("note")} />
      <Field className="gap-1.5" data-invalid={Boolean(form.formState.errors.paidAt)}>
        <FieldLabel
          htmlFor={`finance-paid-at-${row.id}`}
          className="xl:sr-only"
        >
          Data paga
        </FieldLabel>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:grid-cols-[minmax(0,1fr)_2.25rem]">
          <Input
            id={`finance-paid-at-${row.id}`}
            type="date"
            className="h-9 min-w-0 xl:h-8"
            aria-invalid={Boolean(form.formState.errors.paidAt)}
            disabled={isPending}
            {...form.register("paidAt")}
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 px-3 xl:h-8 xl:w-9 xl:px-0"
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-4" />
            )}
            <span className="xl:sr-only">Salvar</span>
          </Button>
        </div>
        <span className="text-xs text-muted-foreground xl:hidden">
          {formatDate(row.paidAt)}
        </span>
        <FieldError errors={[form.formState.errors.paidAt]} />
      </Field>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </form>
  );
}

function FinanceMonthlyNoteForm({
  month,
  row,
}: {
  month: number;
  row: FinanceMonthRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminFinancePaymentUpdateInput>({
    resolver: zodResolver(adminFinancePaymentUpdateSchema, undefined, {
      raw: true,
    }),
    defaultValues: {
      month,
      note: row.note ?? "",
      paidAt: toInputDate(row.paidAt),
      studentId: row.id,
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
    <form className="flex min-w-0 flex-col gap-3" onSubmit={onSubmit} noValidate>
      <input type="hidden" {...form.register("studentId")} />
      <input type="hidden" {...form.register("year", { valueAsNumber: true })} />
      <input type="hidden" {...form.register("month", { valueAsNumber: true })} />
      <input type="hidden" {...form.register("paidAt")} />
      <Field data-invalid={Boolean(form.formState.errors.note)}>
        <FieldLabel htmlFor={`finance-note-${row.id}`}>
          Observacao do mes
        </FieldLabel>
        <Textarea
          id={`finance-note-${row.id}`}
          aria-invalid={Boolean(form.formState.errors.note)}
          className="min-h-24 resize-y"
          disabled={isPending}
          placeholder="Observacao"
          {...form.register("note")}
        />
        <FieldError errors={[form.formState.errors.note]} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          Salvar observacao
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
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <input type="hidden" {...form.register("studentId")} />
      <input type="hidden" {...form.register("year", { valueAsNumber: true })} />
      <input type="hidden" {...form.register("month", { valueAsNumber: true })} />
      <div className="grid gap-3 lg:grid-cols-3">
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
            Valor
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
          <FieldLabel htmlFor={`finance-edit-day-${row.id}`}>Dia</FieldLabel>
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
            Forma de pagamento
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

        <Field
          className="lg:col-span-2"
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
          Editar aluno
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

function FinanceDeleteButton({
  month,
  row,
}: {
  month: number;
  row: FinanceMonthRow;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setMessage(null);

    const confirmed = window.confirm(
      `Retirar ${row.name} somente deste mes? Os outros meses continuam seguindo os alunos ativos.`,
    );

    if (!confirmed) {
      return;
    }

    const payload: AdminFinanceStudentDeleteInput = {
      month,
      studentId: row.id,
      year: 2026,
    };

    startTransition(async () => {
      const result = await deleteFinancialStudent(payload);
      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleDelete}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Trash2 data-icon="inline-start" />
        )}
        Retirar deste mes
      </Button>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">
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
    <div className="flex w-full flex-col gap-2 sm:w-28">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        disabled={isPending || rows.length === 0}
        onClick={() => handleExport("PDF")}
      >
        <FileText data-icon="inline-start" />
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
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
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set());
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
          } else {
            accumulator.pending += row.amountCents;
          }

          if (row.isOverdue) {
            accumulator.overdue += 1;
          }

          return accumulator;
        },
        {
          overdue: 0,
          paid: 0,
          pending: 0,
          total: 0,
        },
      ),
    [monthRows],
  );

  const overdueCounts = useMemo(
    () =>
      months.reduce<Record<number, number>>((accumulator, month) => {
        accumulator[month.value] = buildFinanceMonthRows(
          students,
          month.value,
        ).filter((row) => row.isOverdue).length;

        return accumulator;
      }, {}),
    [students],
  );

  const monthCounts = useMemo(
    () =>
      months.reduce<Record<number, number>>((accumulator, month) => {
        accumulator[month.value] = buildFinanceMonthRows(
          students,
          month.value,
        ).length;

        return accumulator;
      }, {}),
    [students],
  );

  function handleMonthChange(month: number) {
    setActiveMonth(month);
    form.setValue("month", month);
  }

  function toggleRowDetails(studentId: string) {
    setOpenRows((currentRows) => {
      const nextRows = new Set(currentRows);

      if (nextRows.has(studentId)) {
        nextRows.delete(studentId);
      } else {
        nextRows.add(studentId);
      }

      return nextRows;
    });
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

  const activeMonthLabel =
    months.find((month) => month.value === activeMonth)?.label ?? "Mes";

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pr-20">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-primary/20 bg-white p-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">Ano</span>
          <strong className="mt-1 block text-2xl font-semibold">2026</strong>
        </div>
        <div className="rounded-lg border border-primary/20 bg-white p-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">Mes</span>
          <strong className="mt-1 block text-2xl font-semibold">
            {activeMonthLabel}
          </strong>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <span className="text-sm font-medium text-emerald-900">Pago</span>
          <strong className="mt-1 block text-2xl font-semibold text-emerald-700">
            {formatCurrency(monthSummary.paid)}
          </strong>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm">
          <span className="text-sm font-medium text-red-900">Pendente</span>
          <strong className="mt-1 block text-2xl font-semibold text-red-700">
            {formatCurrency(monthSummary.pending)}
          </strong>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-medium text-amber-950">
            <AlertTriangle aria-hidden="true" className="size-4" />
            Devedores
          </span>
          <strong className="mt-1 block text-2xl font-semibold text-amber-800">
            ({monthSummary.overdue})
          </strong>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_7rem] lg:items-start">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-12">
          {months.map((month) => {
            const overdueCount = overdueCounts[month.value] ?? 0;
            const studentCount = monthCounts[month.value] ?? 0;

            return (
              <button
                key={month.value}
                type="button"
                onClick={() => handleMonthChange(month.value)}
                className={cn(
                  "min-w-0 rounded-lg border px-2.5 py-2.5 text-sm font-semibold transition-all",
                  activeMonth === month.value
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
                    : "border-primary/20 bg-white text-primary hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10",
                )}
              >
                <span className="block">{month.shortLabel}</span>
                <span className="mt-1 block text-xs opacity-85">
                  {studentCount} aluno(s)
                </span>
                {overdueCount > 0 ? (
                  <span
                    className={cn(
                      "mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.68rem]",
                      activeMonth === month.value
                        ? "bg-white text-red-700"
                        : "bg-red-600 text-white",
                    )}
                  >
                    ({overdueCount})
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <FinanceExportButtons
          activeMonth={activeMonth}
          activeMonthLabel={activeMonthLabel}
          rows={monthRows}
        />
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-primary/20 bg-white p-3 shadow-sm"
        noValidate
      >
        <FieldGroup className="gap-3">
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-[minmax(170px,1.3fr)_minmax(110px,0.65fr)_minmax(80px,0.45fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)_auto] xl:items-start">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="finance-student-name">Nome</FieldLabel>
              <Input
                id="finance-student-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                disabled={isPending}
                placeholder="Nome"
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.amount)}>
              <FieldLabel htmlFor="finance-amount">Valor</FieldLabel>
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
              <FieldLabel htmlFor="finance-payment-method">
                Forma de pagamento
              </FieldLabel>
              <PaymentMethodSelect
                id="finance-payment-method"
                disabled={isPending}
                register={form.register}
              />
              <FieldError errors={[form.formState.errors.paymentMethod]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.paidAt)}>
              <FieldLabel htmlFor="finance-paid-at">Data paga</FieldLabel>
              <Input
                id="finance-paid-at"
                type="date"
                aria-invalid={Boolean(form.formState.errors.paidAt)}
                disabled={isPending}
                {...form.register("paidAt")}
              />
              <FieldError errors={[form.formState.errors.paidAt]} />
            </Field>

            <Button
              type="submit"
              className="lg:mt-6 lg:w-full xl:w-auto"
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

          <details className="group rounded-lg border border-primary/15 bg-primary/5 p-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
              Dados extras e observacao
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
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
              <Field data-invalid={Boolean(form.formState.errors.cpf)}>
                <FieldLabel htmlFor="finance-cpf">CPF</FieldLabel>
                <Input
                  id="finance-cpf"
                  disabled={isPending}
                  placeholder="CPF"
                  {...form.register("cpf")}
                />
                <FieldError errors={[form.formState.errors.cpf]} />
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
              <Field data-invalid={Boolean(form.formState.errors.address)}>
                <FieldLabel htmlFor="finance-address">Endereco</FieldLabel>
                <Input
                  id="finance-address"
                  disabled={isPending}
                  placeholder="Endereco"
                  {...form.register("address")}
                />
                <FieldError errors={[form.formState.errors.address]} />
              </Field>
              <Field
                className="lg:col-span-4"
                data-invalid={Boolean(form.formState.errors.note)}
              >
                <FieldLabel htmlFor="finance-note">Observacao</FieldLabel>
                <Textarea
                  id="finance-note"
                  aria-invalid={Boolean(form.formState.errors.note)}
                  className="min-h-20 resize-y"
                  disabled={isPending}
                  placeholder="Observacao somente deste mes"
                  {...form.register("note")}
                />
                <FieldError errors={[form.formState.errors.note]} />
              </Field>
            </div>
          </details>
        </FieldGroup>

        {message ? (
          <p
            className="mt-4 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground"
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>

      <section className="flex flex-col gap-3">
        <div className="hidden rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs font-bold uppercase text-primary xl:grid xl:grid-cols-[minmax(135px,1fr)_112px_50px_118px_78px_minmax(190px,0.9fr)_48px] xl:items-center xl:gap-2.5 2xl:grid-cols-[minmax(160px,1.15fr)_120px_60px_125px_100px_minmax(190px,0.95fr)_112px]">
          <span>Nome</span>
          <span>Valor</span>
          <span>Dia</span>
          <span>Status</span>
          <span>Forma</span>
          <span>Data paga</span>
          <span>Extras</span>
        </div>

        {monthRows.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 text-center">
            <CircleDollarSign aria-hidden="true" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Nenhum aluno no financeiro ainda.
            </p>
          </div>
        ) : (
          monthRows.map((row) => (
            <article
              key={`${row.id}-${activeMonth}-${row.payment?.updatedAt ?? "novo"}`}
              className={cn(
                "rounded-lg border bg-white p-2 shadow-sm transition-colors",
                row.isOverdue
                  ? "border-amber-300 shadow-amber-100"
                  : "border-primary/15",
              )}
            >
              <div className="grid gap-2.5 xl:min-h-14 xl:grid-cols-[minmax(135px,1fr)_112px_50px_118px_78px_minmax(190px,0.9fr)_48px] xl:items-center 2xl:grid-cols-[minmax(160px,1.15fr)_120px_60px_125px_100px_minmax(190px,0.95fr)_112px]">
                <div className="min-w-0 break-words xl:flex xl:items-center xl:gap-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                    Nome
                  </span>
                  <strong className="mt-1 block text-base xl:mt-0">
                    {row.name}
                  </strong>
                  {row.isOverdue ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 xl:mt-0">
                      <AlertTriangle aria-hidden="true" className="size-3.5" />
                      Vencido
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 xl:flex xl:items-center">
                  <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                    Valor
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-semibold xl:mt-0">
                    <CircleDollarSign
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    {formatCurrency(row.amountCents)}
                  </span>
                </div>

                <div className="min-w-0 xl:flex xl:items-center">
                  <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                    Dia
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-semibold xl:mt-0">
                    <CalendarDays
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    {row.paymentDay}
                  </span>
                </div>

                <FinanceStatusButton month={activeMonth} row={row} />

                <div className="min-w-0 xl:flex xl:items-center">
                  <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                    Forma
                  </span>
                  <span className="mt-1 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold leading-tight text-primary xl:mt-0">
                    <WalletCards aria-hidden="true" className="size-4 shrink-0" />
                    <span className="min-w-0 break-words">
                      {formatPaymentMethod(row.paymentMethod)}
                    </span>
                  </span>
                </div>

                <FinancePaidDateForm month={activeMonth} row={row} />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Editar dados de ${row.name}`}
                  title="Editar dados"
                  className="h-9 justify-between xl:h-8 xl:justify-center xl:px-0 2xl:justify-between 2xl:px-3"
                  onClick={() => toggleRowDetails(row.id)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Pencil aria-hidden="true" className="size-4 shrink-0" />
                    <span className="truncate xl:hidden 2xl:inline">Editar</span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 transition-transform xl:hidden 2xl:block",
                      openRows.has(row.id) ? "rotate-180" : "",
                    )}
                  />
                </Button>
              </div>

              {openRows.has(row.id) ? (
                <div className="mt-4 grid gap-5 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-primary">
                    <span>Dados extras e observacao</span>
                    <ChevronDown aria-hidden="true" className="size-4 rotate-180" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <span className="flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
                      <Phone aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">{row.phone || "Sem telefone"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
                      <IdCard aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">{row.cpf || "Sem CPF"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
                      <Mail aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">{row.email || "Sem email"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">
                      <MapPin aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">
                        {row.address || "Sem endereco"}
                      </span>
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
                    <FinanceStudentEditForm month={activeMonth} row={row} />
                    <div className="grid gap-4">
                      <FinanceMonthlyNoteForm month={activeMonth} row={row} />
                      <FinanceDeleteButton month={activeMonth} row={row} />
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>

      <details
        id="financeiro-log"
        className="group rounded-lg border border-primary/20 bg-white p-3 shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-base font-semibold">Log financeiro</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {logs.length}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-primary">
            <Download aria-hidden="true" className="size-4" />
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
          </span>
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
                  className="grid gap-1 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-sm md:grid-cols-[180px_minmax(0,1fr)] md:items-start"
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
