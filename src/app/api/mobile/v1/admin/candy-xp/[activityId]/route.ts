import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import {
  getMobileAdminCandyXpActivity,
  MobileAdminCandyXpError,
  updateMobileAdminCandyXpActivity,
} from "@/lib/mobile-admin-candy-xp";
import {
  authorizeMobileAdminCandyXp,
  mobileAdminCandyXpErrorResponse,
} from "@/lib/mobile-admin-candy-xp-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ activityId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeMobileAdminCandyXp(request, requestId);
  if ("error" in authorization) return authorization.error;

  const { activityId } = await context.params;
  try {
    const detail = await getMobileAdminCandyXpActivity(
      authorization.user,
      activityId,
    );
    return mobileJson({ detail, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminCandyXpError) {
      return mobileAdminCandyXpErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-candy-xp:detail]", {
      activityId,
      error,
      requestId,
    });
    return mobileError(
      "ADMIN_CANDY_XP_UNAVAILABLE",
      "Nao foi possivel carregar esta atividade agora.",
      503,
      requestId,
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeMobileAdminCandyXp(request, requestId);
  if ("error" in authorization) return authorization.error;

  const { activityId } = await context.params;
  const input = await request.json().catch(() => null);
  try {
    const result = await updateMobileAdminCandyXpActivity(
      authorization.user,
      activityId,
      input,
    );
    return mobileJson(
      {
        message: result.replayed
          ? "Alteracao Candy XP ja confirmada anteriormente."
          : "Atividade Candy XP atualizada.",
        ok: true,
        result,
      },
      200,
      requestId,
    );
  } catch (error) {
    if (error instanceof MobileAdminCandyXpError) {
      return mobileAdminCandyXpErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-candy-xp:update]", {
      activityId,
      error,
      requestId,
    });
    return mobileError(
      "ADMIN_CANDY_XP_UPDATE_UNAVAILABLE",
      "Nao foi possivel atualizar esta atividade agora.",
      503,
      requestId,
    );
  }
}
