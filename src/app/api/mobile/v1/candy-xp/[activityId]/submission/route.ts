import {
  saveStudentCandyXpDraft,
  submitStudentCandyXpActivity,
} from "@/lib/candy-xp-submission-service";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { candyXpActivityAnswerSchema } from "@/lib/validations/candy-xp-activities";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const answersSchema = candyXpActivityAnswerSchema
  .pick({ answers: true })
  .strict();

type RouteContext = {
  params: Promise<{ activityId: string }>;
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
        "Use uma conta de aluno para responder esta atividade Candy XP.",
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

    const { activityId } = await context.params;
    const input = { activityId, answers: parsed.data.answers };
    const result =
      mode === "DRAFT"
        ? await saveStudentCandyXpDraft(session.user.id, input)
        : await submitStudentCandyXpActivity(session.user.id, input);

    if (!result.ok || !result.data) {
      const status =
        result.reason === "INVALID"
          ? 400
          : result.reason === "NOT_FOUND"
            ? 404
            : 409;

      return mobileError(
        mode === "DRAFT"
          ? "CANDY_XP_DRAFT_NOT_SAVED"
          : "CANDY_XP_ACTIVITY_NOT_SUBMITTED",
        result.message,
        status,
        requestId,
      );
    }

    return mobileJson(
      {
        message: result.message,
        ok: true,
        replayed: result.data.replayed,
        submission: result.data.submission,
      },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-candy-xp-activity:submission]", {
      error,
      mode,
      requestId,
    });
    return mobileError(
      "CANDY_XP_ACTIVITY_UNAVAILABLE",
      "Nao foi possivel atualizar esta atividade agora.",
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
