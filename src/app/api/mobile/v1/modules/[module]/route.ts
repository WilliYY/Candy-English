import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileModuleData,
  MobileModuleError,
} from "@/lib/mobile-modules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ module: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const accessToken = parseBearerToken(request.headers.get("authorization"));

  if (!accessToken) {
    return mobileError(
      "AUTHENTICATION_REQUIRED",
      "Entre para continuar.",
      401,
      requestId,
    );
  }

  const session = await authorizeMobileAccess(accessToken);

  if (!session.ok) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  try {
    const { module } = await context.params;
    const data = await getMobileModuleData(session.user, module);
    return mobileJson({ data, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileModuleError) {
      if (error.code === "MODULE_LIMIT_EXCEEDED") {
        return mobileError(
          error.code,
          "Este módulo excede o limite seguro do app.",
          413,
          requestId,
        );
      }
      return mobileError(
        error.code,
        error.code === "MODULE_NOT_FOUND"
          ? "Módulo não encontrado."
          : "Você não tem acesso a este módulo.",
        error.code === "MODULE_NOT_FOUND" ? 404 : 403,
        requestId,
      );
    }

    console.error("[mobile-module]", { error, requestId });
    return mobileError(
      "MODULE_UNAVAILABLE",
      "Não foi possível carregar este módulo agora.",
      503,
      requestId,
    );
  }
}
