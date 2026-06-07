import {
  buildCattyInput,
  buildCattyResponsePlan,
  buildFallbackCattyReply,
  hasDisallowedCattyText,
  sanitizeCattyReply,
  shouldUseOpenAiForCatty,
  type CattyIntent,
  type CattyMessage,
  type CattyPageContext,
  type CattySessionContext,
} from "../src/lib/catty";
import { CATTY_BEHAVIOR_EXAMPLES } from "../src/lib/catty-examples";
import {
  CATTY_SIGNATURE_EXPRESSIONS,
  hasTooManyCattyCatchphrases,
} from "../src/lib/catty-personality";
import {
  formatCattyLearningPromptContext,
  pickCattyLearningFallbackReply,
} from "../src/lib/catty-learning";
import {
  CATTY_SCENARIOS,
  CATTY_SCENARIOS_BY_INTENT,
  formatCattyScenarioPromptContext,
  pickCattyScenarioFallbackReply,
  selectCattyScenariosForPrompt,
} from "../src/lib/catty-scenarios";
import {
  applyCattyUserMemoryToFallbackReply,
  extractCattyUserMemoryCandidates,
  extractCattyUserMemoryContradictions,
  formatCattyUserMemoryPromptContext,
  selectRelevantCattyUserMemories,
  type CattyUserMemoryPromptItem,
} from "../src/lib/catty-user-memory";
import {
  applyCattyArtifactToReply,
  extractCattyArtifactAvoidanceCandidates,
  formatCattyArtifactPromptContext,
  pickCattyArtifactForContext,
  pickCattyArtifactReplyVariant,
} from "../src/lib/catty-artifacts";
import {
  buildCattyArtifactBalloonTemplates,
  buildCattyLoggedInBalloonPool,
  pickCattyLoggedInBalloon,
} from "../src/lib/catty-artifact-balloons";
import { cattyLearningFeedbackCreateSchema } from "../src/lib/validations/catty-learning";
import {
  cattyArtifactEnrichmentRequestSchema,
  cattyArtifactEnrichmentReviewSchema,
  cattyUserArtifactUpsertSchema,
  hasBlockedCattyArtifactText,
} from "../src/lib/validations/catty-artifacts";
import { cattyUserMemoryUpsertSchema } from "../src/lib/validations/catty-user-memory";

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
    "Memoria pessoal segura do usuario",
    "Continuidade conversacional",
    "Correcao local detectada",
    "Artefato de personalidade sugerido",
    "Cenarios de repertorio da Catty",
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

const requiredScenarioCategories = [
  "admin",
  "animals",
  "candy_xp",
  "cars",
  "code_api",
  "confusion",
  "correction",
  "food",
  "fragment",
  "future_will",
  "games",
  "geek",
  "homework",
  "memory_artifact",
  "messages",
  "motivation",
  "out_of_scope",
  "preference",
  "questions",
  "ready_answer",
  "restaurant",
  "routine",
  "shopping",
  "simple_past",
  "teacher",
  "there_is_are",
  "was_were",
  "would_like",
];

function assertCattyScenarioBase() {
  assertCondition(
    CATTY_SCENARIOS.length >= 40,
    `base de cenarios deveria ter pelo menos 40 itens, recebeu ${CATTY_SCENARIOS.length}.`,
  );

  const ids = new Set<string>();
  const categories = new Set(CATTY_SCENARIOS.map((scenario) => scenario.category));
  const scenarioIntentTotal = Object.values(CATTY_SCENARIOS_BY_INTENT).reduce(
    (total, scenarios) => total + (scenarios?.length ?? 0),
    0,
  );

  assertCondition(
    scenarioIntentTotal === CATTY_SCENARIOS.length,
    "indice de cenarios por intencao nao cobre toda a base.",
  );

  for (const category of requiredScenarioCategories) {
    assertCondition(
      categories.has(category as (typeof CATTY_SCENARIOS)[number]["category"]),
      `base de cenarios nao cobre categoria ${category}.`,
    );
  }

  for (const scenario of CATTY_SCENARIOS) {
    assertCondition(!ids.has(scenario.id), `${scenario.id}: id duplicado.`);
    ids.add(scenario.id);
    assertCondition(scenario.name.length > 3, `${scenario.id}: nome vazio.`);
    assertCondition(
      scenario.userInput.length > 1,
      `${scenario.id}: entrada do usuario vazia.`,
    );
    assertCondition(
      scenario.badReply.length > 8,
      `${scenario.id}: resposta ruim vazia.`,
    );
    assertCondition(
      scenario.idealReply.length > 12,
      `${scenario.id}: resposta ideal vazia.`,
    );
    assertCondition(
      scenario.rule.length > 12,
      `${scenario.id}: regra usada vazia.`,
    );
    assertCondition(
      scenario.tags.length > 0,
      `${scenario.id}: cenario sem tags.`,
    );
    assertCondition(
      includesSignature(scenario.idealReply),
      `${scenario.id}: resposta ideal sem voz da Catty.`,
    );
    assertCondition(
      !hasTooManyCattyCatchphrases(scenario.idealReply),
      `${scenario.id}: resposta ideal tem bordoes demais.`,
    );
    assertCondition(
      countEmojis(scenario.idealReply) <= 2,
      `${scenario.id}: resposta ideal tem emojis demais.`,
    );
    assertNoGenericOpening(scenario.idealReply, `${scenario.id}: cenario ideal`);
    assertIntentSafety(scenario.id, scenario.intent, scenario.idealReply);
  }

  for (const requiredId of [
    "preference-correct-chocolate",
    "preference-error-i-likes",
    "preference-cars-memory",
    "fragment-red-cars",
    "age-have-years-old",
    "simple-past-school-yesterday",
    "she-like-pizza",
    "do-she-like-cats",
    "i-were-happy",
    "vague-nao-entendi",
    "ready-answer-generic",
    "teacher-feedback-short",
    "admin-ava-sensitive",
    "salad-to-english",
    "api-request-redirect",
    "correction-empty-corrige",
  ]) {
    assertCondition(
      CATTY_SCENARIOS.some((scenario) => scenario.id === requiredId),
      `cenario obrigatorio ausente: ${requiredId}.`,
    );
  }
}

