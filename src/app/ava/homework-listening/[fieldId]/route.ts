import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeListeningSentence } from "@/lib/interactive-homework-fields";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";

export const runtime = "nodejs";

type ListeningSpeedMode = "normal" | "slow";

const OPENAI_TTS_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "marin",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "cedar",
]);

function getListeningSpeedMode(request: Request): ListeningSpeedMode {
  const speed = new URL(request.url).searchParams.get("speed");

  return speed === "slow" ? "slow" : "normal";
}

function getOpenAiVoice() {
  const voice = process.env.OPENAI_LISTENING_TTS_VOICE?.trim() || "nova";

  return OPENAI_TTS_VOICES.has(voice) ? voice : "nova";
}

function getOpenAiSpeechBody(input: string, mode: ListeningSpeedMode) {
  const model =
    process.env.OPENAI_LISTENING_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
  const speed = mode === "slow" ? 0.72 : 1;
  const body: {
    input: string;
    instructions?: string;
    model: string;
    response_format: "mp3";
    speed: number;
    voice: string;
  } = {
    input,
    model,
    response_format: "mp3",
    speed,
    voice: getOpenAiVoice(),
  };

  if (model.includes("gpt-4o")) {
    body.instructions =
      mode === "slow"
        ? "Speak the English sentence with a lively, cheerful female English teacher tone, a little slower for a beginner student. Keep pronunciation clear and warm."
        : "Speak the English sentence with a lively, cheerful female English teacher tone. Keep pronunciation clear, natural, and encouraging.";
  }

  return body;
}

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
          teacherProfileId: true,
        },
      },
    },
  });

  if (!field || field.type !== "LISTENING" || field.homework.kind !== "INTERACTIVE") {
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
      field.homework.lesson.studentProfileId !== studentProfile.id
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

  const input = normalizeListeningSentence(field.placeholder ?? "");

  if (!input) {
    return new NextResponse("Frase do listening nao configurada.", {
      status: 400,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return new NextResponse("Audio OpenAI indisponivel.", { status: 503 });
  }

  const mode = getListeningSpeedMode(request);

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      body: JSON.stringify(getOpenAiSpeechBody(input, mode)),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.warn(`Listening OpenAI TTS failed: status ${response.status}`);

      return new NextResponse("Audio indisponivel.", { status: 502 });
    }

    const audio = await response.arrayBuffer();

    return new NextResponse(audio, {
      headers: {
        "Cache-Control": "private, max-age=604800",
        "Content-Type": response.headers.get("Content-Type") ?? "audio/mpeg",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Audio indisponivel.", { status: 502 });
  }
}
