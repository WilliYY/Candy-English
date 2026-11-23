import type { Prisma } from "@/generated/prisma/client";
import { hasCompleteFinancialRegistration } from "@/lib/financial-completeness";
import { getPrisma } from "@/lib/prisma";
import { financialPeriodCandidatesSchema, openFinancialPeriodSchema } from "@/lib/validations/financial-period";

type Store = Pick<ReturnType<typeof getPrisma>, "$transaction">;
export class FinancialPeriodError extends Error {}

export async function openFinancialPeriod(
  actorId: string,
  input: unknown,
  options: { store?: Store } = {},
) {
  const parsed = openFinancialPeriodSchema.safeParse(input);
  if (!parsed.success) throw new FinancialPeriodError("Confirme aluno e competencia validos.");
  const { studentId, year, month } = parsed.data;
  return (options.store ?? getPrisma()).$transaction(async (tx: Prisma.TransactionClient) => {
    const actor = await tx.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } });
    if (!actor) throw new FinancialPeriodError("Acesso administrativo indisponivel.");
    await tx.$queryRaw`SELECT "id" FROM "FinancialStudent" WHERE "id" = ${studentId} FOR UPDATE`;
    const student = await tx.financialStudent.findUnique({
      where: { id: studentId },
      include: { studentProfile: { select: { user: { select: { isActive: true, role: true } } } } },
    });
    if (!student || !student.studentProfile?.user.isActive || student.studentProfile.user.role !== "STUDENT") {
      throw new FinancialPeriodError("Selecione um aluno financeiro com conta ativa.");
    }
    const existing = await tx.financialPayment.findUnique({ where: { studentId_year_month: { studentId, year, month } } });
    if (existing) {
      if (!existing.isActive) throw new FinancialPeriodError("A mensalidade foi retirada. A abertura nao reativa registros encerrados.");
      return { created: false, paymentId: existing.id };
    }
    if (!hasCompleteFinancialRegistration(student)) throw new FinancialPeriodError("Complete valor, vencimento e forma de pagamento do aluno.");
    const previous = await tx.financialPayment.findFirst({
      where: { studentId, OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    if (previous && !previous.isActive) throw new FinancialPeriodError("O vinculo financeiro foi encerrado. Revise o cadastro antes de abrir outra competencia.");
    let installmentNumber: number | null = null;
    if (student.installmentsTotal !== null) {
      if (!previous?.snapshotInstallmentNumber || previous.snapshotInstallmentsTotal !== student.installmentsTotal) {
        throw new FinancialPeriodError("Revise o plano de parcelas antes de abrir outra competencia.");
      }
      installmentNumber = previous.snapshotInstallmentNumber + (year - previous.year) * 12 + month - previous.month;
      if (installmentNumber > student.installmentsTotal) throw new FinancialPeriodError("O plano de parcelas terminou. Revise o plano antes de abrir outra competencia.");
      const duplicate = await tx.financialPayment.findFirst({ where: { studentId, snapshotInstallmentNumber: installmentNumber, snapshotInstallmentsTotal: student.installmentsTotal } });
      if (duplicate) throw new FinancialPeriodError("Esta parcela ja foi registrada. Nenhuma mensalidade foi criada.");
    }
    const payment = await tx.financialPayment.create({ data: {
      studentId, year, month, isActive: true, isPaid: false,
      snapshotName: student.name, snapshotAmountCents: student.amountCents,
      snapshotInstallmentNumber: installmentNumber, snapshotInstallmentsTotal: student.installmentsTotal,
      snapshotPaymentDay: student.paymentDay, snapshotPaymentMethod: student.paymentMethod,
      snapshotUnit: student.unit, snapshotPhone: student.phone, snapshotCpf: student.cpf,
      snapshotEmail: student.email, snapshotAddress: student.address,
    } });
    await tx.financialLog.create({ data: {
      action: "PERIOD_OPENED", createdByUserId: actor.id, paymentId: payment.id, studentId,
      description: `Competencia ${month}/${year} aberta explicitamente para ${student.name}.`,
    } });
    return { created: true, paymentId: payment.id };
  });
}

export async function listFinancialPeriodCandidates(actorId: string, input: unknown, options: {
  store?: Pick<ReturnType<typeof getPrisma>, "user" | "financialStudent">;
} = {}) {
  const parsed = financialPeriodCandidatesSchema.safeParse(input);
  if (!parsed.success) throw new FinancialPeriodError("Revise competencia, unidade e limite da consulta.");
  const store = options.store ?? getPrisma();
  if (!await store.user.findFirst({ where: { id: actorId, role: "ADMIN", isActive: true }, select: { id: true } })) {
    throw new FinancialPeriodError("Acesso administrativo indisponivel.");
  }
  const { month, year, unit, limit, cursor } = parsed.data;
  const rows = await store.financialStudent.findMany({
    where: {
      ...(unit !== "ALL" ? { unit } : {}),
      ...(cursor ? { id: { gt: cursor } } : {}),
      studentProfile: { user: { isActive: true, role: "STUDENT" } },
      payments: { none: { year, month } },
    },
    orderBy: { id: "asc" }, take: limit + 1,
    select: {
      id: true, name: true, unit: true, amountCents: true, paymentDay: true, paymentMethod: true, installmentsTotal: true,
      payments: {
        where: { OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
        orderBy: [{ year: "desc" }, { month: "desc" }], take: 1,
        select: { year: true, month: true, isActive: true, snapshotInstallmentNumber: true, snapshotInstallmentsTotal: true },
      },
    },
  });
  const page = rows.slice(0, limit);
  return {
    students: page.filter((student) => {
      if (!hasCompleteFinancialRegistration(student)) return false;
      const previous = student.payments[0];
      if (previous && !previous.isActive) return false;
      if (student.installmentsTotal !== null) {
        if (!previous?.snapshotInstallmentNumber || previous.snapshotInstallmentsTotal !== student.installmentsTotal) return false;
        if (previous.snapshotInstallmentNumber + (year - previous.year) * 12 + month - previous.month > student.installmentsTotal) return false;
      }
      return true;
    }).map(({ id, name, unit }) => ({ id, name, unit })),
    nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null,
  };
}
