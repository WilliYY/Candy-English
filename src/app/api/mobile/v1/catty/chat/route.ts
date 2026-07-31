import {
  handleCattyChatRequest,
  handleCattyHistoryRequest,
} from "@/lib/catty-chat-handler";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authenticate(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));

  if (!token) {
    return null;
  }

  const session = await authorizeMobileAccess(token);
  return session.ok ? session : null;
}

function withMobileHeaders(response: Response, requestId: string) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Authorization");
  response.headers.set("X-Request-ID", requestId);
  return response;
}

async function handle(
  request: Request,
  mode: "HISTORY" | "MESSAGE",
) {
  const requestId = getMobileRequestId(request);

  try {
    const session = await authenticate(request);

    if (!session) {
      return mobileError(
        "SESSION_INVALID",
        "Entre novamente para conversar com a Catty.",
        401,
        requestId,
      );
    }

    const user = {
      email: session.user.email,
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
    };
    const response =
      mode === "HISTORY"
        ? await handleCattyHistoryRequest(request, user)
        : await handleCattyChatRequest(request, user);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        reply?: unknown;
      } | null;
      const message =
        typeof body?.reply === "string"
          ? body.reply
          : "Nao foi possivel conversar com a Catty agora.";

      return mobileError(
        response.status === 429 ? "CATTY_RATE_LIMITED" : "INVALID_REQUEST",
        message,
        response.status,
        requestId,
      );
    }

    return withMobileHeaders(response, requestId);
  } catch (error) {
    console.error("[mobile-catty:chat]", { error, mode, requestId });
    return mobileError(
      "CATTY_UNAVAILABLE",
      "A Catty esta descansando por alguns instantes. Tente novamente.",
      503,
      requestId,
    );
  }
}

export async function GET(request: Request) {
  return handle(request, "HISTORY");
}

export async function POST(request: Request) {
  return handle(request, "MESSAGE");
}
