import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { replaceUserAvatar } from "@/lib/avatar-service";
import { auth } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { StorageValidationError } from "@/lib/storage";

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
    const avatar = await replaceUserAvatar(session.user.id, file);

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
    const isValidationError = error instanceof StorageValidationError;

    return NextResponse.json(
      {
        message: isValidationError
          ? error.message
          : "Nao foi possivel enviar a foto agora.",
        ok: false,
      },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
