import { getMobileStudentCandyXpOverview } from "@/lib/mobile-candy-xp";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const token = parseBearerToken(request.headers.get("authorization"));
  const session = token ? await authorizeMobileAccess(token) : null;

  if (!session?.ok) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  if (session.user.role !== "STUDENT") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta de aluno para acessar o Candy XP.",
      403,
      requestId,
    );
  }

  try {
    const candyXp = await getMobileStudentCandyXpOverview(session.user.id);

    if (!candyXp) {
      return mobileError(
        "PROFILE_NOT_FOUND",
        "Perfil de aluno nao encontrado.",
        404,
        requestId,
      );
    }

    return mobileJson({ candyXp, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-candy-xp:get]", { error, requestId });
    return mobileError(
      "CANDY_XP_UNAVAILABLE",
      "Nao foi possivel carregar o Candy XP agora.",
      503,
      requestId,
    );
  }
}
