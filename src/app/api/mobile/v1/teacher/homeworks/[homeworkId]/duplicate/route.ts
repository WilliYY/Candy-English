import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { duplicateMobileTeacherHomework } from "@/lib/mobile-teacher-homework-editor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ homeworkId: string }> };

export async function POST(request: Request, context: RouteContext) {
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
    if (session.user.role !== "TEACHER") {
      return mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta de teacher para duplicar tarefas.",
        403,
        requestId,
      );
    }

    const { homeworkId } = await context.params;
    const result = await duplicateMobileTeacherHomework(
      session.user.id,
      homeworkId,
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
            : result.reason === "PROFILE_NOT_FOUND"
              ? "TEACHER_PROFILE_UNAVAILABLE"
              : result.reason === "NOT_FOUND"
                ? "HOMEWORK_UNAVAILABLE"
                : "HOMEWORK_DUPLICATE_CONFLICT",
        result.message,
        status,
        requestId,
      );
    }

    revalidatePath("/ava/teacher");
    revalidatePath("/ava/student");
    return mobileJson(
      { ...result.data, message: result.message, ok: true },
      result.data.createdCount > 0 ? 201 : 200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-teacher-homework:duplicate]", { error, requestId });
    return mobileError(
      "HOMEWORK_NOT_DUPLICATED",
      "Nao foi possivel duplicar esta tarefa agora.",
      503,
      requestId,
    );
  }
}
