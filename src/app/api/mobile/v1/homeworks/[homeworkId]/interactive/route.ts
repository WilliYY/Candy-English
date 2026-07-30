import {
  saveStudentInteractiveHomeworkDraft,
  submitStudentInteractiveHomework,
} from "@/lib/interactive-homework-service";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { interactiveHomeworkAnswerSchema } from "@/lib/validations/learning";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const answersSchema = interactiveHomeworkAnswerSchema
  .pick({ answers: true })
  .strict();

type RouteContext = {
  params: Promise<{ homeworkId: string }>;
};

async function handle(
  request: Request,
  context: RouteContext,
  mode: "DRAFT" | "SUBMIT",
) {
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
        "Use uma conta de aluno para responder esta atividade.",
        403,
        requestId,
      );
    }

    const parsed = answersSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsed.success) {
      return mobileError(
        "INVALID_REQUEST",
        parsed.error.issues[0]?.message ?? "Revise suas respostas.",
        400,
        requestId,
      );
    }

    const { homeworkId } = await context.params;
    const input = { answers: parsed.data.answers, homeworkId };
    const result =
      mode === "DRAFT"
        ? await saveStudentInteractiveHomeworkDraft(session.user.id, input)
        : await submitStudentInteractiveHomework(session.user.id, input);

    if (!result.ok || !result.data) {
      return mobileError(
        mode === "DRAFT"
          ? "HOMEWORK_DRAFT_NOT_SAVED"
          : "HOMEWORK_NOT_SUBMITTED",
        result.message,
        409,
        requestId,
      );
    }

    return mobileJson(
      {
        message: result.message,
        ok: true,
        status: result.data.status,
        submittedAt: result.data.submittedAt,
      },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-interactive-homework]", {
      error,
      mode,
      requestId,
    });
    return mobileError(
      "HOMEWORK_UNAVAILABLE",
      "Não foi possível atualizar esta atividade agora.",
      503,
      requestId,
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context, "DRAFT");
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context, "SUBMIT");
}
