import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";

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

  return mobileJson(
    {
      ok: true,
      user: session.user,
    },
    200,
    requestId,
  );
}
