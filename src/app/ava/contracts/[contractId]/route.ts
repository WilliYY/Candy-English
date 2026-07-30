import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAuthorizedContractDocument,
  getContractContentDisposition,
  hasPdfSignature,
} from "@/lib/contract-documents";
import { isRole } from "@/lib/roles";
import {
  CONTRACT_MAX_BYTES,
  getStoragePath,
  isMissingStorageFileError,
} from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return new NextResponse("Nao autorizado.", { status: 401 });
  }

  const { contractId } = await params;
  const contract = await getAuthorizedContractDocument({
    id: session.user.id,
    role: session.user.role,
  }, contractId);

  if (!contract) {
    return new NextResponse("Contrato nao encontrado.", { status: 404 });
  }

  let file: Buffer;

  try {
    file = await readFile(getStoragePath(contract.storagePath));
  } catch (error) {
    return new NextResponse(
      isMissingStorageFileError(error)
        ? "Contrato nao encontrado."
        : "Nao foi possivel carregar o contrato.",
      { status: isMissingStorageFileError(error) ? 404 : 500 },
    );
  }

  if (
    file.byteLength <= 0 ||
    file.byteLength > CONTRACT_MAX_BYTES ||
    !hasPdfSignature(file)
  ) {
    return new NextResponse("Arquivo de contrato invalido.", { status: 422 });
  }

  const body = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": getContractContentDisposition(
        contract.fileName,
        "inline",
      ),
      "Content-Length": String(file.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
