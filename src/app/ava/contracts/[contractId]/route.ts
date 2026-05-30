import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath } from "@/lib/storage";

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
  const prisma = getPrisma();
  const contract = await prisma.contractDocument.findUnique({
    where: { id: contractId },
    select: {
      fileName: true,
      mimeType: true,
      storagePath: true,
      studentProfileId: true,
    },
  });

  if (!contract) {
    return new NextResponse("Contrato nao encontrado.", { status: 404 });
  }

  if (session.user.role === "STUDENT") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (
      !studentProfile ||
      (contract.studentProfileId &&
        contract.studentProfileId !== studentProfile.id)
    ) {
      return new NextResponse("Nao autorizado.", { status: 403 });
    }
  }

  if (session.user.role === "TEACHER" && contract.studentProfileId) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const assignment =
      teacherProfile &&
      (await prisma.studentTeacherAssignment.findUnique({
        where: {
          teacherProfileId_studentProfileId: {
            studentProfileId: contract.studentProfileId,
            teacherProfileId: teacherProfile.id,
          },
        },
        select: { id: true },
      }));

    if (!assignment) {
      return new NextResponse("Nao autorizado.", { status: 403 });
    }
  }

  let file: Buffer;

  try {
    file = await readFile(getStoragePath(contract.storagePath));
  } catch {
    return new NextResponse("Contrato nao encontrado.", { status: 404 });
  }

  const body = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Content-Disposition": `inline; filename="${encodeURIComponent(contract.fileName)}"`,
      "Content-Type": contract.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
