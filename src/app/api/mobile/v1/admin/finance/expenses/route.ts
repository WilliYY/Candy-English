import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  createMobileAdminFinanceExpense,
  MobileAdminFinanceOperationsError,
} from "@/lib/mobile-admin-finance-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);
  const token = parseBearerToken(request.headers.get("authorization"));
  const authorization = token ? await authorizeMobileAccess(token) : null;

  if (!authorization?.ok) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }
  if (authorization.user.role !== "ADMIN") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta administrativa para registrar gastos.",
      403,
      requestId,
    );
  }

  try {
    const result = await createMobileAdminFinanceExpense(
      authorization.user,
      await request.json().catch(() => null),
    );
    revalidatePath("/ava/admin");
    return mobileJson({ ok: true, ...result }, 201, requestId);
  } catch (error) {
    if (error instanceof MobileAdminFinanceOperationsError) {
      const status =
        error.code === "ROLE_FORBIDDEN"
          ? 403
          : error.code === "INVALID_INPUT"
            ? 400
            : 409;
      const messages: Partial<
        Record<MobileAdminFinanceOperationsError["code"], string>
      > = {
        INVALID_INPUT: "Revise os dados e confirme o registro do gasto.",
        OPERATION_REUSED:
          "Esta operacao ja foi usada em outro gasto. Tente novamente.",
        ROLE_FORBIDDEN: "Voce nao tem permissao para registrar gastos.",
        WRITE_CONFLICT:
          "Nao foi possivel concluir este gasto. Tente novamente.",
      };
      return mobileError(
        error.code,
        messages[error.code] ?? "Nao foi possivel registrar este gasto.",
        status,
        requestId,
      );
    }
    console.error("[mobile-admin-finance:expense-create]", {
      error,
      requestId,
    });
    return mobileError(
      "ADMIN_FINANCE_EXPENSE_NOT_CREATED",
      "Nao foi possivel registrar este gasto agora.",
      503,
      requestId,
    );
  }
}
