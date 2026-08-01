import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { redoMobileTeacherSubmission } from "@/lib/mobile-teacher-submissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ submissionId: string }> };

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
        "Use uma conta de teacher para liberar outra tentativa.",
        403,
        requestId,
      );
    }

    const { submissionId } = await context.params;
    const result = await redoMobileTeacherSubmission(
      session.user.id,
      submissionId,
      await request.json().catch(() => null),
    );
    if (!result.ok || !result.data) {
      return mobileError(
        result.reason === "INVALID"
          ? "INVALID_REQUEST"
          : result.reason === "PROFILE_NOT_FOUND"
            ? "TEACHER_PROFILE_UNAVAILABLE"
            : result.reason === "NOT_FOUND"
              ? "SUBMISSION_UNAVAILABLE"
              : "SUBMISSION_REDO_CONFLICT",
        result.message,
        result.reason === "INVALID"
          ? 400
          : result.reason === "NOT_FOUND" ||
              result.reason === "PROFILE_NOT_FOUND"
            ? 404
            : 409,
        requestId,
      );
    }

    revalidatePath("/ava/teacher");
    revalidatePath("/ava/student");
    return mobileJson({ ...result.data, message: result.message, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-submission:redo]", { error, requestId });
    return mobileError(
      "SUBMISSION_NOT_RETURNED",
      "Nao foi possivel liberar outra tentativa agora.",
      503,
      requestId,
    );
  }
}
