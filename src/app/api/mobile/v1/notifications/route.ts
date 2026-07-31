import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileStudentNotifications,
  MobileNotificationError,
} from "@/lib/mobile-notifications";

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
    const notifications = await getMobileStudentNotifications(session.user);

    return mobileJson({ notifications, ok: true }, 200, requestId);
  } catch (error) {
    if (
      error instanceof MobileNotificationError &&
      error.code === "NOTIFICATIONS_FORBIDDEN"
    ) {
      return mobileError(
        error.code,
        "Notificacoes disponiveis somente para alunos.",
        403,
        requestId,
      );
    }

    console.error("[mobile-notifications]", { error, requestId });

    return mobileError(
      "NOTIFICATIONS_UNAVAILABLE",
      "As notificacoes nao estao disponiveis agora.",
      503,
      requestId,
    );
  }
}
