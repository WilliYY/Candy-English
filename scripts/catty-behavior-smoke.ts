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
import {
  formatCattyLearningPromptContext,
  pickCattyLearningFallbackReply,
} from "../src/lib/catty-learning";
import {
  applyCattyUserMemoryToFallbackReply,
  extractCattyUserMemoryCandidates,
  extractCattyUserMemoryContradictions,
  formatCattyUserMemoryPromptContext,
  selectRelevantCattyUserMemories,
} from "../src/lib/catty-user-memory";
import { cattyLearningFeedbackCreateSchema } from "../src/lib/validations/catty-learning";
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
    plan: buildCattyResponsePlan("vamos praticar", {
      area: "student",
      task: "candy-xp",
    }),
    reply: "Miauw, vamos fazer uma pratica curtinha.",
  });
  const confusedMemoryFallback = applyCattyUserMemoryToFallbackReply({
    memories: userMemoryContext,
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
    `Catty behavior smoke OK: ${CATTY_BEHAVIOR_EXAMPLES.length} exemplos validados.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
