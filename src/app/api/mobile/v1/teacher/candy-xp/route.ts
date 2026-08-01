import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileTeacherCandyXpOverview } from "@/lib/mobile-teacher-candy-xp";

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
      "Use uma conta de teacher para acessar este Candy XP.",
      403,
      requestId,
    );
  }

  try {
    const candyXp = await getMobileTeacherCandyXpOverview(
      authorization.user.id,
    );
    if (!candyXp) {
      return mobileError(
        "TEACHER_PROFILE_UNAVAILABLE",
        "Perfil de teacher nao encontrado.",
        404,
        requestId,
      );
    }
    return mobileJson({ candyXp, ok: true }, 200, requestId);
  } catch (error) {
    if ((error as Error).message === "TEACHER_XP_LIMIT_EXCEEDED") {
      return mobileError(
        "TEACHER_XP_LIMIT_EXCEEDED",
        "O historico da teacher excede o limite seguro do aplicativo.",
        409,
        requestId,
      );
    }
    console.error("[mobile-teacher-candy-xp]", { error, requestId });
    return mobileError(
      "TEACHER_XP_UNAVAILABLE",
      "Nao foi possivel carregar o Candy XP da teacher agora.",
      503,
      requestId,
    );
  }
}
