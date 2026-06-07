import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  LISTENING_SENTENCE_MAX_LENGTH,
  normalizeListeningSentence,
} from "@/lib/interactive-homework-fields";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath } from "@/lib/storage";
import { detectListeningTextSchema } from "@/lib/validations/learning";

export const runtime = "nodejs";

type DetectionConfidence = "high" | "medium" | "low";

const SUPPORTED_LISTENING_OCR_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function extractOutputText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  if (
    "output_text" in payload &&
    typeof (payload as { output_text?: unknown }).output_text === "string"
  ) {
    return (payload as { output_text: string }).output_text;
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  for (const item of output) {
    const content =
      typeof item === "object" && item !== null
        ? (item as { content?: unknown }).content
        : null;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }

  return "";
}

function parseDetectionPayload(text: string): {
  confidence: DetectionConfidence;
  sentence: string;
} {
  try {
    const parsed = JSON.parse(text) as {
      confidence?: unknown;
      text?: unknown;
    };
    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "low";
    const sentence =
      typeof parsed.text === "string"
        ? normalizeListeningSentence(parsed.text)
        : "";

    return { confidence, sentence };
  } catch {
    return {
      confidence: "low",
      sentence: normalizeListeningSentence(text),
    };
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  }

  if (session.user.role === "STUDENT") {
    return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = detectListeningTextSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Area invalida." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const homework = await prisma.homework.findUnique({
    where: { id: parsed.data.homeworkId },
    select: {
      assetFileName: true,
      assetMimeType: true,
      assetPageCount: true,
      assetStoragePath: true,
      kind: true,
      teacherProfileId: true,
    },
  });

  if (
    !homework ||
    homework.kind !== "INTERACTIVE" ||
    !homework.assetStoragePath ||
    !homework.assetMimeType ||
    !SUPPORTED_LISTENING_OCR_MIME_TYPES.has(homework.assetMimeType)
  ) {
    return NextResponse.json(
      { message: "Arquivo da atividade nao encontrado." },
      { status: 404 },
    );
  }

  if (
    homework.assetPageCount &&
    parsed.data.page > homework.assetPageCount
  ) {
    return NextResponse.json(
      { message: "Pagina da area invalida." },
      { status: 400 },
    );
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
      return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { message: "OpenAI nao configurada. Digite a frase manualmente." },
      { status: 503 },
    );
  }

  let file: Buffer;

  try {
    file = await readFile(getStoragePath(homework.assetStoragePath));
  } catch {
    return NextResponse.json(
      { message: "Arquivo da atividade nao encontrado." },
      { status: 404 },
    );
  }

  const model = process.env.OPENAI_HOMEWORK_OCR_MODEL?.trim() || "gpt-4.1-mini";
  const base64 = file.toString("base64");
  const mediaContent =
    homework.assetMimeType === "application/pdf"
      ? {
          file_data: `data:${homework.assetMimeType};base64,${base64}`,
          filename: homework.assetFileName ?? "homework.pdf",
          type: "input_file",
        }
      : {
          detail: "high",
          image_url: `data:${homework.assetMimeType};base64,${base64}`,
          type: "input_image",
        };
  const { height, page, width, x, y } = parsed.data;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: [
              mediaContent,
              {
                text:
                  "Voce esta ajudando a teacher da Candy English a criar um campo Listening. " +
                  "Leia somente a frase impressa dentro da area desenhada pela teacher no PDF/imagem. " +
                  `A area esta na pagina ${page}, com coordenadas percentuais x=${x}, y=${y}, width=${width}, height=${height}. ` +
                  "A frase detectada sera usada em text-to-speech e o botao de volume ficara no fim direito da area. " +
                  "Preserve os espacos entre palavras, pontuacao e maiusculas/minusculas como aparecem no material. " +
                  "Nao junte palavras, por exemplo retorne 'Do you like pizza?' e nunca 'doyoulikepizza'. " +
                  "Se a area pegar texto vizinho, escolha apenas a frase majoritariamente dentro do box. " +
                  "Se nao houver frase legivel, retorne text vazio. Responda apenas com o JSON solicitado.",
                type: "input_text",
              },
            ],
            role: "user",
          },
        ],
        max_output_tokens: 400,
        model,
        text: {
          format: {
            name: "listening_sentence_detection",
            schema: {
              additionalProperties: false,
              properties: {
                confidence: {
                  enum: ["high", "medium", "low"],
                  type: "string",
                },
                text: {
                  maxLength: LISTENING_SENTENCE_MAX_LENGTH,
                  type: "string",
                },
              },
              required: ["text", "confidence"],
              type: "object",
            },
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      console.warn(`Listening OCR failed: status ${response.status}`);

      return NextResponse.json(
        { message: "Nao consegui ler a frase automaticamente." },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as unknown;
    const detection = parseDetectionPayload(extractOutputText(payload));

    if (!detection.sentence) {
      return NextResponse.json(
        {
          confidence: detection.confidence,
          message: "Nao encontrei uma frase clara nessa area.",
          text: "",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      confidence: detection.confidence,
      message:
        detection.confidence === "high"
          ? "Frase lida automaticamente."
          : "Frase detectada. Confira antes de salvar.",
      text: detection.sentence,
    });
  } catch {
    return NextResponse.json(
      { message: "Nao consegui ler a frase automaticamente." },
      { status: 502 },
    );
  }
}
