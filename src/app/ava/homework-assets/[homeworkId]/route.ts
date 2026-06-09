import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ homeworkId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return new NextResponse("Nao autorizado.", { status: 401 });
  }

  const { homeworkId } = await params;
  const prisma = getPrisma();
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: {
      assetFileName: true,
      assetMimeType: true,
      assetStoragePath: true,
      lesson: {
        select: {
          studentProfileId: true,
        },
      },
      status: true,
      studentAssignments: {
        select: {
          studentProfileId: true,
        },
      },
      teacherProfileId: true,
    },
  });

  if (!homework?.assetStoragePath || !homework.assetMimeType) {
    return new NextResponse("Arquivo nao encontrado.", { status: 404 });
  }

  if (session.user.role === "STUDENT") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (
      homework.status !== "PUBLISHED" ||
      !studentProfile ||
      (homework.lesson.studentProfileId !== studentProfile.id &&
        !homework.studentAssignments.some(
          (assignment) => assignment.studentProfileId === studentProfile.id,
        ))
    ) {
      return new NextResponse("Nao autorizado.", { status: 403 });
    }
  }

  if (session.user.role === "TEACHER") {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (
      !teacherProfile ||
      homework.teacherProfileId !== teacherProfile.id
    ) {
      return new NextResponse("Nao autorizado.", { status: 403 });
    }
  }

  let file: Buffer;

  try {
    file = await readFile(getStoragePath(homework.assetStoragePath));
  } catch {
    return new NextResponse("Arquivo nao encontrado.", { status: 404 });
  }

  const body = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        homework.assetFileName ?? "homework",
      )}"`,
      "Content-Type": homework.assetMimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
