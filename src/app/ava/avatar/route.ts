import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { deleteAvatarImage, saveAvatarImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return NextResponse.json(
      { message: "Entre no AVA para atualizar sua foto.", ok: false },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Selecione uma imagem para enviar.", ok: false },
      { status: 400 },
    );
  }

  let savedAvatarPath: string | null = null;
  let persisted = false;

  try {
    const avatar = await saveAvatarImage(file);
    savedAvatarPath = avatar.relativePath;
    const prisma = getPrisma();
    const previousAvatarPath = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ avatarPath: string | null }>>`
        SELECT "avatarPath"
        FROM "User"
        WHERE "id" = ${session.user.id}
        FOR UPDATE
      `;
      const currentUser = rows[0];

      if (!currentUser) {
        throw new Error("Usuario nao encontrado.");
      }

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          avatarMimeType: avatar.mimeType,
          avatarPath: avatar.relativePath,
        },
      });

      return currentUser.avatarPath;
    });
    persisted = true;

    if (previousAvatarPath && previousAvatarPath !== avatar.relativePath) {
      await deleteAvatarImage(previousAvatarPath).catch(() => undefined);
    }

    revalidatePath("/ava", "layout");
    revalidatePath("/ava/student");
    revalidatePath("/ava/teacher");
    revalidatePath("/ava/admin");

    return NextResponse.json({
      avatarUrl: `/ava/avatar/${session.user.id}?v=${encodeURIComponent(
        avatar.relativePath,
      )}`,
      message: "Foto atualizada com sucesso.",
      ok: true,
    });
  } catch (error) {
    if (savedAvatarPath && !persisted) {
      await deleteAvatarImage(savedAvatarPath).catch(() => undefined);
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel enviar a foto.",
        ok: false,
      },
      { status: 400 },
    );
  }
}
