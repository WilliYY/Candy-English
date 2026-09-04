export type StaffInvoiceUnit = "IVATE" | "DOURADINA";

export type StaffInvoiceSale = {
  buyerEmail: string;
  buyerName: string;
  buyerRole: "STUDENT" | "TEACHER";
  buyerUserId: string;
  createdAt: string;
  invoiceDueDate: string | null;
  invoiceMonth: number;
  invoiceYear: number;
  items: {
    id: string;
    lineTotalCents: number;
    productNameSnapshot: string;
    quantity: number;
    unitSalePriceCents: number;
  }[];
  paidAt: string | null;
  saleId: string;
  totalCents: number;
  unit: StaffInvoiceUnit;
};

export type StaffInvoiceItem = StaffInvoiceSale["items"][number] & {
  category: "CANDY";
  paidAt: string | null;
  saleId: string;
};

export type StaffInvoiceSummary = {
  buyerEmail: string;
  buyerName: string;
  buyerRole: "STUDENT" | "TEACHER";
  buyerUserId: string;
  dueDate: string | null;
  items: StaffInvoiceItem[];
  paidSaleIds: string[];
  paidTotalCents: number;
  pendingSaleIds: string[];
  pendingTotalCents: number;
  totalCents: number;
  units: StaffInvoiceUnit[];
};

export function groupStaffInvoices(
  sales: StaffInvoiceSale[],
  year: number,
  month: number,
): StaffInvoiceSummary[] {
  const grouped = new Map<string, StaffInvoiceSummary>();

  for (const sale of sales) {
    if (sale.invoiceYear !== year || sale.invoiceMonth !== month) {
      continue;
    }

    const current = grouped.get(sale.buyerUserId) ?? {
      buyerEmail: sale.buyerEmail,
      buyerName: sale.buyerName,
      buyerRole: sale.buyerRole,
      buyerUserId: sale.buyerUserId,
      dueDate: null,
      items: [],
      paidSaleIds: [],
      paidTotalCents: 0,
      pendingSaleIds: [],
      pendingTotalCents: 0,
      totalCents: 0,
      units: [],
    };

    current.totalCents += sale.totalCents;
    current.items.push(
      ...sale.items.map((item) => ({
        ...item,
        category: "CANDY" as const,
        paidAt: sale.paidAt,
        saleId: sale.saleId,
      })),
    );

    if (sale.paidAt) {
      current.paidSaleIds.push(sale.saleId);
      current.paidTotalCents += sale.totalCents;
    } else {
      current.pendingSaleIds.push(sale.saleId);
      current.pendingTotalCents += sale.totalCents;
    }

    if (!current.units.includes(sale.unit)) {
      current.units.push(sale.unit);
    }

    if (
      sale.invoiceDueDate &&
      (!current.dueDate || sale.invoiceDueDate < current.dueDate)
    ) {
      current.dueDate = sale.invoiceDueDate;
    }

    grouped.set(sale.buyerUserId, current);
  }

  return [...grouped.values()].sort((left, right) => {
    const pendingOrder = Number(right.pendingTotalCents > 0) - Number(left.pendingTotalCents > 0);
    return pendingOrder || left.buyerName.localeCompare(right.buyerName, "pt-BR");
  });
}
