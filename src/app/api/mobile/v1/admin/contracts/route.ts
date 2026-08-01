import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  createMobileAdminContract,
  getMobileAdminContracts,
  MobileAdminContractsError,
} from "@/lib/mobile-admin-contracts";
import { CONTRACT_MAX_BYTES } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contractError(error: MobileAdminContractsError, requestId: string) {
  const messages: Record<MobileAdminContractsError["code"], string> = {
    INVALID_FILE: "Selecione um PDF valido de ate 8 MB.",
    INVALID_QUERY: "Revise os filtros ou os dados do contrato.",
    NOT_FOUND: "Contrato nao encontrado.",
    OPERATION_CONFLICT: "Esta operacao ja foi usada com outro contrato.",
    RESULT_LIMIT: "Ha alunos demais para uma resposta movel segura.",
    ROLE_FORBIDDEN: "Voce nao tem acesso aos contratos administrativos.",
    STUDENT_NOT_FOUND: "Aluno ativo nao encontrado.",
  };
  const status: Record<MobileAdminContractsError["code"], number> = {
    INVALID_FILE: 422,
    INVALID_QUERY: 400,
    NOT_FOUND: 404,
    OPERATION_CONFLICT: 409,
    RESULT_LIMIT: 409,
    ROLE_FORBIDDEN: 403,
    STUDENT_NOT_FOUND: 404,
  };
  return mobileError(error.code, messages[error.code], status[error.code], requestId);
}

async function authorize(request: Request, requestId: string) {
  const token = parseBearerToken(request.headers.get("authorization"));
  const authorization = token ? await authorizeMobileAccess(token) : null;
  if (!authorization?.ok) {
    return {
      error: mobileError(
        "SESSION_INVALID",
        "Entre novamente para continuar.",
        401,
        requestId,
      ),
    } as const;
  }
  if (authorization.user.role !== "ADMIN") {
    return {
      error: mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta administrativa para acessar os contratos.",
        403,
        requestId,
      ),
    } as const;
  }
  return { user: authorization.user } as const;
}

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorize(request, requestId);
  if ("error" in authorization) return authorization.error;

  const url = new URL(request.url);
  try {
    const catalog = await getMobileAdminContracts(authorization.user, {
      assignment: url.searchParams.get("assignment") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
    });
    return mobileJson({ catalog, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminContractsError) {
      return contractError(error, requestId);
    }
    console.error("[mobile-admin-contracts]", { error, requestId });
    return mobileError(
      "ADMIN_CONTRACTS_UNAVAILABLE",
      "Nao foi possivel carregar os contratos agora.",
      503,
      requestId,
    );
  }
}

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorize(request, requestId);
  if ("error" in authorization) return authorization.error;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > CONTRACT_MAX_BYTES + 128 * 1024
  ) {
    return mobileError(
      "INVALID_FILE",
      "Selecione um PDF valido de ate 8 MB.",
      413,
      requestId,
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("contract");
    if (!(file instanceof File)) {
      return mobileError(
        "INVALID_FILE",
        "Selecione um PDF valido de ate 8 MB.",
        422,
        requestId,
      );
    }
    const result = await createMobileAdminContract(
      authorization.user,
      {
        confirmUpload: formData.get("confirmUpload") === "true",
        operationId: formData.get("operationId"),
        studentProfileId:
          typeof formData.get("studentProfileId") === "string" &&
          String(formData.get("studentProfileId")).trim()
            ? String(formData.get("studentProfileId")).trim()
            : null,
        title: formData.get("title"),
      },
      file,
    );
    return mobileJson(
      {
        message: result.replayed
          ? "Contrato ja confirmado anteriormente."
          : "Contrato enviado com sucesso.",
        ok: true,
        result,
      },
      result.replayed ? 200 : 201,
      requestId,
    );
  } catch (error) {
    if (error instanceof MobileAdminContractsError) {
      return contractError(error, requestId);
    }
    console.error("[mobile-admin-contract-upload]", { error, requestId });
    return mobileError(
      "ADMIN_CONTRACT_UPLOAD_UNAVAILABLE",
      "Nao foi possivel enviar o contrato agora.",
      503,
      requestId,
    );
  }
}
