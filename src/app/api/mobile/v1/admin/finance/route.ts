import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminFinance,
  MobileAdminFinanceError,
} from "@/lib/mobile-admin-finance";

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
      "Use uma conta administrativa para acessar o financeiro.",
      403,
      requestId,
    );
  }

  const url = new URL(request.url);
  try {
    const finance = await getMobileAdminFinance(authorization.user, {
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      month: url.searchParams.get("month") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      unit: url.searchParams.get("unit") ?? undefined,
      year: url.searchParams.get("year") ?? undefined,
    });
    return mobileJson({ finance, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminFinanceError) {
      return mobileError(
        error.code,
        error.code === "INVALID_QUERY"
          ? "Revise mes, unidade e filtros do financeiro."
          : "Voce nao tem acesso ao financeiro administrativo.",
        error.code === "INVALID_QUERY" ? 400 : 403,
        requestId,
      );
    }
    console.error("[mobile-admin-finance]", { error, requestId });
    return mobileError(
      "ADMIN_FINANCE_UNAVAILABLE",
      "Nao foi possivel carregar o financeiro agora.",
      503,
      requestId,
    );
  }
}
