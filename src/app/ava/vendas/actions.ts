"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getActiveStudentProfileWhere } from "@/lib/staff-student-access";
import {
  areSaleAmountsDatabaseSafe,
  calculateSaleTotals,
  getSaoPauloYearMonth,
  isMonthlyInvoiceOpen,
  normalizeSaleProductName,
  parseSaleInvoiceDate,
} from "@/lib/sales-domain";
import {
  deleteSaleProductImage,
  saveSaleProductImage,
  StorageValidationError,
} from "@/lib/storage";
import {
  saleCancelSchema,
  saleCheckoutSchema,
  saleProductCreateSchema,
  saleProductUpdateSchema,
  type SaleCancelInput,
  type SaleCheckoutInput,
  type SaleProductCreateInput,
  type SaleProductUpdateInput,
} from "@/lib/validations/sales";

export type SaleActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

type SalesActor = {
  isAdmin: boolean;
  userId: string;
};

class SaleRuleError extends Error {}

function fieldErrors<TInput extends Record<string, unknown>>(
  issues: { message: string; path: PropertyKey[] }[],
) {
  return issues.reduce<Partial<Record<keyof TInput, string>>>(
    (errors, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        errors[fieldName as keyof TInput] = issue.message;
      }

      return errors;
    },
    {},
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function getSalesActor(): Promise<SalesActor | null> {
  const session = await auth();

  if (!isRole(session?.user?.role) || !session.user.id) {
    return null;
  }

  if (session.user.role === "ADMIN") {
    return {
      isAdmin: true,
      userId: session.user.id,
    };
  }

  if (session.user.role !== "TEACHER") {
    return null;
  }

  return {
    isAdmin: false,
    userId: session.user.id,
  };
}

function forbiddenResult<TInput extends Record<string, unknown>>(): SaleActionResult<TInput> {
  return {
    message: "Voce nao tem permissao para acessar o PDV.",
    ok: false,
  };
}

function saleProductInputFromFormData(formData: FormData) {
  return {
    costCents: Number(formData.get("costCents")),
    name: String(formData.get("name") ?? ""),
    salePriceCents: Number(formData.get("salePriceCents")),
    stockQuantity: Number(formData.get("stockQuantity")),
  };
}

function optionalProductImage(formData: FormData) {
  const image = formData.get("image");

  return image instanceof File && image.size > 0 ? image : null;
}

export async function createSaleProduct(
  formData: FormData,
): Promise<SaleActionResult<SaleProductCreateInput>> {
  const actor = await getSalesActor();

  if (!actor) {
    return forbiddenResult();
  }

  const parsed = saleProductCreateSchema.safeParse(
    saleProductInputFromFormData(formData),
  );

  if (!parsed.success) {
    return {
      errors: fieldErrors<SaleProductCreateInput>(parsed.error.issues),
      message: "Revise os dados do produto.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  const image = optionalProductImage(formData);
  let savedImagePath: string | null = null;

  try {
    if (image) {
      savedImagePath = (await saveSaleProductImage(image)).relativePath;
    }

    await prisma.saleProduct.create({
      data: {
        ...parsed.data,
        createdByUserId: actor.userId,
        imagePath: savedImagePath,
        normalizedName: normalizeSaleProductName(parsed.data.name),
        updatedByUserId: actor.userId,
      },
    });
  } catch (error) {
    if (savedImagePath) {
      await deleteSaleProductImage(savedImagePath).catch(() => undefined);
    }

    if (error instanceof StorageValidationError) {
      return {
        message: error.message,
        ok: false,
      };
    }

    if (isUniqueConstraintError(error)) {
      return {
        errors: { name: "Ja existe um produto com esse nome." },
        message: "Use outro nome ou edite o produto existente.",
        ok: false,
      };
    }

    return {
      message: "Nao foi possivel cadastrar o produto.",
      ok: false,
    };
  }

  revalidatePath("/ava/vendas");

  return {
    message: "Produto cadastrado no PDV.",
    ok: true,
  };
}

export async function updateSaleProduct(
  formData: FormData,
): Promise<SaleActionResult<SaleProductUpdateInput>> {
  const actor = await getSalesActor();

  if (!actor) {
    return forbiddenResult();
  }

  const parsed = saleProductUpdateSchema.safeParse({
    ...saleProductInputFromFormData(formData),
    expectedUpdatedAt: String(formData.get("expectedUpdatedAt") ?? ""),
    isActive: formData.get("isActive") === "true",
    productId: String(formData.get("productId") ?? ""),
  });

  if (!parsed.success) {
    return {
      errors: fieldErrors<SaleProductUpdateInput>(parsed.error.issues),
      message: "Revise os dados do produto.",
      ok: false,
    };
  }

  const { expectedUpdatedAt, productId, ...productData } = parsed.data;
  const prisma = getPrisma();
  const image = optionalProductImage(formData);
  const removeImage = formData.get("removeImage") === "true";
  let savedImagePath: string | null = null;
  let persisted = false;
  let previousImagePath: string | null = null;

  try {
    if (image) {
      savedImagePath = (await saveSaleProductImage(image)).relativePath;
    }

    previousImagePath = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ imagePath: string | null; updatedAt: Date }>
      >`
        SELECT "imagePath", "updatedAt"
        FROM "SaleProduct"
        WHERE "id" = ${productId}
        FOR UPDATE
      `;
      const currentProduct = rows[0];

      if (
        !currentProduct ||
        currentProduct.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()
      ) {
        throw new SaleRuleError(
          "O produto mudou enquanto estava aberto. Recarregue antes de salvar o estoque.",
        );
      }

      await tx.saleProduct.update({
        where: { id: productId },
        data: {
          ...productData,
          ...(savedImagePath
            ? { imagePath: savedImagePath }
            : removeImage
              ? { imagePath: null }
              : {}),
          normalizedName: normalizeSaleProductName(productData.name),
          updatedByUserId: actor.userId,
        },
      });

      return currentProduct.imagePath;
    });
    persisted = true;
  } catch (error) {
    if (savedImagePath && !persisted) {
      await deleteSaleProductImage(savedImagePath).catch(() => undefined);
    }

    if (error instanceof SaleRuleError) {
      return {
        message: error.message,
        ok: false,
      };
    }

    if (error instanceof StorageValidationError) {
      return {
        message: error.message,
        ok: false,
      };
    }

    if (isUniqueConstraintError(error)) {
      return {
        errors: { name: "Ja existe um produto com esse nome." },
        message: "Use outro nome para o produto.",
        ok: false,
      };
    }

    return {
      message: "Nao foi possivel atualizar o produto.",
      ok: false,
    };
  }

  if (
    previousImagePath &&
    previousImagePath !== savedImagePath &&
    (savedImagePath || removeImage)
  ) {
    await deleteSaleProductImage(previousImagePath).catch(() => undefined);
  }

  revalidatePath("/ava/vendas");

  return {
    message: "Produto e estoque atualizados.",
    ok: true,
  };
}

