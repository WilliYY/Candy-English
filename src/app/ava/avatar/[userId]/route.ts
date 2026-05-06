import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return new NextResponse("Nao autorizado.", { status: 401 });
  }

  const { userId } = await params;
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarMimeType: true,
      avatarPath: true,
      id: true,
    },
  });

  if (!user?.avatarPath || !user.avatarMimeType) {
    return new NextResponse("Foto nao encontrada.", { status: 404 });
  }

  const file = await readFile(getStoragePath(user.avatarPath));

  return new NextResponse(file, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": user.avatarMimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
