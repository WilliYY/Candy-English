import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return new NextResponse("Nao autorizado.", { status: 401 });
  }

  const { activityId } = await params;
  const prisma = getPrisma();
  const activity = await prisma.candyXpActivity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      assetFileName: true,
      assetMimeType: true,
      assetStoragePath: true,
      assignments: {
        select: {
          studentProfileId: true,
        },
      },
      status: true,
    },
  });

  if (!activity?.assetStoragePath || !activity.assetMimeType) {
    return new NextResponse("Arquivo nao encontrado.", { status: 404 });
  }

  if (session.user.role === "STUDENT") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });
    const isAssigned =
      activity.assignments.length === 0 ||
      activity.assignments.some(
        (assignment) => assignment.studentProfileId === studentProfile?.id,
      );

    if (
      activity.status !== "PUBLISHED" ||
      !studentProfile ||
      !isAssigned
    ) {
      return new NextResponse("Nao autorizado.", { status: 403 });
    }
  }

  if (session.user.role === "TEACHER") {
    return new NextResponse("Nao autorizado.", { status: 403 });
  }

  let file: Buffer;

  try {
    file = await readFile(getStoragePath(activity.assetStoragePath));
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
        activity.assetFileName ?? "candy-xp",
      )}"`,
      "Content-Type": activity.assetMimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