export async function createSale(
  input: SaleCheckoutInput,
): Promise<SaleActionResult<SaleCheckoutInput>> {
  const actor = await getSalesActor();

  if (!actor) {
    return forbiddenResult();
  }

  const parsed = saleCheckoutSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<SaleCheckoutInput>(parsed.error.issues),
      message: "Revise os dados da venda.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  const invoiceDate =
    parsed.data.settlementType === "MONTHLY_INVOICE"
      ? parseSaleInvoiceDate(parsed.data.invoiceDueDate ?? "")
      : null;
  const currentPeriod = getSaoPauloYearMonth();
  const invoicePeriod = invoiceDate
    ? { month: invoiceDate.month, year: invoiceDate.year }
    : null;

  if (
    parsed.data.settlementType === "MONTHLY_INVOICE" &&
    (!invoiceDate ||
      invoiceDate.month !== currentPeriod.month ||
      invoiceDate.year !== currentPeriod.year)
  ) {
    return {
      errors: {
        invoiceDueDate: "Escolha um dia dentro da fatura do mes atual.",
      },
      message: "A data precisa pertencer ao mes financeiro atual.",
      ok: false,
    };
  }
  let student:
    | {
        financialStudent: {
          id: string;
          payments: { id: string; isActive: boolean; isPaid: boolean }[];
        } | null;
        id: string;
        unit: "IVATE" | "DOURADINA";
        user: { id: string; name: string };
      }
    | null = null;
  let staffBuyer: { id: string; name: string } | null = null;

  if (parsed.data.studentProfileId) {
    student = await prisma.studentProfile.findFirst({
      where: getActiveStudentProfileWhere(parsed.data.studentProfileId),
      select: {
        financialStudent: {
          select: {
            id: true,
            payments: {
              where: invoicePeriod
                ? {
                    month: invoicePeriod.month,
                    year: invoicePeriod.year,
                  }
                : { id: "__not_used__" },
              select: { id: true, isActive: true, isPaid: true },
              take: 1,
            },
          },
        },
        id: true,
        unit: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!student) {
      return {
        errors: { studentProfileId: "Aluno nao encontrado ou inativo." },
        message: "Selecione um aluno ativo.",
        ok: false,
      };
    }
  }

  if (parsed.data.buyerUserId) {
    staffBuyer = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        id: parsed.data.buyerUserId,
        isActive: true,
        role: "TEACHER",
      },
      select: { id: true, name: true },
    });

    if (!staffBuyer) {
      return {
        errors: { buyerUserId: "Professor nao encontrado ou inativo." },
        message: "Selecione uma conta de professor ativa.",
        ok: false,
      };
    }
  }

  const invoicePayment = student?.financialStudent?.payments[0] ?? null;

  if (
    invoicePeriod &&
    student &&
    (!student?.financialStudent || !isMonthlyInvoiceOpen(invoicePayment))
  ) {
    return {
      errors: {
        studentProfileId:
          "Este aluno nao tem uma mensalidade ativa e em aberto neste mes.",
      },
      message:
        "Complete o cadastro financeiro do aluno antes de adicionar a fatura.",
      ok: false,
    };
  }

  const buyerName =
    student?.user.name ?? staffBuyer?.name ?? parsed.data.buyerName.trim();
  const operationId = parsed.data.operationId ?? randomUUID();
  let replayed = false;

  try {
    await prisma.$transaction(async (tx) => {
      const existingSale = await tx.sale.findUnique({
        where: { operationId },
        select: { id: true, soldByUserId: true },
      });

      if (existingSale) {
        if (existingSale.soldByUserId !== actor.userId) {
          throw new SaleRuleError("Identificador de venda indisponivel.");
        }

        replayed = true;
        return;
      }

      if (staffBuyer) {
        const currentStaffBuyer = await tx.user.findFirst({
          where: {
            deletedAt: null,
            id: staffBuyer.id,
            isActive: true,
            role: "TEACHER",
          },
          select: { id: true },
        });

        if (!currentStaffBuyer) {
          throw new SaleRuleError(
            "A conta do professor foi alterada. Atualize a tela antes de continuar.",
          );
        }
      }

      let lockedInvoicePayment:
        | {
            financialStudentId: string;
            id: string;
            isActive: boolean;
            isPaid: boolean;
          }
        | null = null;

      if (invoicePeriod && invoicePayment) {
        const paymentRows = await tx.$queryRaw<
          {
            financialStudentId: string;
            id: string;
            isActive: boolean;
            isPaid: boolean;
          }[]
        >`
          SELECT "id", "financialStudentId", "isActive", "isPaid"
          FROM "FinancialPayment"
          WHERE "id" = ${invoicePayment.id}
          FOR UPDATE
        `;
        lockedInvoicePayment = paymentRows[0] ?? null;

        if (
          !isMonthlyInvoiceOpen(lockedInvoicePayment) ||
          lockedInvoicePayment?.financialStudentId !==
            student?.financialStudent?.id
        ) {
          throw new SaleRuleError(
            "A fatura foi paga, fechada ou alterada. Atualize a tela antes de continuar.",
          );
        }
      }

      const productIds = parsed.data.items.map((item) => item.productId);
      const products = await tx.saleProduct.findMany({
        where: { id: { in: productIds } },
        select: {
          costCents: true,
          id: true,
          isActive: true,
          name: true,
          salePriceCents: true,
          stockQuantity: true,
          updatedAt: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new SaleRuleError("Um produto do carrinho nao existe mais.");
      }

      const productById = new Map(products.map((product) => [product.id, product]));
      const saleItems = parsed.data.items.map((item) => {
        const product = productById.get(item.productId);

        if (!product || !product.isActive) {
          throw new SaleRuleError("Um produto do carrinho esta inativo.");
        }

        if (
          product.salePriceCents !== item.expectedSalePriceCents ||
          product.updatedAt.toISOString() !== item.expectedUpdatedAt
        ) {
          throw new SaleRuleError(
            `Preco ou estoque de ${product.name} mudou. Atualize a tela e revise o carrinho.`,
          );
        }

        return {
          lineCostCents: product.costCents * item.quantity,
          lineTotalCents: product.salePriceCents * item.quantity,
          product,
          productId: product.id,
          productNameSnapshot: product.name,
          quantity: item.quantity,
          unitCostCents: product.costCents,
          unitSalePriceCents: product.salePriceCents,
        };
      });

      if (!areSaleAmountsDatabaseSafe(saleItems)) {
        throw new SaleRuleError(
          "O total da venda ultrapassa o limite aceito. Revise valores e quantidades.",
        );
      }

      for (const item of [...saleItems].sort((left, right) =>
        left.productId.localeCompare(right.productId),
      )) {
        const stockUpdate = await tx.saleProduct.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            stockQuantity: { gte: item.quantity },
            updatedAt: item.product.updatedAt,
          },
          data: {
            stockQuantity: { decrement: item.quantity },
            updatedByUserId: actor.userId,
          },
        });

        if (stockUpdate.count !== 1) {
          throw new SaleRuleError(
            `Estoque ou preco de ${item.productNameSnapshot} mudou. Revise o carrinho.`,
          );
        }
      }

      const totals = calculateSaleTotals(saleItems);
      await tx.sale.create({
        data: {
          buyerNameSnapshot: buyerName,
          buyerStudentProfileId: student?.id ?? null,
          buyerUserId: staffBuyer?.id ?? student?.user.id ?? null,
          costTotalCents: totals.costTotalCents,
          financialPaymentId: lockedInvoicePayment?.id ?? null,
          financialStudentId: student?.financialStudent?.id ?? null,
          invoiceMonth: invoicePeriod?.month ?? null,
          invoiceDueDate: invoiceDate?.date ?? null,
          invoiceYear: invoicePeriod?.year ?? null,
          items: {
            create: saleItems.map((item) => ({
              lineCostCents: item.lineCostCents,
              lineTotalCents: item.lineTotalCents,
              productId: item.productId,
              productNameSnapshot: item.productNameSnapshot,
              quantity: item.quantity,
              unitCostCents: item.unitCostCents,
              unitSalePriceCents: item.unitSalePriceCents,
            })),
          },
          paidAt:
            parsed.data.settlementType === "PAID_NOW" ? new Date() : null,
          paymentMethod: parsed.data.paymentMethod,
          note: parsed.data.note,
          operationId,
          settlementType: parsed.data.settlementType,
          soldByUserId: actor.userId,
          totalCents: totals.totalCents,
          unit: student?.unit ?? parsed.data.unit,
        },
      });
    });
  } catch (error) {
    if (error instanceof SaleRuleError) {
      const existingSale = await prisma.sale.findUnique({
        where: { operationId },
        select: { soldByUserId: true },
      });

      if (existingSale?.soldByUserId === actor.userId) {
        replayed = true;
      } else {
        return {
          message: error.message,
          ok: false,
        };
      }
    } else if (isUniqueConstraintError(error)) {
      const existingSale = await prisma.sale.findUnique({
        where: { operationId },
        select: { soldByUserId: true },
      });

      if (existingSale?.soldByUserId === actor.userId) {
        replayed = true;
      } else {
        return {
          message: "Nao foi possivel concluir a venda. Tente novamente.",
          ok: false,
        };
      }
    } else {
      return {
        message: "Nao foi possivel concluir a venda. Nenhum estoque foi alterado.",
        ok: false,
      };
    }
  }

  revalidatePath("/ava/vendas");
  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");

  return {
    message: replayed
      ? "Esta venda ja havia sido registrada. Nenhum estoque foi duplicado."
      :
      parsed.data.settlementType === "MONTHLY_INVOICE"
        ? "Venda adicionada a fatura do mes."
        : "Venda concluida e pagamento registrado.",
    ok: true,
  };
}

