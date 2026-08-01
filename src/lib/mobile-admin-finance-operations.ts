import type { Prisma } from "@/generated/prisma/client";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import {
  getMobileFinanceDateParts,
  mobileAdminFinancePaymentSelect,
  serializeMobileAdminFinancePayment,
} from "@/lib/mobile-admin-finance";
import { hasCompleteFinancialRegistration } from "@/lib/financial-completeness";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const unitSchema = z.enum(["ALL", "IVATE", "DOURADINA"]);
const activityInputSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    unit: unitSchema.default("ALL"),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
  })
  .strict();
const paymentIdSchema = z.string().trim().min(1).max(200);
const paymentUpdateSchema = z
  .object({
    amountCents: z.number().int().positive().max(100_000_000).optional(),
    confirmChange: z.literal(true),
    expectedUpdatedAt: z.string().datetime(),
    isPaid: z.boolean(),
    note: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .transform((value) => value || null),
    operationId: z.string().uuid(),
  })
  .strict();
const expenseCreateSchema = z
  .object({
    actorName: z.string().trim().min(2).max(120),
    amountCents: z.number().int().positive().max(100_000_000),
    confirmCreate: z.literal(true),
    itemName: z.string().trim().min(2).max(160),
    month: z.number().int().min(1).max(12),
    note: z
      .string()
      .trim()
      .max(600)
      .nullable()
      .transform((value) => value || null),
    operationId: z.string().uuid(),
    purchasedAt: z.string().date(),
    unit: z.enum(["IVATE", "DOURADINA"]),
    year: z.number().int().min(2020).max(2100),
  })
  .strict();

const paymentOperationSelect = {
  ...mobileAdminFinancePaymentSelect,
  lastMobileOperationId: true,
} satisfies Prisma.FinancialPaymentSelect;
const expenseSelect = {
  actorName: true,
  amountCents: true,
  createdAt: true,
  id: true,
  itemName: true,
  note: true,
  purchasedAt: true,
  unit: true,
  updatedAt: true,
} satisfies Prisma.FinancialExpenseSelect;
const expenseOperationSelect = {
  ...expenseSelect,
  createdByMobileOperationId: true,
} satisfies Prisma.FinancialExpenseSelect;
const logSelect = {
  action: true,
  createdAt: true,
  description: true,
  id: true,
  student: { select: { name: true } },
} satisfies Prisma.FinancialLogSelect;

type ExpenseRow = Prisma.FinancialExpenseGetPayload<{
  select: typeof expenseSelect;
}>;
type ExpenseOperationRow = Prisma.FinancialExpenseGetPayload<{
  select: typeof expenseOperationSelect;
}>;
type LogRow = Prisma.FinancialLogGetPayload<{ select: typeof logSelect }>;

export type MobileAdminFinanceOperationsStore = Pick<
  ReturnType<typeof getPrisma>,
  "$transaction" | "financialExpense" | "financialLog" | "financialPayment"
>;

type Options = {
  acquireLock?: (
    tx: Prisma.TransactionClient,
    key: string,
  ) => Promise<void>;
  now?: () => Date;
  store?: MobileAdminFinanceOperationsStore;
};

export class MobileAdminFinanceOperationsError extends Error {
  constructor(
    public readonly code:
      | "EDIT_CONFLICT"
      | "INVALID_INPUT"
      | "OPERATION_REUSED"
      | "PAYMENT_INCOMPLETE"
      | "PAYMENT_NOT_FOUND"
      | "ROLE_FORBIDDEN"
      | "WRITE_CONFLICT",
  ) {
    super(code);
    this.name = "MobileAdminFinanceOperationsError";
  }
}

function requireAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminFinanceOperationsError("ROLE_FORBIDDEN");
  }
}

function safeText(value: string, maximum: number) {
  return value.trim().slice(0, maximum);
}

function safeNullableText(value: string | null, maximum: number) {
  const normalized = value?.trim().slice(0, maximum);
  return normalized || null;
}

