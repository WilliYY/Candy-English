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
      role: true,
      studentProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    return new NextResponse("Foto nao encontrada.", { status: 404 });
  }

  if (session.user.role !== "ADMIN" && session.user.id !== user.id) {
    let canReadAssignedStudentAvatar = false;

    if (session.user.role === "TEACHER" && user.role === "STUDENT") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (teacherProfile && user.studentProfile) {
        const assignment = await prisma.studentTeacherAssignment.findUnique({
          where: {
            teacherProfileId_studentProfileId: {
              studentProfileId: user.studentProfile.id,
              teacherProfileId: teacherProfile.id,
            },
          },
          select: { id: true },
        });

        canReadAssignedStudentAvatar = Boolean(assignment);
      }
    }

    if (!canReadAssignedStudentAvatar) {
      return new NextResponse("Nao autorizado.", { status: 403 });
    }
  }

  if (!user?.avatarPath || !user.avatarMimeType) {
    return new NextResponse("Foto nao encontrada.", { status: 404 });
  }

  let file: Buffer;

  try {
    file = await readFile(getStoragePath(user.avatarPath));
  } catch {
    return new NextResponse("Foto nao encontrada.", { status: 404 });
  }

  const body = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": user.avatarMimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
