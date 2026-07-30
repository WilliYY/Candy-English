import { readFile } from "node:fs/promises";

import { revalidatePath } from "next/cache";

import { replaceUserAvatar } from "@/lib/avatar-service";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getPrisma } from "@/lib/prisma";
import { getMobileStudentProfile } from "@/lib/profile-service";
import {
  AVATAR_MAX_BYTES,
  detectAvatarMimeType,
  getStoragePath,
  isMissingStorageFileError,
  StorageValidationError,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_MULTIPART_BYTES = AVATAR_MAX_BYTES + 512 * 1024;

async function authenticateStudent(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  const session = token ? await authorizeMobileAccess(token) : null;

  return session?.ok ? session : null;
}

function roleError(requestId: string) {
  return mobileError(
    "ROLE_FORBIDDEN",
    "Use uma conta de aluno para acessar esta foto.",
    403,
    requestId,
  );
}

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const session = await authenticateStudent(request);

  if (!session) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  if (session.user.role !== "STUDENT") {
    return roleError(requestId);
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        isActive: true,
        role: "STUDENT",
      },
      select: {
        avatarMimeType: true,
        avatarPath: true,
      },
    });

    if (!user?.avatarPath || !user.avatarMimeType) {
      return mobileError(
        "AVATAR_NOT_FOUND",
        "Foto nao encontrada.",
        404,
        requestId,
      );
    }

    const file = await readFile(getStoragePath(user.avatarPath));
    const detectedMimeType = detectAvatarMimeType(file);

    if (
      file.byteLength <= 0 ||
      file.byteLength > AVATAR_MAX_BYTES ||
      !detectedMimeType ||
      detectedMimeType !== user.avatarMimeType
    ) {
      return mobileError(
        "AVATAR_INVALID",
        "A foto deste perfil esta indisponivel.",
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
        "Content-Length": String(file.byteLength),
        "Content-Type": detectedMimeType,
        Vary: "Authorization",
        "X-Content-Type-Options": "nosniff",
        "X-Request-ID": requestId,
      },
      status: 200,
    });
  } catch (error) {
    if (isMissingStorageFileError(error)) {
      return mobileError(
        "AVATAR_NOT_FOUND",
        "Foto nao encontrada.",
        404,
        requestId,
      );
    }

    console.error("[mobile-avatar:get]", { error, requestId });
    return mobileError(
      "AVATAR_UNAVAILABLE",
      "Nao foi possivel carregar sua foto agora.",
      503,
      requestId,
    );
  }
}

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);
  const session = await authenticateStudent(request);

  if (!session) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  if (session.user.role !== "STUDENT") {
    return roleError(requestId);
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return mobileError(
      "AVATAR_TOO_LARGE",
      "A foto precisa ter ate 2 MB.",
      413,
      requestId,
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");

  if (!(file instanceof File)) {
    return mobileError(
      "INVALID_REQUEST",
      "Selecione uma imagem para enviar.",
      400,
      requestId,
    );
  }

  try {
    await replaceUserAvatar(session.user.id, file);
    const profile = await getMobileStudentProfile(session.user.id);

    revalidatePath("/ava", "layout");
    revalidatePath("/ava/student");
    revalidatePath("/ava/teacher");
    revalidatePath("/ava/admin");

    return mobileJson(
      {
        avatarRevision: profile?.avatarRevision ?? null,
        message: "Foto atualizada com sucesso.",
        ok: true,
      },
      200,
      requestId,
    );
  } catch (error) {
    if (error instanceof StorageValidationError) {
      return mobileError(
        "INVALID_AVATAR",
        error.message,
        400,
        requestId,
      );
    }

    console.error("[mobile-avatar:update]", { error, requestId });
    return mobileError(
      "AVATAR_NOT_UPDATED",
      "Nao foi possivel enviar a foto agora.",
      503,
      requestId,
    );
  }
}
