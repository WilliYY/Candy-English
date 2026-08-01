import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileTeacherInteractiveFields,
  updateMobileTeacherInteractiveFields,
  type MobileTeacherInteractiveFieldFailureReason,
} from "@/lib/mobile-teacher-interactive-fields";

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
        "Use uma conta de teacher para editar campos interativos.",
        403,
        requestId,
      ),
    };
  }
  return { session };
}

function failureResponse(
  reason: MobileTeacherInteractiveFieldFailureReason | undefined,
  message: string,
  requestId: string,
) {
  const status =
    reason === "INVALID"
      ? 400
      : reason === "NOT_FOUND" || reason === "PROFILE_NOT_FOUND"
        ? 404
        : reason === "LIMIT_EXCEEDED"
          ? 413
          : 409;
  const code =
    reason === "INVALID"
      ? "INVALID_REQUEST"
      : reason === "PROFILE_NOT_FOUND"
        ? "TEACHER_PROFILE_UNAVAILABLE"
        : reason === "NOT_FOUND"
          ? "HOMEWORK_UNAVAILABLE"
          : reason === "LIMIT_EXCEEDED"
            ? "HOMEWORK_FIELDS_LIMIT_EXCEEDED"
            : reason === "FIELDS_LOCKED"
              ? "HOMEWORK_FIELDS_LOCKED"
              : "HOMEWORK_FIELDS_CONFLICT";
  return mobileError(code, message, status, requestId);
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  try {
    const authorization = await authorizeTeacher(request, requestId);
    if ("response" in authorization) return authorization.response;
    const { homeworkId } = await context.params;
    const result = await getMobileTeacherInteractiveFields(
      authorization.session.user.id,
      homeworkId,
    );
    if (!result.ok || !result.data) {
      return failureResponse(result.reason, result.message, requestId);
    }
    return mobileJson({ editor: result.data, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-homework:fields:get]", { error, requestId });
    return mobileError(
      "HOMEWORK_FIELDS_UNAVAILABLE",
      "Nao foi possivel abrir os campos desta tarefa agora.",
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
    const result = await updateMobileTeacherInteractiveFields(
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
      { editor: result.data, message: result.message, ok: true },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-teacher-homework:fields:update]", { error, requestId });
    return mobileError(
      "HOMEWORK_FIELDS_NOT_UPDATED",
      "Nao foi possivel salvar os campos desta tarefa agora.",
      503,
      requestId,
    );
  }
}
