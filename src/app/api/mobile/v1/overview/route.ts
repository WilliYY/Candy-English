import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileOverview } from "@/lib/mobile-overview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
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
    const overview = await getMobileOverview(session.user);
    return mobileJson({ ok: true, overview }, 200, requestId);
  } catch (error) {
    console.error("[mobile-overview]", { error, requestId });
    return mobileError(
      "OVERVIEW_UNAVAILABLE",
      "Não foi possível carregar o resumo agora.",
      503,
      requestId,
    );
  }
}
