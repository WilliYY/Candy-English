import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import {
  getMobileAdminCandyXp,
  MobileAdminCandyXpError,
} from "@/lib/mobile-admin-candy-xp";
import {
  authorizeMobileAdminCandyXp,
  mobileAdminCandyXpErrorResponse,
} from "@/lib/mobile-admin-candy-xp-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeMobileAdminCandyXp(request, requestId);
  if ("error" in authorization) return authorization.error;

  const url = new URL(request.url);
  try {
    const catalog = await getMobileAdminCandyXp(authorization.user, {
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return mobileJson({ catalog, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminCandyXpError) {
      return mobileAdminCandyXpErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-candy-xp:list]", { error, requestId });
    return mobileError(
      "ADMIN_CANDY_XP_UNAVAILABLE",
      "Nao foi possivel carregar o Candy XP agora.",
      503,
      requestId,
    );
  }
}
