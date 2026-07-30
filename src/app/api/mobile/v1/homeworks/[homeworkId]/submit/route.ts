import { z } from "zod";

import { submitStudentTextHomework } from "@/lib/homework-submission-service";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const answerSchema = z
  .object({
    answer: z
      .string()
      .trim()
      .min(1, "Escreva sua resposta antes de enviar.")
      .max(6000, "A resposta pode ter no máximo 6000 caracteres."),
  })
  .strict();

type RouteContext = {
  params: Promise<{ homeworkId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
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
      "Use uma conta de aluno para enviar esta homework.",
      403,
      requestId,
    );
  }

  const parsed = answerSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return mobileError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Revise sua resposta.",
      400,
      requestId,
    );
  }

  const { homeworkId } = await context.params;
  const result = await submitStudentTextHomework(
    session.user.id,
    homeworkId,
    parsed.data.answer,
  );

  if (!result.ok || !result.data) {
    return mobileError(
      "HOMEWORK_NOT_SUBMITTED",
      result.message,
      409,
      requestId,
    );
  }

  return mobileJson(
    {
      message: result.message,
      ok: true,
      submittedAt: result.data.submittedAt,
    },
    200,
    requestId,
  );
}
