import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminFinancePayment,
  MobileAdminFinanceOperationsError,
  updateMobileAdminFinancePayment,
} from "@/lib/mobile-admin-finance-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ paymentId: string }> };

function operationErrorResponse(
  error: MobileAdminFinanceOperationsError,
  requestId: string,
) {
  const messages: Partial<
    Record<MobileAdminFinanceOperationsError["code"], string>
  > = {
    EDIT_CONFLICT:
      "Este pagamento mudou em outro aparelho. Recarregue antes de continuar.",
    INVALID_INPUT: "Revise os dados e confirme a alteracao do pagamento.",
    OPERATION_REUSED:
      "Esta operacao ja foi usada em outro pagamento. Tente novamente.",
    PAYMENT_INCOMPLETE:
      "Complete o cadastro financeiro do aluno antes de alterar pagamentos.",
    PAYMENT_NOT_FOUND: "Pagamento nao encontrado.",
    ROLE_FORBIDDEN: "Voce nao tem permissao para alterar pagamentos.",
    WRITE_CONFLICT:
      "O pagamento mudou durante a alteracao. Recarregue e tente novamente.",
  };
  const status =
    error.code === "ROLE_FORBIDDEN"
      ? 403
      : error.code === "PAYMENT_NOT_FOUND"
        ? 404
        : error.code === "INVALID_INPUT"
          ? 400
          : 409;
  return mobileError(
    error.code,
    messages[error.code] ?? "Nao foi possivel alterar este pagamento.",
    status,
    requestId,
  );
}

async function authorizeAdmin(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  return token ? authorizeMobileAccess(token) : null;
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeAdmin(request);

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
      "Use uma conta administrativa para acessar pagamentos.",
      403,
      requestId,
    );
  }

  try {
    const { paymentId } = await context.params;
    const payment = await getMobileAdminFinancePayment(
      authorization.user,
      paymentId,
    );
    return mobileJson({ ok: true, payment }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminFinanceOperationsError) {
      return operationErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-finance:payment]", { error, requestId });
    return mobileError(
      "ADMIN_FINANCE_PAYMENT_UNAVAILABLE",
      "Nao foi possivel carregar este pagamento agora.",
      503,
      requestId,
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeAdmin(request);

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
      "Use uma conta administrativa para alterar pagamentos.",
      403,
      requestId,
    );
  }

  try {
    const { paymentId } = await context.params;
    const result = await updateMobileAdminFinancePayment(
      authorization.user,
      paymentId,
      await request.json().catch(() => null),
    );
    revalidatePath("/ava/admin");
    return mobileJson({ ok: true, ...result }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminFinanceOperationsError) {
      return operationErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-finance:payment-update]", {
      error,
      requestId,
    });
    return mobileError(
      "ADMIN_FINANCE_PAYMENT_NOT_UPDATED",
      "Nao foi possivel alterar este pagamento agora.",
      503,
      requestId,
    );
  }
}
