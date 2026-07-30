import { canStudentAccessHomework } from "@/lib/homework-submission-service";
import {
  getListeningSpeedMode,
  synthesizeListeningSpeech,
} from "@/lib/listening-tts";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fieldId: string; homeworkId: string }>;
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
        "Use uma conta de aluno para ouvir esta atividade.",
        403,
        requestId,
      );
    }

    const profile = await getPrisma().studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!profile) {
      return mobileError(
        "LISTENING_UNAVAILABLE",
        "Áudio não encontrado.",
        404,
        requestId,
      );
    }

    const { fieldId, homeworkId } = await context.params;
    const field = await getPrisma().homeworkInteractiveField.findUnique({
      where: { id: fieldId },
      select: {
        homework: {
          select: {
            id: true,
            kind: true,
            lesson: { select: { studentProfileId: true } },
            status: true,
            studentAssignments: {
              where: { studentProfileId: profile.id },
              select: { studentProfileId: true },
              take: 1,
            },
          },
        },
        placeholder: true,
        type: true,
      },
    });

    if (
      !field ||
      field.type !== "LISTENING" ||
      field.homework.id !== homeworkId ||
      field.homework.kind !== "INTERACTIVE" ||
      field.homework.status !== "PUBLISHED" ||
      !canStudentAccessHomework(field.homework, profile.id)
    ) {
      return mobileError(
        "LISTENING_UNAVAILABLE",
        "Áudio não encontrado.",
        404,
        requestId,
      );
    }

    const speech = await synthesizeListeningSpeech(
      field.placeholder,
      getListeningSpeedMode(request),
      `user:${session.user.id}`,
    );

    if (!speech.ok) {
      return mobileError(
        "LISTENING_UNAVAILABLE",
        speech.message,
        speech.status,
        requestId,
      );
    }

    return new Response(speech.audio, {
      headers: {
        "Cache-Control": "private, max-age=604800",
        "Content-Type": speech.contentType,
        Vary: "Authorization",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId,
      },
      status: 200,
    });
  } catch (error) {
    console.error("[mobile-listening]", { error, requestId });
    return mobileError(
      "LISTENING_UNAVAILABLE",
      "Áudio indisponível.",
      503,
      requestId,
    );
  }
}
