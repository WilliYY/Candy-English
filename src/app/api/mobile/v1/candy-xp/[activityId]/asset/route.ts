import { readFile } from "node:fs/promises";

import { getMobileStudentCandyXpAsset } from "@/lib/candy-xp-submission-service";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getStoragePath,
  isMissingStorageFileError,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ activityId: string }>;
};

function hasExpectedSignature(file: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    return file.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (mimeType === "image/png") {
    return file.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }

  if (mimeType === "image/jpeg") {
    return file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff;
  }

  if (mimeType === "image/webp") {
    return (
      file.subarray(0, 4).toString("ascii") === "RIFF" &&
      file.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

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
        "Use uma conta de aluno para abrir este material Candy XP.",
        403,
        requestId,
      );
    }

    const { activityId } = await context.params;
    const asset = await getMobileStudentCandyXpAsset(
      session.user.id,
      activityId,
    );

    if (!asset) {
      return mobileError(
        "CANDY_XP_ASSET_UNAVAILABLE",
        "Material Candy XP nao encontrado.",
        404,
        requestId,
      );
    }

    let file: Buffer;

    try {
      file = await readFile(getStoragePath(asset.storagePath));
    } catch (error) {
      return mobileError(
        "CANDY_XP_ASSET_UNAVAILABLE",
        isMissingStorageFileError(error)
          ? "Material Candy XP nao encontrado."
          : "Nao foi possivel carregar este material.",
        isMissingStorageFileError(error) ? 404 : 503,
        requestId,
      );
    }

    if (
      file.byteLength !== asset.sizeBytes ||
      !hasExpectedSignature(file, asset.mimeType)
    ) {
      return mobileError(
        "CANDY_XP_ASSET_INVALID",
        "O arquivo desta atividade esta indisponivel.",
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
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          asset.fileName,
        )}"`,
        "Content-Length": String(file.byteLength),
        "Content-Type": asset.mimeType,
        Vary: "Authorization",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId,
      },
      status: 200,
    });
  } catch (error) {
    console.error("[mobile-candy-xp-activity:asset]", { error, requestId });
    return mobileError(
      "CANDY_XP_ASSET_UNAVAILABLE",
      "Nao foi possivel carregar este material agora.",
      503,
      requestId,
    );
  }
}
