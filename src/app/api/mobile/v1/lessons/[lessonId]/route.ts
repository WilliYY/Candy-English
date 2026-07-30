import { getMobileStudentLesson } from "@/lib/mobile-lesson";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);

  try {
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
        "Use uma conta de aluno para abrir esta aula.",
        403,
        requestId,
      );
    }

    const { lessonId } = await context.params;
    const result = await getMobileStudentLesson(session.user.id, lessonId);

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
    console.error("[mobile-lesson]", { error, requestId });
    return mobileError(
      "LESSON_UNAVAILABLE",
      "Não foi possível carregar esta aula agora.",
      503,
      requestId,
    );
  }
}
