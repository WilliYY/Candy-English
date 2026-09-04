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

export function getSaoPauloDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  return `${year}-${month}-${day}`;
}

export function parseSaleInvoiceDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { date, day, month, year };
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

export function getSaleProductAvailability(
  product: { isActive: boolean; stockQuantity: number },
  quantityInCart: number,
) {
  if (!product.isActive) return "INACTIVE" as const;
  if (product.stockQuantity < 1) return "OUT_OF_STOCK" as const;
  if (quantityInCart >= product.stockQuantity) return "LIMIT_REACHED" as const;
  return "AVAILABLE" as const;
}

export function getStudentInvoiceDestination(
  financialStudentId: string | null | undefined,
  payment:
    | { id: string; isActive: boolean; isPaid: boolean }
    | null
    | undefined,
) {
  if (financialStudentId && payment?.id && isMonthlyInvoiceOpen(payment)) {
    return {
      financialPaymentId: payment.id,
      financialStudentId,
      kind: "MONTHLY_PAYMENT" as const,
    };
  }

  return {
    financialPaymentId: null,
    financialStudentId: financialStudentId ?? null,
    kind: "PRODUCT_ONLY" as const,
  };
}
