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

const LISTENING_FULL_ASSET_FALLBACK_MAX_BYTES = 4_000_000;

function buildGeminiUrl(model: string) {
  const normalizedModel = model.replace(/^models\//, "");

  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    normalizedModel,
  )}:generateContent`;
}

function extractGeminiResponseText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const candidates = (payload as { candidates?: unknown }).candidates;

  if (!Array.isArray(candidates)) {
    return "";
  }

  for (const candidate of candidates) {
    const content =
      typeof candidate === "object" && candidate !== null
        ? (candidate as { content?: unknown }).content
        : null;
    const parts =
      typeof content === "object" && content !== null
        ? (content as { parts?: unknown }).parts
        : null;

    if (!Array.isArray(parts)) {
      continue;
    }

    const text = parts
      .map((part) =>
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "",
      )
      .filter(Boolean)
      .join(" ");

    if (text) {
      return text;
    }
  }

  return "";
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseDataUrl(value: string) {
  const match = value.match(
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/,
  );

  if (!match) {
    return null;
  }

  return {
    base64: match[2],
    mimeType: match[1],
  };
}

async function getGeminiMediaPart({
  assetMimeType,
  assetSizeBytes,
  assetStoragePath,
  imageDataUrl,
}: {
  assetMimeType: string;
  assetSizeBytes?: number | null;
  assetStoragePath: string;
  imageDataUrl?: string;
}) {
  if (imageDataUrl) {
    const parsed = parseDataUrl(imageDataUrl);

    if (parsed) {
      return {
        inline_data: {
          data: parsed.base64,
          mime_type: parsed.mimeType,
        },
      };
    }
  }

  if (
    assetSizeBytes &&
    assetSizeBytes > LISTENING_FULL_ASSET_FALLBACK_MAX_BYTES
  ) {
    return null;
  }

  try {
    const file = await readFile(getStoragePath(assetStoragePath));

    return {
      inline_data: {
        data: file.toString("base64"),
        mime_type: assetMimeType,
      },
    };
  } catch {
    return null;
  }
}

function buildListeningDetectionPrompt({
  hasCrop,
  height,
  page,
  width,
  x,
  y,
}: {
  hasCrop: boolean;
  height: number;
  page: number;
  width: number;
  x: number;
  y: number;
}) {
  const areaInstruction = hasCrop
    ? "A imagem enviada ja e o recorte exato da area desenhada. Leia apenas o texto visivel dentro desse recorte."
    : `A area fica na pagina ${page}, com coordenadas percentuais x=${x}, y=${y}, width=${width}, height=${height}. Leia apenas o texto majoritariamente dentro dessa area.`;

  return (
    "Voce esta fazendo OCR para um campo Listening da Candy English. " +
    `${areaInstruction} ` +
    "Extraia somente texto em ingles que deve virar audio. " +
    "Preserve espacos entre palavras, pontuacao, maiusculas/minusculas e a ordem natural de leitura. " +
    "Se houver varias frases dentro do box, mantenha todas em uma frase ou paragrafo curto. " +
    "Nunca junte palavras: retorne 'Do you like pizza?' e nunca 'doyoulikepizza'. " +
    "Ignore titulos, numeros de exercicio, alternativas, respostas ou texto vizinho parcialmente cortado quando nao forem o alvo central do box. " +
    "Se o box pegar linhas de resposta abaixo da frase, ignore essas linhas. " +
    "Se nao houver texto claro, use texto vazio. " +
    `Limite o texto a ${LISTENING_SENTENCE_MAX_LENGTH} caracteres. ` +
    'Responda somente JSON valido no formato {"text":"...","confidence":"high|medium|low"}.'
  );
}

function parseDetectionPayload(text: string): {
  confidence: DetectionConfidence;
  sentence: string;
} {
  const clean = stripJsonFence(text);

  try {
    const parsed = JSON.parse(clean) as {
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
      sentence: normalizeListeningSentence(clean),
    };
  }
}

async function requestGeminiListeningDetection({
  hasCrop,
  mediaPart,
  prompt,
}: {
  hasCrop: boolean;
  mediaPart: unknown;
  prompt: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      error: "Gemini nao configurado. Digite o texto manualmente.",
      status: 503,
    };
  }

  const model =
    process.env.GEMINI_HOMEWORK_OCR_MODEL?.trim() ||
    process.env.GEMINI_CATTY_MODEL?.trim() ||
    "gemini-3.5-flash";

  try {
    const response = await fetch(buildGeminiUrl(model), {
      body: JSON.stringify({
        contents: [
          {
            parts: [
              mediaPart,
              {
                text: prompt,
              },
            ],
            role: "user",
          },
        ],
        generationConfig: {
          maxOutputTokens: 320,
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(hasCrop ? 12_000 : 18_000),
    });

    if (!response.ok) {
      console.warn(`Listening Gemini OCR failed: status ${response.status}`);

      return {
        error: "Nao consegui ler o texto automaticamente.",
        status: 502,
      };
    }

    const payload = (await response.json()) as unknown;

    return {
      detection: parseDetectionPayload(extractGeminiResponseText(payload)),
    };
  } catch {
    return {
      error: "Nao consegui ler o texto automaticamente.",
      status: 502,
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
      assetMimeType: true,
      assetPageCount: true,
      assetSizeBytes: true,
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

  if (homework.assetPageCount && parsed.data.page > homework.assetPageCount) {
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

    if (!teacherProfile || homework.teacherProfileId !== teacherProfile.id) {
      return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });
    }
  }

  const { height, imageDataUrl, page, width, x, y } = parsed.data;
  const hasCrop = Boolean(imageDataUrl);
  const mediaPart = await getGeminiMediaPart({
    assetMimeType: homework.assetMimeType,
    assetSizeBytes: homework.assetSizeBytes,
    assetStoragePath: homework.assetStoragePath,
    imageDataUrl,
  });

  if (!mediaPart) {
    return NextResponse.json(
      {
        message:
          "Nao consegui preparar o recorte. Aguarde a pagina carregar ou digite o texto manualmente.",
      },
      { status: 422 },
    );
  }

  const result = await requestGeminiListeningDetection({
    hasCrop,
    mediaPart,
    prompt: buildListeningDetectionPrompt({
      hasCrop,
      height,
      page,
      width,
      x,
      y,
    }),
  });

  if ("error" in result) {
    return NextResponse.json(
      { message: result.error },
      { status: result.status },
    );
  }

  const detection = result.detection;

  if (!detection.sentence) {
    return NextResponse.json(
      {
        confidence: detection.confidence,
        message: "Nao encontrei texto claro nessa area.",
        text: "",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    confidence: detection.confidence,
    message:
      detection.confidence === "high"
        ? "Gemini leu o texto do box."
        : "Gemini leu o texto com baixa confianca. Confira antes de salvar.",
    text: detection.sentence,
  });
}
