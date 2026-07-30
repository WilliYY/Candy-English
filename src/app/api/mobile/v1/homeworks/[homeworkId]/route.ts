import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileStudentHomework } from "@/lib/mobile-homework";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ homeworkId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
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
      "Use uma conta de aluno para abrir esta homework.",
      403,
      requestId,
    );
  }

  const { homeworkId } = await context.params;
  const result = await getMobileStudentHomework(session.user.id, homeworkId);

  if (!result.ok || !result.data) {
    return mobileError(
      "HOMEWORK_UNAVAILABLE",
      result.message,
      404,
      requestId,
    );
  }

  return mobileJson({ homework: result.data, ok: true }, 200, requestId);
}