export async function cancelSale(
  input: SaleCancelInput,
): Promise<SaleActionResult<SaleCancelInput>> {
  const actor = await getSalesActor();

  if (!actor) {
    return forbiddenResult();
  }

  const parsed = saleCancelSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<SaleCancelInput>(parsed.error.issues),
      message: "Revise o estorno.",
      ok: false,
    };
  }

  const prisma = getPrisma();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Sale"
        WHERE "id" = ${parsed.data.saleId}
        FOR UPDATE
      `;

      const sale = await tx.sale.findUnique({
        where: { id: parsed.data.saleId },
        select: {
          buyerUserId: true,
          items: { select: { productId: true, quantity: true } },
          financialPayment: {
            select: { id: true },
          },
          settlementType: true,
          soldByUserId: true,
          status: true,
          paidAt: true,
        },
      });

      if (!sale || sale.status !== "COMPLETED") {
        throw new SaleRuleError("Venda inexistente ou ja estornada.");
      }

      if (!actor.isAdmin && sale.soldByUserId !== actor.userId) {
        throw new SaleRuleError("Professor pode estornar somente a propria venda.");
      }

      if (sale.settlementType === "MONTHLY_INVOICE") {
        const paymentRows = sale.financialPayment
          ? await tx.$queryRaw<{ isActive: boolean; isPaid: boolean }[]>`
              SELECT "isActive", "isPaid"
              FROM "FinancialPayment"
              WHERE "id" = ${sale.financialPayment.id}
              FOR UPDATE
            `
          : [];

        const standaloneStaffInvoiceOpen =
          !sale.financialPayment && Boolean(sale.buyerUserId) && !sale.paidAt;

        if (
          !standaloneStaffInvoiceOpen &&
          !isMonthlyInvoiceOpen(paymentRows[0])
        ) {
          throw new SaleRuleError(
            "Esta fatura ja foi paga ou fechada. Reabra a competencia no Financeiro antes de estornar.",
          );
        }
      }

      const cancellation = await tx.sale.updateMany({
        where: { id: parsed.data.saleId, status: "COMPLETED" },
        data: {
          canceledAt: new Date(),
          canceledByUserId: actor.userId,
          cancelReason: parsed.data.reason,
          status: "CANCELED",
        },
      });

      if (cancellation.count !== 1) {
        throw new SaleRuleError("A venda mudou enquanto era estornada.");
      }

      for (const item of sale.items) {
        await tx.saleProduct.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
            updatedByUserId: actor.userId,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof SaleRuleError) {
      return { message: error.message, ok: false };
    }

    return {
      message: "Nao foi possivel estornar a venda. O estoque foi preservado.",
      ok: false,
    };
  }

  revalidatePath("/ava/vendas");
  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");

  return {
    message: "Venda estornada e estoque devolvido.",
    ok: true,
  };
}
