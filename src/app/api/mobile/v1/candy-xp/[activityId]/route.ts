import { getMobileStudentCandyXpActivity } from "@/lib/candy-xp-submission-service";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ activityId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);

  try {
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
        "Use uma conta de aluno para abrir esta atividade Candy XP.",
        403,
        requestId,
      );
    }

    const { activityId } = await context.params;
    const activity = await getMobileStudentCandyXpActivity(
      session.user.id,
      activityId,
    );

    if (!activity) {
      return mobileError(
        "CANDY_XP_ACTIVITY_UNAVAILABLE",
        "Atividade Candy XP nao encontrada.",
        404,
        requestId,
      );
    }

    return mobileJson({ activity, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-candy-xp-activity:get]", { error, requestId });
    return mobileError(
      "CANDY_XP_ACTIVITY_UNAVAILABLE",
      "Nao foi possivel carregar esta atividade agora.",
      503,
      requestId,
    );
  }
}
