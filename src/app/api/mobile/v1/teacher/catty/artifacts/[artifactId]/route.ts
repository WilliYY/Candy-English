import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { changeMobileTeacherCattyArtifactStatus } from "@/lib/mobile-teacher-catty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ artifactId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  try {
    const token = parseBearerToken(request.headers.get("authorization"));
    const authorization = token ? await authorizeMobileAccess(token) : null;
    if (!authorization?.ok) {
      return mobileError(
        "SESSION_INVALID",
        "Entre novamente para continuar.",
        401,
        requestId,
      );
    }
    if (authorization.user.role !== "TEACHER") {
      return mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta de teacher para ajustar artefatos da Catty.",
        403,
        requestId,
      );
    }

    const { artifactId } = await context.params;
    const body = await request.json().catch(() => null);
    const result = await changeMobileTeacherCattyArtifactStatus(
      authorization.user.id,
      { ...(typeof body === "object" && body ? body : {}), artifactId },
    );
    if (!result.ok) {
      return mobileError(
        result.code,
        result.message,
        result.code === "TARGET_FORBIDDEN" ? 403 : 400,
        requestId,
      );
    }

    revalidatePath("/ava/teacher");
    revalidatePath("/ava/student");
    return mobileJson({ message: result.message, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-catty:artifact-status]", {
      error,
      requestId,
    });
    return mobileError(
      "TEACHER_CATTY_ARTIFACT_NOT_UPDATED",
      "Nao foi possivel atualizar este artefato agora.",
      503,
      requestId,
    );
  }
}
