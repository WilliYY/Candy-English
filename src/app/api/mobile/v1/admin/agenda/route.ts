import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminAgenda,
  MobileAdminAgendaError,
} from "@/lib/mobile-admin-agenda";

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
      "Use uma conta administrativa para acessar a agenda.",
      403,
      requestId,
    );
  }

  const url = new URL(request.url);
  try {
    const agenda = await getMobileAdminAgenda(authorization.user, {
      date: url.searchParams.get("date") ?? undefined,
      month: url.searchParams.get("month") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
      unit: url.searchParams.get("unit") ?? undefined,
      year: url.searchParams.get("year") ?? undefined,
    });
    return mobileJson({ agenda, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminAgendaError) {
      const messages: Record<MobileAdminAgendaError["code"], string> = {
        INVALID_QUERY: "Revise mes, data, unidade e busca da agenda.",
        RESULT_LIMIT:
          "A agenda deste mes excede o limite seguro do aplicativo.",
        ROLE_FORBIDDEN: "Voce nao tem acesso a agenda administrativa.",
      };
      return mobileError(
        error.code,
        messages[error.code],
        error.code === "ROLE_FORBIDDEN"
          ? 403
          : error.code === "INVALID_QUERY"
            ? 400
            : 409,
        requestId,
      );
    }
    console.error("[mobile-admin-agenda]", { error, requestId });
    return mobileError(
      "ADMIN_AGENDA_UNAVAILABLE",
      "Nao foi possivel carregar a agenda agora.",
      503,
      requestId,
    );
  }
}