function assertConversationalReply(text: string, label: string) {
  assertCondition(
    !/\n\s*(?:[-*]|\d+[.)])\s+/.test(text),
    `${label}: resposta virou lista.`,
  );
  assertCondition(
    includesSignature(text),
    `${label}: resposta sequencial sem voz da Catty.`,
  );
  assertCondition(
    !hasTooManyCattyCatchphrases(text),
    `${label}: resposta sequencial tem bordoes demais.`,
  );
  assertCondition(
    countEmojis(text) <= 2,
    `${label}: resposta sequencial tem emojis demais.`,
  );
  assertNoGenericOpening(text, label);
}

function buildRouteLikeFallbackTurn(input: {
  context?: CattyPageContext;
  history: CattyMessage[];
  message: string;
  sessionContext?: CattySessionContext;
  userMemoryContext?: CattyUserMemoryPromptItem[];
}) {
  const context: CattyPageContext =
    input.context ?? { area: "student", task: "resumo" };
  const sessionContext: CattySessionContext =
    input.sessionContext ?? { firstName: "Ana", role: "STUDENT" };
  const userMemoryContext = input.userMemoryContext ?? [];
  const plan = buildCattyResponsePlan(
    input.message,
    context,
    input.history,
    sessionContext,
  );
  const prompt = buildCattyInput(
    input.message,
    input.history,
    context,
    plan,
    sessionContext,
    [],
    userMemoryContext,
  );
  const scenarioFallbackReply = pickCattyScenarioFallbackReply({
    context,
    history: input.history,
    memories: userMemoryContext,
    message: input.message,
    plan,
  });
  const reply = applyCattyUserMemoryToFallbackReply({
    history: input.history,
    memories: userMemoryContext,
    message: input.message,
    plan,
    reply: scenarioFallbackReply
      ? sanitizeCattyReply(scenarioFallbackReply)
      : plan.fallbackReply,
  });

  input.history.push(
    { from: "user", text: input.message },
    { from: "catty", text: reply },
  );

  return {
    normalizedReply: normalizeText(reply),
    plan,
    prompt,
    reply,
    scenarioFallbackReply,
  };
}

type ScenarioFallbackChecklistCase = {
  context?: CattyPageContext;
  expectedAiSource: "gemini" | "openai";
  expectedIntent: CattyIntent;
  fallbackMustInclude: string[];
  history?: CattyMessage[];
  id: string;
  message: string;
  scenarioFallback: boolean;
  sessionContext?: CattySessionContext;
  userMemoryContext?: CattyUserMemoryPromptItem[];
  usesMemoryOrArtifact: boolean;
};