function serializeExpense(row: ExpenseRow | ExpenseOperationRow) {
  return {
    actorName: safeText(row.actorName, 120),
    amountCents: Math.max(0, row.amountCents),
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    itemName: safeText(row.itemName, 160),
    note: safeNullableText(row.note, 600),
    purchasedAt: row.purchasedAt.toISOString().slice(0, 10),
    unit: row.unit,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeLog(row: LogRow) {
  return {
    action: safeText(row.action, 80),
    createdAt: row.createdAt.toISOString(),
    description: safeText(row.description, 500),
    id: row.id,
    studentName: row.student
      ? safeText(row.student.name, 120) || null
      : null,
  };
}

export async function getMobileAdminFinanceActivity(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsed = activityInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminFinanceOperationsError("INVALID_INPUT");
  }
  const now = options.now?.() ?? new Date();
  const today = getMobileFinanceDateParts(now);
  const month = parsed.data.month ?? today.month;
  const year = parsed.data.year ?? today.year;
  const store = options.store ?? getPrisma();
  const [expenses, logs] = await Promise.all([
    store.financialExpense.findMany({
      orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
      select: expenseSelect,
      take: 50,
      where: {
        month,
        year,
        ...(parsed.data.unit === "ALL" ? {} : { unit: parsed.data.unit }),
      },
    }),
    store.financialLog.findMany({
      orderBy: { createdAt: "desc" },
      select: logSelect,
      take: 50,
    }),
  ]);
  const safeExpenses = expenses.map(serializeExpense);
  return {
    expenseSummary: {
      count: safeExpenses.length,
      totalCents: safeExpenses.reduce(
        (total, expense) => total + expense.amountCents,
        0,
      ),
    },
    expenses: safeExpenses,
    generatedAt: now.toISOString(),
    logs: logs.map(serializeLog),
    logsScope: "GLOBAL_RECENT" as const,
    period: { month, year },
    unit: parsed.data.unit,
  };
}

export async function getMobileAdminFinancePayment(
  actor: MobileAuthUser,
  paymentId: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedId = paymentIdSchema.safeParse(paymentId);
  if (!parsedId.success) {
    throw new MobileAdminFinanceOperationsError("INVALID_INPUT");
  }
  const now = options.now?.() ?? new Date();
  const store = options.store ?? getPrisma();
  const payment = await store.financialPayment.findUnique({
    select: mobileAdminFinancePaymentSelect,
    where: { id: parsedId.data },
  });
  if (!payment || !payment.isActive) {
    throw new MobileAdminFinanceOperationsError("PAYMENT_NOT_FOUND");
  }
  return serializeMobileAdminFinancePayment(
    payment,
    getMobileFinanceDateParts(now),
  );
}

export async function updateMobileAdminFinancePayment(
  actor: MobileAuthUser,
  paymentId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedId = paymentIdSchema.safeParse(paymentId);
  const parsed = paymentUpdateSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    throw new MobileAdminFinanceOperationsError("INVALID_INPUT");
  }
  const now = options.now?.() ?? new Date();
  const store = options.store ?? getPrisma();
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;
  const operationKey = `admin-finance:payment:${parsed.data.operationId}`;
  const result = await store.$transaction(async (tx) => {
    await acquireLock(tx, operationKey);
    const prior = await tx.financialPayment.findUnique({
      select: paymentOperationSelect,
      where: { lastMobileOperationId: operationKey },
    });
    if (prior) {
      if (prior.id !== parsedId.data) {
        throw new MobileAdminFinanceOperationsError("OPERATION_REUSED");
      }
      return { payment: prior, replayed: true };
    }

    const current = await tx.financialPayment.findUnique({
      select: paymentOperationSelect,
      where: { id: parsedId.data },
    });
    if (!current || !current.isActive) {
      throw new MobileAdminFinanceOperationsError("PAYMENT_NOT_FOUND");
    }
    if (current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
      throw new MobileAdminFinanceOperationsError("EDIT_CONFLICT");
    }
    if (
      !hasCompleteFinancialRegistration({
        amountCents:
          parsed.data.amountCents ?? current.snapshotAmountCents,
        paymentDay: current.snapshotPaymentDay,
        paymentMethod: current.snapshotPaymentMethod,
      })
    ) {
      throw new MobileAdminFinanceOperationsError("PAYMENT_INCOMPLETE");
    }

    const write = await tx.financialPayment.updateMany({
      data: {
        ...(parsed.data.amountCents
          ? { snapshotAmountCents: parsed.data.amountCents }
          : {}),
        isPaid: parsed.data.isPaid,
        lastMobileOperationId: operationKey,
        note: parsed.data.note,
        paidAt: parsed.data.isPaid ? current.paidAt ?? now : null,
      },
      where: { id: current.id, updatedAt: current.updatedAt },
    });
    if (write.count !== 1) {
      throw new MobileAdminFinanceOperationsError("EDIT_CONFLICT");
    }
    await tx.financialLog.create({
      data: {
        action: "MOBILE_PAYMENT",
        createdByUserId: actor.id,
        description: parsed.data.isPaid
          ? `Pagamento marcado como pago no app: ${current.snapshotName}.`
          : `Pagamento marcado como pendente no app: ${current.snapshotName}.`,
        paymentId: current.id,
        studentId: current.studentId,
      },
    });
    const updated = await tx.financialPayment.findUnique({
      select: paymentOperationSelect,
      where: { id: current.id },
    });
    if (!updated) {
      throw new MobileAdminFinanceOperationsError("WRITE_CONFLICT");
    }
    return { payment: updated, replayed: false };
  });

  return {
    message: result.replayed
      ? "Pagamento ja atualizado por esta operacao."
      : parsed.data.isPaid
        ? "Pagamento marcado como pago."
        : "Pagamento marcado como pendente.",
    payment: serializeMobileAdminFinancePayment(
      result.payment,
      getMobileFinanceDateParts(now),
    ),
    replayed: result.replayed,
  };
}

