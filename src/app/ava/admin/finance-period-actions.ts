"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { FinancialPeriodError, openFinancialPeriod } from "@/lib/financial-period-operations";
import type { OpenFinancialPeriodInput } from "@/lib/validations/financial-period";

export async function openAdminFinancialPeriod(input: OpenFinancialPeriodInput) {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "ADMIN") return { ok: false, message: "Acesso negado." };
  try {
    const result = await openFinancialPeriod(session.user.id, input);
    revalidatePath("/ava/admin");
    revalidatePath("/ava/teacher");
    revalidatePath("/ava/vendas");
    return { ok: true, message: result.created ? "Mensalidade criada na competencia selecionada." : "Esta mensalidade ja existe. Nenhum registro foi duplicado." };
  } catch (error) {
    return { ok: false, message: error instanceof FinancialPeriodError ? error.message : "Nao foi possivel abrir a competencia. Atualize a tela e tente novamente." };
  }
}
