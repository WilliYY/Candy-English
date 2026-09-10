import type { PrismaClient } from "@/generated/prisma/client";
import { hasCompleteFinancialRegistration } from "@/lib/financial-completeness";
import {
  canRecordTeacherPayment, TeacherPaymentRuleError, validateTeacherPaymentChange,
} from "@/lib/teacher-finance-payment";
import { teacherPaymentStatusSchema } from "@/lib/validations/teacher-finance";

// The caller supplies only the authenticated session ID, never a browser actor ID.
export async function recordTeacherPaymentStatus(prisma: PrismaClient, actorId: string, rawInput: unknown) {
  const parsed = teacherPaymentStatusSchema.safeParse(rawInput);
  if (!parsed.success) throw new TeacherPaymentRuleError("Revise a confirmação do pagamento.");
  const input = parsed.data;

  await prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, role: true, isActive: true, deletedAt: true },
    });
    if (!actor || !canRecordTeacherPayment(actor)) {
      throw new TeacherPaymentRuleError("Você não tem permissão para registrar pagamentos.");
    }
    const activeBuyer = { isActive: true, deletedAt: null };
    const now = new Date();
    let name: string;
    let month: number;
    let year: number;
    let paymentId: string | null = null;
    let studentId: string | null = null;
    let recordIds = input.id;

    if (input.kind === "TUITION") {
      // Same lock used by checkout/cancellation: no sale can enter a closing bill.
      await tx.$queryRaw`SELECT "id" FROM "FinancialPayment" WHERE "id" = ${input.id} FOR UPDATE`;
      const payment = await tx.financialPayment.findFirst({
        where: { id: input.id, student: { studentProfile: { user: { ...activeBuyer, role: "STUDENT" } } } },
        select: {
          id: true, studentId: true, isActive: true, isPaid: true, updatedAt: true,
          snapshotName: true, snapshotAmountCents: true, snapshotPaymentDay: true,
          snapshotPaymentMethod: true, month: true, year: true,
        },
      });
      if (!payment) throw new TeacherPaymentRuleError("Pagamento indisponível para esta conta.");
      validateTeacherPaymentChange(input, payment);
      if (!hasCompleteFinancialRegistration({
        amountCents: payment.snapshotAmountCents, paymentDay: payment.snapshotPaymentDay,
        paymentMethod: payment.snapshotPaymentMethod,
      })) throw new TeacherPaymentRuleError("Peça ao administrador para completar o cadastro financeiro.");
      await tx.financialPayment.update({
        where: { id: payment.id }, data: { isPaid: input.isPaid, paidAt: input.isPaid ? now : null },
      });
      // Linked products inherit FinancialPayment.isPaid; do not detach or alter their ledger.
      name = payment.snapshotName; month = payment.month; year = payment.year;
      paymentId = payment.id; studentId = payment.studentId;
    } else {
      // Buyer lock also serializes new Sale FK references while this set is settled.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.id} FOR UPDATE`;
      const buyer = await tx.user.findFirst({
        where: { id: input.id, ...activeBuyer, role: { in: ["STUDENT", "TEACHER"] } },
        select: { name: true },
      });
      if (!buyer) throw new TeacherPaymentRuleError("Conta indisponível para pagamento.");
      await tx.$queryRaw`SELECT "id" FROM "Sale"
        WHERE "buyerUserId" = ${input.id} AND "invoiceMonth" = ${input.month}
          AND "invoiceYear" = ${input.year} AND "financialPaymentId" IS NULL
        ORDER BY "id" FOR UPDATE`;
      const sales = await tx.sale.findMany({
        where: {
          buyerUserId: input.id, invoiceMonth: input.month, invoiceYear: input.year,
          financialPaymentId: null, settlementType: "MONTHLY_INVOICE", status: "COMPLETED",
          paidAt: input.isPaid ? null : { not: null },
        },
        select: { id: true, paidAt: true, updatedAt: true },
      });
      if (sales.length !== input.sales.length) {
        throw new TeacherPaymentRuleError("A fatura mudou. Atualize a tela para conferir todas as compras.");
      }
      for (const sale of sales) {
        const expected = input.sales.find((item) => item.id === sale.id);
        if (!expected) throw new TeacherPaymentRuleError("A fatura mudou. Atualize a tela.");
        validateTeacherPaymentChange({ isPaid: input.isPaid, expectedUpdatedAt: expected.updatedAt }, { ...sale, isActive: true, isPaid: Boolean(sale.paidAt) });
      }
      await tx.sale.updateMany({ where: { id: { in: sales.map((sale) => sale.id) } }, data: { paidAt: input.isPaid ? now : null } });
      name = buyer.name; month = input.month; year = input.year;
      recordIds = sales.map((sale) => sale.id).sort().join(", ");
    }

    await tx.financialLog.create({ data: {
      action: `TEACHER_${input.kind}_${input.isPaid ? "PAID" : "REOPENED"}`,
      createdByUserId: actor.id, paymentId, studentId,
      description: `${actor.role === "TEACHER" ? "Professor(a)" : "Admin"} ${actor.name} ${input.isPaid ? "confirmou o pagamento" : "cancelou a confirmação de pagamento"}: ${name}, ${month}/${year}, ${input.kind === "TUITION" ? "mensalidade e doces vinculados" : "fatura de doces"}. Registro: ${recordIds}.`,
    } });
  });
}
