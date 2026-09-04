import { z } from "zod";
import { parseSaleInvoiceDate } from "@/lib/sales-domain";

export const SALE_PAYMENT_METHODS = [
  "PIX",
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "OTHER",
] as const;

export const SALE_SETTLEMENT_TYPES = ["PAID_NOW", "MONTHLY_INVOICE"] as const;
export const SALE_UNITS = ["IVATE", "DOURADINA"] as const;

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || undefined);

export const saleProductCreateSchema = z.object({
  costCents: z.number().int().min(0).max(100_000_000),
  name: z.string().trim().min(2).max(120),
  salePriceCents: z.number().int().min(1).max(100_000_000),
  stockQuantity: z.number().int().min(0).max(1_000_000),
});

export const saleProductUpdateSchema = saleProductCreateSchema.extend({
  expectedUpdatedAt: z.string().datetime(),
  isActive: z.boolean(),
  productId: z.string().min(1),
});

const saleCheckoutItemSchema = z.object({
  expectedSalePriceCents: z.number().int().min(1).max(100_000_000),
  expectedUpdatedAt: z.string().datetime(),
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(1_000),
});

export const saleCheckoutSchema = z
  .object({
    buyerName: z.string().trim().max(120).default(""),
    buyerUserId: z.string().trim().min(1).nullable().default(null),
    invoiceDueDate: z
      .string()
      .trim()
      .refine((value) => Boolean(parseSaleInvoiceDate(value)), {
        message: "Informe uma data de fatura valida.",
      })
      .nullable()
      .optional(),
    items: z.array(saleCheckoutItemSchema).min(1).max(50),
    note: optionalText,
    operationId: z.string().trim().min(8).max(100).optional(),
    paymentMethod: z.enum(SALE_PAYMENT_METHODS).nullable(),
    settlementType: z.enum(SALE_SETTLEMENT_TYPES),
    studentProfileId: z.string().trim().min(1).nullable(),
    unit: z.enum(SALE_UNITS).default("IVATE"),
  })
  .superRefine((value, context) => {
    if (
      value.settlementType === "MONTHLY_INVOICE" &&
      !value.studentProfileId &&
      !value.buyerUserId
    ) {
      context.addIssue({
        code: "custom",
        message: "Selecione um aluno ou professor cadastrado para adicionar a fatura.",
        path: ["studentProfileId"],
      });
    }

    if (value.studentProfileId && value.buyerUserId) {
      context.addIssue({
        code: "custom",
        message: "Selecione somente uma conta compradora.",
        path: ["buyerUserId"],
      });
    }

    if (
      value.settlementType === "MONTHLY_INVOICE" &&
      !value.invoiceDueDate
    ) {
      context.addIssue({
        code: "custom",
        message: "Informe o dia em que a compra entra na fatura.",
        path: ["invoiceDueDate"],
      });
    }

    if (value.settlementType === "PAID_NOW" && !value.paymentMethod) {
      context.addIssue({
        code: "custom",
        message: "Informe como a compra foi paga.",
        path: ["paymentMethod"],
      });
    }

    if (!value.studentProfileId && !value.buyerUserId && !value.buyerName?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Selecione um aluno ou informe o nome do comprador.",
        path: ["buyerName"],
      });
    }

    const productIds = value.items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      context.addIssue({
        code: "custom",
        message: "O mesmo produto nao pode aparecer duas vezes no carrinho.",
        path: ["items"],
      });
    }
  });

export const saleProductStockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(1_000_000),
});

export const saleCancelSchema = z.object({
  reason: z.string().trim().min(3).max(300),
  saleId: z.string().min(1),
});

export const productInvoiceSettlementSchema = z
  .object({
    buyerUserId: z.string().trim().min(1),
    isPaid: z.boolean(),
    month: z.number().int().min(1).max(12),
    saleIds: z.array(z.string().trim().min(1)).min(1).max(100),
    year: z.number().int().min(2026).max(2100),
  })
  .superRefine((value, context) => {
    if (new Set(value.saleIds).size !== value.saleIds.length) {
      context.addIssue({
        code: "custom",
        message: "A mesma venda nao pode aparecer duas vezes.",
        path: ["saleIds"],
      });
    }
  });

export type SaleCheckoutInput = z.input<typeof saleCheckoutSchema>;
export type SaleCancelInput = z.input<typeof saleCancelSchema>;
export type ProductInvoiceSettlementInput = z.input<
  typeof productInvoiceSettlementSchema
>;
export type SaleProductCreateInput = z.input<typeof saleProductCreateSchema>;
export type SaleProductStockAdjustmentInput = z.input<
  typeof saleProductStockAdjustmentSchema
>;
export type SaleProductUpdateInput = z.input<typeof saleProductUpdateSchema>;
