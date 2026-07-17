"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
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
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createFinancialExpense,
  createFinancialStudent,
  deleteFinancialStudent,
  recordFinancialExport,
  toggleFinancialPaymentStatus,
  updateFinancialPaymentDetails,
  updateFinancialStudent,
} from "@/app/ava/admin/actions";
import {
  FINANCIAL_PAYMENT_METHODS,
  FINANCIAL_UNITS,
  adminFinanceExpenseCreateSchema,
  adminFinancePaymentUpdateSchema,
  adminFinanceStudentCreateSchema,
  adminFinanceStudentUpdateSchema,
  type AdminFinanceExpenseCreateInput,
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
import type { SecretariaUnitFilter } from "@/lib/secretaria-unit-filter";

type PaymentMethod = (typeof FINANCIAL_PAYMENT_METHODS)[number];
type FinancialUnit = (typeof FINANCIAL_UNITS)[number];
type FinanceStatus = "paid" | "pending" | "overdue" | "inactive";
type FinanceView = "STUDENTS" | "EXPENSES";
type UnitFilter = "ALL" | FinancialUnit;

export type AdminFinanceExpenseRow = {
  actorName: string;
  amountCents: number;
  createdAt: string;
  id: string;
  itemName: string;
  month: number;
  note: string | null;
  purchasedAt: string;
  unit: FinancialUnit;
  year: number;
};

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
  snapshotUnit: FinancialUnit;
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
  unit: FinancialUnit;
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
  expenses: AdminFinanceExpenseRow[];
  initialMonth: number;
  initialUnitFilter?: SecretariaUnitFilter;
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
  timeZone: "UTC",
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

const financialUnitShortLabels: Record<FinancialUnit, string> = {
  DOURADINA: "Douradina",
  IVATE: "Ivaté",
};

const financialUnitPoloLabels: Record<FinancialUnit, string> = {
  DOURADINA: "Polo 2",
  IVATE: "Polo 1",
};

const financialUnitToneClasses: Record<
  FinancialUnit,
  {
    badge: string;
    dot: string;
    panel: string;
    stripe: string;
  }
> = {
  DOURADINA: {
    badge: "border-sky-200 bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
    panel: "border-sky-200 bg-sky-50/80 text-sky-950",
    stripe: "bg-sky-500",
  },
  IVATE: {
    badge: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
    dot: "bg-fuchsia-500",
    panel: "border-fuchsia-200 bg-fuchsia-50/80 text-fuchsia-950",
    stripe: "bg-fuchsia-500",
  },
};

const financeSummaryToneClasses = {
  amber: {
    accent: "bg-amber-500",
    icon: "bg-amber-100 text-amber-800 ring-amber-200/80",
    panel:
      "border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-amber-100/65",
    value: "text-amber-900",
  },
  emerald: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
    panel:
      "border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70",
    value: "text-emerald-800",
  },
  rose: {
    accent: "bg-rose-500",
    icon: "bg-rose-100 text-rose-800 ring-rose-200/80",
    panel:
      "border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-rose-100/70",
    value: "text-rose-800",
  },
  sky: {
    accent: "bg-sky-500",
    icon: "bg-sky-100 text-sky-800 ring-sky-200/80",
    panel:
      "border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-sky-100/70",
    value: "text-sky-800",
  },
} as const;

type FinanceSummaryTone = keyof typeof financeSummaryToneClasses;

function FinanceSummaryCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: FinanceSummaryTone;
  value: string;
}) {
  const classes = financeSummaryToneClasses[tone];

  return (
    <article
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-lg border p-4 shadow-[0_12px_30px_rgba(65,42,76,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(65,42,76,0.11)]",
        classes.panel,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1", classes.accent)}
      />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-primary/62">
            {label}
          </span>
          <strong
            className={cn(
              "mt-2 block min-w-0 text-[1.7rem] font-extrabold leading-none tabular-nums tracking-normal",
              classes.value,
            )}
          >
            {value}
          </strong>
        </span>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform duration-200 group-hover:scale-105",
            classes.icon,
          )}
        >
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
      </div>
      <span className="mt-3 block text-xs font-semibold leading-5 text-primary/64">
        {detail}
      </span>
    </article>
  );
}

function normalizeInitialUnitFilter(
  filter: SecretariaUnitFilter | undefined,
): UnitFilter {
  return filter === "IVATE" || filter === "DOURADINA" ? filter : "ALL";
}

function getDefaultUnitForFilter(filter: UnitFilter): FinancialUnit {
  return filter === "ALL" ? "IVATE" : filter;
}

const createDefaultValues = (
  month: number,
  unit: FinancialUnit = "IVATE",
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
  unit,
  year: 2026,
});

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatInputDate(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function getDefaultExpenseDate(month: number) {
  const today = new Date();

  if (today.getFullYear() === 2026 && today.getMonth() + 1 === month) {
    return formatInputDate(today);
  }

  return `2026-${padDatePart(month)}-01`;
}

const createExpenseDefaultValues = (
  month: number,
  unit: FinancialUnit = "IVATE",
): AdminFinanceExpenseCreateInput => ({
  actorName: "",
  amount: "",
  itemName: "",
  month,
  note: "",
  purchasedAt: getDefaultExpenseDate(month),
  unit,
  year: 2026,
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
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

function formatFinancialUnitShort(unit: FinancialUnit) {
  return financialUnitShortLabels[unit];
}

function formatFinancialUnitPolo(unit: FinancialUnit) {
  return financialUnitPoloLabels[unit];
}

function formatFinancialUnitWithPolo(unit: FinancialUnit) {
  return `${formatFinancialUnitPolo(unit)} - ${formatFinancialUnitShort(unit)}`;
}

function formatUnitFilterDisplay(filter: UnitFilter) {
  return filter === "ALL"
    ? "Todos os polos"
    : formatFinancialUnitWithPolo(filter);
}

function getFinancialUnitTone(unit: FinancialUnit) {
  return financialUnitToneClasses[unit];
}

const unitFilterOptions: ReadonlyArray<{
  description: string;
  label: string;
  value: UnitFilter;
}> = [
  {
    description: `${financialUnitShortLabels.IVATE} e ${financialUnitShortLabels.DOURADINA}`,
    label: "Todos",
    value: "ALL",
  },
  {
    description: financialUnitShortLabels.IVATE,
    label: "Polo 1",
    value: "IVATE",
  },
  {
    description: financialUnitShortLabels.DOURADINA,
    label: "Polo 2",
    value: "DOURADINA",
  },
];

function UnitFilterChips({
  compact = false,
  onChange,
  value,
}: {
  compact?: boolean;
  onChange: (nextValue: UnitFilter) => void;
  value: UnitFilter;
}) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1",
        compact
          ? "flex-wrap overflow-visible"
          : "sm:flex-wrap sm:overflow-visible",
      )}
    >
      {unitFilterOptions.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-fit rounded-lg border px-3 py-2 text-left text-sm font-bold transition-all",
              compact ? "px-2.5 py-1.5 text-xs" : "",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
                : "border-primary/15 bg-white text-primary shadow-sm hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10",
            )}
          >
            <span className="block leading-4">{option.label}</span>
            <span
              className={cn(
                "mt-0.5 block text-[0.68rem] font-semibold leading-3",
                isActive ? "text-white/75" : "text-primary/58",
              )}
            >
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
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

