import { type NextRequest, NextResponse } from "next/server";
import {
  buildCattyInput,
  buildCattyResponsePlan,
  type CattyMessage,
  type CattyPageContext,
  type CattyResponsePlan,
  type CattySessionContext,
  hasDisallowedCattyText,
  sanitizeCattyReply,
  shouldUseOpenAiForCatty,
} from "@/lib/catty";
import {
  CATTY_AUTH_REQUIRED_REPLY,
  CATTY_BRAIN_RULES,
  hasTooManyCattyCatchphrases,
} from "@/lib/catty-personality";
import {
  CATTY_AI_CONTEXT_LIMIT,
  getCattyConversationMessages,
  persistCattyExchange,
  type CattyStoredReplySource,
} from "@/lib/catty-history";
import {
  getApprovedCattyLearningContext,
  maybeCreateCattyLearningAutoSuggestion,
  pickCattyLearningFallbackReply,
} from "@/lib/catty-learning";
import {
  applyCattyUserMemoryToFallbackReply,
  getCattyUserMemoryContext,
  maybeCreateCattyUserMemoryFromMessage,
} from "@/lib/catty-user-memory";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  cattyChatSchema,
  cattyHistoryQuerySchema,
} from "@/lib/validations/catty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATTY_SYSTEM_PROMPT = [
  CATTY_BRAIN_RULES,
  "Responda em ingles quando a ultima mensagem do aluno estiver em ingles ou quando o prompt indicar English como idioma esperado.",
  "Responda em portugues brasileiro quando a ultima mensagem estiver em portugues.",
  "Ajude com pratica de ingles, frases curtas, correcao simples, significado de palavras, motivacao de estudo e duvidas gerais do AVA.",
  "Nao responda como especialista generica fora da Candy English. Se pedirem receita, codigo, API tecnica, financas, saude ou direito, redirecione para vocabulario, frase curta ou conversacao em ingles.",
  "Use o contexto da tela apenas para orientar a resposta. Nao invente dados, notas, pagamentos, contratos, respostas de homework ou informacoes internas.",
  "Use role, primeiro nome e nivel do aluno apenas para ajustar tom, saudacao curta e dificuldade do exemplo.",
  "Use memoria pessoal ativa apenas como personalizacao leve de exemplos, incentivo ou estilo. Se a memoria nao combinar com a pergunta, ignore. Nao diga que salvou memoria e nunca trate preferencia como dado administrativo.",
  "Quando houver primeiro nome seguro, use o nome de forma natural no comeco da conversa, motivacao, correcao, homework ou Candy XP, mas nao repita em toda resposta.",
  "Nao use nome em temas sensiveis como senha, contrato, pagamento, documento, chave, token ou credencial.",
  "Nunca mencione email, id, senha, pagamento, contrato, documento, chave de API ou dado privado.",
  "Se a pessoa estiver em homework ou aula interativa, explique o enunciado, de pistas e exemplos parecidos, mas nao entregue a resposta final.",
  "Se a pessoa estiver em aulas, ajude com vocabulario, frases exemplo e revisao curta.",
  "Se a pessoa estiver em mensagens, ajude a escrever uma frase educada em ingles ou portugues.",
  "Se a pessoa for teacher/admin, ajude a escrever instrucoes, feedback, texto de aula ou montar atividade com objetivo, frase-alvo e forma de resposta, mas nao prometa executar acoes no sistema.",
  "Para teacher/admin, a resposta pode ser um pouco mais completa, mas ainda curta, sem rubrica enorme, plano gigante ou lista enciclopedica.",
  "Use a intencao detectada no prompt como trilho principal da resposta.",
  "Intencoes esperadas incluem correcao, traducao, explicacao de palavra, conversacao, homework, Candy XP, aula/material, mensagem para teacher, criacao de atividade para teacher, feedback para aluno, motivacao, duvida do AVA, fora do tema, codigo/API, pergunta confusa e resposta pronta.",
  "Quando a intencao for pergunta confusa, nao chute: peca um detalhe especifico ou ofereca no maximo dois caminhos.",
  "Quando a intencao for pergunta grande, resuma e responda por partes, sem textao.",
  "Quando a intencao for codigo/API, nao escreva codigo nem explique API tecnica; puxe para frase ou vocabulario em ingles.",
  "Quando a intencao for pedido de resposta pronta, negue com carinho e ofereca uma pista ou exemplo parecido.",
  "Quando a IA estiver insegura, prefira uma resposta simples e util em vez de tentar parecer completa.",
  "Formato ideal: abertura curta da Catty, ajuda principal e uma pergunta pequena ou proximo passo.",
  "Comece de forma natural, com a voz da Catty, sem abrir sempre com a mesma frase.",
  "Pode usar humor leve, energia meme controlada e ate dois emojis permitidos quando combinar com a resposta.",
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

