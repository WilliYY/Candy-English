import { type NextRequest, NextResponse } from "next/server";
import {
  buildCattyInput,
  buildCattyResponsePlan,
  CATTY_PERSONALITY_GUIDE,
  type CattyMessage,
  type CattyPageContext,
  hasDisallowedCattyText,
  sanitizeCattyReply,
  shouldUseOpenAiForCatty,
} from "@/lib/catty";
import {
  CATTY_AI_CONTEXT_LIMIT,
  getCattyConversationMessages,
  persistCattyExchange,
  type CattyStoredReplySource,
} from "@/lib/catty-history";
import { auth } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import {
  cattyChatSchema,
  cattyHistoryQuerySchema,
} from "@/lib/validations/catty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATTY_SYSTEM_PROMPT = [
  CATTY_PERSONALITY_GUIDE,
  "Responda em ingles quando a ultima mensagem do aluno estiver em ingles ou quando o prompt indicar English como idioma esperado.",
  "Responda em portugues brasileiro quando a ultima mensagem estiver em portugues.",
  "Ajude com pratica de ingles, frases curtas, correcao simples, significado de palavras, motivacao de estudo e duvidas gerais do AVA.",
  "Use o contexto da tela apenas para orientar a resposta. Nao invente dados, notas, pagamentos, contratos, respostas de homework ou informacoes internas.",
  "Se a pessoa estiver em homework ou aula interativa, explique o enunciado, de pistas e exemplos parecidos, mas nao entregue a resposta final.",
  "Se a pessoa estiver em aulas, ajude com vocabulario, frases exemplo e revisao curta.",
  "Se a pessoa estiver em mensagens, ajude a escrever uma frase educada em ingles ou portugues.",
  "Se a pessoa for teacher/admin, ajude a escrever instrucoes, feedback, texto de aula ou organizar a tarefa, mas nao prometa executar acoes no sistema.",
  "Use a intencao detectada no prompt como trilho principal da resposta.",
  "Quando a intencao for pergunta confusa, nao chute: peca um detalhe especifico ou ofereca no maximo dois caminhos.",
  "Quando a intencao for pergunta grande, resuma e responda por partes, sem textao.",
  "Quando a IA estiver insegura, prefira uma resposta simples e util em vez de tentar parecer completa.",
  "Comece de forma natural, com a voz da Catty, sem abrir sempre com a mesma frase.",
  "Se usar emoji, use no maximo um e apenas quando combinar com a resposta.",
  "Nao transforme a resposta em menu de opcoes. Faca no maximo uma pergunta simples de continuidade.",
  "Para pratica em ingles, prefira uma frase curta para repetir, uma microcorrecao ou uma pergunta pequena.",
  "Se o aluno pedir correcao de ingles, mostre uma versao melhor e explique em uma frase simples.",
  "Termine sempre com frase completa e pontuacao final.",
  "Use 1 a 4 frases curtas. Evite markdown pesado, listas longas e frases genericas de chatbot.",
].join("\n");

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
type CattyAiSource = "gemini" | "openai";
const CATTY_AUTH_REQUIRED_REPLY =
  "Awnn, meu chat e so para alunos Candy. Entra na sua conta do AVA para conversar comigo.";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return false;
  }

  current.count += 1;

  if (rateLimitStore.size > 1000) {
    for (const [storedKey, value] of rateLimitStore.entries()) {
      if (value.resetAt <= now) {
        rateLimitStore.delete(storedKey);
      }
    }
  }

  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function extractOpenAiResponseText(payload: unknown) {
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

function buildGeminiUrl(model: string) {
  const normalizedModel = model.replace(/^models\//, "");

  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    normalizedModel,
  )}:generateContent`;
}

function cleanAiReply(text: string) {
  const reply = sanitizeCattyReply(text);

  if (!reply || hasDisallowedCattyText(reply) || isLikelyIncompleteReply(reply)) {
    return null;
  }

  return reply;
}

function isLikelyIncompleteReply(reply: string) {
  const clean = reply.trim();
  const textToCheck =
    clean.replace(/\s*[\p{Extended_Pictographic}\ufe0f]+$/u, "").trim() ||
    clean;

  if (!clean) {
    return true;
  }

  if (/[.!?]$/.test(textToCheck)) {
    return false;
  }

  const lastWord = textToCheck
    .split(/\s+/)
    .at(-1)
    ?.replace(/[,"')\]]+$/g, "")
    .toLowerCase();

  if (!lastWord) {
    return true;
  }

  return (
    textToCheck.split(/\s+/).length >= 4 ||
    [
      "and",
      "but",
      "com",
      "da",
      "de",
      "do",
      "e",
      "or",
      "para",
      "porque",
      "que",
      "sen",
      "sem",
      "with",
    ].includes(lastWord)
  );
}

async function requestOpenAiCattyReply(input: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_CATTY_MODEL?.trim() || "gpt-5.4-nano";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input,
        instructions: CATTY_SYSTEM_PROMPT,
        max_output_tokens: 280,
        model,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      console.warn(`Catty OpenAI fallback: status ${response.status}`);

      return null;
    }

    const data = (await response.json()) as unknown;
    const reply = cleanAiReply(extractOpenAiResponseText(data));

    return reply ? { reply, source: "openai" as const } : null;
  } catch {
    return null;
  }
}

async function requestGeminiCattyReply(input: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_CATTY_MODEL?.trim() || "gemini-3.5-flash";

  try {
    const response = await fetch(buildGeminiUrl(model), {
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: input,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 512,
        },
        system_instruction: {
          parts: [
            {
              text: CATTY_SYSTEM_PROMPT,
            },
          ],
        },
      }),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      console.warn(`Catty Gemini fallback: status ${response.status}`);

      return null;
    }

    const data = (await response.json()) as unknown;
    const reply = cleanAiReply(extractGeminiResponseText(data));

    return reply ? { reply, source: "gemini" as const } : null;
  } catch {
    return null;
  }
}

async function requestCattyAiReply(input: string, sources: CattyAiSource[]) {
  for (const source of sources) {
    const result =
      source === "openai"
        ? await requestOpenAiCattyReply(input)
        : await requestGeminiCattyReply(input);

    if (result) {
      return result;
    }
  }

  return null;
}

function removeCurrentMessageFromClientHistory(
  history: CattyMessage[],
  message: string,
) {
  const lastMessage = history.at(-1);

  if (
    lastMessage?.from === "user" &&
    lastMessage.text.trim() === message.trim()
  ) {
    return history.slice(0, -1);
  }

  return history;
}

function toStoredReplySource(
  source: CattyAiSource | "fallback",
): CattyStoredReplySource {
  if (source === "openai") {
    return "OPENAI";
  }

  if (source === "gemini") {
    return "GEMINI";
  }

  return "FALLBACK";
}

async function getHistoryForAi(input: {
  clientHistory: CattyMessage[];
  context?: CattyPageContext;
  message: string;
  userId: string;
}) {
  const fallbackHistory = removeCurrentMessageFromClientHistory(
    input.clientHistory,
    input.message,
  );

  try {
    const storedHistory = await getCattyConversationMessages({
      context: input.context,
      take: CATTY_AI_CONTEXT_LIMIT,
      userId: input.userId,
    });

    return storedHistory.length > 0 ? storedHistory : fallbackHistory;
  } catch {
    console.warn("Catty history load failed; using client context.");

    return fallbackHistory;
  }
}

async function persistCattyExchangeSafely(input: {
  cattyReply: string;
  context?: CattyPageContext;
  source: CattyStoredReplySource;
  userId: string;
  userMessage: string;
}) {
  try {
    await persistCattyExchange(input);
  } catch {
    console.warn("Catty history persistence failed.");
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return NextResponse.json(
      {
        messages: [],
        ok: false,
        reply: CATTY_AUTH_REQUIRED_REPLY,
        source: "unauthorized",
      },
      { status: 401 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const parsed = cattyHistoryQuerySchema.safeParse({
    area: searchParams.get("area") ?? undefined,
    task: searchParams.get("task") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        messages: [],
        ok: false,
      },
      { status: 400 },
    );
  }

  try {
    const messages = await getCattyConversationMessages({
      context: parsed.data,
      userId: session.user.id,
    });

    return NextResponse.json({
      messages,
      ok: true,
    });
  } catch {
    console.warn("Catty history GET failed.");

    return NextResponse.json({
      messages: [],
      ok: true,
    });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return NextResponse.json(
      {
        ok: false,
        reply: CATTY_AUTH_REQUIRED_REPLY,
        source: "unauthorized",
      },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        reply:
          "Miauw, me manda uma mensagem curtinha para eu conseguir te ajudar com carinho.",
        source: "fallback",
      },
      { status: 400 },
    );
  }

  const parsed = cattyChatSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        reply:
          "Awnn, escreve de novo em uma mensagem menorzinha. Eu quero te ajudar direitinho.",
        source: "fallback",
      },
      { status: 400 },
    );
  }

  const { context, history, message } = parsed.data;
  const responsePlan = buildCattyResponsePlan(message, context);
  const fallbackReply = responsePlan.fallbackReply;

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      {
        ok: false,
        reply:
          "Pss pss, pausa pequenininha: recebi muitas mensagens seguidas. Respira, pega agua e me chama de novo em instantes.",
        source: "rate-limit",
      },
      { status: 429 },
    );
  }

  const aiHistory = await getHistoryForAi({
    clientHistory: history,
    context,
    message,
    userId: session.user.id,
  });
  const input = buildCattyInput(message, aiHistory, context, responsePlan);
  const sources: CattyAiSource[] = shouldUseOpenAiForCatty(message)
    ? ["openai", "gemini"]
    : ["gemini"];
  const aiReply = await requestCattyAiReply(input, sources);

  if (!aiReply) {
    await persistCattyExchangeSafely({
      cattyReply: fallbackReply,
      context,
      source: "FALLBACK",
      userId: session.user.id,
      userMessage: message,
    });

    return NextResponse.json({
      ok: true,
      reply: fallbackReply,
      source: "fallback",
    });
  }

  await persistCattyExchangeSafely({
    cattyReply: aiReply.reply,
    context,
    source: toStoredReplySource(aiReply.source),
    userId: session.user.id,
    userMessage: message,
  });

  return NextResponse.json({
    ok: true,
    reply: aiReply.reply,
    source: aiReply.source,
  });
}
