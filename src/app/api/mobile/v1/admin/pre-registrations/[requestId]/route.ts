import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminPreRegistration,
  MobileAdminPreRegistrationsError,
} from "@/lib/mobile-admin-pre-registrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function GET(request: Request, context: RouteContext) {
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
      "Use uma conta administrativa para acessar este pre-cadastro.",
      403,
      requestId,
    );
  }

  try {
    const { requestId: preRegistrationId } = await context.params;
    const preRegistration = await getMobileAdminPreRegistration(
      authorization.user,
      preRegistrationId,
    );
    return mobileJson({ ok: true, preRegistration }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminPreRegistrationsError) {
      const notFound = error.code === "PRE_REGISTRATION_NOT_FOUND";
      return mobileError(
        error.code,
        notFound
          ? "Pre-cadastro nao encontrado."
          : error.code === "INVALID_QUERY"
            ? "Pre-cadastro invalido."
            : "Voce nao tem acesso a este pre-cadastro.",
        notFound ? 404 : error.code === "INVALID_QUERY" ? 400 : 403,
        requestId,
      );
    }
    console.error("[mobile-admin-pre-registration]", { error, requestId });
    return mobileError(
      "ADMIN_PRE_REGISTRATION_UNAVAILABLE",
      "Nao foi possivel carregar este pre-cadastro agora.",
      503,
      requestId,
    );
  }
}
