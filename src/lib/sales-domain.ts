const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const POSTGRES_INTEGER_MAX = 2_147_483_647;

type SaleTotalItem = {
  quantity: number;
  unitCostCents: number;
  unitSalePriceCents: number;
};

export function normalizeSaleProductName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function getSaoPauloYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const year = Number(parts.find((part) => part.type === "year")?.value);

  return { month, year };
}

export function calculateSaleTotals(items: SaleTotalItem[]) {
  return items.reduce(
    (totals, item) => ({
      costTotalCents:
        totals.costTotalCents + item.unitCostCents * item.quantity,
      totalCents:
        totals.totalCents + item.unitSalePriceCents * item.quantity,
    }),
    { costTotalCents: 0, totalCents: 0 },
  );
}

export function areSaleAmountsDatabaseSafe(items: SaleTotalItem[]) {
  const totals = calculateSaleTotals(items);
  const amounts = items.flatMap((item) => [
    item.unitCostCents * item.quantity,
    item.unitSalePriceCents * item.quantity,
  ]);

  return [...amounts, totals.costTotalCents, totals.totalCents].every(
    (amount) => Number.isSafeInteger(amount) && amount <= POSTGRES_INTEGER_MAX,
  );
}

export function isMonthlyInvoiceOpen(
  payment: { isActive: boolean; isPaid: boolean } | null | undefined,
) {
  return Boolean(payment?.isActive && !payment.isPaid);
}
