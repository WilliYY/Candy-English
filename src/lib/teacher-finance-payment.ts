export class TeacherPaymentRuleError extends Error {}

export function canRecordTeacherPayment(actor: {
  role: string; isActive: boolean; deletedAt: Date | null;
} | null | undefined) {
  return Boolean(actor?.isActive && !actor.deletedAt &&
    (actor.role === "ADMIN" || actor.role === "TEACHER"));
}

export function validateTeacherPaymentChange(
  input: { expectedUpdatedAt: string; isPaid: boolean },
  current: { isActive: boolean; isPaid: boolean; updatedAt: Date },
) {
  if (!current.isActive || current.isPaid === input.isPaid ||
      current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
    throw new TeacherPaymentRuleError("O pagamento mudou ou não está disponível. Atualize a tela antes de confirmar.");
  }
}

export type TeacherProductPaymentRow = {
  id: string;
  buyerUserId: string;
  name: string;
  role: string;
  unit: "IVATE" | "DOURADINA";
  paidAt: string | null;
  updatedAt: string;
  createdAt: string;
  items: { name: string; quantity: number }[];
};

export function projectTeacherProductPayment(sale: {
  id: string; buyerUserId: string | null; buyerNameSnapshot: string; buyerUser: { role: string } | null;
  unit: "IVATE" | "DOURADINA"; paidAt: Date | null; updatedAt: Date; createdAt: Date;
  items: { productNameSnapshot: string; quantity: number }[];
}): TeacherProductPaymentRow {
  return {
    id: sale.id, buyerUserId: sale.buyerUserId ?? "", name: sale.buyerNameSnapshot, role: sale.buyerUser?.role ?? "STUDENT",
    unit: sale.unit, paidAt: sale.paidAt?.toISOString() ?? null,
    updatedAt: sale.updatedAt.toISOString(), createdAt: sale.createdAt.toISOString(),
    items: sale.items.map((item) => ({ name: item.productNameSnapshot, quantity: item.quantity })),
  };
}

export function groupTeacherProductPayments(rows: TeacherProductPaymentRow[]) {
  const groups = new Map<string, {
    id: string; name: string; role: string; units: TeacherProductPaymentRow["unit"][];
    pendingSales: { id: string; updatedAt: string }[];
    paidSales: { id: string; updatedAt: string }[];
    items: { name: string; quantity: number; isPaid: boolean }[];
  }>();
  for (const row of rows) {
    if (!row.buyerUserId) continue;
    const group = groups.get(row.buyerUserId) ?? {
      id: row.buyerUserId, name: row.name, role: row.role, units: [], pendingSales: [], paidSales: [], items: [],
    };
    (row.paidAt ? group.paidSales : group.pendingSales).push({ id: row.id, updatedAt: row.updatedAt });
    if (!group.units.includes(row.unit)) group.units.push(row.unit);
    group.items.push(...row.items.map((item) => ({ ...item, isPaid: Boolean(row.paidAt) })));
    groups.set(row.buyerUserId, group);
  }
  return [...groups.values()];
}
