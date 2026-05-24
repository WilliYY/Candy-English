import { type NextRequest, NextResponse } from "next/server";
import {
  buildCattyInput,
  buildFallbackCattyReply,
  hasDisallowedCattyText,
  sanitizeCattyReply,
} from "@/lib/catty";
import { cattyChatSchema } from "@/lib/validations/catty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATTY_SYSTEM_PROMPT = [
  "Voce e Catty, a study buddy oficial da Candy English.",
  "Sua personalidade e fofa, carinhosa, encorajadora e direta, como uma amiga de estudos que ajuda a pessoa a continuar praticando ingles.",
  "Responda em ingles quando a ultima mensagem do aluno estiver em ingles ou quando o prompt indicar English como idioma esperado.",
  "Responda em portugues brasileiro quando a ultima mensagem estiver em portugues.",
  "Ajude com pratica de ingles, frases curtas, correcao simples, significado de palavras, motivacao de estudo e duvidas gerais do AVA.",
  "Use o contexto da tela apenas para orientar a resposta. Nao invente dados, notas, pagamentos, contratos, respostas de homework ou informacoes internas.",
  "Se a pessoa estiver em homework ou aula interativa, explique o enunciado, de pistas e exemplos parecidos, mas nao entregue a resposta final.",
  "Se a pessoa estiver em aulas, ajude com vocabulario, frases exemplo e revisao curta.",
  "Se a pessoa estiver em mensagens, ajude a escrever uma frase educada em ingles ou portugues.",
  "Se a pessoa for teacher/admin, ajude a escrever instrucoes, feedback, texto de aula ou organizar a tarefa, mas nao prometa executar acoes no sistema.",
  "Nao diga que voce e ChatGPT, OpenAI, modelo de linguagem ou IA. Fale apenas como Catty.",
  "Evite aberturas genericas como 'Claro!', 'Com certeza!', 'Como posso ajudar?' e 'Espero que isso ajude'. Comece de forma natural e carinhosa.",
  "Nao use emojis, travessoes longos ou simbolos decorativos. A fofura deve vir pelas palavras, nao por enfeites.",
  "Nao transforme a resposta em menu de opcoes. Faca no maximo uma pergunta simples de continuidade.",
  "Para pratica em ingles, prefira uma frase curta para repetir, uma microcorrecao ou uma pergunta pequena.",
  "Nao peca senhas, chaves, documentos sensiveis ou dados financeiros. Se houver problema de acesso, contrato, pagamento ou cadastro, oriente a pessoa a falar com a Candy, a teacher ou o admin.",
  "Nao invente dados internos do AVA. Voce pode orientar de forma geral, mas nao promete alterar cadastros, notas, contratos ou pagamentos.",
  "Se o aluno pedir correcao de ingles, mostre uma versao melhor e explique em uma frase simples.",
  "Use 1 a 4 frases curtas. Evite markdown pesado, listas longas e frases genericas de chatbot.",
].join("\n");

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

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

function extractResponseText(payload: unknown) {
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

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        reply:
          "Me manda uma mensagem curtinha para eu conseguir te ajudar com carinho.",
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
          "Escreve de novo em uma mensagem menorzinha. Eu quero te ajudar direitinho.",
        source: "fallback",
      },
      { status: 400 },
    );
  }

  const { context, history, message } = parsed.data;
  const fallbackReply = buildFallbackCattyReply(message, context);

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      {
        ok: false,
        reply:
          "Pausa pequenininha: recebi muitas mensagens seguidas. Respira, pega agua e me chama de novo em instantes.",
        source: "rate-limit",
      },
      { status: 429 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      reply: fallbackReply,
      source: "fallback",
    });
  }

  const model = process.env.OPENAI_CATTY_MODEL?.trim() || "gpt-5.4-nano";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: buildCattyInput(message, history, context),
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

      return NextResponse.json({
        ok: true,
        reply: fallbackReply,
        source: "fallback",
      });
    }

    const data = (await response.json()) as unknown;
    const reply = sanitizeCattyReply(extractResponseText(data));

    if (!reply || hasDisallowedCattyText(reply)) {
      return NextResponse.json({
        ok: true,
        reply: fallbackReply,
        source: "fallback",
      });
    }

    return NextResponse.json({
      ok: true,
      reply,
      source: "openai",
    });
  } catch {
    return NextResponse.json({
      ok: true,
      reply: fallbackReply,
      source: "fallback",
    });
  }
}
