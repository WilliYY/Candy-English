import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getListeningSpeedMode,
  synthesizeListeningSpeech,
} from "@/lib/listening-tts";
import { canStudentAccessHomework } from "@/lib/homework-submission-service";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fieldId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return new NextResponse("Nao autorizado.", { status: 401 });
  }

  const { fieldId } = await params;
  const prisma = getPrisma();
  const field = await prisma.homeworkInteractiveField.findUnique({
    where: { id: fieldId },
    select: {
      placeholder: true,
      type: true,
      homework: {
        select: {
          kind: true,
          lesson: {
            select: {
              studentProfileId: true,
            },
          },
          status: true,
          studentAssignments: {
            select: { studentProfileId: true },
          },
          teacherProfileId: true,
        },
      },
    },
  });

  if (
    !field ||
    field.type !== "LISTENING" ||
    field.homework.kind !== "INTERACTIVE"
  ) {
    return new NextResponse("Audio nao encontrado.", { status: 404 });
  }

  if (session.user.role === "STUDENT") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (
      field.homework.status !== "PUBLISHED" ||
      !studentProfile ||
      !canStudentAccessHomework(field.homework, studentProfile.id)
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
      field.homework.teacherProfileId !== teacherProfile.id
    ) {
      return new NextResponse("Nao autorizado.", { status: 403 });
    }
  }

  const speech = await synthesizeListeningSpeech(
    field.placeholder,
    getListeningSpeedMode(request),
    `user:${session.user.id}`,
  );

  if (!speech.ok) {
    return new NextResponse(speech.message, { status: speech.status });
  }

  return new NextResponse(speech.audio, {
    headers: {
      "Cache-Control": "private, max-age=604800",
      "Content-Type": speech.contentType,
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
