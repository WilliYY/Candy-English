"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  Plus,
  Save,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  createFinancialEntry,
  toggleFinancialEntryStatus,
  updateFinancialEntryDetails,
} from "@/app/ava/admin/actions";
import {
  adminFinanceEntrySchema,
  adminFinanceEntryUpdateSchema,
  type AdminFinanceEntryInput,
  type AdminFinanceEntryUpdateInput,
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

export type AdminFinanceEntryRow = {
  amountCents: number;
  id: string;
  isPaid: boolean;
  month: number;
  note: string | null;
  paidAt: string | null;
  payerName: string;
  paymentDay: number;
  year: number;
};

type AdminFinancePanelProps = {
  entries: AdminFinanceEntryRow[];
  initialMonth: number;
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

const createDefaultValues = (month: number): AdminFinanceEntryInput => ({
  amount: "",
  month,
  note: "",
  paidAt: "",
  payerName: "",
  paymentDay: 1,
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function toInputDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function FinanceStatusButton({ entry }: { entry: AdminFinanceEntryRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await toggleFinancialEntryStatus({
        entryId: entry.id,
        isPaid: !entry.isPaid,
      });

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
        Status
      </span>
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        className={cn(
          "w-full justify-center border text-white shadow-sm",
          entry.isPaid
            ? "border-emerald-700 bg-emerald-600 hover:bg-emerald-700"
            : "border-red-700 bg-red-600 hover:bg-red-700",
        )}
      >
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : entry.isPaid ? (
          <CheckCircle2 data-icon="inline-start" />
        ) : (
          <XCircle data-icon="inline-start" />
        )}
        {entry.isPaid ? "Pago" : "Pendente"}
      </Button>
      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {message}
        </span>
      ) : null}
    </div>
  );
}

function FinanceEntryDetailsForm({ entry }: { entry: AdminFinanceEntryRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminFinanceEntryUpdateInput>({
    resolver: zodResolver(adminFinanceEntryUpdateSchema, undefined, {
      raw: true,
    }),
    defaultValues: {
      entryId: entry.id,
      note: entry.note ?? "",
      paidAt: toInputDate(entry.paidAt),
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateFinancialEntryDetails(values);

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminFinanceEntryUpdateInput, {
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
    <form className="contents" onSubmit={onSubmit} noValidate>
      <input type="hidden" {...form.register("entryId")} />
      <div className="flex min-w-0 flex-col gap-2">
        <Field data-invalid={Boolean(form.formState.errors.paidAt)}>
          <FieldLabel htmlFor={`finance-paid-at-${entry.id}`}>
            Data paga
          </FieldLabel>
          <Input
            id={`finance-paid-at-${entry.id}`}
            type="date"
            aria-invalid={Boolean(form.formState.errors.paidAt)}
            disabled={isPending}
            {...form.register("paidAt")}
          />
          <span className="text-xs text-muted-foreground">
            {formatDate(entry.paidAt)}
          </span>
          <FieldError errors={[form.formState.errors.paidAt]} />
        </Field>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <Field data-invalid={Boolean(form.formState.errors.note)}>
          <FieldLabel htmlFor={`finance-note-${entry.id}`}>
            Observacao
          </FieldLabel>
          <Textarea
            id={`finance-note-${entry.id}`}
            aria-invalid={Boolean(form.formState.errors.note)}
            className="min-h-20 resize-y"
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
            Salvar
          </Button>
          {message ? (
            <span className="text-xs leading-5 text-muted-foreground">
              {message}
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export function AdminFinancePanel({
  entries,
  initialMonth,
}: AdminFinancePanelProps) {
  const router = useRouter();
  const [activeMonth, setActiveMonth] = useState(initialMonth);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AdminFinanceEntryInput>({
    resolver: zodResolver(adminFinanceEntrySchema, undefined, { raw: true }),
    defaultValues: createDefaultValues(initialMonth),
  });

  const monthEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.year === 2026 && entry.month === activeMonth)
        .sort((left, right) => {
          if (left.paymentDay !== right.paymentDay) {
            return left.paymentDay - right.paymentDay;
          }

          return left.payerName.localeCompare(right.payerName, "pt-BR");
        }),
    [activeMonth, entries],
  );

  const monthSummary = useMemo(
    () =>
      monthEntries.reduce(
        (accumulator, entry) => {
          accumulator.total += entry.amountCents;

          if (entry.isPaid) {
            accumulator.paid += entry.amountCents;
          } else {
            accumulator.pending += entry.amountCents;
          }

          return accumulator;
        },
        {
          paid: 0,
          pending: 0,
          total: 0,
        },
      ),
    [monthEntries],
  );

  const entryCounts = useMemo(
    () =>
      months.reduce<Record<number, number>>((accumulator, month) => {
        accumulator[month.value] = entries.filter(
          (entry) => entry.year === 2026 && entry.month === month.value,
        ).length;

        return accumulator;
      }, {}),
    [entries],
  );

  function handleMonthChange(month: number) {
    setActiveMonth(month);
    form.setValue("month", month);
  }

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);

    startTransition(async () => {
      const result = await createFinancialEntry({
        ...values,
        month: activeMonth,
      });

      if (!result.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, fieldMessage]) => {
            if (fieldMessage) {
              form.setError(field as keyof AdminFinanceEntryInput, {
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
    <div className="flex flex-col gap-6 pb-28 lg:pr-24 xl:pr-20">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="ava-stat-card rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">Ano</span>
          <strong className="mt-1 block text-3xl font-semibold">2026</strong>
        </div>
        <div className="ava-stat-card rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">Mes</span>
          <strong className="mt-1 block text-2xl font-semibold">
            {activeMonthLabel}
          </strong>
        </div>
        <div className="ava-stat-card rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">Pago</span>
          <strong className="mt-1 block text-2xl font-semibold text-emerald-700">
            {formatCurrency(monthSummary.paid)}
          </strong>
        </div>
        <div className="ava-stat-card rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">Pendente</span>
          <strong className="mt-1 block text-2xl font-semibold text-red-700">
            {formatCurrency(monthSummary.pending)}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12">
        {months.map((month) => (
          <button
            key={month.value}
            type="button"
            onClick={() => handleMonthChange(month.value)}
            className={cn(
              "rounded-lg border px-3 py-3 text-sm font-semibold transition-all",
              activeMonth === month.value
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/15"
                : "border-primary/15 bg-white/70 text-primary hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10",
            )}
          >
            <span className="block">{month.shortLabel}</span>
            <span className="mt-1 block text-xs opacity-80">
              {entryCounts[month.value] ?? 0} linha(s)
            </span>
          </button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="ava-soft-card rounded-lg border p-4"
        noValidate
      >
        <FieldGroup className="gap-4">
          <div className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-[minmax(180px,1.3fr)_minmax(120px,0.7fr)_minmax(100px,0.55fr)_minmax(150px,0.75fr)_minmax(220px,1.2fr)_auto] 2xl:items-start">
            <Field data-invalid={Boolean(form.formState.errors.payerName)}>
              <FieldLabel htmlFor="finance-payer-name">Nome</FieldLabel>
              <Input
                id="finance-payer-name"
                aria-invalid={Boolean(form.formState.errors.payerName)}
                disabled={isPending}
                placeholder="Nome"
                {...form.register("payerName")}
              />
              <FieldError errors={[form.formState.errors.payerName]} />
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

            <Field data-invalid={Boolean(form.formState.errors.note)}>
              <FieldLabel htmlFor="finance-note">Observacao</FieldLabel>
              <Textarea
                id="finance-note"
                aria-invalid={Boolean(form.formState.errors.note)}
                className="min-h-11 py-2"
                disabled={isPending}
                placeholder="Observacao"
                {...form.register("note")}
              />
              <FieldError errors={[form.formState.errors.note]} />
            </Field>

            <Button
              type="submit"
              className="lg:mt-6 lg:w-full 2xl:w-auto"
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
        <div className="hidden rounded-lg border border-primary/15 bg-primary/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-primary lg:grid lg:grid-cols-[minmax(150px,1.2fr)_minmax(96px,0.65fr)_minmax(64px,0.4fr)_minmax(120px,0.75fr)_minmax(140px,0.8fr)_minmax(180px,1fr)] lg:gap-4">
          <span>Nome</span>
          <span>Valor</span>
          <span>Dia</span>
          <span>Status</span>
          <span>Data paga</span>
          <span>Observacao</span>
        </div>

        {monthEntries.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/5 text-center">
            <CircleDollarSign aria-hidden="true" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Nenhuma linha financeira neste mes.
            </p>
          </div>
        ) : (
          monthEntries.map((entry) => (
            <article
              key={entry.id}
              className="ava-soft-card rounded-lg border p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(150px,1.2fr)_minmax(96px,0.65fr)_minmax(64px,0.4fr)_minmax(120px,0.75fr)_minmax(140px,0.8fr)_minmax(180px,1fr)] lg:items-start">
                <div className="min-w-0 break-words">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                    Nome
                  </span>
                  <strong className="mt-1 block text-base">
                    {entry.payerName}
                  </strong>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                    Valor
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-semibold">
                    <CircleDollarSign
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    {formatCurrency(entry.amountCents)}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                    Dia
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-semibold">
                    <CalendarDays
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                    {entry.paymentDay}
                  </span>
                </div>

                <FinanceStatusButton entry={entry} />
                <FinanceEntryDetailsForm entry={entry} />
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