function cleanAiReply(text: string, plan: CattyResponsePlan) {
  const reply = sanitizeCattyReply(text);

  if (
    !reply ||
    hasDisallowedCattyText(reply) ||
    hasTooManyCattyCatchphrases(reply) ||
    isLikelyIncompleteReply(reply) ||
    isLowValueAiReply(reply) ||
    isUnsafeForResponsePlan(reply, plan)
  ) {
    return null;
  }

  return reply;
}

function isLowValueAiReply(reply: string) {
  const normalized = reply
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const words = normalized.match(/[a-z0-9]+/g) ?? [];

  if (words.length <= 3) {
    return true;
  }

  if (
    words.length <= 8 &&
    [
      "claro",
      "com certeza",
      "como posso ajudar",
      "me diga mais",
      "nao entendi",
      "ok",
      "sim",
    ].some((term) => normalized.includes(term))
  ) {
    return true;
  }

  return [
    "como posso ajudar hoje",
    "preciso de mais contexto",
    "sou apenas um assistente",
  ].some((term) => normalized.includes(term));
}

function isUnsafeForResponsePlan(reply: string, plan: CattyResponsePlan) {
  const normalized = reply
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    plan.intent === "homework_hint" ||
    plan.intent === "ready_answer_request"
  ) {
    return [
      "a resposta correta",
      "a resposta e",
      "answer is",
      "correct answer",
      "gabarito",
      "the answer is",
    ].some((term) => normalized.includes(term));
  }

  if (plan.intent === "confusing_question") {
    return normalized.includes("nao entendi sua pergunta");
  }

  if (
    plan.intent === "code_api_request" ||
    plan.intent === "out_of_scope"
  ) {
    return [
      "codigo completo",
      "const ",
      "function ",
      "ingredientes:",
      "modo de preparo",
      "passo a passo",
      "receita completa",
      "recomendo investir",
      "tratamento medico",
    ].some((term) => normalized.includes(term));
  }

  return false;
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

async function requestOpenAiCattyReply(input: string, plan: CattyResponsePlan) {
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
    const reply = cleanAiReply(extractOpenAiResponseText(data), plan);

    return reply ? { reply, source: "openai" as const } : null;
  } catch {
    return null;
  }
}

async function requestGeminiCattyReply(input: string, plan: CattyResponsePlan) {
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
    const reply = cleanAiReply(extractGeminiResponseText(data), plan);

    return reply ? { reply, source: "gemini" as const } : null;
  } catch {
    return null;
  }
}

