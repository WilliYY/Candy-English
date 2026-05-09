import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { saveAvatarImage } from "@/lib/storage";

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

  try {
    const avatar = await saveAvatarImage(file);
    const prisma = getPrisma();

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        avatarMimeType: avatar.mimeType,
        avatarPath: avatar.relativePath,
      },
    });

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
