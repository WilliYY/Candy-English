import type { Metadata } from "next";
import { AvaWorkspaceShell } from "@/components/ava/ava-workspace-shell";
import { SalesPosPanel } from "@/components/ava/sales-pos-panel";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";
import { getStaffStudentSelectionWhere } from "@/lib/staff-student-access";
import {
  getSaoPauloDateKey,
  getSaoPauloYearMonth,
  getNextSaleInvoicePeriod,
  getSaleInvoiceDateForPeriod,
  planStudentSaleInvoice,
} from "@/lib/sales-domain";

export const metadata: Metadata = {
  title: "Vendas",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SalesPage() {
  const session = await requireAvaRole(["ADMIN", "TEACHER"], "/ava/vendas");
  const prisma = getPrisma();
  const period = getSaoPauloYearMonth();
  const nextPeriod = getNextSaleInvoicePeriod(period);
  const [products, students, teachers, recentSales] = await Promise.all([
    prisma.saleProduct.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        costCents: true,
        id: true,
        imagePath: true,
        isActive: true,
        name: true,
        salePriceCents: true,
        stockQuantity: true,
        updatedAt: true,
      },
    }),
    prisma.studentProfile.findMany({
      where: getStaffStudentSelectionWhere(),
      orderBy: { user: { name: "asc" } },
      select: {
        financialStudent: {
          select: {
            id: true,
            payments: {
              where: {
                OR: [period, nextPeriod],
              },
              select: { id: true, month: true, year: true, isActive: true, isPaid: true, snapshotPaymentDay: true },
            },
          },
        },
        id: true,
        unit: true,
        user: {
          select: { email: true, name: true },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: "TEACHER",
      },
      orderBy: { name: "asc" },
      select: { email: true, id: true, name: true },
    }),
    prisma.sale.findMany({
      where:
        session.user.role === "ADMIN"
          ? {}
          : { soldByUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        buyerNameSnapshot: true,
        canceledAt: true,
        cancelReason: true,
        costTotalCents: true,
        createdAt: true,
        id: true,
        invoiceMonth: true,
        invoiceDueDate: true,
        invoiceYear: true,
        items: {
          select: {
            id: true,
            lineTotalCents: true,
            productNameSnapshot: true,
            quantity: true,
            unitSalePriceCents: true,
          },
        },
        paidAt: true,
        paymentMethod: true,
        settlementType: true,
        soldByUser: { select: { name: true } },
        soldByUserId: true,
        status: true,
        totalCents: true,
        unit: true,
      },
    }),
  ]);

  return (
    <AvaWorkspaceShell area="VENDAS">
      <SalesPosPanel
        actor={{
          id: session.user.id,
          isAdmin: session.user.role === "ADMIN",
          name: session.user.name ?? "Equipe Candy",
        }}
        currentPeriod={{ ...period, dateKey: getSaoPauloDateKey() }}
        products={products.map(({ imagePath, ...product }) => ({
          ...product,
          imageUrl: imagePath
            ? `/ava/vendas/produto-imagem/${product.id}?v=${encodeURIComponent(product.updatedAt.toISOString())}`
            : null,
          updatedAt: product.updatedAt.toISOString(),
        }))}
        recentSales={recentSales.map((sale) => ({
          ...sale,
          canceledAt: sale.canceledAt?.toISOString() ?? null,
          createdAt: sale.createdAt.toISOString(),
          invoiceDueDate: sale.invoiceDueDate?.toISOString().slice(0, 10) ?? null,
          paidAt: sale.paidAt?.toISOString() ?? null,
          sellerName: sale.soldByUser?.name ?? "Usuario removido",
        }))}
        students={students.map((student) => {
          const plan = planStudentSaleInvoice(period, student.financialStudent?.id, student.financialStudent?.payments ?? []);
          const payment = student.financialStudent?.payments.find((row) => row.id === plan.financialPaymentId);
          return {
            invoice: {
              kind: plan.kind,
              month: plan.month,
              year: plan.year,
              movedToNextMonth: plan.movedToNextMonth,
              dueDate: getSaleInvoiceDateForPeriod(
                payment ? `2000-01-${String(payment.snapshotPaymentDay).padStart(2, "0")}` : getSaoPauloDateKey(), plan,
              ),
            },
            email: student.user.email,
            id: student.id,
            name: student.user.name,
            unit: student.unit,
          };
        })}
        teachers={teachers}
      />
    </AvaWorkspaceShell>
  );
}
