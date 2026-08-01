import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileTeacherLesson } from "@/lib/mobile-teacher-lesson";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
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

  if (session.user.role !== "TEACHER") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta de teacher para abrir esta aula.",
      403,
      requestId,
    );
  }

  try {
    const { lessonId } = await context.params;
    const result = await getMobileTeacherLesson(session.user.id, lessonId);

    if (!result.ok || !result.data) {
      return mobileError(
        "LESSON_UNAVAILABLE",
        result.message,
        404,
        requestId,
      );
    }

    return mobileJson({ lesson: result.data, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-lesson]", { error, requestId });

    return mobileError(
      "LESSON_UNAVAILABLE",
      "Nao foi possivel carregar esta aula agora.",
      503,
      requestId,
    );
  }
}