async function requestCattyAiReply(
  input: string,
  plan: CattyResponsePlan,
  sources: CattyAiSource[],
) {
  for (const source of sources) {
    const result =
      source === "openai"
        ? await requestOpenAiCattyReply(input, plan)
        : await requestGeminiCattyReply(input, plan);

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

function normalizeHistoryKey(message: CattyMessage) {
  return `${message.from}:${message.text.replace(/\s+/g, " ").trim().toLowerCase()}`;
}

function mergeCattyHistory(input: {
  clientHistory: CattyMessage[];
  currentMessage: string;
  storedHistory: CattyMessage[];
}) {
  const clientHistory = removeCurrentMessageFromClientHistory(
    input.clientHistory,
    input.currentMessage,
  );
  const merged = [...input.storedHistory, ...clientHistory]
    .map((message) => ({
      from: message.from,
      text: message.text.replace(/\s+/g, " ").trim(),
    }))
    .filter((message) => message.text.length > 0);
  const seen = new Set<string>();
  const dedupedNewestFirst = [...merged].reverse().filter((message) => {
    const key = normalizeHistoryKey(message);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });

  return dedupedNewestFirst.reverse().slice(-CATTY_AI_CONTEXT_LIMIT);
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

function getFirstNameFromName(name?: string | null) {
  const cleaned = name?.replace(/\s+/g, " ").trim();

  if (!cleaned || cleaned.includes("@")) {
    return "";
  }

  return cleaned.split(" ")[0]?.slice(0, 24) || "";
}

function getFirstNameFromEmail(email?: string | null) {
  const localPart = email
    ?.split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return localPart?.split(" ")[0]?.slice(0, 24) || "";
}

async function getCattySessionContext(input: {
  email?: string | null;
  name?: string | null;
  role: CattySessionContext["role"];
  userId: string;
}): Promise<CattySessionContext> {
  const context: CattySessionContext = {
    firstName: getFirstNameFromName(input.name) || getFirstNameFromEmail(input.email),
    role: input.role,
  };

  if (input.role !== "STUDENT") {
    return context;
  }

  try {
    const prisma = getPrisma();
    const profile = await prisma.studentProfile.findUnique({
      select: {
        level: true,
      },
      where: {
        userId: input.userId,
      },
    });

    if (profile?.level) {
      context.studentLevel = profile.level;
    }
  } catch {
    console.warn("Catty student level context failed.");
  }

  return context;
}

async function getHistoryForCatty(input: {
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

    return mergeCattyHistory({
      clientHistory: fallbackHistory,
      currentMessage: input.message,
      storedHistory,
    });
  } catch {
    console.warn("Catty history load failed; using client context.");

    return fallbackHistory.slice(-CATTY_AI_CONTEXT_LIMIT);
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
    return await persistCattyExchange(input);
  } catch {
    console.warn("Catty history persistence failed.");

    return null;
  }
}

async function getCattyLearningContextSafely(input: {
  intent: CattyResponsePlan["intent"];
  message: string;
}) {
  try {
    return await getApprovedCattyLearningContext(input);
  } catch {
    console.warn("Catty learning context load failed.");

    return [];
  }
}

async function getCattyUserMemoryContextSafely(input: {
  intent: CattyResponsePlan["intent"];
  message: string;
  userId: string;
}) {
  try {
    return await getCattyUserMemoryContext(input);
  } catch {
    console.warn("Catty user memory context load failed.");

    return [];
  }
}

async function maybeCreateCattyLearningAutoSuggestionSafely(input: {
  context?: CattyPageContext;
  learningContext: Awaited<ReturnType<typeof getApprovedCattyLearningContext>>;
  message: string;
  plan: CattyResponsePlan;
  reply: string;
  source: "fallback" | "gemini" | "openai";
  userId: string;
}) {
  try {
    await maybeCreateCattyLearningAutoSuggestion(input);
  } catch {
    console.warn("Catty auto learning suggestion failed.");
  }
}

async function maybeCreateCattyUserMemoryFromMessageSafely(input: {
  actorRole: "ADMIN" | "TEACHER" | "STUDENT";
  message: string;
  userId: string;
}) {
  try {
    await maybeCreateCattyUserMemoryFromMessage(input);
  } catch {
    console.warn("Catty user memory extraction failed.");
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

  const cattyHistory = await getHistoryForCatty({
    clientHistory: history,
    context,
    message,
    userId: session.user.id,
  });
  const sessionContext = await getCattySessionContext({
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    userId: session.user.id,
  });
  const responsePlan = buildCattyResponsePlan(
    message,
    context,
    cattyHistory,
    sessionContext,
  );
  const learningContext = await getCattyLearningContextSafely({
    intent: responsePlan.intent,
    message,
  });
  const userMemoryContext = await getCattyUserMemoryContextSafely({
    intent: responsePlan.intent,
    message,
    userId: session.user.id,
  });
  const fallbackReply = applyCattyUserMemoryToFallbackReply({
    memories: userMemoryContext,
    plan: responsePlan,
    reply:
      pickCattyLearningFallbackReply(responsePlan, learningContext, message) ??
      responsePlan.fallbackReply,
  });
  const input = buildCattyInput(
    message,
    cattyHistory,
    context,
    responsePlan,
    sessionContext,
    learningContext,
    userMemoryContext,
  );
  const sources: CattyAiSource[] = shouldUseOpenAiForCatty(message)
    ? ["openai", "gemini"]
    : ["gemini"];
  const aiReply = await requestCattyAiReply(input, responsePlan, sources);

  if (!aiReply) {
    const persistedExchange = await persistCattyExchangeSafely({
      cattyReply: fallbackReply,
      context,
      source: "FALLBACK",
      userId: session.user.id,
      userMessage: message,
    });

    await maybeCreateCattyLearningAutoSuggestionSafely({
      context,
      learningContext,
      message,
      plan: responsePlan,
      reply: fallbackReply,
      source: "fallback",
      userId: session.user.id,
    });
    await maybeCreateCattyUserMemoryFromMessageSafely({
      actorRole: session.user.role,
      message,
      userId: session.user.id,
    });

    return NextResponse.json({
      messageId: persistedExchange?.cattyMessageId,
      ok: true,
      reply: fallbackReply,
      source: "fallback",
    });
  }

  const persistedExchange = await persistCattyExchangeSafely({
    cattyReply: aiReply.reply,
    context,
    source: toStoredReplySource(aiReply.source),
    userId: session.user.id,
    userMessage: message,
  });

  await maybeCreateCattyLearningAutoSuggestionSafely({
    context,
    learningContext,
    message,
    plan: responsePlan,
    reply: aiReply.reply,
    source: aiReply.source,
    userId: session.user.id,
  });
  await maybeCreateCattyUserMemoryFromMessageSafely({
    actorRole: session.user.role,
    message,
    userId: session.user.id,
  });

  return NextResponse.json({
    messageId: persistedExchange?.cattyMessageId,
    ok: true,
    reply: aiReply.reply,
    source: aiReply.source,
  });
}
