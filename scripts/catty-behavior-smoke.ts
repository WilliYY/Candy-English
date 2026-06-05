import {
  buildCattyInput,
  buildCattyResponsePlan,
  buildFallbackCattyReply,
  hasDisallowedCattyText,
  shouldUseOpenAiForCatty,
} from "../src/lib/catty";
import { CATTY_BEHAVIOR_EXAMPLES } from "../src/lib/catty-examples";
import {
  CATTY_SIGNATURE_EXPRESSIONS,
  hasTooManyCattyCatchphrases,
} from "../src/lib/catty-personality";
import { pickCattyLearningFallbackReply } from "../src/lib/catty-learning";
import { cattyLearningFeedbackCreateSchema } from "../src/lib/validations/catty-learning";

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
    "Regra de personalidade da Catty",
    "Regra de uso do nome",
    "Regra de roteamento interno",
    "Regra de homework",
    "Regra de escopo",
    "Memoria aprovada da Catty",
    "Regra para ADMIN/TEACHER",
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

function countEmojis(text: string) {
  return text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
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
    assertCondition(
      !hasTooManyCattyCatchphrases(example.idealReply),
      `${example.id}: resposta ideal tem bordoes demais.`,
    );
    assertCondition(
      countEmojis(example.idealReply) <= 2,
      `${example.id}: resposta ideal tem emojis demais.`,
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
    assertCondition(
      !hasTooManyCattyCatchphrases(fallbackReply),
      `${example.id}: fallback tem bordoes demais.`,
    );
    assertCondition(
      countEmojis(fallbackReply) <= 2,
      `${example.id}: fallback tem emojis demais.`,
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

  const personalizedCorrection = buildFallbackCattyReply(
    "corrige",
    { area: "student", task: "resumo" },
    [],
    { firstName: "Ana", role: "STUDENT" },
  );

  assertCondition(
    personalizedCorrection.includes("Ana"),
    "fallback personalizado nao usou o primeiro nome em correcao.",
  );
  assertCondition(
    countEmojis(personalizedCorrection) <= 2,
    "fallback personalizado passou do limite de emojis.",
  );

  const sensitiveReply = buildFallbackCattyReply(
    "esqueci minha senha",
    { area: "student", task: "perfil" },
    [],
    { firstName: "Ana", role: "STUDENT" },
  );

  assertCondition(
    !sensitiveReply.includes("Ana"),
    "fallback usou nome em mensagem sensivel de senha.",
  );

  const learningPlan = buildCattyResponsePlan("corrige", {
    area: "student",
    task: "homework",
  });
  const learningContext = [
    {
      badReply: "Nao entendi sua pergunta.",
      category: "IDEAL_REPLY" as const,
      idealReply:
        "Miauw, me manda a frase que voce quer corrigir. A Catty explica rapidinho.",
      intent: "correct_sentence",
      notes: "Usar tom curto quando o aluno pede correcao sem frase.",
      tags: ["correcao"],
      title: "Correcao sem frase",
      userPrompt: "corrige",
    },
  ];
  const promptWithLearning = buildCattyInput(
    "corrige",
    [],
    { area: "student", task: "homework" },
    learningPlan,
    { firstName: "Ana", role: "STUDENT" },
    learningContext,
  );
  const learnedFallback = pickCattyLearningFallbackReply(
    learningPlan,
    learningContext,
    "corrige",
  );

  assertCondition(
    promptWithLearning.includes("Correcao sem frase"),
    "prompt nao incluiu memoria aprovada da Catty.",
  );
  assertCondition(
    Boolean(learnedFallback?.includes("Miauw")),
    "fallback nao aproveitou resposta ideal aprovada.",
  );

  const missingIdealFeedback = cattyLearningFeedbackCreateSchema.safeParse({
    cattyMessageId: "catty-message-1",
    kind: "SHOULD_ANSWER",
  });
  const sensitiveFeedback = cattyLearningFeedbackCreateSchema.safeParse({
    cattyMessageId: "catty-message-1",
    idealReply: "Use este telefone no exemplo.",
    kind: "SHOULD_ANSWER",
  });
  const validFeedback = cattyLearningFeedbackCreateSchema.safeParse({
    cattyMessageId: "catty-message-1",
    idealReply:
      "Miauw, quer aprender isso em English? Podemos dizer: I make a salad.",
    kind: "SHOULD_ANSWER",
  });

  assertCondition(
    !missingIdealFeedback.success,
    "feedback deveria exigir resposta ideal em SHOULD_ANSWER.",
  );
  assertCondition(
    !sensitiveFeedback.success,
    "feedback deveria bloquear termo sensivel.",
  );
  assertCondition(validFeedback.success, "feedback valido foi recusado.");

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
