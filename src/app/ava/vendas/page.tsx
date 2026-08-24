import type { Metadata } from "next";
import { AvaWorkspaceShell } from "@/components/ava/ava-workspace-shell";
import { SalesPosPanel } from "@/components/ava/sales-pos-panel";
import { requireAvaRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";
import {
  getSaoPauloDateKey,
  getSaoPauloYearMonth,
  isMonthlyInvoiceOpen,
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
  const teacherProfile =
    session.user.role === "TEACHER"
      ? await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })
      : null;

  const [products, students, recentSales] = await Promise.all([
    prisma.saleProduct.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        costCents: true,
        id: true,
        isActive: true,
        name: true,
        salePriceCents: true,
        stockQuantity: true,
        updatedAt: true,
      },
    }),
    prisma.studentProfile.findMany({
      where: {
        user: { isActive: true, role: "STUDENT" },
        ...(session.user.role === "TEACHER"
          ? {
              teacherAssignments: {
                some: {
                  teacherProfileId:
                    teacherProfile?.id ?? "__missing_teacher_profile__",
                },
              },
            }
          : {}),
      },
      orderBy: { user: { name: "asc" } },
      select: {
        financialStudent: {
          select: {
            id: true,
            payments: {
              where: {
                month: period.month,
                year: period.year,
              },
              select: { id: true, isActive: true, isPaid: true },
              take: 1,
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
        products={products.map((product) => ({
          ...product,
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
        students={students.map((student) => ({
          canInvoice: Boolean(
            student.financialStudent?.id &&
              isMonthlyInvoiceOpen(student.financialStudent.payments[0]),
          ),
          email: student.user.email,
          id: student.id,
          name: student.user.name,
          unit: student.unit,
        }))}
      />
    </AvaWorkspaceShell>
  );
}
