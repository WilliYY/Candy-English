import { revalidatePath } from "next/cache";
import { z } from "zod";

import { acceptStudentPreRegistrationWithMobileSession } from "@/app/ava/pre-registrations/actions";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileTeacherPreRegistration } from "@/lib/mobile-teacher-pre-registrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const inputSchema = z
  .object({
    confirmConversion: z.literal(true),
    confirmMissingAgendaData: z.boolean(),
    emailForLogin: z.string().trim().email().max(254),
    initialPassword: z.string().trim().min(8).max(120),
    operationId: z.string().uuid(),
  })
  .strict();

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const token = parseBearerToken(request.headers.get("authorization"));
  const authorization = token ? await authorizeMobileAccess(token) : null;
  if (!authorization?.ok || !token) {
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
      "Use uma conta de teacher para converter este pre-cadastro.",
      403,
      requestId,
    );
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return mobileError(
      "INVALID_REQUEST",
      "Revise email, senha e confirmacoes.",
      400,
      requestId,
    );
  }
  try {
    const { requestId: preRegistrationId } = await context.params;
    const result = await acceptStudentPreRegistrationWithMobileSession(
      token,
      {
        confirmConversion: true,
        confirmMissingAgendaData: parsed.data.confirmMissingAgendaData,
        emailForLogin: parsed.data.emailForLogin,
        initialPassword: parsed.data.initialPassword,
        requestId: preRegistrationId,
      },
      parsed.data.operationId,
    );
    if (!result.ok) {
      const unavailable = /permissao|nao encontrada/i.test(result.message);
      return mobileError(
        unavailable
          ? "PRE_REGISTRATION_UNAVAILABLE"
          : "PRE_REGISTRATION_CONFLICT",
        result.message,
        unavailable ? 404 : 409,
        requestId,
      );
    }
    const refreshed = await getMobileTeacherPreRegistration(
      authorization.user.id,
      preRegistrationId,
    );
    revalidatePath("/ava/teacher");
    return mobileJson(
      {
        message: result.message,
        ok: true,
        preRegistration: refreshed.data ?? null,
      },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-teacher-pre-registration:convert]", {
      error,
      requestId,
    });
    return mobileError(
      "PRE_REGISTRATION_NOT_CONVERTED",
      "Nao foi possivel converter este pre-cadastro agora.",
      503,
      requestId,
    );
  }
}
