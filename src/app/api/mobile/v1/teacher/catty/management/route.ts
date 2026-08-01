import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileTeacherCattyManagement } from "@/lib/mobile-teacher-catty";

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
  if (authorization.user.role !== "TEACHER") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta de teacher para acessar o Catty Learning.",
      403,
      requestId,
    );
  }

  try {
    const management = await getMobileTeacherCattyManagement(
      authorization.user.id,
    );
    if (!management) {
      return mobileError(
        "TEACHER_PROFILE_UNAVAILABLE",
        "Perfil de teacher nao encontrado.",
        404,
        requestId,
      );
    }
    return mobileJson({ management, ok: true }, 200, requestId);
  } catch (error) {
    const code = (error as Error).message;
    if (code.startsWith("TEACHER_CATTY_") && code.endsWith("_LIMIT_EXCEEDED")) {
      return mobileError(
        code,
        "Os dados da Catty excedem o limite seguro do aplicativo.",
        409,
        requestId,
      );
    }
    console.error("[mobile-teacher-catty:management]", { error, requestId });
    return mobileError(
      "TEACHER_CATTY_UNAVAILABLE",
      "Nao foi possivel carregar o Catty Learning agora.",
      503,
      requestId,
    );
  }
}
