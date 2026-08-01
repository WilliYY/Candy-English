import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileTeacherPreRegistration } from "@/lib/mobile-teacher-pre-registrations";

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
  if (authorization.user.role !== "TEACHER") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta de teacher para abrir este pre-cadastro.",
      403,
      requestId,
    );
  }
  try {
    const { requestId: preRegistrationId } = await context.params;
    const result = await getMobileTeacherPreRegistration(
      authorization.user.id,
      preRegistrationId,
    );
    if (!result.ok || !result.data) {
      return mobileError(
        result.reason === "INVALID"
          ? "INVALID_REQUEST"
          : "PRE_REGISTRATION_UNAVAILABLE",
        result.message,
        result.reason === "INVALID" ? 400 : 404,
        requestId,
      );
    }
    return mobileJson({ ok: true, preRegistration: result.data }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-pre-registration:get]", { error, requestId });
    return mobileError(
      "PRE_REGISTRATION_UNAVAILABLE",
      "Nao foi possivel abrir este pre-cadastro agora.",
      503,
      requestId,
    );
  }
}
