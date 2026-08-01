import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminUsers,
  MobileAdminUsersError,
} from "@/lib/mobile-admin-users";

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
      "Use uma conta administrativa para acessar usuarios.",
      403,
      requestId,
    );
  }

  const url = new URL(request.url);

  try {
    const users = await getMobileAdminUsers(authorization.user, {
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return mobileJson({ ok: true, users }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminUsersError) {
      return mobileError(
        error.code,
        error.code === "INVALID_QUERY"
          ? "Revise os filtros da busca de usuarios."
          : "Voce nao tem acesso a usuarios administrativos.",
        error.code === "INVALID_QUERY" ? 400 : 403,
        requestId,
      );
    }

    console.error("[mobile-admin-users]", { error, requestId });
    return mobileError(
      "ADMIN_USERS_UNAVAILABLE",
      "Nao foi possivel carregar os usuarios agora.",
      503,
      requestId,
    );
  }
}