export async function createMobileAdminFinanceExpense(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsed = expenseCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminFinanceOperationsError("INVALID_INPUT");
  }
  const purchasedAt = new Date(`${parsed.data.purchasedAt}T00:00:00.000Z`);
  if (
    purchasedAt.getUTCFullYear() !== parsed.data.year ||
    purchasedAt.getUTCMonth() + 1 !== parsed.data.month
  ) {
    throw new MobileAdminFinanceOperationsError("INVALID_INPUT");
  }
  const store = options.store ?? getPrisma();
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;
  const operationKey = `admin-finance:expense:${parsed.data.operationId}`;
  const result = await store.$transaction(async (tx) => {
    await acquireLock(tx, operationKey);
    const prior = await tx.financialExpense.findUnique({
      select: expenseOperationSelect,
      where: { createdByMobileOperationId: operationKey },
    });
    if (prior) return { expense: prior, replayed: true };

    const expense = await tx.financialExpense.create({
      data: {
        actorName: parsed.data.actorName,
        amountCents: parsed.data.amountCents,
        createdByMobileOperationId: operationKey,
        createdByUserId: actor.id,
        itemName: parsed.data.itemName,
        month: parsed.data.month,
        note: parsed.data.note,
        purchasedAt,
        unit: parsed.data.unit,
        year: parsed.data.year,
      },
      select: expenseOperationSelect,
    });
    await tx.financialLog.create({
      data: {
        action: "MOBILE_EXPENSE",
        createdByUserId: actor.id,
        description: `Gasto registrado no app: ${expense.itemName}, feito por ${expense.actorName}.`,
      },
    });
    return { expense, replayed: false };
  });
  return {
    expense: serializeExpense(result.expense),
    message: result.replayed
      ? "Gasto ja registrado por esta operacao."
      : "Gasto registrado com sucesso.",
    replayed: result.replayed,
  };
}