function getPaymentTimelineLabel(row: FinanceMonthRow) {
  if (row.isPaid) {
    return row.paidAt ? `Pago em ${formatDate(row.paidAt)}` : "Pago sem data";
  }

  if (row.isOverdue) {
    return `Venceu dia ${row.paymentDay}`;
  }

  return `Vence dia ${row.paymentDay}`;
}

function getStatusClasses(status: FinanceStatus) {
  if (status === "paid") {
    return {
      accent: "bg-emerald-500",
      amount: "text-emerald-800",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-800 ring-emerald-200/80",
      card:
        "border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-white text-emerald-950",
      icon: "bg-emerald-600 text-white shadow-emerald-200",
      timeline:
        "border-emerald-200 bg-emerald-50 text-emerald-800 ring-emerald-100",
    };
  }

  if (status === "overdue") {
    return {
      accent: "bg-red-500",
      amount: "text-red-800",
      badge: "border-red-200 bg-red-50 text-red-800 ring-red-200/80",
      card:
        "border-red-200 bg-gradient-to-br from-red-50/90 via-white to-white text-red-950",
      icon: "bg-red-600 text-white shadow-red-200",
      timeline: "border-red-200 bg-red-50 text-red-800 ring-red-100",
    };
  }

  if (status === "inactive") {
    return {
      accent: "bg-slate-400",
      amount: "text-slate-700",
      badge: "border-slate-200 bg-slate-50 text-slate-600 ring-slate-200/80",
      card:
        "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-600",
      icon: "bg-slate-500 text-white shadow-slate-200",
      timeline: "border-slate-200 bg-slate-50 text-slate-600 ring-slate-100",
    };
  }

  return {
    accent: "bg-amber-500",
    amount: "text-primary",
    badge: "border-amber-200 bg-amber-50 text-amber-900 ring-amber-200/80",
    card:
      "border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-white text-primary",
    icon: "bg-amber-500 text-white shadow-amber-200",
    timeline: "border-amber-200 bg-amber-50 text-amber-900 ring-amber-100",
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
        unit: payment.snapshotUnit,
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
    unidade: formatFinancialUnitWithPolo(row.unit),
    valor: formatCurrency(row.amountCents),
  }));
}

