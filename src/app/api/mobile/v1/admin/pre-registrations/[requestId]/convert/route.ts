import { revalidatePath } from "next/cache";

import { acceptStudentPreRegistrationWithMobileSession } from "@/app/ava/pre-registrations/actions";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  convertMobileAdminPreRegistration,
  MobileAdminPreRegistrationConversionError,
} from "@/lib/mobile-admin-pre-registration-conversion";
import { MobileAdminPreRegistrationsError } from "@/lib/mobile-admin-pre-registrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (authorization.user.role !== "ADMIN") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta administrativa para converter este pre-cadastro.",
      403,
      requestId,
    );
  }

  try {
    const { requestId: preRegistrationId } = await context.params;
    const result = await convertMobileAdminPreRegistration(
      authorization.user,
      preRegistrationId,
      await request.json().catch(() => null),
      {
        executeConversion: (input, operationId, expectedUpdatedAt) =>
          acceptStudentPreRegistrationWithMobileSession(
            token,
            input,
            operationId,
            { expectedUpdatedAt },
          ),
      },
    );
    revalidatePath("/ava/admin");
    return mobileJson({ ok: true, ...result }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminPreRegistrationConversionError) {
      const status =
        error.code === "ROLE_FORBIDDEN"
          ? 403
          : ["INVALID_INPUT", "MISSING_DATA_CONFIRMATION"].includes(
                error.code,
              )
            ? 400
            : 409;
      const messages: Partial<
        Record<MobileAdminPreRegistrationConversionError["code"], string>
      > = {
        EDIT_CONFLICT:
          "Este pre-cadastro mudou em outro aparelho. Recarregue antes de converter.",
        INVALID_INPUT: "Revise email, senha e confirmacoes.",
        MISSING_DATA_CONFIRMATION:
          "Confirme os dados financeiros ou de agenda que serao preenchidos depois.",
        PRE_REGISTRATION_UNAVAILABLE:
          "Este pre-cadastro nao pode mais ser convertido.",
        ROLE_FORBIDDEN: "Voce nao tem permissao para converter alunos.",
      };
      return mobileError(
        error.code,
        error.code === "CONVERSION_CONFLICT"
          ? error.message
          : messages[error.code] ?? "Nao foi possivel converter o aluno.",
        status,
        requestId,
      );
    }
    if (error instanceof MobileAdminPreRegistrationsError) {
      const notFound = error.code === "PRE_REGISTRATION_NOT_FOUND";
      return mobileError(
        error.code,
        notFound ? "Pre-cadastro nao encontrado." : "Pre-cadastro invalido.",
        notFound ? 404 : error.code === "ROLE_FORBIDDEN" ? 403 : 400,
        requestId,
      );
    }
    console.error("[mobile-admin-pre-registration:convert]", {
      error,
      requestId,
    });
    return mobileError(
      "ADMIN_PRE_REGISTRATION_NOT_CONVERTED",
      "Nao foi possivel converter este pre-cadastro agora.",
      503,
      requestId,
    );
  }
}
