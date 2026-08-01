import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileTeacherSubmissionDetail } from "@/lib/mobile-teacher-submissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ submissionId: string }> };

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
    if (session.user.role !== "TEACHER") {
      return mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta de teacher para abrir esta entrega.",
        403,
        requestId,
      );
    }

    const { submissionId } = await context.params;
    const result = await getMobileTeacherSubmissionDetail(
      session.user.id,
      submissionId,
    );
    if (!result.ok || !result.data) {
      return mobileError(
        result.reason === "LIMIT_EXCEEDED"
          ? "SUBMISSION_LIMIT_EXCEEDED"
          : result.reason === "PROFILE_NOT_FOUND"
            ? "TEACHER_PROFILE_UNAVAILABLE"
            : "SUBMISSION_UNAVAILABLE",
        result.message,
        result.reason === "LIMIT_EXCEEDED" ? 413 : 404,
        requestId,
      );
    }
    return mobileJson({ submission: result.data, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-submission:detail]", { error, requestId });
    return mobileError(
      "SUBMISSION_UNAVAILABLE",
      "Nao foi possivel carregar esta entrega agora.",
      503,
      requestId,
    );
  }
}
