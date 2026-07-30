import { listAuthorizedChatThreads } from "@/lib/chat-service";
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

  if (!token) {
    return mobileError(
      "AUTHENTICATION_REQUIRED",
      "Entre para continuar.",
      401,
      requestId,
    );
  }

  const session = await authorizeMobileAccess(token);

  if (!session.ok) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  const threads = await listAuthorizedChatThreads({
    role: session.user.role,
    userId: session.user.id,
  });
  return mobileJson({ ok: true, threads }, 200, requestId);
}
