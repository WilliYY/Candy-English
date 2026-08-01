import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { createMobileTeacherHomework } from "@/lib/mobile-teacher-homework-editor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
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
        "Use uma conta de teacher para criar tarefas.",
        403,
        requestId,
      );
    }

    const result = await createMobileTeacherHomework(
      session.user.id,
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
                ? "LESSON_UNAVAILABLE"
                : "HOMEWORK_OPERATION_CONFLICT",
        result.message,
        status,
        requestId,
      );
    }

    revalidatePath("/ava/teacher");
    revalidatePath("/ava/student");
    return mobileJson(
      { ...result.data, message: result.message, ok: true },
      result.data.replayed ? 200 : 201,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-teacher-homework:create]", { error, requestId });
    return mobileError(
      "HOMEWORK_NOT_CREATED",
      "Nao foi possivel criar esta tarefa agora.",
      503,
      requestId,
    );
  }
}
