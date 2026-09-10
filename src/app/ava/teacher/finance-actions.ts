"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { TeacherPaymentRuleError } from "@/lib/teacher-finance-payment";
import { recordTeacherPaymentStatus } from "@/lib/teacher-finance-payment-operations";
import type { TeacherPaymentStatusInput } from "@/lib/validations/teacher-finance";

export async function setTeacherPaymentStatus(input: TeacherPaymentStatusInput) {
  const session = await auth();
  if (!session?.user?.id || !["ADMIN", "TEACHER"].includes(session.user.role)) {
    return { ok: false, message: "Você não tem permissão para registrar pagamentos." };
  }
  try {
    await recordTeacherPaymentStatus(getPrisma(), session.user.id, input);
  } catch (error) {
    return { ok: false, message: error instanceof TeacherPaymentRuleError ? error.message : "Não foi possível registrar. Atualize a tela e confira o status antes de tentar novamente." };
  }
  for (const path of ["/ava/admin", "/ava/teacher", "/ava/student", "/ava/vendas"]) revalidatePath(path);
  return { ok: true, message: input.isPaid ? "Pagamento registrado com seu nome. Administrador notificado no Financeiro." : "Confirmação cancelada com seu nome. Administrador notificado no Financeiro." };
}
