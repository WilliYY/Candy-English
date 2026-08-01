import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminFinanceActivity,
  MobileAdminFinanceOperationsError,
} from "@/lib/mobile-admin-finance-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
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
      "Use uma conta administrativa para acessar gastos e historico.",
      403,
      requestId,
    );
  }

  const url = new URL(request.url);
  try {
    const activity = await getMobileAdminFinanceActivity(authorization.user, {
      month: url.searchParams.get("month") ?? undefined,
      unit: url.searchParams.get("unit") ?? undefined,
      year: url.searchParams.get("year") ?? undefined,
    });
    return mobileJson({ activity, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminFinanceOperationsError) {
      return mobileError(
        error.code,
        error.code === "INVALID_INPUT"
          ? "Revise mes, ano e unidade do financeiro."
          : "Voce nao tem acesso ao financeiro administrativo.",
        error.code === "INVALID_INPUT" ? 400 : 403,
        requestId,
      );
    }
    console.error("[mobile-admin-finance:activity]", { error, requestId });
    return mobileError(
      "ADMIN_FINANCE_ACTIVITY_UNAVAILABLE",
      "Nao foi possivel carregar gastos e historico agora.",
      503,
      requestId,
    );
  }
}
