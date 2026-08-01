import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { saveMobileTeacherCattyArtifact } from "@/lib/mobile-teacher-catty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request) {
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

    const result = await saveMobileTeacherCattyArtifact(
      authorization.user.id,
      await request.json().catch(() => null),
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
    console.error("[mobile-teacher-catty:artifact-save]", { error, requestId });
    return mobileError(
      "TEACHER_CATTY_ARTIFACT_NOT_SAVED",
      "Nao foi possivel salvar este artefato agora.",
      503,
      requestId,
    );
  }
}