function main() {
  assertCondition(
    CATTY_BEHAVIOR_EXAMPLES.length === expectedExampleCount,
    `Esperava ${expectedExampleCount} exemplos, recebeu ${CATTY_BEHAVIOR_EXAMPLES.length}.`,
  );
  assertCattyScenarioBase();

  const scenarioPromptPlan = buildCattyResponsePlan(
    "I like cars.",
    { area: "student", task: "resumo" },
  );
  const scenarioPromptMemory: CattyUserMemoryPromptItem[] = [
    {
      category: "INTEREST",
      confidence: 90,
      id: "memory-cars",
      key: "cars",
      source: "TEACHER_NOTE",
      value: "gosta de carros",
    },
  ];
  const selectedScenarios = selectCattyScenariosForPrompt({
    context: { area: "student", task: "resumo" },
    history: [],
    intent: scenarioPromptPlan.intent,
    memories: scenarioPromptMemory,
    message: "I like cars.",
  });
  const scenarioPrompt = buildCattyInput(
    "I like cars.",
    [],
    { area: "student", task: "resumo" },
    scenarioPromptPlan,
    { firstName: "Ana", role: "STUDENT" },
    [],
    scenarioPromptMemory,
  );
  const scenarioFallback = pickCattyScenarioFallbackReply({
    context: { area: "student", task: "resumo" },
    history: [],
    memories: scenarioPromptMemory,
    message: "I like cars.",
    plan: scenarioPromptPlan,
  });

  assertCondition(
    selectedScenarios.some((scenario) => scenario.id === "preference-cars-memory"),
    "seletor de cenarios nao priorizou gosto de carros com memoria.",
  );
  assertCondition(
    formatCattyScenarioPromptContext(selectedScenarios).includes("Gosto pessoal com memoria"),
    "formatador de cenarios nao incluiu nome do cenario selecionado.",
  );
  assertCondition(
    scenarioPrompt.includes("Cenarios de repertorio da Catty") &&
      scenarioPrompt.includes("Uwau, vruum vruum"),
    "prompt da Catty nao incluiu repertorio de cenarios relevante.",
  );
  assertCondition(
    Boolean(scenarioFallback?.includes("What color cars")),
    "fallback por cenario nao retornou resposta curada de carros.",
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

  const simpleConversationCases = [
    {
      history: [],
      mustInclude: ["What else do you like", "chocolate"],
      topic: "chocolate",
      userMessage: "I like chocolate.",
    },
    {
      history: [],
      mustInclude: ["vruum", "What color cars"],
      topic: "cars",
      userMessage: "I like cars.",
    },
    {
      history: [],
      mustInclude: ["past sentence", "one more thing in the past"],
      topic: "soccer yesterday",
      userMessage: "I played soccer yesterday.",
    },
    {
      history: [{ from: "user" as const, text: "I like chocolate." }],
      mustInclude: ["almost there", "Complete it"],
      topic: "chocolate",
      userMessage: "I like",
    },
  ];

  for (const example of simpleConversationCases) {
    const plan = buildCattyResponsePlan(
      example.userMessage,
      { area: "student", task: "resumo" },
      example.history,
      { firstName: "Ana", role: "STUDENT" },
    );
    const prompt = buildCattyInput(
      example.userMessage,
      example.history,
      { area: "student", task: "resumo" },
      plan,
      { firstName: "Ana", role: "STUDENT" },
    );
    const normalizedFallback = normalizeText(plan.fallbackReply);

    assertCondition(
      plan.intent === "practice_english",
      `${example.userMessage}: frase simples nao virou pratica de ingles.`,
    );
    assertCondition(
      Boolean(plan.continuity),
      `${example.userMessage}: plano nao tem continuidade conversacional.`,
    );
    assertCondition(
      prompt.includes("Continuidade conversacional") &&
        prompt.includes(example.topic),
      `${example.userMessage}: prompt nao levou assunto da continuidade.`,
    );
    assertCondition(
      !normalizedFallback.includes("write one small english sentence"),
      `${example.userMessage}: fallback voltou a responder generico.`,
    );

    for (const expected of example.mustInclude) {
      assertCondition(
        normalizedFallback.includes(normalizeText(expected)),
        `${example.userMessage}: fallback nao contem "${expected}". Resposta: ${plan.fallbackReply}`,
      );
    }
  }

  const sequenceOneHistory: CattyMessage[] = [];
  const sequenceOneFirst = buildRouteLikeFallbackTurn({
    history: sequenceOneHistory,
    message: "I like chocolate.",
  });
  const sequenceOneSecond = buildRouteLikeFallbackTurn({
    history: sequenceOneHistory,
    message: "I like pizza.",
  });

  assertConversationalReply(sequenceOneFirst.reply, "sequencia 1 turno 1");
  assertConversationalReply(sequenceOneSecond.reply, "sequencia 1 turno 2");
  assertCondition(
    sequenceOneFirst.plan.intent === "practice_english" &&
      sequenceOneFirst.normalizedReply.includes("what else do you like"),
    "sequencia 1 turno 1 nao continuou perguntando outro gosto.",
  );
  assertCondition(
    sequenceOneSecond.plan.intent === "practice_english" &&
      sequenceOneSecond.plan.continuity?.historyTopic === "chocolate" &&
      sequenceOneSecond.normalizedReply.includes("chocolate and pizza"),
    "sequencia 1 turno 2 nao reconheceu gostos anteriores para juntar com and.",
  );
  assertCondition(
    sequenceOneSecond.prompt.includes("Assunto recente no historico: chocolate") &&
      sequenceOneSecond.prompt.includes("I like chocolate and pizza"),
    "sequencia 1 nao levou a continuidade com and para o prompt da IA.",
  );

  const sequenceTwoHistory: CattyMessage[] = [];
  const sequenceTwoFirst = buildRouteLikeFallbackTurn({
    history: sequenceTwoHistory,
    message: "I likes cars.",
  });
  const sequenceTwoSecond = buildRouteLikeFallbackTurn({
    history: sequenceTwoHistory,
    message: "red cars",
  });

  assertConversationalReply(sequenceTwoFirst.reply, "sequencia 2 turno 1");
  assertConversationalReply(sequenceTwoSecond.reply, "sequencia 2 turno 2");
  assertCondition(
    sequenceTwoFirst.plan.intent === "correct_sentence" &&
      sequenceTwoFirst.normalizedReply.includes("melhor: i like cars") &&
      sequenceTwoFirst.normalizedReply.includes("like sem -s"),
    "sequencia 2 turno 1 nao corrigiu I likes cars.",
  );
  assertCondition(
    sequenceTwoSecond.plan.intent === "practice_english" &&
      sequenceTwoSecond.plan.continuity?.isFragment === true &&
      sequenceTwoSecond.normalizedReply.includes("i like red cars") &&
      !sequenceTwoSecond.normalizedReply.includes("exact bit") &&
      !sequenceTwoSecond.normalizedReply.includes("trecho exato"),
    "sequencia 2 turno 2 nao transformou red cars em frase completa.",
  );
  assertCondition(
    sequenceTwoSecond.prompt.includes("Mensagem atual e fragmento") &&
      sequenceTwoSecond.prompt.includes("Frase completa sugerida: I like red cars."),
    "sequencia 2 nao levou fragmento e frase sugerida para o prompt da IA.",
  );

  const capybaraMemoryContext: CattyUserMemoryPromptItem[] = [
    {
      category: "INTEREST",
      confidence: 90,
      id: "memory-capybara",
      key: "animal",
      source: "TEACHER_NOTE",
      value: "capivara",
    },
  ];
  const sequenceThreeHistory: CattyMessage[] = [];
  const sequenceThreeFirst = buildRouteLikeFallbackTurn({
    history: sequenceThreeHistory,
    message: "My favorite animal is capybara.",
    userMemoryContext: capybaraMemoryContext,
  });

  assertConversationalReply(sequenceThreeFirst.reply, "sequencia 3");
  assertCondition(
    sequenceThreeFirst.plan.intent === "correct_sentence" &&
      sequenceThreeFirst.normalizedReply.includes(
        "my favorite animal is a capybara",
      ) &&
      sequenceThreeFirst.normalizedReply.includes("animal sentence"),
    "sequencia 3 nao corrigiu artigo em capybara e continuou com animal.",
  );
  assertCondition(
    sequenceThreeFirst.prompt.includes("capivara") &&
      sequenceThreeFirst.prompt.includes("Correcao local detectada"),
    "sequencia 3 nao incluiu memoria de capivara e correcao no prompt.",
  );

  const sequenceFour = buildRouteLikeFallbackTurn({
    history: [],
    message: "She like chocolate.",
  });
  const sequenceFive = buildRouteLikeFallbackTurn({
    history: [],
    message: "I have 12 years old.",
  });
  const sequenceSix = buildRouteLikeFallbackTurn({
    history: [],
    message: "I go to school yesterday.",
  });

  assertConversationalReply(sequenceFour.reply, "sequencia 4");
  assertConversationalReply(sequenceFive.reply, "sequencia 5");
  assertConversationalReply(sequenceSix.reply, "sequencia 6");
  assertCondition(
    sequenceFour.normalizedReply.includes("melhor: she likes chocolate") &&
      sequenceFour.normalizedReply.includes("does she like chocolate"),
    "sequencia 4 nao corrigiu she like chocolate com continuacao relacionada.",
  );
  assertCondition(
    sequenceFive.normalizedReply.includes("melhor: i am 12 years old") &&
      sequenceFive.normalizedReply.includes("say your age again"),
    "sequencia 5 nao corrigiu idade com I am e pedido para repetir.",
  );
  assertCondition(
    sequenceSix.normalizedReply.includes("melhor: i went to school yesterday") &&
      sequenceSix.normalizedReply.includes("yesterday") &&
      sequenceSix.normalizedReply.includes("passado"),
    "sequencia 6 nao corrigiu yesterday + presente para passado.",
  );

  const scenarioFallbackChecklist: ScenarioFallbackChecklistCase[] = [
    {
      expectedAiSource: "gemini",
      expectedIntent: "practice_english",
      fallbackMustInclude: ["What else do you like"],
      id: "scenario-like-chocolate",
      message: "I like chocolate.",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "openai",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["I like chocolate", "like sem -s"],
      id: "scenario-openai-correction",
      message: "Catty, corrige: I likes chocolate.",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["I like chocolate", "What else do you like"],
      id: "scenario-i-likes",
      message: "I likes chocolate.",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["She likes pizza", "verbo ganha -s"],
      id: "scenario-she-like",
      message: "She like pizza.",
      scenarioFallback: false,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["I am 10 years old", "idade"],
      id: "scenario-age",
      message: "I have 10 years old.",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["I went to school yesterday", "passado"],
      id: "scenario-yesterday",
      message: "I go to school yesterday.",
      scenarioFallback: false,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "confusing_question",
      fallbackMustInclude: ["I like red cars", "blue"],
      id: "scenario-red-cars-isolated",
      message: "red cars",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "practice_english",
      fallbackMustInclude: ["I like red cars"],
      history: [
        { from: "user" as const, text: "I likes cars." },
        {
          from: "catty" as const,
          text: "Awnn, quase la. Melhor: I like cars.",
        },
      ],
      id: "scenario-red-cars-history",
      message: "red cars",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "confusing_question",
      fallbackMustInclude: ["palavra", "frase", "exercicio"],
      id: "scenario-nao-entendi",
      message: "nao entendi",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["frase que voce quer corrigir"],
      id: "scenario-corrige",
      message: "corrige",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      context: { area: "student" as const, task: "homeworks" },
      expectedAiSource: "gemini",
      expectedIntent: "ready_answer_request",
      fallbackMustInclude: ["resposta pronta", "me manda o enunciado"],
      id: "scenario-ready-answer",
      message: "me da a resposta",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "out_of_scope",
      fallbackMustInclude: ["I make a salad", "ingredients"],
      id: "scenario-salad",
      message: "como faz salada?",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["My favorite animal is a capybara", "animal sentence"],
      id: "scenario-capybara-memory",
      message: "My favorite animal is capybara.",
      scenarioFallback: false,
      userMemoryContext: capybaraMemoryContext,
      usesMemoryOrArtifact: true,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["Does she like cats", "does"],
      id: "scenario-do-she",
      message: "Do she like cats?",
      scenarioFallback: false,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "correct_sentence",
      fallbackMustInclude: ["I was happy", "was"],
      id: "scenario-was-were",
      message: "I were happy.",
      scenarioFallback: false,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "confusing_question",
      fallbackMustInclude: ["There are two cats", "plural"],
      id: "scenario-there-are",
      message: "There is two cats.",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "confusing_question",
      fallbackMustInclude: ["I would like a juice", "What would you like"],
      id: "scenario-would-like",
      message: "I would like a juice.",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      expectedAiSource: "gemini",
      expectedIntent: "confusing_question",
      fallbackMustInclude: ["I bought shoes", "bought"],
      id: "scenario-shopping-buyed",
      message: "I buyed shoes.",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
    {
      context: { area: "teacher" as const, task: "resumo" },
      expectedAiSource: "openai",
      expectedIntent: "teacher_feedback",
      fallbackMustInclude: ["feedback bruto", "Candy"],
      id: "scenario-teacher-feedback",
      message: "Catty melhora esse feedback",
      scenarioFallback: true,
      sessionContext: { firstName: "Teacher", role: "TEACHER" as const },
      usesMemoryOrArtifact: false,
    },
    {
      context: { area: "student" as const, task: "candy-xp" },
      expectedAiSource: "gemini",
      expectedIntent: "candy_xp",
      fallbackMustInclude: ["Candy XP", "missao"],
      id: "scenario-candy-xp",
      message: "como ganho XP?",
      scenarioFallback: true,
      usesMemoryOrArtifact: false,
    },
  ];

  assertCondition(
    scenarioFallbackChecklist.length === 20,
    "checklist de fallback por cenario deve ter 20 entradas.",
  );

  for (const example of scenarioFallbackChecklist) {
    const result = buildRouteLikeFallbackTurn({
      context: example.context,
      history: [...(example.history ?? [])],
      message: example.message,
      sessionContext: example.sessionContext,
      userMemoryContext: example.userMemoryContext,
    });
    const usesOpenAi = shouldUseOpenAiForCatty(example.message);

    assertConversationalReply(result.reply, example.id);
    assertCondition(
      result.plan.intent === example.expectedIntent,
      `${example.id}: intencao ${result.plan.intent} diferente de ${example.expectedIntent}.`,
    );
    assertCondition(
      usesOpenAi === (example.expectedAiSource === "openai"),
      `${example.id}: roteamento IA esperado ${example.expectedAiSource}, recebeu ${usesOpenAi ? "openai" : "gemini"}.`,
    );
    assertCondition(
      Boolean(result.scenarioFallbackReply) === example.scenarioFallback,
      `${example.id}: fallback por cenario esperado ${example.scenarioFallback}.`,
    );
    assertCondition(
      result.prompt.includes("Cenarios de repertorio da Catty"),
      `${example.id}: prompt nao incluiu bloco de cenarios para Gemini/OpenAI.`,
    );
    assertCondition(
      !hasDisallowedCattyText(result.reply),
      `${example.id}: fallback mencionou IA ou provedor.`,
    );
    assertIntentSafety(example.id, result.plan.intent, result.reply);

    for (const expected of example.fallbackMustInclude) {
      assertCondition(
        result.normalizedReply.includes(normalizeText(expected)),
        `${example.id}: fallback nao contem "${expected}". Resposta: ${result.reply}`,
      );
    }

    if (example.usesMemoryOrArtifact) {
      assertCondition(
        result.prompt.includes("capivara") || result.reply.includes("capybara"),
        `${example.id}: teste marcado como memoria/artefato nao levou contexto pessoal.`,
      );
    }
  }

  const grammarCorrectionCases = [
    {
      expected: ["Melhor", "I like chocolate", "like sem -s", "What else"],
      userMessage: "I likes chocolate.",
    },
    {
      expected: ["Melhor", "She likes pizza", "verbo ganha -s", "Does she"],
      userMessage: "She like pizza.",
    },
    {
      expected: ["Melhor", "He likes games", "verbo ganha -s", "Does he"],
      userMessage: "He like games.",
    },
    {
      expected: ["Melhor", "I have a dog", "usamos have", "What else"],
      userMessage: "I has a dog.",
    },
    {
      expected: ["Melhor", "She has a cat", "usamos has", "What else"],
      userMessage: "She have a cat.",
    },
    {
      expected: ["Melhor", "I like pizza", "sem am", "What else"],
      userMessage: "I am like pizza.",
    },
    {
      expected: ["Melhor", "I am 10 years old", "idade", "say your age"],
      userMessage: "I have 10 years old.",
    },
    {
      expected: ["Melhor", "I went to school yesterday", "went to", "What did"],
      userMessage: "I went in school yesterday.",
    },
    {
      expected: ["Melhor", "I went to school yesterday", "passado", "yesterday"],
      userMessage: "I go to school yesterday.",
    },
    {
      expected: ["Melhor", "Yesterday I watched a movie", "passado", "one more"],
      userMessage: "Yesterday I watch a movie.",
    },
    {
      expected: ["Melhor", "I like cars", "plural", "What kind"],
      userMessage: "I like car.",
    },
    {
      expected: ["Melhor", "My favorite animal is a capybara", "Antes de capybara", "animal sentence"],
      userMessage: "My favorite animal is capybara.",
    },
    {
      expected: ["Melhor", "I have an apple", "Antes de apple", "a or an"],
      userMessage: "I have apple.",
    },
    {
      expected: ["Melhor", "What do you like?", "usamos do", "do"],
      userMessage: "What you like?",
    },
    {
      expected: ["Melhor", "What does she like?", "does", "does she"],
      userMessage: "What she likes?",
    },
    {
      expected: ["Melhor", "Does she like pizza?", "sem -s", "What else"],
      userMessage: "Does she likes pizza?",
    },
    {
      expected: ["Melhor", "Does he like pizza?", "usa does", "does question"],
      userMessage: "Do he like pizza?",
    },
    {
      expected: ["Melhor", "I was happy", "usamos was", "past sentence"],
      userMessage: "I were happy.",
    },
    {
      expected: ["Melhor", "They were tired", "usamos were", "were"],
      userMessage: "They was tired.",
    },
    {
      expected: ["Melhor", "They are happy", "usamos are", "are"],
      userMessage: "They is happy.",
    },
  ];

  assertCondition(
    grammarCorrectionCases.length === 20,
    "smoke deve cobrir 20 frases de correcao conversacional.",
  );

  for (const example of grammarCorrectionCases) {
    const plan = buildCattyResponsePlan(example.userMessage, {
      area: "student",
      task: "resumo",
    });
    const prompt = buildCattyInput(
      example.userMessage,
      [],
      { area: "student", task: "resumo" },
      plan,
      { firstName: "Ana", role: "STUDENT" },
    );
    const normalizedFallback = normalizeText(plan.fallbackReply);

    assertCondition(
      plan.intent === "correct_sentence",
      `${example.userMessage}: erro comum nao virou correcao direta.`,
    );
    assertCondition(
      Boolean(plan.correction),
      `${example.userMessage}: plano nao gerou correcao local.`,
    );
    assertCondition(
      prompt.includes("Correcao local detectada") &&
        prompt.includes(plan.correction?.correctedSentence ?? ""),
      `${example.userMessage}: prompt nao levou a correcao para IA.`,
    );
    assertCondition(
      !normalizedFallback.includes("send me the sentence") &&
        !normalizedFallback.includes("manda a frase exata"),
      `${example.userMessage}: fallback pediu frase de novo apesar de ja ter frase.`,
    );
    assertCondition(
      includesSignature(plan.fallbackReply),
      `${example.userMessage}: fallback de correcao sem voz da Catty.`,
    );
    assertCondition(
      countEmojis(plan.fallbackReply) <= 2,
      `${example.userMessage}: fallback de correcao tem emojis demais.`,
    );

    for (const expected of example.expected) {
      assertCondition(
        normalizedFallback.includes(normalizeText(expected)),
        `${example.userMessage}: fallback nao contem "${expected}". Resposta: ${plan.fallbackReply}`,
      );
    }
  }

  const homeworkCorrectionPlan = buildCattyResponsePlan(
    "I likes chocolate.",
    { area: "student", task: "homeworks" },
  );
  const normalizedHomeworkCorrection = normalizeText(
    homeworkCorrectionPlan.fallbackReply,
  );

  assertCondition(
    normalizedHomeworkCorrection.includes("nao dou gabarito final") &&
      normalizedHomeworkCorrection.includes("estrutura parecida") &&
      normalizedHomeworkCorrection.includes("i like chocolate"),
    "correcao em homework deve explicar estrutura parecida sem gabarito final.",
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
    {
      badReply: null,
      category: "VOCABULARY" as const,
      idealReply:
        "Miauw, playground quer dizer parquinho. Exemplo: The kids are in the playground.",
      intent: "explain_word",
      notes: "Exemplo curto para vocabulario.",
      tags: ["vocabulario"],
      title: "Vocabulario playground",
      userPrompt: "o que significa playground?",
    },
    {
      badReply: null,
      category: "HOMEWORK_EXAMPLE" as const,
      idealReply:
        "Nya, resposta pronta nao rola, mas pista boa rola: olhe primeiro o verbo.",
      intent: "ready_answer_request",
      notes: "Nao entregar gabarito em homework.",
      tags: ["homework"],
      title: "Homework sem gabarito",
      userPrompt: "me da a resposta",
    },
    {
      badReply: null,
      category: "CANDY_CONTEXT" as const,
      idealReply: "Esta memoria nao deve entrar no prompt.",
      intent: null,
      notes: "Item acima do limite de tres memorias.",
      tags: ["limite"],
      title: "Memoria fora do limite",
      userPrompt: "limite",
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
  const userMemoryContext = [
    {
      category: "INTEREST" as const,
      confidence: 88,
      id: "memory-1",
      key: "animal",
      source: "USER_MESSAGE" as const,
      value: "capivara",
    },
    {
      category: "STYLE" as const,
      confidence: 80,
      id: "memory-2",
      key: "examples",
      source: "USER_MESSAGE" as const,
      value: "exemplos com animais fofos",
    },
  ];
  const promptWithUserMemory = buildCattyInput(
    "vamos praticar",
    [],
    { area: "student", task: "candy-xp" },
    buildCattyResponsePlan("vamos praticar", {
      area: "student",
      task: "candy-xp",
    }),
    { firstName: "Betina", role: "STUDENT" },
    [],
    userMemoryContext,
  );
  const memoryAwareFallback = applyCattyUserMemoryToFallbackReply({
    memories: userMemoryContext,
    message: "vamos praticar com capivara",
    plan: buildCattyResponsePlan("vamos praticar", {
      area: "student",
      task: "candy-xp",
    }),
    reply: "Miauw, vamos fazer uma pratica curtinha.",
  });
  const confusedMemoryFallback = applyCattyUserMemoryToFallbackReply({
    memories: userMemoryContext,
    message: "nao entendi capivara",
    plan: buildCattyResponsePlan("nao entendi", {
      area: "student",
      task: "candy-xp",
    }),
    reply: "Awnn, voce travou na palavra, na frase ou no exercicio?",
  });

  assertCondition(
    promptWithLearning.includes("Correcao sem frase"),
    "prompt nao incluiu memoria aprovada da Catty.",
  );
  assertCondition(
    !promptWithLearning.includes("Memoria fora do limite"),
    "prompt incluiu mais de 3 memorias aprovadas.",
  );
  assertCondition(
    !formatCattyLearningPromptContext(learningContext).includes(
      "Memoria fora do limite",
    ),
    "formatador de memoria incluiu mais de 3 itens.",
  );
  assertCondition(
    Boolean(learnedFallback?.includes("Miauw")),
    "fallback nao aproveitou resposta ideal aprovada.",
  );
  assertCondition(
    promptWithUserMemory.includes("capivara"),
    "prompt nao incluiu memoria pessoal do usuario.",
  );
  assertCondition(
    formatCattyUserMemoryPromptContext(userMemoryContext).includes("capivara"),
    "formatador de memoria pessoal nao incluiu preferencia segura.",
  );
  assertCondition(
    memoryAwareFallback.includes("capivara"),
    "fallback nao aplicou memoria pessoal segura.",
  );
  assertCondition(
    confusedMemoryFallback.includes("capivara"),
    "fallback confuso nao aplicou memoria pessoal relevante.",
  );

  const capybaraArtifact = pickCattyArtifactForContext({
    intent: "confusing_question",
    memories: userMemoryContext,
    message: "nao entendi capivara",
  });
  const carsArtifact = pickCattyArtifactForContext({
    intent: "correct_sentence",
    memories: [],
    message: "corrige minha frase sobre carros",
  });
  const artifactPrompt = formatCattyArtifactPromptContext(capybaraArtifact, {
    history: [
      {
        from: "catty",
        text: "Awnn, modo capivara calma. Palavra ou frase?",
      },
    ],
    intent: "confusing_question",
    message: "nao entendi capivara",
  });
  const artifactFallback = applyCattyArtifactToReply({
    history: [
      {
        from: "catty",
        text: "Awnn, modo capivara calma. Palavra ou frase?",
      },
    ],
    intent: "confusing_question",
    message: "nao entendi capivara",
    reply: "Awnn, voce travou na palavra, na frase ou no exercicio?",
    selection: capybaraArtifact,
  });
  const repeatedVariant = pickCattyArtifactReplyVariant({
    history: [
      {
        from: "catty",
        text: "Awnn, modo capivara calma. Palavra ou frase?",
      },
    ],
    intent: "confusing_question",
    message: "nao entendi capivara",
    selection: capybaraArtifact,
  });
  const artifactAvoidance = extractCattyArtifactAvoidanceCandidates(
    "Para de usar exemplos de capivara comigo.",
  );
  const blockedArtifact = pickCattyArtifactForContext({
    intent: "confusing_question",
    memories: [
      ...userMemoryContext,
      {
        category: "STYLE" as const,
        confidence: 92,
        key: "avoid_capybara",
        source: "USER_MESSAGE" as const,
        value: "evitar artefatos de capivara",
      },
    ],
    message: "nao entendi",
  });
  const customArtifactContext = [
    {
      catchphrases: ["modo dino curioso", "passinho jurassico"],
      emojis: ["🦖", "✨"],
      example: "The dinosaur is reading a book.",
      id: "artifact-dino",
      label: "dinossauro",
      sounds: ["rawr"],
      themeId: "dinosaurs",
      toneRule: "Usar dino como brincadeira leve, sem forcar toda resposta.",
    },
  ];
  const customArtifact = pickCattyArtifactForContext({
    customArtifacts: customArtifactContext,
    intent: "practice_english",
    memories: [
      {
        category: "FAVORITE_THEME" as const,
        confidence: 90,
        key: "artifact_dinosaurs",
        source: "TEACHER_NOTE" as const,
        value: "gosta de dinossauro",
      },
    ],
    message: "vamos praticar",
  });
  const customArtifactPrompt = formatCattyArtifactPromptContext(customArtifact, {
    intent: "practice_english",
    message: "vamos praticar",
  });
  const customArtifactFallback = applyCattyUserMemoryToFallbackReply({
    artifacts: customArtifactContext,
    memories: [
      {
        category: "FAVORITE_THEME" as const,
        confidence: 90,
        id: "memory-dino",
        key: "artifact_dinosaurs",
        source: "TEACHER_NOTE" as const,
        value: "gosta de dinossauro",
      },
    ],
    message: "vamos praticar",
    plan: buildCattyResponsePlan("vamos praticar", {
      area: "student",
      task: "candy-xp",
    }),
    reply: "Miauw, vamos praticar uma frase curtinha.",
  });
  const dinoBalloons = buildCattyArtifactBalloonTemplates({
    artifact: customArtifactContext[0],
    name: "Pedro",
  });
  const dinoBalloonPool = buildCattyLoggedInBalloonPool({
    artifacts: customArtifactContext,
    greeting: "Good afternoon",
    name: "Pedro",
  });
  const pickedDinoBalloon = pickCattyLoggedInBalloon({
    artifacts: customArtifactContext,
    current: dinoBalloons[0],
    greeting: "Good afternoon",
    name: "Pedro",
  });
  const validArtifactForm = cattyUserArtifactUpsertSchema.safeParse({
    catchphrasesText: "modo dino curioso",
    emojisText: "🦖 ✨",
    label: "dinossauro",
    soundsText: "rawr",
    status: "ACTIVE",
    targetUserId: "user-1",
    themeId: "dinosaurs",
  });
  const validEnrichmentRequest =
    cattyArtifactEnrichmentRequestSchema.safeParse({
      label: "dinossauro",
      targetUserId: "user-1",
      themeId: "dinosaurs",
    });
  const blockedEnrichmentRequest =
    cattyArtifactEnrichmentRequestSchema.safeParse({
      label: "arma",
      targetUserId: "user-1",
      themeId: "arma",
    });
  const validEnrichmentReview = cattyArtifactEnrichmentReviewSchema.safeParse({
    catchphrasesText: "modo dino curioso",
    emojisText: "🦖 ✨",
    enrichmentId: "enrichment-1",
    label: "dinossauro",
    soundsText: "rawr",
    status: "ACTIVE",
    targetUserId: "user-1",
    themeId: "dinosaurs",
  });

  assertCondition(
    capybaraArtifact?.artifact.id === "capybara",
    "artefato de capivara nao foi selecionado por interesse/mensagem.",
  );
  assertCondition(
    carsArtifact?.artifact.id === "cars",
    "artefato de carros nao foi selecionado por mensagem atual.",
  );
  assertCondition(
    artifactPrompt.includes("modo capivara calma"),
    "prompt de artefato nao incluiu mini-bordoes do tema.",
  );
  assertCondition(
    artifactFallback !==
      "Awnn, voce travou na palavra, na frase ou no exercicio?",
    "fallback de artefato nao aplicou nenhuma variacao do tema.",
  );
  assertCondition(
    !artifactFallback.includes("modo capivara calma"),
    "fallback de artefato repetiu bordao recente.",
  );
  assertCondition(
    artifactPrompt.includes("Variacao sugerida agora"),
    "prompt de artefato nao incluiu variacao anti-repeticao.",
  );
  assertCondition(
    artifactPrompt.includes("Evite repetir elementos recentes"),
    "prompt de artefato nao incluiu elementos recentes.",
  );
  assertCondition(
    repeatedVariant?.text !== "modo capivara calma",
    "variante de artefato repetiu bordao recente.",
  );
  assertCondition(
    artifactAvoidance.some((memory) => memory.key === "avoid_capybara"),
    "detector nao capturou preferencia para evitar tema.",
  );
  assertCondition(
    blockedArtifact === null,
    "artefato deveria ser bloqueado por memoria de evitar tema.",
  );
  assertCondition(
    customArtifact?.artifact.id === "dinosaurs" &&
      customArtifact.artifact.customArtifactId === "artifact-dino",
    "artefato customizado do painel nao foi selecionado.",
  );
  assertCondition(
    customArtifactPrompt.includes("modo dino curioso"),
    "prompt nao incluiu bordao do artefato customizado.",
  );
  assertCondition(
    customArtifactFallback.includes("dino") ||
      customArtifactFallback.includes("🦖"),
    "fallback nao aplicou artefato customizado.",
  );
  assertCondition(
    dinoBalloons.some(
      (balloon) =>
        balloon.includes("Pedro") &&
        (balloon.includes("dino") ||
          balloon.includes("jurassico") ||
          balloon.includes("rawr")),
    ),
    "baloes personalizados nao usam nome + artefato aprovado.",
  );
  assertCondition(
    dinoBalloonPool.some((balloon) => balloon.includes("Pedro")) &&
      dinoBalloonPool.some(
        (balloon) =>
          balloon.includes("dino") ||
          balloon.includes("jurassico") ||
          balloon.includes("rawr"),
      ),
    "pool de baloes logados nao incluiu artefato aprovado.",
  );
  assertCondition(
    pickedDinoBalloon !== dinoBalloons[0],
    "seletor de balao repetiu a frase atual mesmo com alternativas.",
  );
  assertCondition(
    validArtifactForm.success,
    "validacao do formulario de artefato customizado falhou.",
  );
  assertCondition(
    validEnrichmentRequest.success,
    "validacao de pedido de enriquecimento seguro falhou.",
  );
  assertCondition(
    !blockedEnrichmentRequest.success,
    "enriquecimento deveria bloquear tema sensivel antes da busca.",
  );
  assertCondition(
    hasBlockedCattyArtifactText("violencia"),
    "detector de tema bloqueado nao reconheceu termo sensivel.",
  );
  assertCondition(
    validEnrichmentReview.success,
    "validacao de aprovacao editada do enriquecimento falhou.",
  );

  const detectedMemories = extractCattyUserMemoryCandidates(
    "Eu gosto de capivara e prefiro exemplos com animais fofos.",
  );
  const negativeDetectedMemories = extractCattyUserMemoryCandidates(
    "Nao gosto mais de capivara.",
  );
  const contradictions = extractCattyUserMemoryContradictions(
    "Nao gosto mais de capivara.",
  );
  const relevantMemories = selectRelevantCattyUserMemories({
    intent: "practice_english",
    message: "Cria uma frase com capivara.",
    memories: [
      ...userMemoryContext,
      {
        category: "DIFFICULTY" as const,
        confidence: 86,
        id: "memory-3",
        key: "grammar",
        source: "USER_MESSAGE" as const,
        updatedAt: new Date("2026-06-01T10:00:00.000Z"),
        usageCount: 3,
        value: "simple past",
      },
      {
        category: "DIFFICULTY" as const,
        confidence: 80,
        id: "memory-4",
        key: "grammar-2",
        source: "TEACHER_NOTE" as const,
        updatedAt: new Date("2026-06-02T10:00:00.000Z"),
        usageCount: 2,
        value: "do e does",
      },
      {
        category: "DIFFICULTY" as const,
        confidence: 78,
        id: "memory-5",
        key: "grammar-3",
        source: "TEACHER_NOTE" as const,
        updatedAt: new Date("2026-06-03T10:00:00.000Z"),
        usageCount: 1,
        value: "prepositions",
      },
      {
        category: "FAVORITE_THEME" as const,
        confidence: 82,
        id: "memory-6",
        key: "theme",
        source: "USER_MESSAGE" as const,
        updatedAt: new Date("2026-06-04T10:00:00.000Z"),
        usageCount: 1,
        value: "Pokemon",
      },
      {
        category: "INTEREST" as const,
        confidence: 74,
        id: "memory-7",
        key: "topic",
        source: "USER_MESSAGE" as const,
        updatedAt: new Date("2026-06-05T10:00:00.000Z"),
        usageCount: 0,
        value: "filmes",
      },
    ],
  });

  assertCondition(
    detectedMemories.some(
      (memory) => memory.category === "INTEREST" && memory.value === "capivara",
    ),
    "detector de memoria pessoal nao capturou interesse explicito.",
  );
  assertCondition(
    !negativeDetectedMemories.some((memory) => memory.value === "capivara"),
    "detector nao deveria salvar memoria negada pelo usuario.",
  );
  assertCondition(
    contradictions.includes("capivara"),
    "detector de contradicao nao capturou preferencia negada.",
  );
  assertCondition(
    relevantMemories.length <= 5,
    "seletor de memoria pessoal passou do limite do prompt.",
  );
  assertCondition(
    relevantMemories.filter((memory) => memory.category === "DIFFICULTY")
      .length <= 2,
    "seletor incluiu mais de 2 dificuldades.",
  );
  assertCondition(
    relevantMemories.filter((memory) =>
      ["FAVORITE_THEME", "INTEREST"].includes(memory.category),
    ).length <= 2,
    "seletor incluiu mais de 2 interesses/temas.",
  );
  assertCondition(
    relevantMemories.some((memory) => memory.value === "capivara"),
    "seletor nao priorizou memoria citada na mensagem.",
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
  const sensitiveUserMemory = cattyUserMemoryUpsertSchema.safeParse({
    category: "INTEREST",
    key: "contato",
    source: "USER_MESSAGE",
    status: "ACTIVE",
    targetUserId: "user-1",
    value: "telefone da mae",
  });
  const validUserMemory = cattyUserMemoryUpsertSchema.safeParse({
    category: "INTEREST",
    key: "animal",
    source: "USER_MESSAGE",
    status: "ACTIVE",
    targetUserId: "user-1",
    value: "capivara",
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
  assertCondition(
    !sensitiveUserMemory.success,
    "memoria pessoal deveria bloquear dado sensivel.",
  );
  assertCondition(validUserMemory.success, "memoria pessoal valida foi recusada.");

  console.log(
    `Catty behavior smoke OK: ${CATTY_BEHAVIOR_EXAMPLES.length} exemplos, ${CATTY_SCENARIOS.length} cenarios, 20 fallbacks por cenario, 20 correcoes e 6 sequencias validadas.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
