import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileTeacherLessonEditor,
  updateMobileTeacherLesson,
} from "@/lib/mobile-teacher-lesson-editor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

async function authorizeTeacher(request: Request, requestId: string) {
  const token = parseBearerToken(request.headers.get("authorization"));
  const session = token ? await authorizeMobileAccess(token) : null;

  if (!session?.ok) {
    return {
      response: mobileError(
        "SESSION_INVALID",
        "Entre novamente para continuar.",
        401,
        requestId,
      ),
    };
  }

  if (session.user.role !== "TEACHER") {
    return {
      response: mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta de teacher para editar aulas.",
        403,
        requestId,
      ),
    };
  }

  return { session };
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);

  try {
    const authorization = await authorizeTeacher(request, requestId);

    if ("response" in authorization) {
      return authorization.response;
    }

    const { lessonId } = await context.params;
    const result = await getMobileTeacherLessonEditor(
      authorization.session.user.id,
      lessonId,
    );

    if (!result.ok || !result.data) {
      return mobileError(
        result.reason === "PROFILE_NOT_FOUND"
          ? "TEACHER_PROFILE_UNAVAILABLE"
          : result.reason === "LIMIT_EXCEEDED"
            ? "LESSON_EDITOR_LIMIT_EXCEEDED"
            : "LESSON_UNAVAILABLE",
        result.message,
        result.reason === "LIMIT_EXCEEDED" ? 409 : 404,
        requestId,
      );
    }

    return mobileJson({ lesson: result.data, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-lesson:editor:get]", { error, requestId });
    return mobileError(
      "LESSON_EDITOR_UNAVAILABLE",
      "Nao foi possivel abrir o editor desta aula agora.",
      503,
      requestId,
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);

  try {
    const authorization = await authorizeTeacher(request, requestId);

    if ("response" in authorization) {
      return authorization.response;
    }

    const { lessonId } = await context.params;
    const result = await updateMobileTeacherLesson(
      authorization.session.user.id,
      lessonId,
      await request.json().catch(() => null),
    );

    if (!result.ok || !result.data) {
      const status =
        result.reason === "INVALID"
          ? 400
          : result.reason === "STUDENT_FORBIDDEN"
            ? 403
            : result.reason === "NOT_FOUND" ||
                result.reason === "PROFILE_NOT_FOUND"
              ? 404
              : 409;

      return mobileError(
        result.reason === "INVALID"
          ? "INVALID_REQUEST"
          : result.reason === "STUDENT_FORBIDDEN"
            ? "STUDENT_FORBIDDEN"
            : result.reason === "NOT_FOUND"
              ? "LESSON_UNAVAILABLE"
              : result.reason === "PROFILE_NOT_FOUND"
                ? "TEACHER_PROFILE_UNAVAILABLE"
                : "LESSON_EDIT_CONFLICT",
        result.message,
        status,
        requestId,
      );
    }

    revalidatePath("/ava/teacher");
    revalidatePath("/ava/student");

    return mobileJson(
      {
        lessonId: result.data.lessonId,
        message: result.message,
        ok: true,
        replayed: result.data.replayed,
        updatedAt: result.data.updatedAt,
      },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-teacher-lesson:editor:update]", {
      error,
      requestId,
    });
    return mobileError(
      "LESSON_NOT_UPDATED",
      "Nao foi possivel atualizar esta aula agora.",
      503,
      requestId,
    );
  }
}
