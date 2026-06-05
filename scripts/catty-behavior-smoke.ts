import {
  buildCattyInput,
  buildCattyResponsePlan,
  buildFallbackCattyReply,
  CATTY_SIGNATURE_EXPRESSIONS,
  hasDisallowedCattyText,
  shouldUseOpenAiForCatty,
} from "../src/lib/catty";
import { CATTY_BEHAVIOR_EXAMPLES } from "../src/lib/catty-examples";

const expectedExampleCount = 15;
const forbiddenGenericStarts = [
  "claro!",
  "com certeza!",
  "como uma ia",
  "as an ai",
];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesSignature(text: string) {
  const normalized = normalizeText(text);

  return CATTY_SIGNATURE_EXPRESSIONS.some((expression) =>
    normalized.includes(normalizeText(expression)),
  );
}

function assertNoGenericOpening(text: string, label: string) {
  const normalized = normalizeText(text).trim();

  for (const forbidden of forbiddenGenericStarts) {
    assertCondition(
      !normalized.startsWith(forbidden),
      `${label} abriu como chatbot generico: ${forbidden}`,
    );
  }
}

function assertPromptContext(input: string, id: string) {
  for (const required of [
    "Area atual",
    "Tarefa atual",
    "Contexto seguro do usuario",
    "Intencao detectada",
    "Intencao tecnica",
    "Regra de homework",
    "Regra de escopo",
    "Conversa recente",
  ]) {
    assertCondition(
      input.includes(required),
      `${id}: contexto da Catty nao contem ${required}`,
    );
  }
}

function getExampleRole(area?: string) {
  if (area === "admin") return "ADMIN";
  if (area === "teacher") return "TEACHER";
  return "STUDENT";
}

function assertIntentSafety(id: string, intent: string, fallbackReply: string) {
  const normalized = normalizeText(fallbackReply);

  if (intent === "ready_answer_request" || intent === "homework_hint") {
    assertCondition(
      ![
        "a resposta correta",
        "a resposta e",
        "answer is",
        "correct answer",
        "gabarito",
      ].some((term) => normalized.includes(term)),
      `${id}: fallback entregou resposta pronta de homework.`,
    );
  }

  if (intent === "code_api_request") {
    assertCondition(
      ![
        "codigo completo",
        "const ",
        "function ",
        "endpoint pronto",
      ].some((term) => normalized.includes(term)),
      `${id}: fallback parece resposta tecnica de codigo/API.`,
    );
  }
}

function main() {
  assertCondition(
    CATTY_BEHAVIOR_EXAMPLES.length === expectedExampleCount,
    `Esperava ${expectedExampleCount} exemplos, recebeu ${CATTY_BEHAVIOR_EXAMPLES.length}.`,
  );

  const ids = new Set<string>();

  for (const example of CATTY_BEHAVIOR_EXAMPLES) {
    assertCondition(!ids.has(example.id), `${example.id}: id duplicado.`);
    ids.add(example.id);
    assertCondition(example.badReply.length > 10, `${example.id}: resposta ruim vazia.`);
    assertCondition(
      example.idealReply.length > 10,
      `${example.id}: resposta ideal vazia.`,
    );
    assertCondition(
      includesSignature(example.idealReply),
      `${example.id}: resposta ideal sem voz da Catty.`,
    );
    assertNoGenericOpening(example.idealReply, `${example.id}: resposta ideal`);

    const plan = buildCattyResponsePlan(example.userMessage, example.context);
    const fallbackReply = buildFallbackCattyReply(
      example.userMessage,
      example.context,
    );
    const usesOpenAi = shouldUseOpenAiForCatty(example.userMessage);
    const promptInput = buildCattyInput(
      example.userMessage,
      [],
      example.context,
      plan,
      {
        firstName: "Willian",
        role: getExampleRole(example.context?.area),
        studentLevel: "Beginner",
      },
    );

    assertCondition(
      plan.intent === example.expectedIntent,
      `${example.id}: intencao ${plan.intent} diferente de ${example.expectedIntent}.`,
    );
    assertCondition(
      fallbackReply === plan.fallbackReply,
      `${example.id}: fallback direto diverge do plano de resposta.`,
    );
    assertCondition(
      usesOpenAi === Boolean(example.expectsOpenAi),
      `${example.id}: gatilho OpenAI esperado ${Boolean(
        example.expectsOpenAi,
      )}, recebeu ${usesOpenAi}.`,
    );
    assertCondition(
      Boolean(example.expectsOpenAi) === /\bcatty\b/i.test(example.userMessage),
      `${example.id}: regra OpenAI deve depender apenas de chamar Catty.`,
    );
    assertCondition(
      !hasDisallowedCattyText(fallbackReply),
      `${example.id}: fallback menciona provedor ou IA.`,
    );
    assertCondition(
      fallbackReply.length <= 700,
      `${example.id}: fallback ficou longo demais.`,
    );
    assertCondition(
      includesSignature(fallbackReply),
      `${example.id}: fallback sem expressao da Catty.`,
    );
    assertNoGenericOpening(fallbackReply, `${example.id}: fallback`);
    assertIntentSafety(example.id, example.expectedIntent, fallbackReply);
    assertPromptContext(promptInput, example.id);

    const normalizedFallback = normalizeText(fallbackReply);

    for (const expected of example.fallbackMustInclude) {
      assertCondition(
        normalizedFallback.includes(normalizeText(expected)),
        `${example.id}: fallback nao contem "${expected}". Resposta: ${fallbackReply}`,
      );
    }
  }

  console.log(
    `Catty behavior smoke OK: ${CATTY_BEHAVIOR_EXAMPLES.length} exemplos validados.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
