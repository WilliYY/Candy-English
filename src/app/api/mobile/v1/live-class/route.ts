import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileLiveClassOverview } from "@/lib/mobile-live-class";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const accessToken = parseBearerToken(request.headers.get("authorization"));

  if (!accessToken) {
    return mobileError(
      "UNAUTHORIZED",
      "Sessao movel obrigatoria.",
      401,
      requestId,
    );
  }

  const session = await authorizeMobileAccess(accessToken);

  if (!session.ok) {
    return mobileError(
      session.code,
      "Sessao movel invalida ou expirada.",
      401,
      requestId,
    );
  }

  try {
    const liveClass = await getMobileLiveClassOverview(session.user);

    return mobileJson({ liveClass, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-live-class]", { error, requestId });

    return mobileError(
      "LIVE_CLASS_UNAVAILABLE",
      "A aula ao vivo nao esta disponivel agora.",
      503,
      requestId,
    );
  }
}
