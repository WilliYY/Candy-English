import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import {
  MobileAdminCandyXpError,
  reviewMobileAdminCandyXpSubmission,
} from "@/lib/mobile-admin-candy-xp";
import {
  authorizeMobileAdminCandyXp,
  mobileAdminCandyXpErrorResponse,
} from "@/lib/mobile-admin-candy-xp-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ submissionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeMobileAdminCandyXp(request, requestId);
  if ("error" in authorization) return authorization.error;

  const { submissionId } = await context.params;
  const input = await request.json().catch(() => null);
  try {
    const result = await reviewMobileAdminCandyXpSubmission(
      authorization.user,
      submissionId,
      input,
    );
    return mobileJson(
      {
        message: result.replayed
          ? "Correcao Candy XP ja confirmada anteriormente."
          : "Correcao Candy XP confirmada.",
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
    console.error("[mobile-admin-candy-xp:review]", {
      error,
      requestId,
      submissionId,
    });
    return mobileError(
      "ADMIN_CANDY_XP_REVIEW_UNAVAILABLE",
      "Nao foi possivel confirmar esta correcao agora.",
      503,
      requestId,
    );
  }
}
