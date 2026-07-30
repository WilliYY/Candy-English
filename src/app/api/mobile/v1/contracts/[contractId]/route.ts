import { readFile } from "node:fs/promises";

import {
  getAuthorizedContractDocument,
  getContractContentDisposition,
  hasPdfSignature,
} from "@/lib/contract-documents";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  CONTRACT_MAX_BYTES,
  getStoragePath,
  isMissingStorageFileError,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ contractId: string }>;
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
        "Use uma conta de aluno para baixar este contrato.",
        403,
        requestId,
      );
    }

    const { contractId } = await context.params;
    const contract = await getAuthorizedContractDocument(
      session.user,
      contractId,
    );

    if (!contract) {
      return mobileError(
        "CONTRACT_UNAVAILABLE",
        "Contrato não encontrado.",
        404,
        requestId,
      );
    }

    let file: Buffer;

    try {
      file = await readFile(getStoragePath(contract.storagePath));
    } catch (error) {
      return mobileError(
        "CONTRACT_UNAVAILABLE",
        isMissingStorageFileError(error)
          ? "Contrato não encontrado."
          : "Não foi possível carregar o contrato.",
        isMissingStorageFileError(error) ? 404 : 503,
        requestId,
      );
    }

    if (
      file.byteLength <= 0 ||
      file.byteLength > CONTRACT_MAX_BYTES ||
      !hasPdfSignature(file)
    ) {
      return mobileError(
        "CONTRACT_INVALID",
        "O arquivo deste contrato está indisponível.",
        422,
        requestId,
      );
    }

    const body = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": getContractContentDisposition(contract.fileName),
        "Content-Length": String(file.byteLength),
        "Content-Type": "application/pdf",
        Vary: "Authorization",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId,
      },
      status: 200,
    });
  } catch (error) {
    console.error("[mobile-contract]", { error, requestId });
    return mobileError(
      "CONTRACT_UNAVAILABLE",
      "Não foi possível carregar este contrato agora.",
      503,
      requestId,
    );
  }
}
