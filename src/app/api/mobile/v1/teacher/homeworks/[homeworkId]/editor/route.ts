import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  deleteMobileTeacherHomework,
  getMobileTeacherHomeworkEditor,
  updateMobileTeacherHomework,
  type MobileTeacherHomeworkFailureReason,
} from "@/lib/mobile-teacher-homework-editor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ homeworkId: string }> };

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
        "Use uma conta de teacher para editar tarefas.",
        403,
        requestId,
      ),
    };
  }
  return { session };
}

function failureResponse(
  reason: MobileTeacherHomeworkFailureReason | undefined,
  message: string,
  requestId: string,
) {
  const status =
    reason === "INVALID"
      ? 400
      : reason === "STUDENT_FORBIDDEN"
        ? 403
        : reason === "NOT_FOUND" || reason === "PROFILE_NOT_FOUND"
          ? 404
          : 409;
  const code =
    reason === "INVALID"
      ? "INVALID_REQUEST"
      : reason === "STUDENT_FORBIDDEN"
        ? "STUDENT_FORBIDDEN"
        : reason === "PROFILE_NOT_FOUND"
          ? "TEACHER_PROFILE_UNAVAILABLE"
          : reason === "NOT_FOUND"
            ? "HOMEWORK_UNAVAILABLE"
            : reason === "LIMIT_EXCEEDED"
              ? "HOMEWORK_EDITOR_LIMIT_EXCEEDED"
              : reason === "ASSIGNMENTS_LOCKED"
                ? "HOMEWORK_ASSIGNMENTS_LOCKED"
                : "HOMEWORK_EDIT_CONFLICT";
  return mobileError(code, message, status, requestId);
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  try {
    const authorization = await authorizeTeacher(request, requestId);
    if ("response" in authorization) return authorization.response;

    const { homeworkId } = await context.params;
    const result = await getMobileTeacherHomeworkEditor(
      authorization.session.user.id,
      homeworkId,
    );
    if (!result.ok || !result.data) {
      return failureResponse(result.reason, result.message, requestId);
    }
    return mobileJson({ homework: result.data, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-homework:editor:get]", { error, requestId });
    return mobileError(
      "HOMEWORK_EDITOR_UNAVAILABLE",
      "Nao foi possivel abrir o editor desta tarefa agora.",
      503,
      requestId,
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  try {
    const authorization = await authorizeTeacher(request, requestId);
    if ("response" in authorization) return authorization.response;

    const { homeworkId } = await context.params;
    const result = await updateMobileTeacherHomework(
      authorization.session.user.id,
      homeworkId,
      await request.json().catch(() => null),
    );
    if (!result.ok || !result.data) {
      return failureResponse(result.reason, result.message, requestId);
    }
    revalidatePath("/ava/teacher");
    revalidatePath("/ava/student");
    return mobileJson(
      { ...result.data, message: result.message, ok: true },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-teacher-homework:editor:update]", {
      error,
      requestId,
    });
    return mobileError(
      "HOMEWORK_NOT_UPDATED",
      "Nao foi possivel atualizar esta tarefa agora.",
      503,
      requestId,
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  try {
    const authorization = await authorizeTeacher(request, requestId);
    if ("response" in authorization) return authorization.response;

    const { homeworkId } = await context.params;
    const result = await deleteMobileTeacherHomework(
      authorization.session.user.id,
      homeworkId,
      await request.json().catch(() => null),
    );
    if (!result.ok || !result.data) {
      return failureResponse(result.reason, result.message, requestId);
    }
    revalidatePath("/ava/teacher");
    revalidatePath("/ava/student");
    return mobileJson(
      { ...result.data, message: result.message, ok: true },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-teacher-homework:editor:delete]", {
      error,
      requestId,
    });
    return mobileError(
      "HOMEWORK_NOT_DELETED",
      "Nao foi possivel excluir esta tarefa agora.",
      503,
      requestId,
    );
  }
}