function buildFinanceTableHtml(rows: FinanceMonthRow[], title: string) {
  const exportRows = buildExportRows(rows);
  const headings = [
    "Nome",
    "Polo",
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
        <td>${escapeHtml(row.unidade)}</td>
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
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold shadow-sm",
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
          "w-full justify-center border shadow-sm",
          isPaid
            ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
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
      unit: row.unit,
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
        <Field data-invalid={Boolean(form.formState.errors.unit)}>
          <FieldLabel htmlFor={`finance-edit-unit-${row.id}`}>
            Unidade
          </FieldLabel>
          <NativeSelect
            id={`finance-edit-unit-${row.id}`}
            aria-invalid={Boolean(form.formState.errors.unit)}
            disabled={isPending}
            {...form.register("unit")}
          >
            {FINANCIAL_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {formatFinancialUnitWithPolo(unit)}
              </option>
            ))}
          </NativeSelect>
          <FieldError errors={[form.formState.errors.unit]} />
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
  expenses,
  initialMonth,
  initialUnitFilter,
  logs,
  students,
}: AdminFinancePanelProps) {
  const router = useRouter();
  const initialPanelUnitFilter = normalizeInitialUnitFilter(initialUnitFilter);
  const initialFormUnit = getDefaultUnitForFilter(initialPanelUnitFilter);
  const [activeMonth, setActiveMonth] = useState(initialMonth);
  const [financeView, setFinanceView] = useState<FinanceView>("STUDENTS");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FinanceStatus>("ALL");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>(initialPanelUnitFilter);
  const [expenseUnitFilter, setExpenseUnitFilter] =
    useState<UnitFilter>(initialPanelUnitFilter);
  const [message, setMessage] = useState<string | null>(null);
  const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExpensePending, startExpenseTransition] = useTransition();
  const form = useForm<AdminFinanceStudentCreateInput>({
    resolver: zodResolver(adminFinanceStudentCreateSchema, undefined, {
      raw: true,
    }),
    defaultValues: createDefaultValues(initialMonth, initialFormUnit),
  });
  const expenseForm = useForm<AdminFinanceExpenseCreateInput>({
    resolver: zodResolver(adminFinanceExpenseCreateSchema, undefined, {
      raw: true,
    }),
    defaultValues: createExpenseDefaultValues(initialMonth, initialFormUnit),
  });

  const monthRows = useMemo(
    () => buildFinanceMonthRows(students, activeMonth),
    [activeMonth, students],
  );

  const unitMonthRows = useMemo(
    () =>
      monthRows.filter(
        (row) => unitFilter === "ALL" || row.unit === unitFilter,
      ),
    [monthRows, unitFilter],
  );

  const monthSummary = useMemo(
    () =>
      unitMonthRows.reduce(
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
            accumulator.overdue += row.amountCents;
            accumulator.overdueCount += 1;
          }

          return accumulator;
        },
        {
          overdue: 0,
          overdueCount: 0,
          paid: 0,
          paidCount: 0,
          pending: 0,
          pendingCount: 0,
          total: 0,
        },
      ),
    [unitMonthRows],
  );

  const monthCounts = useMemo(
    () =>
      months.reduce<Record<number, { all: number; overdue: number }>>(
        (accumulator, month) => {
          const rows = buildFinanceMonthRows(students, month.value).filter(
            (row) => unitFilter === "ALL" || row.unit === unitFilter,
          );

          accumulator[month.value] = {
            all: rows.length,
            overdue: rows.filter((row) => row.isOverdue).length,
          };

          return accumulator;
        },
        {},
      ),
    [students, unitFilter],
  );

  const monthExpenses = useMemo(
    () =>
      expenses
        .filter(
          (expense) => expense.year === 2026 && expense.month === activeMonth,
        )
        .sort(
          (left, right) =>
            new Date(right.purchasedAt).getTime() -
              new Date(left.purchasedAt).getTime() ||
            new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
        ),
    [activeMonth, expenses],
  );

  const visibleMonthExpenses = useMemo(
    () =>
      monthExpenses.filter(
        (expense) =>
          expenseUnitFilter === "ALL" || expense.unit === expenseUnitFilter,
      ),
    [expenseUnitFilter, monthExpenses],
  );

  const expenseSummary = useMemo(
    () =>
      visibleMonthExpenses.reduce(
        (accumulator, expense) => {
          accumulator.total += expense.amountCents;
          accumulator.count += 1;

          return accumulator;
        },
        {
          count: 0,
          total: 0,
        },
      ),
    [visibleMonthExpenses],
  );
  const averageExpenseAmount =
    expenseSummary.count > 0
      ? Math.round(expenseSummary.total / expenseSummary.count)
      : 0;
  const latestExpense = visibleMonthExpenses[0] ?? null;
  const expenseScopeLabel =
    expenseUnitFilter === "ALL"
      ? "todos os polos"
      : formatFinancialUnitWithPolo(expenseUnitFilter);
  const expenseBreakdownUnits =
    expenseUnitFilter === "ALL" ? FINANCIAL_UNITS : [expenseUnitFilter];
  const expenseUnitSummary = useMemo(() => {
    const summary = FINANCIAL_UNITS.reduce<
      Record<FinancialUnit, { count: number; total: number }>
    >(
      (accumulator, unit) => {
        accumulator[unit] = {
          count: 0,
          total: 0,
        };

        return accumulator;
      },
      {} as Record<FinancialUnit, { count: number; total: number }>,
    );

    monthExpenses.forEach((expense) => {
      summary[expense.unit].count += 1;
      summary[expense.unit].total += expense.amountCents;
    });

    return summary;
  }, [monthExpenses]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return unitMonthRows.filter((row) => {
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
  }, [searchTerm, statusFilter, unitMonthRows]);

  const selectedRow =
    filteredRows.find((row) => row.id === selectedStudentId) ??
    filteredRows[0] ??
    null;
  const selectedRowId = selectedRow?.id ?? null;

  function handleFinanceUnitFilterChange(nextUnit: UnitFilter) {
    setUnitFilter(nextUnit);
    setExpenseUnitFilter(nextUnit);
    setSelectedStudentId(null);

    form.setValue("unit", getDefaultUnitForFilter(nextUnit));
    expenseForm.setValue("unit", getDefaultUnitForFilter(nextUnit));

    const params = new URLSearchParams(window.location.search);
    params.set("unit", nextUnit === "ALL" ? "all" : nextUnit);
    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handleMonthChange(month: number) {
    setActiveMonth(month);
    setSelectedStudentId(null);
    form.setValue("month", month);
    expenseForm.setValue("month", month);
    expenseForm.setValue("purchasedAt", getDefaultExpenseDate(month));
    form.setValue("unit", unitFilter === "ALL" ? "IVATE" : unitFilter);
    expenseForm.setValue(
      "unit",
      expenseUnitFilter === "ALL" ? "IVATE" : expenseUnitFilter,
    );
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

      form.reset({
        ...createDefaultValues(activeMonth),
        unit: unitFilter === "ALL" ? "IVATE" : unitFilter,
      });
      setMessage(result.message);
      router.refresh();
    });
  });

  const activeMonthLabel = getMonthLabel(activeMonth);
  const collectionRate =
    monthSummary.total > 0 ? (monthSummary.paid / monthSummary.total) * 100 : 0;
  const visiblePendingAmount = monthSummary.pending - monthSummary.overdue;

  const onExpenseSubmit = expenseForm.handleSubmit((values) => {
    setExpenseMessage(null);

    startExpenseTransition(async () => {
      const result = await createFinancialExpense({
        ...values,
        month: activeMonth,
        year: 2026,
      });

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              expenseForm.setError(
                field as keyof AdminFinanceExpenseCreateInput,
                {
                  message: fieldMessage,
                },
              );
            }
          });
        }

        setExpenseMessage(result.message);
        return;
      }

      expenseForm.reset({
        ...createExpenseDefaultValues(activeMonth),
        unit: expenseUnitFilter === "ALL" ? "IVATE" : expenseUnitFilter,
      });
      setExpenseMessage(result.message);
      router.refresh();
    });
  });

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pr-20">
      <section className="overflow-hidden rounded-lg border border-primary/20 bg-white shadow-[0_22px_64px_rgba(65,42,76,0.11)] ring-1 ring-white/80">
        <div className="relative flex flex-col gap-4 overflow-hidden border-b border-primary/10 bg-gradient-to-r from-[#f8efff] via-white to-[#eaf8fb] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1d9bb6] via-[#74409a] to-[#ee6b8d]" />
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#70418a] text-primary-foreground shadow-[0_12px_28px_rgba(65,42,76,0.24)] ring-1 ring-white/70">
              <WalletCards aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary/60">
                {financeView === "STUDENTS"
                  ? "Financeiro simples"
                  : "Controle interno"}
              </span>
              <strong className="mt-1 block text-xl font-extrabold text-primary sm:text-2xl">
                {financeView === "STUDENTS"
                  ? `${activeMonthLabel} de 2026`
                  : `Pagamentos da loja - ${activeMonthLabel}`}
              </strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                {financeView === "STUDENTS"
                  ? "Lista manual de alunos pagantes, parcelas e status do mes."
                  : "Gastos, insumos e compras do mes, separados dos alunos."}
              </span>
            </span>
          </span>
          {financeView === "STUDENTS" ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[19rem]">
              <FinanceExportButtons
                activeMonth={activeMonth}
                activeMonthLabel={activeMonthLabel}
                rows={unitMonthRows}
              />
            </div>
          ) : (
            <span className="w-fit rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-bold uppercase text-primary shadow-sm">
              Separado dos alunos
            </span>
          )}
        </div>

        <div className="grid gap-3 border-b border-primary/10 bg-[#fcfaff] p-4 sm:p-5 md:grid-cols-2">
          {[
            {
              activeClass:
                "border-primary bg-gradient-to-br from-primary via-[#603574] to-[#7e4f96] text-white shadow-[0_18px_38px_rgba(65,42,76,0.2)]",
              description:
                "Mensalidades, parcelas, status, historico e cadastro financeiro.",
              detail: "Controle de alunos",
              eyebrow: "Entradas mensais",
              icon: UserRound,
              inactiveClass:
                "border-primary/15 bg-gradient-to-br from-[#f8efff] via-white to-white text-primary hover:border-primary/40",
              label: "Alunos",
              metric: `${unitMonthRows.length} aluno(s)`,
              value: "STUDENTS" as const,
            },
            {
              activeClass:
                "border-teal-700 bg-gradient-to-br from-[#0f6673] via-[#147f8c] to-[#36a7a6] text-white shadow-[0_18px_38px_rgba(15,102,115,0.2)]",
              description:
                "Insumos e compras internas salvos no mes selecionado.",
              detail: "Controle interno",
              eyebrow: "Saidas da loja",
              icon: ShoppingCart,
              inactiveClass:
                "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white text-primary hover:border-teal-400",
              label: "Pagamentos",
              metric: formatCurrency(expenseSummary.total),
              value: "EXPENSES" as const,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = financeView === item.value;

            return (
              <button
                key={item.value}
                aria-pressed={isActive}
                type="button"
                onClick={() => setFinanceView(item.value)}
                className={cn(
                  "group flex min-h-[9rem] min-w-0 flex-col items-start justify-between rounded-lg border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5",
                  isActive ? item.activeClass : item.inactiveClass,
                )}
              >
                <span className="flex w-full min-w-0 items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg",
                      isActive
                        ? "bg-white/15 text-white ring-1 ring-white/20"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-primary/[0.08] text-primary",
                    )}
                  >
                    {item.metric}
                  </span>
                </span>
                <span className="mt-4 block min-w-0">
                  <span
                    className={cn(
                      "mb-1.5 block text-[0.65rem] font-extrabold uppercase tracking-[0.12em]",
                      isActive ? "text-white/68" : "text-primary/52",
                    )}
                  >
                    {item.eyebrow}
                  </span>
                  <strong className="block text-lg leading-5">
                    {item.label}
                  </strong>
                  <span
                    className={cn(
                      "mt-1.5 block text-sm leading-5",
                      isActive ? "text-white/78" : "text-muted-foreground",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
                <span className="mt-4 flex w-full items-center justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                      isActive
                        ? "bg-white text-primary"
                        : "bg-white text-primary shadow-sm ring-1 ring-primary/10",
                    )}
                  >
                    {item.detail}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-b border-primary/10 bg-white p-4 sm:p-5">
          <div className="grid gap-4 rounded-lg border border-primary/12 bg-gradient-to-r from-[#f8efff] via-white to-[#eef9ff] p-3 shadow-sm xl:grid-cols-[minmax(0,1fr)_240px] xl:items-end">
            <div className="min-w-0">
              <span className="flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-primary/62">
                <Building2 aria-hidden="true" className="size-4" />
                Visao por polo
              </span>
              <UnitFilterChips
                value={unitFilter}
                onChange={handleFinanceUnitFilterChange}
              />
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary/60">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Exibindo {formatUnitFilterDisplay(unitFilter)}
              </p>
            </div>
            <div className="rounded-lg border border-primary/15 bg-white/90 p-3 shadow-sm">
              <span className="flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-primary/62">
                <CalendarDays aria-hidden="true" className="size-4" />
                Competencia
              </span>
              <NativeSelect
                value={activeMonth}
                onChange={(event) =>
                  handleMonthChange(Number(event.target.value))
                }
                className="mt-2 h-11 border-primary/20 bg-white font-bold text-primary shadow-sm focus:border-primary/50"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </div>

        {financeView === "STUDENTS" ? (
          <>
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
              <FinanceSummaryCard
                detail={`${unitMonthRows.length} aluno(s) ativo(s)`}
                icon={ReceiptText}
                label="Total previsto"
                tone="sky"
                value={formatCurrency(monthSummary.total)}
              />
              <FinanceSummaryCard
                detail={`${monthSummary.paidCount} pagamento(s) confirmado(s)`}
                icon={CheckCircle2}
                label="Recebido"
                tone="emerald"
                value={formatCurrency(monthSummary.paid)}
              />
              <FinanceSummaryCard
                detail={`${monthSummary.pendingCount} aluno(s) ainda em aberto`}
                icon={Clock3}
                label="A receber"
                tone="amber"
                value={formatCurrency(Math.max(visiblePendingAmount, 0))}
              />
              <FinanceSummaryCard
                detail={`${monthSummary.overdueCount} pagamento(s) vencido(s)`}
                icon={AlertTriangle}
                label="Atrasados"
                tone="rose"
                value={formatCurrency(monthSummary.overdue)}
              />
            </div>

            <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-primary/15 bg-gradient-to-r from-primary via-[#68407c] to-[#245f70] p-4 text-white shadow-[0_16px_34px_rgba(65,42,76,0.16)] sm:mx-5 sm:mb-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span className="inline-flex items-center gap-2">
                      <TrendingUp aria-hidden="true" className="size-4" />
                      Recebimento de {activeMonthLabel}
                    </span>
                    <span className="rounded-full bg-white/14 px-2.5 py-1 tabular-nums ring-1 ring-white/20">
                      {formatPercent(collectionRate)}
                    </span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/10">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 transition-[width] duration-500"
                      style={{ width: `${Math.min(collectionRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid gap-2 text-xs font-bold sm:grid-cols-3 lg:min-w-[29rem]">
                  <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <span className="block text-white/65">Recebido</span>
                    <span className="mt-0.5 block text-sm tabular-nums">
                      {formatCurrency(monthSummary.paid)}
                    </span>
                  </span>
                  <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <span className="block text-white/65">Em aberto</span>
                    <span className="mt-0.5 block text-sm tabular-nums">
                      {formatCurrency(Math.max(visiblePendingAmount, 0))}
                    </span>
                  </span>
                  <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <span className="block text-white/65">Escopo</span>
                    <span className="mt-0.5 block truncate text-sm">
                      {unitFilter === "ALL"
                        ? "Todos os polos"
                        : formatFinancialUnitPolo(unitFilter)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-primary/10 bg-[#fcfaff] p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-primary">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  Navegue pelos meses
                </span>
                <span className="rounded-full border border-primary/12 bg-white px-2.5 py-1 text-xs font-bold text-primary/65 shadow-sm">
                  {activeMonthLabel} selecionado
                </span>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 2xl:grid 2xl:grid-cols-12 2xl:overflow-visible 2xl:pb-0">
                {months.map((month) => {
                  const counts = monthCounts[month.value] ?? {
                    all: 0,
                    overdue: 0,
                  };

                  return (
                    <button
                      key={month.value}
                      type="button"
                      onClick={() => handleMonthChange(month.value)}
                      className={cn(
                        "min-h-[4.7rem] min-w-[5.2rem] flex-1 rounded-lg border px-2.5 py-2.5 text-sm font-semibold transition-all duration-200 2xl:min-w-0",
                        activeMonth === month.value
                          ? "border-primary bg-gradient-to-br from-primary to-[#714587] text-primary-foreground shadow-md shadow-primary/20"
                          : "border-primary/15 bg-white text-primary shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.06]",
                      )}
                    >
                      <span className="block">{month.shortLabel}</span>
                      <span className="mt-1 block whitespace-nowrap text-xs opacity-80">
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
          </>
        ) : null}
      </section>

      {financeView === "STUDENTS" ? (
        <>
      <form
        onSubmit={onSubmit}
        className="overflow-hidden rounded-lg border border-primary/20 bg-white shadow-[0_18px_46px_rgba(65,42,76,0.09)]"
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
        <FieldGroup className="gap-3 bg-gradient-to-br from-white via-[#fcfaff] to-[#f3fbfd] p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-[minmax(190px,1.35fr)_minmax(150px,0.85fr)_minmax(120px,0.65fr)_90px_minmax(150px,0.8fr)_110px_auto] xl:items-start">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="finance-student-name">Nome</FieldLabel>
              <Input
                id="finance-student-name"
                className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/55 focus-visible:ring-primary/15"
                aria-invalid={Boolean(form.formState.errors.name)}
                disabled={isPending}
                placeholder="Nome do aluno"
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.unit)}>
              <FieldLabel htmlFor="finance-unit">Unidade</FieldLabel>
              <NativeSelect
                id="finance-unit"
                className="h-11 border-primary/20 bg-white shadow-sm focus:border-primary/55"
                aria-invalid={Boolean(form.formState.errors.unit)}
                disabled={isPending}
                {...form.register("unit")}
              >
                {FINANCIAL_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {formatFinancialUnitWithPolo(unit)}
                  </option>
                ))}
              </NativeSelect>
              <FieldError errors={[form.formState.errors.unit]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.amount)}>
              <FieldLabel htmlFor="finance-amount">Valor mensal</FieldLabel>
              <Input
                id="finance-amount"
                className="h-11 border-primary/20 bg-white font-bold tabular-nums shadow-sm focus-visible:border-primary/55 focus-visible:ring-primary/15"
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
                className="h-11 border-primary/20 bg-white shadow-sm focus:border-primary/55"
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
                className="h-11 border-primary/20 bg-white shadow-sm focus:border-primary/55"
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
                className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-primary/55 focus-visible:ring-primary/15"
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
              className="h-11 shadow-md shadow-primary/15 lg:mt-6 lg:w-full xl:w-auto"
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

          <details className="group rounded-lg border border-primary/15 bg-gradient-to-r from-[#f8efff] via-white to-[#eaf8fb] p-3 shadow-sm">
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
        <div className="relative flex flex-col gap-4 overflow-hidden bg-gradient-to-r from-primary via-[#70418a] to-[#167b87] px-4 py-4 text-white sm:px-5 xl:flex-row xl:items-center xl:justify-between">
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
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px] xl:min-w-[32rem]">
              <label className="relative min-w-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/50"
              />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 border-white/45 bg-white pl-9 text-primary shadow-sm placeholder:text-primary/45 focus-visible:ring-white/60"
                placeholder="Buscar aluno ou telefone"
              />
            </label>
            <NativeSelect
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | FinanceStatus)
              }
              className="h-11 border-white/45 bg-white text-primary shadow-sm"
            >
              <option value="ALL">Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
              <option value="overdue">Atrasados</option>
            </NativeSelect>
          </div>
        </div>

        <div className="grid gap-4 bg-gradient-to-br from-[#fbf7ff] via-white to-[#eef9ff] p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.64fr)]">
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/12 bg-white/78 p-3 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="inline-flex items-center gap-1.5 text-primary">
                <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                Mostrando {filteredRows.length} de {unitMonthRows.length}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <StatusPill status="paid" />
                <StatusPill status="pending" />
                <StatusPill status="overdue" />
              </span>
            </div>

            {filteredRows.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-white/85 text-center shadow-sm">
                <CircleDollarSign aria-hidden="true" className="text-primary" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  Nenhum aluno financeiro encontrado para este filtro.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredRows.map((row) => {
                  const classes = getStatusClasses(row.status);
                  const isSelected = selectedRowId === row.id;

                  return (
                    <article
                      key={`${row.id}-${activeMonth}-${row.payment.updatedAt}`}
                      className={cn(
                        "group relative flex min-h-[17rem] min-w-0 flex-col overflow-hidden rounded-lg border p-4 pt-5 text-left shadow-[0_12px_28px_rgba(58,29,75,0.09)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(58,29,75,0.14)]",
                        classes.card,
                        isSelected
                          ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-[#fbf7ff]"
                          : "",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn("absolute inset-x-0 top-0 h-1", classes.accent)}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(row.id)}
                        className="flex w-full min-w-0 items-start justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={cn(
                              "flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold uppercase shadow-md",
                              classes.icon,
                            )}
                          >
                            {getFinanceInitials(row.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="line-clamp-2 block break-words text-base font-extrabold leading-5">
                              {row.name}
                            </strong>
                            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-75">
                              {row.phone ? (
                                <span className="min-w-0 truncate">
                                  {row.phone}
                                </span>
                              ) : null}
                              <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2 py-0.5 font-bold text-primary shadow-sm">
                                <MapPin
                                  aria-hidden="true"
                                  className="size-3 shrink-0"
                                />
                                {formatFinancialUnitWithPolo(row.unit)}
                              </span>
                            </span>
                          </span>
                        </span>
                        <StatusPill status={row.status} />
                      </button>

                      <span
                        className={cn(
                          "mt-3 inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ring-1",
                          classes.timeline,
                        )}
                      >
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        {getPaymentTimelineLabel(row)}
                      </span>

                      <div className="mt-3 rounded-lg border border-white/80 bg-white/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(65,42,76,0.06)] backdrop-blur-sm">
                        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] opacity-60">
                          Valor do mes
                        </span>
                        <span className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                          <strong
                            className={cn(
                              "min-w-0 text-[1.72rem] font-extrabold leading-none tabular-nums tracking-normal",
                              classes.amount,
                            )}
                          >
                            {formatCurrency(row.amountCents)}
                          </strong>
                          <span className="shrink-0 rounded-full border border-primary/10 bg-white px-2.5 py-1 text-xs font-bold text-primary shadow-sm">
                            Dia {row.paymentDay}
                          </span>
                        </span>
                      </div>

                      <span className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-primary/75">
                        <WalletCards
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate">
                          {formatPaymentMethod(row.paymentMethod)}
                        </span>
                        <span aria-hidden="true" className="opacity-45">
                          /
                        </span>
                        <span className="truncate">
                          {getInstallmentLabel(row.payment)}
                        </span>
                      </span>

                      <span className="mt-auto grid gap-2 pt-4">
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

          <aside className="min-w-0 rounded-lg border border-primary/15 bg-white shadow-[0_14px_34px_rgba(65,42,76,0.09)] xl:sticky xl:top-4 xl:self-start">
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
                      <MapPin
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                      {formatFinancialUnitShort(selectedRow.unit)}
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
                        key={`${selectedRow.id}-${activeMonth}-${selectedRow.payment.id}`}
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
                                <span className="rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-xs font-semibold">
                                  {formatFinancialUnitShort(payment.snapshotUnit)}
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

        <div className="grid gap-2 border-t border-primary/15 bg-gradient-to-r from-[#f6e6ff] via-white to-[#fce5d8]/70 px-4 py-3 text-sm font-bold text-primary sm:grid-cols-3">
          <span>Total mensal: {formatCurrency(monthSummary.total)}</span>
          <span>Recebido: {formatCurrency(monthSummary.paid)}</span>
          <span>Em aberto: {formatCurrency(monthSummary.pending)}</span>
        </div>
      </section>
        </>
      ) : (
        <section className="overflow-hidden rounded-lg border border-primary/20 bg-white shadow-[0_22px_60px_rgba(65,42,76,0.1)]">
          <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-r from-[#f5fbfc] via-white to-[#fff3f7] p-4 sm:p-5">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-sky-500 to-rose-400" />
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <ShoppingCart aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-lg text-primary">
                    Pagamentos da loja - {activeMonthLabel}
                  </strong>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Compras internas separadas por mes e unidade.
                  </span>
                </span>
              </span>
              <span className="w-fit rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-bold uppercase text-primary shadow-sm">
                Controle interno
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {FINANCIAL_UNITS.map((unit) => {
                const summary = expenseUnitSummary[unit];
                const tone = getFinancialUnitTone(unit);

                return (
                  <div
                    key={unit}
                    className={cn(
                      "grid min-w-0 gap-1 rounded-lg border px-4 py-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5",
                      tone.panel,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase text-current/70">
                      <span className={cn("size-2 rounded-full", tone.dot)} />
                      Total gasto {formatFinancialUnitWithPolo(unit)}
                    </span>
                    <span className="flex min-w-0 items-end justify-between gap-3">
                      <strong className="truncate text-lg leading-6 tabular-nums">
                        {formatCurrency(summary.total)}
                      </strong>
                      <span className="shrink-0 rounded-full bg-white/75 px-2 py-0.5 text-xs font-bold">
                        {summary.count} registro(s)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 p-4 xl:grid-cols-[minmax(240px,1.15fr)_minmax(0,2fr)]">
            <div className="rounded-lg border border-teal-700 bg-gradient-to-br from-[#0d5968] via-[#147b88] to-[#289a9b] p-4 text-white shadow-[0_16px_34px_rgba(15,102,115,0.2)]">
              <span className="flex items-center gap-2 text-sm font-bold text-white/82">
                <Banknote aria-hidden="true" className="size-4" />
                {expenseUnitFilter === "ALL"
                  ? "Total geral"
                  : `Total ${formatFinancialUnitPolo(expenseUnitFilter)}`}
              </span>
              <strong className="mt-3 block text-3xl font-extrabold leading-none tabular-nums tracking-normal">
                {formatCurrency(expenseSummary.total)}
              </strong>
              <span className="mt-2 block text-sm font-semibold text-white/74">
                {expenseSummary.count} compra(s) em {expenseScopeLabel}
              </span>
              <div className="mt-4 grid gap-2 text-xs font-bold sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {expenseBreakdownUnits.map((unit) => {
                  const summary = expenseUnitSummary[unit];

                  return (
                    <span
                      key={unit}
                      className="min-w-0 rounded-lg bg-white/12 px-2.5 py-2 ring-1 ring-white/15"
                    >
                      <span className="block truncate text-white/70">
                        {formatFinancialUnitWithPolo(unit)}
                      </span>
                      <span className="mt-1 block truncate tabular-nums text-white">
                        {formatCurrency(summary.total)}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-primary/15 bg-gradient-to-br from-[#f8efff] via-white to-[#eef9ff] p-4 shadow-sm">
                <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <ShoppingCart aria-hidden="true" className="size-4" />
                  Registros
                </span>
                <strong className="mt-2 block text-2xl font-semibold tabular-nums text-primary">
                  {expenseSummary.count}
                </strong>
                <span className="mt-1 block text-xs text-primary/65">
                  compra(s) no filtro
                </span>
              </div>
              <div className="rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/75 p-4 shadow-sm">
                <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <CircleDollarSign aria-hidden="true" className="size-4" />
                  Media
                </span>
                <strong className="mt-2 block text-2xl font-semibold tabular-nums text-sky-800">
                  {formatCurrency(averageExpenseAmount)}
                </strong>
                <span className="mt-1 block text-xs text-primary/65">
                  por compra
                </span>
              </div>
              <div className="rounded-lg border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-white p-4 shadow-sm">
                <span className="flex items-center gap-2 text-sm font-semibold text-primary/80">
                  <MapPin aria-hidden="true" className="size-4" />
                  Polo
                </span>
                <div className="mt-2">
                  <UnitFilterChips
                    compact
                    value={expenseUnitFilter}
                    onChange={handleFinanceUnitFilterChange}
                  />
                </div>
                <span className="mt-2 block text-xs text-primary/60">
                  {expenseScopeLabel}
                </span>
              </div>
              <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-sm">
                <span className="flex items-center gap-2 text-sm font-semibold text-primary/80">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  Mes
                </span>
                <NativeSelect
                  value={activeMonth}
                  onChange={(event) =>
                    handleMonthChange(Number(event.target.value))
                  }
                  className="mt-2"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </NativeSelect>
                <span className="mt-2 block text-xs text-primary/60">
                  Ultimo:{" "}
                  {latestExpense ? formatDate(latestExpense.purchasedAt) : "sem registro"}
                </span>
              </div>
            </div>
          </div>

          <form
            onSubmit={onExpenseSubmit}
            className="mx-4 mb-4 overflow-hidden rounded-lg border border-primary/15 bg-white shadow-[0_14px_34px_rgba(65,42,76,0.09)] sm:mx-5 sm:mb-5"
            noValidate
          >
            <div className="flex flex-col gap-3 border-b border-primary/10 bg-gradient-to-r from-white via-[#fff7fb] to-[#eef9ff] p-4 xl:flex-row xl:items-center xl:justify-between">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
                  <Plus aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-base text-primary">
                    Novo pagamento interno
                  </strong>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Registre uma compra sem misturar com mensalidades.
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-primary">
                <span className="rounded-full border border-primary/15 bg-white px-2.5 py-1">
                  {activeMonthLabel}
                </span>
                <span className="rounded-full border border-primary/15 bg-white px-2.5 py-1">
                  {expenseScopeLabel}
                </span>
              </span>
            </div>
            <FieldGroup className="gap-4 bg-gradient-to-br from-[#f5fbfc] via-white to-[#fff7fa] p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-[minmax(190px,1.25fr)_minmax(110px,0.56fr)_145px_150px_minmax(170px,0.9fr)_auto] xl:items-start">
                <Field
                  data-invalid={Boolean(expenseForm.formState.errors.itemName)}
                >
                  <FieldLabel htmlFor="finance-expense-item">
                    Insumos
                  </FieldLabel>
                  <Input
                    id="finance-expense-item"
                    className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-teal-600 focus-visible:ring-teal-100"
                    aria-invalid={Boolean(
                      expenseForm.formState.errors.itemName,
                    )}
                    disabled={isExpensePending}
                    placeholder="Ex: Garrafa de agua"
                    {...expenseForm.register("itemName")}
                  />
                  <FieldError
                    errors={[expenseForm.formState.errors.itemName]}
                  />
                </Field>
                <Field
                  data-invalid={Boolean(expenseForm.formState.errors.amount)}
                >
                  <FieldLabel htmlFor="finance-expense-amount">Valor</FieldLabel>
                  <Input
                    id="finance-expense-amount"
                    className="h-11 border-primary/20 bg-white font-bold tabular-nums shadow-sm focus-visible:border-teal-600 focus-visible:ring-teal-100"
                    inputMode="decimal"
                    aria-invalid={Boolean(expenseForm.formState.errors.amount)}
                    disabled={isExpensePending}
                    placeholder="0,00"
                    {...expenseForm.register("amount")}
                  />
                  <FieldError errors={[expenseForm.formState.errors.amount]} />
                </Field>
                <Field
                  data-invalid={Boolean(expenseForm.formState.errors.purchasedAt)}
                >
                  <FieldLabel htmlFor="finance-expense-date">Data</FieldLabel>
                  <Input
                    id="finance-expense-date"
                    className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-teal-600 focus-visible:ring-teal-100"
                    type="date"
                    aria-invalid={Boolean(
                      expenseForm.formState.errors.purchasedAt,
                    )}
                    disabled={isExpensePending}
                    {...expenseForm.register("purchasedAt")}
                  />
                  <FieldError
                    errors={[expenseForm.formState.errors.purchasedAt]}
                  />
                </Field>
                <Field data-invalid={Boolean(expenseForm.formState.errors.unit)}>
                  <FieldLabel htmlFor="finance-expense-unit">
                    Unidade
                  </FieldLabel>
                  <NativeSelect
                    id="finance-expense-unit"
                    className="h-11 border-primary/20 bg-white shadow-sm focus:border-teal-600"
                    aria-invalid={Boolean(expenseForm.formState.errors.unit)}
                    disabled={isExpensePending}
                    {...expenseForm.register("unit")}
                  >
                    {FINANCIAL_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {formatFinancialUnitWithPolo(unit)}
                      </option>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[expenseForm.formState.errors.unit]} />
                </Field>
                <Field
                  data-invalid={Boolean(expenseForm.formState.errors.actorName)}
                >
                  <FieldLabel htmlFor="finance-expense-actor">
                    Quem fez
                  </FieldLabel>
                  <Input
                    id="finance-expense-actor"
                    className="h-11 border-primary/20 bg-white shadow-sm focus-visible:border-teal-600 focus-visible:ring-teal-100"
                    aria-invalid={Boolean(
                      expenseForm.formState.errors.actorName,
                    )}
                    disabled={isExpensePending}
                    placeholder="Nome da pessoa"
                    {...expenseForm.register("actorName")}
                  />
                  <FieldError
                    errors={[expenseForm.formState.errors.actorName]}
                  />
                </Field>
                <Button
                  type="submit"
                  className="h-11 bg-teal-700 text-white shadow-md shadow-teal-700/15 hover:bg-teal-800 lg:mt-6 xl:w-full"
                  disabled={isExpensePending}
                >
                  {isExpensePending ? (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Save data-icon="inline-start" />
                  )}
                  Salvar
                </Button>
              </div>
              <details className="group rounded-lg border border-primary/12 bg-white px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-primary [&::-webkit-details-marker]:hidden">
                  <span>Observacao opcional</span>
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <Field
                  className="mt-3"
                  data-invalid={Boolean(expenseForm.formState.errors.note)}
                >
                  <FieldLabel htmlFor="finance-expense-note">
                    Detalhe rapido
                  </FieldLabel>
                  <Textarea
                    id="finance-expense-note"
                    aria-invalid={Boolean(expenseForm.formState.errors.note)}
                    className="min-h-16 resize-y"
                    disabled={isExpensePending}
                    placeholder="Ex: comprado para a unidade, evento ou reposicao."
                    {...expenseForm.register("note")}
                  />
                  <FieldError errors={[expenseForm.formState.errors.note]} />
                </Field>
              </details>
            </FieldGroup>
            {expenseMessage ? (
              <p
                className="mx-4 mb-4 rounded-lg border bg-white px-4 py-3 text-sm text-muted-foreground"
                role="status"
              >
                {expenseMessage}
              </p>
            ) : null}
          </form>

          <div className="border-t border-primary/10 bg-[#fbf7ff] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong className="block text-lg text-primary">
                  Compras salvas em {activeMonthLabel}
                </strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Historico mensal de insumos e pagamentos da loja.
                </span>
              </span>
              <span className="rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-bold text-primary">
                {visibleMonthExpenses.length} registro(s)
              </span>
            </div>
            {visibleMonthExpenses.length === 0 ? (
              <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/20 bg-white p-4 text-center">
                <ShoppingCart aria-hidden="true" className="size-5 text-primary" />
                <strong className="text-primary">
                  Nenhum gasto em {activeMonthLabel}
                </strong>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {expenseUnitFilter === "ALL"
                    ? "Use o formulario acima para salvar a primeira compra interna do mes."
                    : `Ainda nao ha compra registrada em ${formatFinancialUnitWithPolo(expenseUnitFilter)} neste mes.`}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-lg border border-primary/15 bg-white shadow-sm xl:block">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-[#fbf7ff] text-xs font-bold uppercase text-primary/70">
                      <tr>
                        <th className="px-3 py-2">Insumo</th>
                        <th className="px-3 py-2">Polo</th>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Quem fez</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {visibleMonthExpenses.map((expense) => {
                        const tone = getFinancialUnitTone(expense.unit);

                        return (
                          <tr
                            key={expense.id}
                            className="align-top transition-colors hover:bg-[#fbf7ff]"
                          >
                            <td className="min-w-0 px-3 py-3">
                              <strong className="block break-words text-primary">
                                {expense.itemName}
                              </strong>
                              {expense.note ? (
                                <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                                  {expense.note}
                                </span>
                              ) : (
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Sem observacao
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
                                  tone.badge,
                                )}
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn("size-2 rounded-full", tone.dot)}
                                />
                                {formatFinancialUnitWithPolo(expense.unit)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                              {formatDate(expense.purchasedAt)}
                            </td>
                            <td className="max-w-44 px-3 py-3 text-muted-foreground">
                              <span className="block truncate">
                                {expense.actorName}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold tabular-nums text-red-700">
                              {formatCurrency(expense.amountCents)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:hidden">
                  {visibleMonthExpenses.map((expense) => {
                    const tone = getFinancialUnitTone(expense.unit);

                    return (
                      <article
                        key={expense.id}
                        className="relative overflow-hidden rounded-lg border border-primary/15 bg-white p-3 pt-4 shadow-[0_10px_24px_rgba(58,29,75,0.08)]"
                      >
                        <span
                          aria-hidden="true"
                          className={cn("absolute inset-x-0 top-0 h-1", tone.stripe)}
                        />
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary/55">
                              Insumo
                            </span>
                            <strong className="mt-1 block break-words text-base leading-5 text-primary">
                              {expense.itemName}
                            </strong>
                          </span>
                          <span className="shrink-0 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-bold tabular-nums text-red-800">
                            {formatCurrency(expense.amountCents)}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                          <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-primary/10 bg-[#fbf7ff] px-2.5 py-2">
                            <CalendarDays
                              aria-hidden="true"
                              className="size-4 shrink-0 text-primary"
                            />
                            {formatDate(expense.purchasedAt)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2",
                              tone.badge,
                            )}
                          >
                            <MapPin
                              aria-hidden="true"
                              className="size-4 shrink-0"
                            />
                            <span className="truncate">
                              {formatFinancialUnitWithPolo(expense.unit)}
                            </span>
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-primary/10 bg-white px-2.5 py-2">
                            <UserRound
                              aria-hidden="true"
                              className="size-4 shrink-0 text-primary"
                            />
                            <span className="truncate">{expense.actorName}</span>
                          </span>
                        </div>
                        {expense.note ? (
                          <p className="mt-3 line-clamp-2 rounded-lg border border-primary/10 bg-[#fbf7ff] px-2.5 py-2 text-sm text-primary/75">
                            {expense.note}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

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
