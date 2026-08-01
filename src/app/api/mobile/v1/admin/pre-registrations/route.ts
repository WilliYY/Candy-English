import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminPreRegistrations,
  MobileAdminPreRegistrationsError,
} from "@/lib/mobile-admin-pre-registrations";

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
      "Use uma conta administrativa para acessar pre-cadastros.",
      403,
      requestId,
    );
  }

  const url = new URL(request.url);
  try {
    const preRegistrations = await getMobileAdminPreRegistrations(
      authorization.user,
      {
        cursor: url.searchParams.get("cursor") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
        query: url.searchParams.get("query") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        unit: url.searchParams.get("unit") ?? undefined,
      },
    );
    return mobileJson({ ok: true, preRegistrations }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminPreRegistrationsError) {
      return mobileError(
        error.code,
        error.code === "INVALID_QUERY"
          ? "Revise os filtros da busca de pre-cadastros."
          : "Voce nao tem acesso aos pre-cadastros administrativos.",
        error.code === "INVALID_QUERY" ? 400 : 403,
        requestId,
      );
    }
    console.error("[mobile-admin-pre-registrations]", { error, requestId });
    return mobileError(
      "ADMIN_PRE_REGISTRATIONS_UNAVAILABLE",
      "Nao foi possivel carregar os pre-cadastros agora.",
      503,
      requestId,
    );
  }
}
