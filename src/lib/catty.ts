import { CATTY_ALLOWED_EMOJIS } from "./catty-personality";
import {
  formatCattyArtifactPromptContext,
  pickCattyArtifactForContext,
  type CattyArtifactCustomItem,
} from "./catty-artifacts";
import {
  formatCattyScenarioPromptContext,
  selectCattyScenariosForPrompt,
} from "./catty-scenarios";
import type { CattyLearningPromptItem } from "@/lib/catty-learning";
import type { CattyUserMemoryPromptItem } from "@/lib/catty-user-memory";

export {
  CATTY_ALLOWED_EMOJIS,
  CATTY_BRAIN_RULES,
  CATTY_PERSONALITY_GUIDE,
  CATTY_SCOPE_GUIDE,
  CATTY_SIGNATURE_EXPRESSIONS,
} from "./catty-personality";

export type CattyMessage = {
  from: "catty" | "user";
  id?: string;
  text: string;
};

export type CattyPageContext = {
  area?: "site" | "login" | "admin" | "teacher" | "student" | "unknown";
  task?: string;
};

export type CattySessionContext = {
  firstName?: string;
  role?: "ADMIN" | "TEACHER" | "STUDENT";
  studentLevel?: string;
};

export type CattyIntent =
  | "ava_help"
  | "candy_xp"
  | "code_api_request"
  | "complex_question"
  | "confusing_question"
  | "correct_sentence"
  | "explain_word"
  | "homework_hint"
  | "lesson_material"
  | "motivation"
  | "out_of_scope"
  | "practice_english"
  | "ready_answer_request"
  | "teacher_activity_creation"
  | "teacher_feedback"
  | "teacher_message"
  | "translate_sentence";

type CattyScopeTopic =
  | "cake"
  | "code_api"
  | "cooking"
  | "finance"
  | "generic"
  | "health"
  | "legal";

type CattySimpleEnglishPattern =
  | "am"
  | "can"
  | "dislike"
  | "favorite"
  | "have"
  | "like"
  | "played"
  | "short_answer"
  | "third_person_likes"
  | "today"
  | "want"
  | "went"
  | "yesterday";

export type CattyConversationContinuityPlan = {
  correction?: string;
  historyTopic?: string;
  isFragment?: boolean;
  isFollowUp?: boolean;
  isIncomplete: boolean;
  pattern: CattySimpleEnglishPattern;
  previousQuestion?: string;
  prompt: string;
  question: string;
  shortAnswerKind?:
    | "agreement"
    | "degree"
    | "fragment"
    | "reason"
    | "yes_no";
  suggestedSentence?: string;
  topic: string;
  userAnswer?: string;
};

export type CattyGrammarCorrectionPlan = {
  correctedSentence: string;
  englishTip: string;
  explanation: string;
  homeworkExplanation: string;
  portugueseTip: string;
  prompt: string;
  question: string;
  rule: string;
};

export type CattyQuestionPracticePlan = {
  opening: string;
  prompt: string;
  question: string;
  topic: string;
};

export type CattyResponsePlan = {
  confidence: "high" | "medium" | "low";
  correction?: CattyGrammarCorrectionPlan;
  continuity?: CattyConversationContinuityPlan;
  fallbackReply: string;
  intent: CattyIntent;
  instruction: string;
  language: "English" | "Portuguese";
  label: string;
  questionPractice?: CattyQuestionPracticePlan;
};

const taskLabels: Record<string, string> = {
  agenda: "agenda",
  "apis-senhas": "APIs e senhas",
  aulas: "aulas e materiais",
  "aula-ao-vivo": "aula ao vivo",
  "candy-xp": "Candy XP",
  contratos: "contratos",
  "corrigir-respostas": "correcao de homework",
  "criar-aluno": "criar aluno",
  "criar-aula": "criar aula",
  "criar-homework": "criar homework",
  financeiro: "financeiro",
  homeworks: "homework",
  mensagens: "mensagens",
  perfil: "perfil",
  resumo: "resumo",
  usuarios: "usuarios",
};

const intentLabels: Record<CattyIntent, string> = {
  ava_help: "ajuda no AVA",
  candy_xp: "Candy XP",
  code_api_request: "pedido de codigo/API",
  complex_question: "pergunta grande",
  confusing_question: "pergunta confusa",
  correct_sentence: "corrigir frase",
  explain_word: "explicar palavra",
  homework_hint: "dica de homework",
  lesson_material: "aula/material",
  motivation: "motivacao",
  out_of_scope: "pergunta fora do tema",
  practice_english: "praticar ingles",
  ready_answer_request: "pedido de resposta pronta",
  teacher_activity_creation: "criacao de atividade para teacher",
  teacher_feedback: "feedback para aluno",
  teacher_message: "mensagem para teacher",
  translate_sentence: "traduzir frase",
};

const intentInstructions: Record<CattyIntent, string> = {
  ava_help:
    "oriente o caminho no AVA sem prometer executar acoes, alterar dados ou revelar informacoes internas.",
  candy_xp:
    "ajude com missoes, XP, progresso e atividades Candy XP sem inventar pontuacao, dados internos ou respostas finais.",
  code_api_request:
    "nao entregue codigo ou API tecnica; explique que Catty e de estudos e transforme a ideia em frase ou vocabulario de ingles.",
  complex_question:
    "resuma a duvida em uma frase e responda por partes, com no maximo dois passos claros.",
  confusing_question:
    "peca uma informacao especifica ou ofereca no maximo dois caminhos simples para a pessoa escolher.",
  correct_sentence:
    "corrija uma frase curta, mostre uma versao melhor e explique o motivo em uma frase simples.",
  explain_word:
    "explique a palavra com significado simples e uma frase exemplo curta.",
  homework_hint:
    "explique o caminho de raciocinio e de uma pista, mas nao entregue a resposta final da atividade.",
  lesson_material:
    "ajude com aula ou material dando vocabulario, exemplo curto ou um passo de estudo.",
  motivation:
    "anime o estudo com uma meta pequena e concreta para fazer agora.",
  out_of_scope:
    "nao responda como especialista generica; puxe o assunto para pratica curta de ingles, vocabulario ou conversacao.",
  practice_english:
    "crie uma micro pratica em ingles com frase curta, repeticao ou pergunta simples.",
  ready_answer_request:
    "recuse resposta pronta com carinho, explique que ajuda por pista ou exemplo parecido e peca apenas o enunciado.",
  teacher_activity_creation:
    "ajude teacher/admin a montar uma atividade curta com objetivo, frase-alvo, instrucao simples e forma de resposta, sem plano gigante.",
  teacher_feedback:
    "ajude a teacher com feedback curto, carinhoso e util, sem expor dados de aluno.",
  teacher_message:
    "ajude a escrever uma mensagem educada e curta para a teacher.",
  translate_sentence:
    "traduza ou peca o texto exato para traduzir; quando for homework, nao entregue resposta final.",
};

const portugueseSignals = [
  "ajuda",
  "aula",
  "como",
  "contrato",
  "dever",
  "enunciado",
  "estudar",
  "exercicio",
  "faco",
  "falar",
  "homework",
  "ingles",
  "mim",
  "mensagem",
  "pergunta",
  "pode",
  "preciso",
  "resposta",
  "senha",
  "tambem",
  "teacher",
  "traduz",
  "voce",
];

const englishSignals = [
  "am",
  "are",
  "can",
  "could",
  "correct",
  "do",
  "does",
  "english",
  "favorite",
  "good",
  "grammar",
  "has",
  "have",
  "he",
  "hello",
  "help",
  "hi",
  "how",
  "i",
  "is",
  "like",
  "likes",
  "learn",
  "mean",
  "practice",
  "phrase",
  "played",
  "say",
  "sentence",
  "she",
  "school",
  "should",
  "study",
  "they",
  "today",
  "what",
  "went",
  "why",
  "word",
  "yesterday",
];

const disallowedCattyTerms = [
  "as an ai",
  "chatgpt",
  "gemini",
  "google ai",
  "inteligencia artificial",
  "language model",
  "modelo de linguagem",
  "openai",
  "sou uma ia",
];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function countSignalMatches(text: string, terms: string[]) {
  const tokens = new Set(text.match(/[a-z0-9]+/g) ?? []);

  return terms.filter((term) => {
    const normalizedTerm = normalizeText(term);

    if (normalizedTerm.includes(" ")) {
      return text.includes(normalizedTerm);
    }

    if (normalizedTerm.length <= 3) {
      return tokens.has(normalizedTerm);
    }

    return text.includes(normalizedTerm);
  }).length;
}

function getContextLabel(context?: CattyPageContext) {
  if (!context) {
    return "site";
  }

  const area = context.area ?? "unknown";
  const task = context.task ? (taskLabels[context.task] ?? context.task) : "";

  if (area === "login") {
    return "login";
  }

  if (area === "site") {
    return "site";
  }

  if (area === "unknown") {
    return task || "area desconhecida";
  }

  return task ? `${area} - ${task}` : area;
}

function getTaskText(context?: CattyPageContext) {
  return normalizeText(context?.task ?? "");
}

function getWordTokens(text: string) {
  return normalizeText(text).match(/[a-z0-9]+/g) ?? [];
}

function isHomeworkContext(context?: CattyPageContext) {
  const task = getTaskText(context);

  return (
    task.includes("homework") ||
    task.includes("dever") ||
    task.includes("corrigir-respostas")
  );
}

function isCandyXpContext(context?: CattyPageContext) {
  const task = getTaskText(context);

  return task.includes("candy-xp") || task.includes("candy xp");
}

function isLessonMaterialContext(context?: CattyPageContext) {
  const task = getTaskText(context);

  return (
    task.includes("aula") ||
    task.includes("aulas") ||
    task.includes("material") ||
    task.includes("materiais")
  );
}

function isEnglishLearningMessage(text: string) {
  const normalized = normalizeText(text);

  return hasAny(normalized, [
    "atividade",
    "aula",
    "candy xp",
    "corrige",
    "corrigir",
    "dever",
    "enunciado",
    "english",
    "exercicio",
    "frase",
    "homework",
    "ingles",
    "listening",
    "material",
    "missao",
    "palavra",
    "practice",
    "praticar",
    "reading",
    "sentence",
    "speaking",
    "traduz",
    "translate",
    "vocabulario",
    "word",
    "writing",
    "xp",
  ]);
}

function hasCodeApiRequest(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);

  if (context?.task === "apis-senhas") {
    return false;
  }

  return hasAny(normalized, [
    "api",
    "backend",
    "codigo",
    "code",
    "endpoint",
    "javascript",
    "programa",
    "programar",
    "python",
    "typescript",
  ]);
}

function hasCandyXpSignal(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);

  return (
    isCandyXpContext(context) ||
    hasAny(normalized, [
      "badge",
      "candy xp",
      "conquista",
      "missao",
      "nivel",
      "progresso",
      "xp",
    ])
  );
}

function hasLessonMaterialSignal(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);

  return (
    isLessonMaterialContext(context) ||
    hasAny(normalized, [
      "aula",
      "lesson",
      "material",
      "materiais",
      "pdf",
      "slide",
    ])
  );
}

function isEducatorContext(context?: CattyPageContext) {
  return context?.area === "teacher" || context?.area === "admin";
}

function hasTeacherActivityCreationSignal(
  text: string,
  context?: CattyPageContext,
) {
  const normalized = normalizeText(text);
  const task = getTaskText(context);
  const creationSignal =
    hasAny(normalized, [
      "cria",
      "criar",
      "create",
      "monta",
      "montar",
      "planeja",
      "planejar",
      "prepare",
      "preparar",
    ]) ||
    task.includes("criar-aula") ||
    task.includes("criar-homework");
  const activitySignal = hasAny(normalized, [
    "atividade",
    "canva",
    "exercise",
    "exercicio",
    "homework",
    "instrucao",
    "lesson",
    "listening",
    "pdf",
    "pergunta",
    "question",
    "reading",
    "speaking",
    "writing",
  ]);

  return (
    isEducatorContext(context) &&
    (creationSignal ||
      hasAny(normalized, [
        "criar atividade",
        "create activity",
        "montar atividade",
        "planejar atividade",
        "preparar atividade",
      ])) &&
    activitySignal
  );
}

function getCattyScopeTopic(
  text: string,
  context?: CattyPageContext,
): CattyScopeTopic | null {
  const normalized = normalizeText(text);

  if (isEnglishLearningMessage(text)) {
    return null;
  }

  if (context?.task === "apis-senhas" && hasAny(normalized, ["api", "apis"])) {
    return null;
  }

  if (
    hasAny(normalized, [
      "bolo",
      "cake",
      "cupcake",
      "massa de bolo",
      "receita de bolo",
    ])
  ) {
    return "cake";
  }

  if (
    hasAny(normalized, [
      "cozinha",
      "cozinhar",
      "ingrediente",
      "receita",
      "salad",
      "salada",
    ])
  ) {
    return "cooking";
  }

  if (hasCodeApiRequest(text, context)) {
    return "code_api";
  }

  if (
    hasAny(normalized, [
      "acao",
      "bitcoin",
      "cripto",
      "financas",
      "investimento",
      "investir",
      "renda fixa",
    ])
  ) {
    return "finance";
  }

  if (
    hasAny(normalized, [
      "doenca",
      "medicina",
      "remedio",
      "saude",
      "sintoma",
      "tratamento",
    ])
  ) {
    return "health";
  }

  if (
    hasAny(normalized, [
      "advogado",
      "contrato juridico",
      "direito",
      "juridico",
      "processo",
    ])
  ) {
    return "legal";
  }

  return null;
}

function isLongQuestion(text: string) {
  const tokens = getWordTokens(text);
  const questionMarks = (text.match(/\?/g) ?? []).length;

  return tokens.length >= 42 || questionMarks >= 3;
}

function isVagueQuestion(text: string) {
  const normalized = normalizeText(text);
  const tokens = getWordTokens(text);

  if (tokens.length <= 2) {
    return true;
  }

  return (
    tokens.length <= 7 &&
    (hasAny(normalized, [
      "aqui",
      "como assim",
      "e agora",
      "me ajuda",
      "nao entendi",
      "nao sei",
      "o que faco",
      "isso",
      "preso",
      "this",
      "travad",
      "travou",
      "what now",
    ]) ||
      /^[?.!\s]+$/.test(text))
  );
}

function isBareConfusionQuestion(text: string) {
  const normalized = normalizeText(text);
  const tokens = getWordTokens(text);

  return (
    tokens.length <= 5 &&
    hasAny(normalized, ["como assim", "nao entendi", "nao sei", "o que faco"])
  );
}

function hasTranslationSignal(text: string) {
  const normalized = normalizeText(text);

  return hasAny(normalized, ["traducao", "traduz", "translate", "translation"]);
}

function hasReadyAnswerSignal(text: string) {
  const normalized = normalizeText(text);

  return hasAny(normalized, [
    "a resposta correta",
    "a resposta e",
    "answer is",
    "correct answer",
    "do it for me",
    "faz para mim",
    "faz pra mim",
    "faz por mim",
    "faca para mim",
    "faca pra mim",
    "gabarito",
    "give me the answer",
    "me da a resposta",
    "me de a resposta",
    "qual e a resposta",
    "responde por mim",
    "resposta pronta",
    "the answer",
  ]);
}

function extractTranslationFragment(text: string) {
  const quoted = getQuotedFragment(text);

  if (quoted) {
    return quoted;
  }

  const match = text
    .match(
      /(?:traduz(?:a|ir)?|translate(?:\s+this)?|translation)\s*:?\s+(.{3,160})/i,
    )?.[1]
    ?.trim();

  if (!match) {
    return "";
  }

  const normalized = normalizeText(match);

  if (
    hasAny(normalized, [
      "a frase",
      "em ingles",
      "esta frase",
      "isso",
      "uma frase",
    ]) &&
    getWordTokens(match).length <= 5
  ) {
    return "";
  }

  return match;
}

function getQuotedFragment(text: string) {
  const quoted = text.match(/["']([^"']{2,120})["']/)?.[1]?.trim();

  if (quoted) {
    return quoted;
  }

  const afterColon = text.split(":").slice(1).join(":").trim();

  return afterColon.length >= 2 && afterColon.length <= 120 ? afterColon : "";
}

function extractCorrectionFragment(text: string) {
  const quoted = getQuotedFragment(text);

  if (quoted) {
    return quoted;
  }

  const match = text
    .match(
      /(?:corrige|corrigir|correct(?:\s+this\s+phrase)?|frase|phrase|sentence)\s*:?\s+(.{3,140})/i,
    )?.[1]
    ?.trim();

  if (!match) {
    return isLikelyEnglishCorrectionCandidate(text) ? text.trim() : "";
  }

  const normalized = normalizeText(match);

  if (
    hasAny(normalized, [
      "a frase",
      "a sentence",
      "em ingles",
      "esta frase",
      "uma frase",
      "uma sentence",
    ]) &&
    getWordTokens(match).length <= 5
  ) {
    return "";
  }

  return match;
}

function isLikelyEnglishCorrectionCandidate(text: string) {
  const normalized = normalizeText(text);
  const tokens = getWordTokens(text);

  return (
    (tokens.length >= 4 &&
      tokens.length <= 14 &&
      hasAny(normalized, [
        "he go",
        "i has",
        "she go",
        "they is",
        "we is",
        "you is",
      ])) ||
    Boolean(buildCommonEnglishCorrectionPlan(text))
  );
}

function countMixedIntentSignals(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);
  const signals = [
    hasAny(normalized, ["corrige", "corrigir", "correct", "grammar", "frase"]),
    hasTranslationSignal(text),
    hasAny(normalized, [
      "meaning",
      "o que significa",
      "palavra",
      "significa",
      "word",
    ]),
    isHomeworkContext(context) ||
      hasAny(normalized, ["answer", "dever", "homework", "responder"]),
    hasReadyAnswerSignal(text),
  ];

  return signals.filter(Boolean).length;
}

function getRecentUserContext(history: CattyMessage[], currentText: string) {
  const normalizedCurrent = normalizeText(currentText).trim();

  return [...history]
    .reverse()
    .find(
      (message) =>
        message.from === "user" &&
        normalizeText(message.text).trim() !== normalizedCurrent &&
        getWordTokens(message.text).length >= 3,
    );
}

function stripCattyAddress(text: string) {
  return text.replace(/^\/?catty\b[:,\s-]*/i, "").trim();
}

function hasQuestionPracticeRequest(text: string) {
  const normalized = normalizeText(stripCattyAddress(text));

  return hasAny(normalized, [
    "ask a question",
    "ask me a question",
    "faz pergunta",
    "faz uma pergunta",
    "faca pergunta",
    "faca uma pergunta",
    "me faz uma pergunta",
    "me pergunta",
    "pergunta para mim",
    "pergunta pra mim",
  ]);
}

function buildCattyQuestionPracticePlan(
  text: string,
  history: CattyMessage[] = [],
): CattyQuestionPracticePlan | undefined {
  if (!hasQuestionPracticeRequest(text)) {
    return undefined;
  }

  const normalized = normalizeText(stripCattyAddress(text));
  const recentLikeTopic = getRecentLikeTopic(history, text);

  if (hasAny(normalized, ["simple past", "passado", "past", "yesterday"])) {
    return {
      opening: "Pss pss, simple past time",
      prompt:
        "Pedido de pergunta sobre simple past detectado. Faca uma pergunta direta no passado.",
      question: "What did you do yesterday?",
      topic: "simple past",
    };
  }

  if (
    hasAny(normalized, ["car", "cars", "carro", "carros"]) ||
    /\b(?:car|cars)\b/.test(normalizeText(recentLikeTopic))
  ) {
    return {
      opening: "Uwau, vruum vruum",
      prompt:
        "Pedido de pergunta sobre carros detectado. Faca uma pergunta curta sobre cor ou preferencia.",
      question: "What color cars do you like?",
      topic: "cars",
    };
  }

  if (hasAny(normalized, ["food", "comida", "chocolate", "pizza"])) {
    return {
      opening: "Miauw",
      prompt:
        "Pedido de pergunta sobre comida detectado. Faca uma pergunta curta de gosto.",
      question: "What food do you like?",
      topic: "food",
    };
  }

  if (hasAny(normalized, ["weekend", "weekends", "fim de semana"])) {
    return {
      opening: "Uwau, let's practice!",
      prompt:
        "Pedido de pergunta de conversacao detectado. Faca uma pergunta curta sobre fim de semana.",
      question: "What do you like to do on weekends?",
      topic: "weekends",
    };
  }

  if (hasAny(normalized, ["ask a question", "ask me a question"])) {
    return {
      opening: "Uwau, let's practice!",
      prompt:
        "Pedido de pergunta em ingles detectado. Faca uma pergunta direta para conversacao.",
      question: "What do you like to do on weekends?",
      topic: "conversation",
    };
  }

  return {
    opening: "Miauw",
    prompt:
      "Pedido generico de pergunta detectado. Faca uma pergunta curta e facil para iniciar pratica.",
    question: "What food do you like?",
    topic: "food",
  };
}

function buildQuestionPracticeFallbackReply(plan: CattyQuestionPracticePlan) {
  const suffix =
    plan.topic === "cars"
      ? " 🚗"
      : plan.topic === "simple past"
        ? " 🐾"
        : plan.opening.includes("Miauw")
          ? " 😺"
          : "";

  return `${plan.opening}${suffix} ${formatBilingualQuestion(plan.question)}`;
}

function formatCattyQuestionPracticePromptContext(
  questionPractice?: CattyQuestionPracticePlan,
) {
  if (!questionPractice) {
    return "Nenhum pedido direto de pergunta detectado.";
  }

  return [
    `Tema: ${questionPractice.topic}.`,
    `Abertura sugerida: ${questionPractice.opening}.`,
    `Pergunta sugerida: ${questionPractice.question}`,
    `Pergunta com traducao sugerida: ${formatBilingualQuestion(questionPractice.question)}`,
    questionPractice.prompt,
    "Nao peca tema de novo quando ja houver pedido claro; faca a pergunta diretamente.",
  ].join("\n");
}

function cleanSimpleEnglishTopic(value: string) {
  return value
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/g, "")
    .trim()
    .slice(0, 80);
}

function isIncompleteSimpleEnglishTopic(value: string) {
  const normalized = normalizeText(value)
    .replace(/[_\s.]+/g, " ")
    .trim();

  return (
    normalized.length === 0 ||
    normalized === "and" ||
    normalized === "because" ||
    normalized === "to" ||
    normalized === "very"
  );
}

function startsWithArticle(value: string) {
  return /^(?:a|an|the)\s+/i.test(value.trim());
}

function needsFavoriteAnimalArticle(topic: string) {
  const normalizedTopic = normalizeText(topic);
  const words = getWordTokens(topic);

  return (
    words.length > 0 &&
    words.length <= 2 &&
    !startsWithArticle(topic) &&
    !normalizedTopic.endsWith("s")
  );
}

function getSimpleEnglishFavoriteCorrection(
  favoriteKind: string,
  topic: string,
) {
  const normalizedKind = normalizeText(favoriteKind);

  if (
    !normalizedKind.includes("animal") ||
    !needsFavoriteAnimalArticle(topic)
  ) {
    return "";
  }

  return `My favorite animal is a ${topic}.`;
}

function cleanCorrectionSentence(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/g, "");
}

function formatCorrectionSentence(value: string, end = ".") {
  return `${cleanCorrectionSentence(value)}${end}`;
}

function capitalizeFirstWord(value: string) {
  const trimmed = value.trim();

  return trimmed ? `${trimmed[0]?.toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

function formatEnglishSubject(value: string, position: "start" | "middle") {
  const normalized = normalizeText(value).trim();

  if (normalized === "i") {
    return "I";
  }

  return position === "start" ? capitalizeFirstWord(normalized) : normalized;
}

function getCorrectionCandidateText(text: string) {
  const quoted = getQuotedFragment(text);

  if (quoted) {
    return quoted;
  }

  const stripped = stripCattyAddress(text);
  const match = stripped
    .match(
      /(?:corrige|corrigir|correct(?:\s+this)?(?:\s+phrase|\s+sentence)?|melhora(?:r)?(?:\s+minha\s+frase)?|frase|phrase|sentence)\s*:?\s+(.{3,160})/i,
    )?.[1]
    ?.trim();

  return match || stripped;
}

const countableArticleWords = new Set([
  "animal",
  "apple",
  "book",
  "capybara",
  "car",
  "cat",
  "dog",
  "egg",
  "game",
  "movie",
  "orange",
  "umbrella",
]);

const pluralPracticeWords: Record<string, string> = {
  animal: "animals",
  apple: "apples",
  book: "books",
  car: "cars",
  cat: "cats",
  dog: "dogs",
  game: "games",
  movie: "movies",
};

const pastVerbMap: Record<string, string> = {
  do: "did",
  eat: "ate",
  go: "went",
  have: "had",
  make: "made",
  play: "played",
  read: "read",
  see: "saw",
  study: "studied",
  visit: "visited",
  walk: "walked",
  watch: "watched",
};

const pastToBaseVerbMap: Record<string, string> = {
  ate: "eat",
  did: "do",
  had: "have",
  made: "make",
  played: "play",
  read: "read",
  saw: "see",
  studied: "study",
  visited: "visit",
  walked: "walk",
  watched: "watch",
  went: "go",
};

const thirdPersonVerbMap: Record<string, string> = {
  do: "does",
  eat: "eats",
  go: "goes",
  have: "has",
  like: "likes",
  live: "lives",
  make: "makes",
  play: "plays",
  read: "reads",
  study: "studies",
  visit: "visits",
  walk: "walks",
  want: "wants",
  watch: "watches",
  work: "works",
};

const thirdPersonVerbBaseMap: Record<string, string> = Object.entries(
  thirdPersonVerbMap,
).reduce<Record<string, string>>((accumulator, [base, thirdPerson]) => {
  accumulator[thirdPerson] = base;
  return accumulator;
}, {});

function getArticleForWord(word: string) {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

function pluralizePracticeWord(word: string) {
  const normalized = normalizeText(word);
  const mapped = pluralPracticeWords[normalized];

  if (mapped) {
    return mapped;
  }

  if (normalized.endsWith("y")) {
    return `${normalized.slice(0, -1)}ies`;
  }

  if (normalized.endsWith("s")) {
    return normalized;
  }

  return `${normalized}s`;
}

function formatThirdPersonVerb(verb: string) {
  const normalized = normalizeText(verb);

  return thirdPersonVerbMap[normalized] ?? `${normalized}s`;
}

function getBaseVerbFromThirdPerson(verb: string) {
  const normalized = normalizeText(verb);

  if (thirdPersonVerbBaseMap[normalized]) {
    return thirdPersonVerbBaseMap[normalized];
  }

  if (normalized.endsWith("ies")) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith("es")) {
    return normalized.slice(0, -2);
  }

  if (normalized.endsWith("s")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function formatQuestionSubject(subject: string) {
  const formatted = formatEnglishSubject(subject, "middle");

  return normalizeText(formatted) === "i" ? "you" : formatted;
}

function addArticleIfNeeded(value: string) {
  const clean = cleanCorrectionSentence(value);
  const normalized = normalizeText(clean);

  if (
    getWordTokens(clean).length === 1 &&
    countableArticleWords.has(normalized) &&
    !startsWithArticle(clean)
  ) {
    return `${getArticleForWord(clean)} ${clean}`;
  }

  return clean;
}

const shortQuestionTranslations: Record<string, string> = {
  "are you at home now?": "Voce esta em casa agora?",
  "can i see the menu, please?": "Posso ver o cardapio, por favor?",
  "can you add a color, number or detail?":
    "Voce consegue adicionar uma cor, numero ou detalhe?",
  "can you add why?": "Voce consegue adicionar o motivo?",
  "can you answer with yes or no?": "Voce consegue responder com sim ou nao?",
  "can you answer: i live in ____?":
    "Voce consegue responder: I live in ____?",
  "can you ask one more past question?":
    "Voce consegue fazer mais uma pergunta no passado?",
  "can you ask one more question with do?":
    "Voce consegue fazer mais uma pergunta com do?",
  "can you ask one more question with does he?":
    "Voce consegue fazer mais uma pergunta com does he?",
  "can you ask one more question with does she?":
    "Voce consegue fazer mais uma pergunta com does she?",
  "can you complete it with a name?":
    "Voce consegue completar com um nome?",
  "can you help me?": "Voce pode me ajudar?",
  "can you make another does question?":
    "Voce consegue fazer outra pergunta com does?",
  "can you make one more car sentence?":
    "Voce consegue fazer mais uma frase sobre carros?",
  "can you make one more animal sentence?":
    "Voce consegue fazer mais uma frase sobre animal?",
  "can you make one more do question?":
    "Voce consegue fazer mais uma pergunta com do?",
  "can you make one more fruit sentence?":
    "Voce consegue fazer mais uma frase sobre fruta?",
  "can you make one more past sentence?":
    "Voce consegue fazer mais uma frase no passado?",
  "can you make one more plural sentence?":
    "Voce consegue fazer mais uma frase no plural?",
  "can you make one more present sentence?":
    "Voce consegue fazer mais uma frase no presente?",
  "can you make one more sentence with a or an?":
    "Voce consegue fazer mais uma frase com a ou an?",
  "can you make one more sentence with are?":
    "Voce consegue fazer mais uma frase com are?",
  "can you make one more sentence with i am?":
    "Voce consegue fazer mais uma frase com I am?",
  "can you make one more sentence with i can?":
    "Voce consegue fazer mais uma frase com I can?",
  "can you make one more sentence with is?":
    "Voce consegue fazer mais uma frase com is?",
  "can you make one more sentence with were?":
    "Voce consegue fazer mais uma frase com were?",
  "can you make one more there are sentence?":
    "Voce consegue fazer mais uma frase com there are?",
  "can you say it again?": "Voce consegue dizer de novo?",
  "can you say her age again?": "Voce consegue dizer a idade dela de novo?",
  "can you say his age again?": "Voce consegue dizer a idade dele de novo?",
  "can you say one more name sentence?":
    "Voce consegue dizer mais uma frase com nome?",
  "can you say one more thing in the past?":
    "Voce consegue dizer mais uma coisa no passado?",
  "can you show one more thing you have?":
    "Voce consegue mostrar mais uma coisa que voce tem?",
  "can you say one more reason?":
    "Voce consegue dizer mais um motivo?",
  "can you try with blue cars?":
    "Voce consegue tentar com carros azuis?",
  "can you try with blue?": "Voce consegue tentar com azul?",
  "can you try with red?": "Voce consegue tentar com vermelho?",
  "can you try with red cars?":
    "Voce consegue tentar com carros vermelhos?",
  "did you go?": "Voce foi?",
  "do you like blue cars too?": "Voce tambem gosta de carros azuis?",
  "do you like cats?": "Voce gosta de gatos?",
  "do you like chocolate?": "Voce gosta de chocolate?",
  "do you like chocolate too?": "Voce tambem gosta de chocolate?",
  "do you like pizza too?": "Voce tambem gosta de pizza?",
  "do you like red cars?": "Voce gosta de carros vermelhos?",
  "do you like red cars too?": "Voce tambem gosta de carros vermelhos?",
  "does he like chocolate too?": "Ele gosta de chocolate tambem?",
  "does she like cats?": "Ela gosta de gatos?",
  "does she like chocolate too?": "Ela gosta de chocolate tambem?",
  "how many do you have?": "Quantos voce tem?",
  "what did you do at school?": "O que voce fez na escola?",
  "what did you do there?": "O que voce fez la?",
  "what did you do yesterday?": "O que voce fez ontem?",
  "what do you like?": "Do que voce gosta?",
  "what do you like instead?": "Do que voce gosta no lugar disso?",
  "what do you like to do on weekends?":
    "O que voce gosta de fazer nos fins de semana?",
  "what do you want to do next?": "O que voce quer fazer agora?",
  "what doesn't she like?": "Do que ela nao gosta?",
  "what doesn't he like?": "Do que ele nao gosta?",
  "what else can you do?": "O que mais voce consegue fazer?",
  "what else did you do yesterday?": "O que mais voce fez ontem?",
  "what else does he have?": "O que mais ele tem?",
  "what else does he like?": "Do que mais ele gosta?",
  "what else does she have?": "O que mais ela tem?",
  "what else does she like?": "Do que mais ela gosta?",
  "what else do you do?": "O que mais voce faz?",
  "what else do you have?": "O que mais voce tem?",
  "what else do you like?": "O que mais voce gosta?",
  "what else is on the table?": "O que mais esta na mesa?",
  "what else is there?": "O que mais tem ali?",
  "what drink do you like?": "De qual bebida voce gosta?",
  "what food do you like?": "De qual comida voce gosta?",
  "what other food do you like?": "De qual outra comida voce gosta?",
  "what would you like to do?": "O que voce gostaria de fazer?",
  "what will you do instead?": "O que voce vai fazer no lugar disso?",
  "what will you do next today?": "O que voce vai fazer depois hoje?",
  "what will you do tomorrow?": "O que voce vai fazer amanha?",
  "when do you go home?": "Quando voce vai para casa?",
  "where do you live?": "Onde voce mora?",
  "who likes it too?": "Quem tambem gosta disso?",
  "who went with you?": "Quem foi com voce?",
  "why are you happy?": "Por que voce esta feliz?",
  "why do you like it?": "Por que voce gosta disso?",
  "why do you like pizza?": "Por que voce gosta de pizza?",
  "why is she sad?": "Por que ela esta triste?",
  "what color do you like?": "De qual cor voce gosta?",
};

const shortAnswerTranslations: Record<string, string> = {
  "a little.": "Um pouco.",
  "because it is good.": "Porque e bom.",
  "i do too.": "Eu tambem gosto.",
  "i don't.": "Eu nao gosto.",
  "i don't like chocolate.": "Eu nao gosto de chocolate.",
  "i like chocolate too.": "Eu tambem gosto de chocolate.",
  "no, he doesn't.": "Nao, ele nao gosta.",
  "no, i can't.": "Nao, eu nao consigo.",
  "no, i didn't.": "Nao, eu nao fui.",
  "no, i don't.": "Nao, eu nao gosto.",
  "no, i won't.": "Nao, eu nao vou.",
  "no, i'm not.": "Nao, eu nao estou.",
  "no, she doesn't.": "Nao, ela nao gosta.",
  "no, she isn't.": "Nao, ela nao esta.",
  "sometimes.": "As vezes.",
  "very much.": "Muito.",
  "yes, he does.": "Sim, ele gosta.",
  "yes, i am.": "Sim, eu estou.",
  "yes, i can.": "Sim, eu consigo.",
  "yes, i did.": "Sim, eu fui.",
  "yes, i do.": "Sim, eu gosto.",
  "yes, i will.": "Sim, eu vou.",
  "yes, she does.": "Sim, ela gosta.",
  "yes, she is.": "Sim, ela esta.",
};

const shortPhraseTranslations: Record<string, string> = {
  "a dog": "um cachorro",
  "blue": "azul",
  "blue cars": "carros azuis",
  "book": "livro",
  "cars": "carros",
  "cats": "gatos",
  "chocolate": "chocolate",
  "coffee": "cafe",
  "dogs": "cachorros",
  "games": "jogos",
  "he": "ele",
  "happy": "feliz",
  "milk": "leite",
  "pizza": "pizza",
  "red": "vermelho",
  "red cars": "carros vermelhos",
  "school": "escola",
  "she": "ela",
  "tired": "cansado",
};

function translateShortPhrase(value: string) {
  const normalized = normalizeText(value)
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return shortPhraseTranslations[normalized] ?? value.trim();
}

function normalizeQuestionForTranslation(value: string) {
  return normalizeText(value)
    .replace(/\s+/g, " ")
    .replace(/\s+([?.!])/g, "$1")
    .trim();
}

function isLikelyEnglishQuestion(value: string) {
  return /^(?:are|can|did|do|does|how|is|what|when|where|who|why|will)\b/i.test(
    value.trim(),
  );
}

function translatePracticeQuestion(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim();
  const tryMatch = clean.match(/^(.*?\?)\s+Try:\s*(.+)$/i);

  if (tryMatch) {
    const baseQuestion = tryMatch[1] ?? "";
    const practice = tryMatch[2] ?? "";

    return `${translatePracticeQuestion(baseQuestion)} Tente: ${practice}`;
  }

  const sayMatch = clean.match(/^Can you say:\s*(.+)$/i);

  if (sayMatch) {
    return `Voce consegue dizer: ${sayMatch[1]?.trim() ?? ""}`;
  }

  const joinMatch = clean.match(/^Can you join them with and\?\s*(.*)$/i);

  if (joinMatch) {
    const rest = joinMatch[1]?.trim();

    return `Voce consegue juntar com and?${rest ? ` ${rest.replace(/^Try:/i, "Tente:")}` : ""}`;
  }

  const direct = shortQuestionTranslations[normalizeQuestionForTranslation(clean)];

  if (direct) {
    return direct;
  }

  const aboutMatch = clean.match(
    /^Can you (?:add|make|say) one more (?:sentence )?(?:about )?(.+)\?$/i,
  );

  if (aboutMatch) {
    return `Voce consegue fazer mais uma frase sobre ${translateShortPhrase(
      aboutMatch[1] ?? "",
    )}?`;
  }

  const askAboutMatch = clean.match(
    /^Can you ask another question about (.+)\?$/i,
  );

  if (askAboutMatch) {
    return `Voce consegue fazer outra pergunta sobre ${translateShortPhrase(
      askAboutMatch[1] ?? "",
    )}?`;
  }

  const answerWhyMatch = clean.match(/^Can you answer why (.+) is (.+)\?$/i);

  if (answerWhyMatch) {
    return `Voce consegue responder por que ${translateShortPhrase(
      answerWhyMatch[1] ?? "",
    )} esta ${translateShortPhrase(answerWhyMatch[2] ?? "")}?`;
  }

  const doesLikeMatch = clean.match(/^Does (she|he) like (.+)\?$/i);

  if (doesLikeMatch) {
    const pronoun = normalizeText(doesLikeMatch[1] ?? "she") === "he"
      ? "Ele"
      : "Ela";

    return `${pronoun} gosta de ${translateShortPhrase(
      doesLikeMatch[2] ?? "",
    )}?`;
  }

  const doLikeMatch = clean.match(/^Do (you|they|we) like (.+)\?$/i);

  if (doLikeMatch) {
    const subject = normalizeText(doLikeMatch[1] ?? "you");
    const prefix =
      subject === "they"
        ? "Eles gostam"
        : subject === "we"
          ? "Nos gostamos"
          : "Voce gosta";

    return `${prefix} de ${translateShortPhrase(doLikeMatch[2] ?? "")}?`;
  }

  const whatKindMatch = clean.match(/^What kind of (.+) do you like\?$/i);

  if (whatKindMatch) {
    return `Que tipo de ${translateShortPhrase(
      whatKindMatch[1] ?? "",
    )} voce gosta?`;
  }

  return "O que isso quer dizer em portugues?";
}

function formatBilingualQuestion(question: string) {
  const clean = question.replace(/\s+/g, " ").trim();

  if (!clean || clean.includes(" = ") || !isLikelyEnglishQuestion(clean)) {
    return clean;
  }

  const tryMatch = clean.match(/^(.*?\?)\s+Try:\s*(.+)$/i);

  if (tryMatch) {
    const baseQuestion = tryMatch[1]?.trim() ?? "";
    const practice = tryMatch[2]?.trim() ?? "";

    return `${baseQuestion} = ${translatePracticeQuestion(
      baseQuestion,
    )}${practice ? ` Try: ${practice}` : ""}`;
  }

  return `${clean} = ${translatePracticeQuestion(clean)}`;
}

function formatBilingualCorrectedSentence(sentence: string) {
  const clean = sentence.replace(/\s+/g, " ").trim();

  if (!clean || !clean.endsWith("?") || clean.includes(" = ")) {
    return clean;
  }

  return formatBilingualQuestion(clean);
}

type CattyFollowUpAuxiliary = "be" | "can" | "did" | "do" | "does" | "will";

type CattyShortFollowUpAnswer =
  | {
      auxiliary?: CattyFollowUpAuxiliary;
      isBare: boolean;
      kind: "yes_no";
      polarity: "affirmative" | "negative";
      sentence?: string;
      subject?: string;
      userAnswer: string;
    }
  | {
      correction?: string;
      kind: "agreement" | "degree" | "fragment" | "reason";
      sentence?: string;
      userAnswer: string;
    };

type CattyFollowUpQuestionContext = {
  auxiliary?: CattyFollowUpAuxiliary;
  favoriteKind?: string;
  kind:
    | "color"
    | "color_cars"
    | "favorite"
    | "like_statement"
    | "open_like"
    | "why"
    | "yes_no";
  nextQuestion: string;
  pattern: CattySimpleEnglishPattern;
  promptLabel: string;
  subject?: string;
  topic: string;
};

function normalizeShortFollowUpText(value: string) {
  return normalizeText(stripCattyAddress(value))
    .replace(/[â€™']/g, "")
    .replace(/[.,!?;:]+/g, " ")
    .replace(/\bim\b/g, "i am")
    .replace(/\bwont\b/g, "will not")
    .replace(/\bcant\b/g, "can not")
    .replace(/\bdont\b/g, "do not")
    .replace(/\bdoesnt\b/g, "does not")
    .replace(/\bdidnt\b/g, "did not")
    .replace(/\bisnt\b/g, "is not")
    .replace(/\barent\b/g, "are not")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeShortAnswerForComparison(value: string) {
  return normalizeShortFollowUpText(value)
    .replace(/\bi am not\b/g, "im not")
    .replace(/\bdo not\b/g, "dont")
    .replace(/\bdoes not\b/g, "doesnt")
    .replace(/\bdid not\b/g, "didnt")
    .replace(/\bcan not\b/g, "cant")
    .replace(/\bwill not\b/g, "wont")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFollowUpSentenceWithTranslation(sentence: string) {
  const clean = formatCorrectionSentence(sentence);
  const normalized = normalizeText(clean)
    .replace(/[â€™]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  const direct = shortAnswerTranslations[normalized];

  if (direct) {
    return `${clean} = ${direct}`;
  }

  const likeMatch = clean.match(/^I like (.+)\.$/i);

  if (likeMatch) {
    return `${clean} = Eu gosto de ${translateShortPhrase(
      likeMatch[1] ?? "",
    )}.`;
  }

  const favoriteMatch = clean.match(/^My favorite (.+?) is (.+)\.$/i);

  if (favoriteMatch) {
    return `${clean} = Meu/minha ${favoriteMatch[1]?.trim() ?? "favorito"} favorito(a) e ${translateShortPhrase(
      favoriteMatch[2] ?? "",
    )}.`;
  }

  return clean;
}

function getShortFollowUpAuxiliary(value: string): CattyFollowUpAuxiliary {
  if (value === "am" || value === "are" || value === "is") {
    return "be";
  }

  return value as CattyFollowUpAuxiliary;
}

function getFollowUpAnswerSubject(subject?: string) {
  const normalized = normalizeText(subject ?? "you").trim();

  return normalized === "you" ? "i" : normalized || "i";
}

function formatFollowUpSubject(subject: string, position: "start" | "middle") {
  return formatEnglishSubject(subject, position);
}

function formatDetectedYesNoFollowUpSentence(input: {
  auxiliary: CattyFollowUpAuxiliary;
  polarity: "affirmative" | "negative";
  subject: string;
}) {
  const subject = normalizeText(input.subject).trim() || "i";
  const formattedSubject = formatFollowUpSubject(subject, "middle");

  if (input.polarity === "affirmative") {
    if (input.auxiliary === "be") {
      const verb =
        subject === "i"
          ? "am"
          : subject === "you" || subject === "we" || subject === "they"
            ? "are"
            : "is";

      return `Yes, ${formattedSubject} ${verb}.`;
    }

    return `Yes, ${formattedSubject} ${input.auxiliary}.`;
  }

  if (input.auxiliary === "be") {
    if (subject === "i") {
      return "No, I'm not.";
    }

    const verb =
      subject === "you" || subject === "we" || subject === "they"
        ? "aren't"
        : "isn't";

    return `No, ${formattedSubject} ${verb}.`;
  }

  if (input.auxiliary === "do") {
    return `No, ${formattedSubject} don't.`;
  }

  if (input.auxiliary === "does") {
    return `No, ${formattedSubject} doesn't.`;
  }

  if (input.auxiliary === "can") {
    return `No, ${formattedSubject} can't.`;
  }

  if (input.auxiliary === "did") {
    return `No, ${formattedSubject} didn't.`;
  }

  return `No, ${formattedSubject} won't.`;
}

function getExpectedYesNoFollowUpAnswer(
  questionContext: CattyFollowUpQuestionContext,
  polarity: "affirmative" | "negative",
) {
  if (!questionContext.auxiliary) {
    return "";
  }

  return formatDetectedYesNoFollowUpSentence({
    auxiliary: questionContext.auxiliary,
    polarity,
    subject: getFollowUpAnswerSubject(questionContext.subject),
  });
}

function detectShortFollowUpAnswer(
  text: string,
): CattyShortFollowUpAnswer | undefined {
  const clean = cleanSimpleEnglishTopic(stripCattyAddress(text));
  const normalized = normalizeShortFollowUpText(clean);
  const tokens = getWordTokens(clean);

  if (
    !clean ||
    tokens.length > 7 ||
    /[?]/.test(clean) ||
    !/^[a-zA-Z][a-zA-Z\s'.,!-]*$/.test(clean)
  ) {
    return undefined;
  }

  if (/^(?:yes|yeah|yep)$/.test(normalized)) {
    return {
      isBare: true,
      kind: "yes_no",
      polarity: "affirmative",
      userAnswer: clean,
    };
  }

  if (/^(?:no|nope)$/.test(normalized)) {
    return {
      isBare: true,
      kind: "yes_no",
      polarity: "negative",
      userAnswer: clean,
    };
  }

  if (/^me\s+no$/.test(normalized)) {
    return {
      auxiliary: "do",
      isBare: false,
      kind: "yes_no",
      polarity: "negative",
      sentence: "I don't.",
      subject: "i",
      userAnswer: clean,
    };
  }

  const answerMatch = normalized.match(
    /^(?:(yes|no)\s+)?(i|you|she|he|it|we|they)\s+(do|does|am|are|is|can|did|will)(?:\s+not)?$/,
  );

  if (answerMatch) {
    const prefix = answerMatch[1] ?? "";
    const subject = answerMatch[2] ?? "i";
    const auxiliary = getShortFollowUpAuxiliary(answerMatch[3] ?? "do");
    const polarity =
      prefix === "no" || /\snot$/.test(normalized)
        ? "negative"
        : "affirmative";

    return {
      auxiliary,
      isBare: false,
      kind: "yes_no",
      polarity,
      sentence: formatDetectedYesNoFollowUpSentence({
        auxiliary,
        polarity,
        subject,
      }),
      subject,
      userAnswer: clean,
    };
  }

  if (normalized === "me too") {
    return { kind: "agreement", userAnswer: clean };
  }

  if (normalized === "sometimes" || normalized === "a little" || normalized === "very much") {
    return { kind: "degree", userAnswer: clean };
  }

  if (/^because\s+(?:it\s+)?good$/.test(normalized)) {
    return {
      correction: "Better: Because it is good. = Porque e bom.",
      kind: "reason",
      sentence: "Because it is good.",
      userAnswer: clean,
    };
  }

  if (/^because\s+it\s+is\s+good$/.test(normalized)) {
    return {
      kind: "reason",
      sentence: "Because it is good.",
      userAnswer: clean,
    };
  }

  const portugueseLikeMatch = normalized.match(
    /^(?:eu\s+)?gosto\s+de\s+([a-zA-Z][a-zA-Z\s-]{1,40})$/,
  );

  if (portugueseLikeMatch) {
    return {
      kind: "fragment",
      userAnswer: cleanSimpleEnglishTopic(portugueseLikeMatch[1] ?? ""),
    };
  }

  const shortLikeMatch = clean.match(/^I\s+like\s+([a-zA-Z][a-zA-Z\s-]{1,40})\.?$/i);

  if (shortLikeMatch) {
    return {
      kind: "fragment",
      sentence: formatCorrectionSentence(clean),
      userAnswer: cleanSimpleEnglishTopic(shortLikeMatch[1] ?? ""),
    };
  }

  const fragment = getSimpleEnglishFragment(clean);

  if (fragment) {
    return { kind: "fragment", userAnswer: fragment };
  }

  return undefined;
}

function extractLastCattyQuestion(history: CattyMessage[]) {
  let inspected = 0;

  for (const message of [...history].reverse()) {
    if (message.from !== "catty") {
      continue;
    }

    inspected += 1;

    if (inspected > 8) {
      break;
    }

    const matches = [
      ...message.text.matchAll(
        /\b(?:are|can|did|do|does|how|is|what|when|where|who|why|will)\b[^?]*\?/gi,
      ),
    ].map((match) => match[0].replace(/\s+/g, " ").trim());

    const question = matches.at(-1);

    if (question) {
      return question;
    }
  }

  return "";
}

function extractLastCattyFollowUpCue(history: CattyMessage[]) {
  const question = extractLastCattyQuestion(history);

  if (question) {
    return question;
  }

  let inspected = 0;

  for (const message of [...history].reverse()) {
    if (message.from !== "catty") {
      continue;
    }

    inspected += 1;

    if (inspected > 8) {
      break;
    }

    const likeStatement = message.text.match(/\bI like [a-zA-Z\s-]{2,80}\./i)?.[0];

    if (likeStatement) {
      return likeStatement.replace(/\s+/g, " ").trim();
    }
  }

  return "";
}

function getFollowUpLikeNextQuestion(topic: string) {
  const normalizedTopic = normalizeText(topic);

  if (/\b(?:car|cars)\b/.test(normalizedTopic)) {
    return "What color cars do you like?";
  }

  if (/\b(?:chocolate|food|pizza)\b/.test(normalizedTopic)) {
    return "What other food do you like?";
  }

  return "What else do you like?";
}

function classifyCattyFollowUpQuestion(
  question: string,
): CattyFollowUpQuestionContext | undefined {
  const clean = question.replace(/\s+/g, " ").trim();
  const normalized = normalizeText(clean);

  const likeStatementMatch = clean.match(/^I like (.+?)\.$/i);

  if (likeStatementMatch) {
    const topic = cleanSimpleEnglishTopic(likeStatementMatch[1] ?? "");

    return {
      auxiliary: "do",
      kind: "like_statement",
      nextQuestion: getFollowUpLikeNextQuestion(topic),
      pattern: "like",
      promptLabel: "I like...",
      subject: "you",
      topic,
    };
  }

  if (/^what color cars do you like\?$/.test(normalized)) {
    return {
      kind: "color_cars",
      nextQuestion: "Can you try with blue cars?",
      pattern: "like",
      promptLabel: "What color cars do you like?",
      subject: "you",
      topic: "cars",
    };
  }

  if (/^what color do you like\?$/.test(normalized)) {
    return {
      kind: "color",
      nextQuestion: "Can you try with red?",
      pattern: "like",
      promptLabel: "What color do you like?",
      subject: "you",
      topic: "color",
    };
  }

  if (/^what (?:food|drink) do you like\?$/.test(normalized)) {
    const topic = normalized.includes("drink") ? "drink" : "food";

    return {
      kind: "open_like",
      nextQuestion: topic === "drink" ? "What food do you like?" : "What drink do you like?",
      pattern: "like",
      promptLabel: clean,
      subject: "you",
      topic,
    };
  }

  if (normalized === "what else do you like?") {
    return undefined;
  }

  const openLikeMatch = clean.match(/^What (.+?) do you like\?$/i);

  if (openLikeMatch) {
    return {
      kind: "open_like",
      nextQuestion: "What else do you like?",
      pattern: "like",
      promptLabel: clean,
      subject: "you",
      topic: cleanSimpleEnglishTopic(openLikeMatch[1] ?? "things"),
    };
  }

  const favoriteMatch = clean.match(/^What(?: is|'s)? your favorite (.+?)\?$/i);

  if (favoriteMatch) {
    return {
      favoriteKind: cleanSimpleEnglishTopic(favoriteMatch[1] ?? "thing"),
      kind: "favorite",
      nextQuestion: "Why do you like it?",
      pattern: "favorite",
      promptLabel: "What is your favorite...?",
      subject: "you",
      topic: "favorite",
    };
  }

  if (/^why\b/i.test(clean)) {
    return {
      kind: "why",
      nextQuestion: "Can you say one more reason?",
      pattern: "short_answer",
      promptLabel: "Why...?",
      subject: "you",
      topic: "reason",
    };
  }

  let match = clean.match(/^Do (you|we|they) like (.+?)\?$/i);

  if (match) {
    const subject = normalizeText(match[1] ?? "you");
    const topic = cleanSimpleEnglishTopic(match[2] ?? "");

    return {
      auxiliary: "do",
      kind: "yes_no",
      nextQuestion: getFollowUpLikeNextQuestion(topic),
      pattern: "like",
      promptLabel: `Do ${subject}...`,
      subject,
      topic,
    };
  }

  match = clean.match(/^Do (you|we|they)\b(.+?)\?$/i);

  if (match) {
    const subject = normalizeText(match[1] ?? "you");

    return {
      auxiliary: "do",
      kind: "yes_no",
      nextQuestion: "What else do you do?",
      pattern: "short_answer",
      promptLabel: `Do ${subject}...`,
      subject,
      topic: cleanSimpleEnglishTopic(match[2] ?? "do"),
    };
  }

  match = clean.match(/^Does (she|he|it)\b(.+?)\?$/i);

  if (match) {
    const subject = normalizeText(match[1] ?? "she");

    return {
      auxiliary: "does",
      kind: "yes_no",
      nextQuestion:
        subject === "he" ? "What else does he like?" : "What else does she like?",
      pattern: "third_person_likes",
      promptLabel: `Does ${subject}...`,
      subject,
      topic: cleanSimpleEnglishTopic(match[2] ?? "like"),
    };
  }

  match = clean.match(/^Are you\s+(.+?)\?$/i);

  if (match) {
    const topic = cleanSimpleEnglishTopic(match[1] ?? "");

    return {
      auxiliary: "be",
      kind: "yes_no",
      nextQuestion:
        normalizeText(topic) === "happy" ? "Why are you happy?" : "Why do you like it?",
      pattern: "am",
      promptLabel: "Are you...",
      subject: "you",
      topic,
    };
  }

  match = clean.match(/^(?:Are (we|they)|Is (she|he|it))\b(.+?)\?$/i);

  if (match) {
    const subject = normalizeText(match[1] ?? match[2] ?? "she");
    const rest = cleanSimpleEnglishTopic(match[3] ?? "");

    return {
      auxiliary: "be",
      kind: "yes_no",
      nextQuestion: "Why do you like it?",
      pattern: "short_answer",
      promptLabel: `${clean.split(" ")[0]} ${subject}...`,
      subject,
      topic: rest,
    };
  }

  match = clean.match(/^Can (you|we|they|she|he|it)\b(.+?)\?$/i);

  if (match) {
    const subject = normalizeText(match[1] ?? "you");

    return {
      auxiliary: "can",
      kind: "yes_no",
      nextQuestion: "What else can you do?",
      pattern: "can",
      promptLabel: `Can ${subject}...`,
      subject,
      topic: cleanSimpleEnglishTopic(match[2] ?? "can"),
    };
  }

  match = clean.match(/^Did (you|we|they|she|he|it)\b(.+?)\?$/i);

  if (match) {
    const subject = normalizeText(match[1] ?? "you");
    const rest = cleanSimpleEnglishTopic(match[2] ?? "");
    const normalizedRest = normalizeText(rest);

    return {
      auxiliary: "did",
      kind: "yes_no",
      nextQuestion:
        normalizedRest.includes("school") || normalized.includes("there")
          ? "What did you do there?"
          : "What else did you do yesterday?",
      pattern: "yesterday",
      promptLabel: `Did ${subject}...`,
      subject,
      topic: rest,
    };
  }

  match = clean.match(/^Will (you|we|they|she|he|it)\b(.+?)\?$/i);

  if (match) {
    const subject = normalizeText(match[1] ?? "you");

    return {
      auxiliary: "will",
      kind: "yes_no",
      nextQuestion: "What will you do tomorrow?",
      pattern: "short_answer",
      promptLabel: `Will ${subject}...`,
      subject,
      topic: cleanSimpleEnglishTopic(match[2] ?? "will"),
    };
  }

  return undefined;
}

function getColorCarsRetryQuestion(fragment: string) {
  return /\bblue\s+cars?\b/i.test(fragment)
    ? "Can you try with red cars?"
    : "Can you try with blue cars?";
}

function getColorRetryQuestion(fragment: string) {
  return /^blue\b/i.test(fragment) ? "Can you try with red?" : "Can you try with blue?";
}

function normalizeColorCarFragment(fragment: string) {
  return fragment.replace(/\bcar\b/i, "cars");
}

function buildShortFollowUpSentence(input: {
  answer: CattyShortFollowUpAnswer;
  questionContext: CattyFollowUpQuestionContext;
}): { correction?: string; question: string; sentence: string; topic: string } | undefined {
  const { answer, questionContext } = input;

  if (answer.kind === "fragment") {
    const fragment = cleanSimpleEnglishTopic(answer.userAnswer);

    if (
      questionContext.kind === "color_cars" ||
      /\b(?:car|cars)\b/.test(normalizeText(questionContext.topic)) ||
      /\b(?:car|cars)\b/.test(normalizeText(fragment))
    ) {
      const carFragment = normalizeColorCarFragment(fragment);

      return {
        correction:
          normalizeText(carFragment) !== normalizeText(fragment)
            ? `Better: ${formatFollowUpSentenceWithTranslation(`I like ${carFragment}.`)}`
            : undefined,
        question: getColorCarsRetryQuestion(carFragment),
        sentence: answer.sentence ?? formatCorrectionSentence(`I like ${carFragment}`),
        topic: "cars",
      };
    }

    if (questionContext.kind === "color") {
      return {
        question: getColorRetryQuestion(fragment),
        sentence: answer.sentence ?? formatCorrectionSentence(`I like ${fragment}`),
        topic: fragment,
      };
    }

    if (
      questionContext.kind === "open_like" ||
      questionContext.kind === "yes_no"
    ) {
      return {
        question:
          questionContext.topic === "food" ||
          /(?:chocolate|pizza|food)/.test(normalizeText(fragment))
            ? "What drink do you like?"
            : questionContext.nextQuestion,
        sentence: answer.sentence ?? formatCorrectionSentence(`I like ${fragment}`),
        topic: fragment,
      };
    }

    if (questionContext.kind === "favorite") {
      const favoriteKind = questionContext.favoriteKind ?? "thing";

      return {
        question: "Why do you like it?",
        sentence: formatCorrectionSentence(
          `My favorite ${favoriteKind} is ${addArticleIfNeeded(fragment)}`,
        ),
        topic: fragment,
      };
    }
  }

  if (answer.kind === "agreement" && questionContext.kind === "yes_no") {
    return {
      question: questionContext.nextQuestion,
      sentence: "I do too.",
      topic: questionContext.topic,
    };
  }

  if (answer.kind === "agreement" && questionContext.kind === "like_statement") {
    return {
      question: questionContext.nextQuestion,
      sentence: formatCorrectionSentence(`I like ${questionContext.topic} too`),
      topic: questionContext.topic,
    };
  }

  if (answer.kind === "yes_no" && questionContext.kind === "like_statement") {
    const sentence =
      answer.polarity === "negative"
        ? formatCorrectionSentence(`I don't like ${questionContext.topic}`)
        : formatCorrectionSentence(`I like ${questionContext.topic} too`);
    const correction =
      normalizeShortFollowUpText(answer.userAnswer) === "me no"
        ? "Better: I don't. = Eu nao gosto."
        : undefined;

    return {
      correction,
      question: questionContext.nextQuestion,
      sentence,
      topic: questionContext.topic,
    };
  }

  if (answer.kind === "degree") {
    const normalized = normalizeShortFollowUpText(answer.userAnswer);

    return {
      question: questionContext.nextQuestion,
      sentence: formatCorrectionSentence(normalized),
      topic: questionContext.topic,
    };
  }

  if (answer.kind === "reason") {
    return {
      correction: answer.correction,
      question: questionContext.nextQuestion,
      sentence: answer.sentence ?? "Because it is good.",
      topic: questionContext.topic,
    };
  }

  return undefined;
}

function buildCattyConversationFollowUpPlan(
  text: string,
  history: CattyMessage[] = [],
): CattyConversationContinuityPlan | undefined {
  const answer = detectShortFollowUpAnswer(text);

  if (!answer) {
    return undefined;
  }

  const previousQuestion = extractLastCattyFollowUpCue(history);
  const questionContext = previousQuestion
    ? classifyCattyFollowUpQuestion(previousQuestion)
    : undefined;

  if (!previousQuestion || !questionContext) {
    return undefined;
  }

  if (answer.kind === "yes_no" && questionContext.kind === "yes_no") {
    const expectedAnswer = getExpectedYesNoFollowUpAnswer(
      questionContext,
      answer.polarity,
    );
    const isCorrect =
      Boolean(answer.sentence) &&
      normalizeShortAnswerForComparison(answer.sentence ?? "") ===
        normalizeShortAnswerForComparison(expectedAnswer);
    const needsHelp = answer.isBare || !isCorrect;
    const correction = needsHelp
      ? `${answer.isBare ? "You can say" : `Para ${questionContext.promptLabel} usamos`}: ${formatFollowUpSentenceWithTranslation(
          expectedAnswer,
        )}`
      : undefined;

    return {
      correction,
      historyTopic: questionContext.topic,
      isFollowUp: true,
      isIncomplete: false,
      pattern: questionContext.pattern,
      previousQuestion,
      prompt: [
        "Resposta curta de follow-up detectada.",
        `Pergunta anterior da Catty: ${previousQuestion}`,
        `Resposta curta do aluno: ${answer.userAnswer}.`,
        `Resposta modelo: ${expectedAnswer}`,
        correction ? `Correcao curta sugerida: ${correction}` : "",
        `Pergunta relacionada sugerida: ${questionContext.nextQuestion}`,
        "Use a pergunta anterior para nao tratar a resposta como confusa.",
      ]
        .filter(Boolean)
        .join(" "),
      question: questionContext.nextQuestion,
      shortAnswerKind: "yes_no",
      suggestedSentence: expectedAnswer,
      topic: questionContext.topic,
      userAnswer: answer.userAnswer,
    };
  }

  const shortSentence = buildShortFollowUpSentence({
    answer,
    questionContext,
  });

  if (!shortSentence) {
    return undefined;
  }

  return {
    historyTopic: questionContext.topic,
    isFragment: answer.kind === "fragment",
    isFollowUp: true,
    isIncomplete: false,
    pattern: questionContext.pattern,
    previousQuestion,
    correction: shortSentence.correction,
    prompt: [
      "Resposta curta de follow-up detectada.",
      `Pergunta anterior da Catty: ${previousQuestion}`,
      `Resposta curta do aluno: ${answer.userAnswer}.`,
      `Frase sugerida: ${shortSentence.sentence}`,
      shortSentence.correction
        ? `Correcao curta sugerida: ${shortSentence.correction}`
        : "",
      `Pergunta relacionada sugerida: ${shortSentence.question}`,
      "Transforme a resposta curta em frase simples e continue no mesmo contexto.",
    ]
      .filter(Boolean)
      .join(" "),
    question: shortSentence.question,
    shortAnswerKind: answer.kind,
    suggestedSentence: shortSentence.sentence,
    topic: shortSentence.topic,
    userAnswer: answer.userAnswer,
  };
}

function extractCorrectionErrorWord(explanation: string) {
  return (
    explanation.match(/O erro esta em ([^:]+):/i)?.[1]?.trim() ??
    "essa parte"
  );
}

function getCorrectionSubject(correction: Pick<CattyGrammarCorrectionPlan, "correctedSentence">) {
  const direct = correction.correctedSentence.match(
    /^(I|You|We|They|She|He|It)\b/i,
  )?.[1];

  if (direct) {
    return direct.toLowerCase();
  }

  return (
    correction.correctedSentence.match(
      /^(?:Do|Does|Did|Can|Will|What|Where|Why)\s+(I|you|we|they|she|he|it)\b/i,
    )?.[1]?.toLowerCase() ?? "you"
  );
}

function buildCorrectionEnglishTip(
  correction: Pick<
    CattyGrammarCorrectionPlan,
    "correctedSentence" | "explanation" | "rule"
  >,
) {
  const normalizedRule = normalizeText(correction.rule);
  const subject = getCorrectionSubject(correction);
  const errorWord = extractCorrectionErrorWord(correction.explanation);

  if (normalizedRule.includes("i likes")) {
    return "with I, use like without -s.";
  }

  if (normalizedRule.includes("she/he like")) {
    return `with ${subject}, add -s to the verb.`;
  }

  if (normalizedRule.includes("she/he has years old")) {
    return `for age with ${subject}, use is.`;
  }

  if (normalizedRule.includes("family member have years old")) {
    return "for age, use is with this family member.";
  }

  if (normalizedRule.includes("years old")) {
    return "for age, use I am.";
  }

  if (normalizedRule.includes("yesterday")) {
    const pastVerb =
      correction.explanation.match(/usamos ([a-z]+)/i)?.[1]?.trim() ?? "";

    return pastVerb
      ? `with yesterday, use the past form; ${errorWord} becomes ${pastVerb}.`
      : "with yesterday, use the past form.";
  }

  if (normalizedRule.includes("do she") || normalizedRule.includes("do he")) {
    return `with ${subject}, use does in questions.`;
  }

  if (normalizedRule.includes("question order with do")) {
    return "use do after what in this question.";
  }

  if (normalizedRule.includes("does + verb")) {
    return "after does, use the base verb.";
  }

  if (normalizedRule.includes("did + base")) {
    return "after did, use the base verb.";
  }

  if (normalizedRule.includes("will")) {
    return "after will, use the base verb.";
  }

  if (normalizedRule.includes("can")) {
    return "after can, use the base verb without to.";
  }

  if (normalizedRule.includes("plural")) {
    return "use the plural form for this idea.";
  }

  if (normalizedRule.includes("a/an") || normalizedRule.includes("article")) {
    return "use a or an before one countable thing.";
  }

  if (normalizedRule.includes("there is")) {
    return "use there is for one thing and there are for plural.";
  }

  return "use the corrected sentence as your model.";
}

function buildCorrectionPortugueseTip(
  correction: Pick<
    CattyGrammarCorrectionPlan,
    "correctedSentence" | "explanation" | "rule"
  >,
) {
  const normalizedRule = normalizeText(correction.rule);
  const subject = getCorrectionSubject(correction);
  const errorWord = extractCorrectionErrorWord(correction.explanation);

  if (normalizedRule.includes("i likes")) {
    return "o erro esta em likes; com I, usamos like sem -s.";
  }

  if (normalizedRule.includes("she/he like")) {
    return `o erro esta em like; com ${subject}, o verbo ganha -s.`;
  }

  if (normalizedRule.includes("i have years old")) {
    return "o erro esta em have; para idade, usamos I am, nao I have.";
  }

  if (normalizedRule.includes("she/he has years old")) {
    return `o erro esta em has; para idade com ${subject}, usamos is.`;
  }

  if (normalizedRule.includes("family member have years old")) {
    return "o erro esta em have; para idade de familiar, usamos is.";
  }

  if (normalizedRule.includes("years old")) {
    return "para idade, usamos o verbo be, nao have.";
  }

  if (normalizedRule.includes("yesterday")) {
    const pastVerb =
      correction.explanation.match(/usamos ([a-z]+)/i)?.[1]?.trim() ?? "";

    return pastVerb
      ? `o erro esta em ${errorWord}; com yesterday, usamos passado: ${errorWord} vira ${pastVerb}.`
      : `o erro esta em ${errorWord}; com yesterday, usamos passado.`;
  }

  if (normalizedRule.includes("do she") || normalizedRule.includes("do he")) {
    return `o erro esta em do; com ${subject}, a pergunta usa does.`;
  }

  if (normalizedRule.includes("question order with do")) {
    return "nessa pergunta, usamos do depois de what.";
  }

  return correction.explanation.replace(/\.$/, ".");
}

function buildCorrectionPlan(input: {
  correctedSentence: string;
  explanation: string;
  question: string;
  rule: string;
}): CattyGrammarCorrectionPlan {
  const draftCorrection = {
    correctedSentence: input.correctedSentence,
    explanation: input.explanation,
    rule: input.rule,
  };
  const englishTip = buildCorrectionEnglishTip(draftCorrection);
  const portugueseTip = buildCorrectionPortugueseTip(draftCorrection);

  return {
    correctedSentence: input.correctedSentence,
    englishTip,
    explanation: input.explanation,
    homeworkExplanation: `Use essa estrutura parecida: ${input.correctedSentence} ${portugueseTip}`,
    portugueseTip,
    prompt: [
      `Erro comum detectado: ${input.rule}.`,
      `Frase corrigida: ${input.correctedSentence}`,
      `English tip: ${englishTip}`,
      `Explicacao em portugues: ${portugueseTip}`,
      `Continuacao relacionada: ${formatBilingualQuestion(input.question)}`,
      "Responda no formato bilingue curto: abertura da Catty, Better: frase corrigida, English tip: explicacao curta em ingles, Em portugues: explicacao curta, pergunta em ingles = traducao em portugues.",
    ].join(" "),
    question: input.question,
    rule: input.rule,
  };
}

function buildCommonEnglishCorrectionPlan(
  text: string,
): CattyGrammarCorrectionPlan | undefined {
  const rawCandidate = getCorrectionCandidateText(text);
  const hasQuestionMark = /\?\s*$/.test(rawCandidate);
  const sentence = cleanCorrectionSentence(rawCandidate);
  const normalized = normalizeText(sentence);
  const tokens = getWordTokens(sentence);

  if (
    tokens.length < 2 ||
    tokens.length > 18 ||
    hasAny(normalized, ["answer", "api", "code", "homework", "translate"])
  ) {
    return undefined;
  }

  let match = sentence.match(/^i\s+likes\s+(.+)$/i);
  if (hasQuestionMark) {
    match = sentence.match(/^(she|he)\s+likes?\s+(.+)$/i);
    if (match) {
      const subject = formatEnglishSubject(match[1] ?? "she", "middle");
      const topic = cleanCorrectionSentence(match[2] ?? "");

      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `Does ${subject} like ${topic}`,
          "?",
        ),
        explanation:
          "O erro esta na ordem da pergunta: com she/he usamos does no comeco e like sem -s.",
        question: `Can you ask another question about ${subject}?`,
        rule: "missing does in question",
      });
    }

    match = sentence.match(/^(i|you|we|they)\s+likes?\s+(.+)$/i);
    if (match) {
      const subject = formatEnglishSubject(match[1] ?? "you", "middle");
      const topic = cleanCorrectionSentence(match[2] ?? "");

      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `Do ${subject} like ${topic}`,
          "?",
        ),
        explanation:
          "O erro esta na ordem da pergunta: com I/you/we/they usamos do no comeco.",
        question: "Can you ask one more question with do?",
        rule: "missing do in question",
      });
    }
  }

  match = sentence.match(/^did\s+(i|you|she|he|we|they)\s+([a-z]+)(.*)$/i);
  if (match) {
    const subject = formatQuestionSubject(match[1] ?? "you");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const baseVerb = pastToBaseVerbMap[verb];

    if (baseVerb) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `Did ${subject} ${baseVerb}${rest ? ` ${rest}` : ""}`,
          "?",
        ),
        explanation: `O erro esta em ${verb}: depois de did usamos o verbo base ${baseVerb}.`,
        question: "Can you ask one more past question?",
        rule: "did + base verb",
      });
    }
  }

  if (hasQuestionMark) {
    match = sentence.match(
      /^i\s+(watched|played|studied|visited|walked|went|ate|saw|did|had|made|read)\b\s*(.*)$/i,
    );
    if (match) {
      const pastVerb = normalizeText(match[1] ?? "");
      const rest = cleanCorrectionSentence(match[2] ?? "");
      const baseVerb = pastToBaseVerbMap[pastVerb];

      if (baseVerb) {
        return buildCorrectionPlan({
          correctedSentence: formatCorrectionSentence(
            `Did you ${baseVerb}${rest ? ` ${rest}` : ""}`,
            "?",
          ),
          explanation: `O erro esta em ${pastVerb}: em pergunta no passado usamos did + verbo base.`,
          question: "Can you answer with yes or no?",
          rule: "past statement with question mark -> did question",
        });
      }
    }
  }

  match = sentence.match(/^will\s+(i|you|she|he|we|they)\s+([a-z]+)(.*)$/i);
  if (match) {
    const subject = formatQuestionSubject(match[1] ?? "you");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const baseVerb = getBaseVerbFromThirdPerson(verb);

    if (baseVerb !== verb) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `Will ${subject} ${baseVerb}${rest ? ` ${rest}` : ""}`,
          "?",
        ),
        explanation: `O erro esta em ${verb}: depois de will usamos o verbo base ${baseVerb}.`,
        question: "Can you make one more will question?",
        rule: "will question + base verb",
      });
    }
  }

  match = sentence.match(/^can\s+(i|you|she|he|we|they)\s+to\s+(.+)$/i);
  if (match) {
    const subject = formatQuestionSubject(match[1] ?? "you");
    const action = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Can ${subject} ${action}`,
        "?",
      ),
      explanation: "O erro esta em to: depois de can usamos o verbo sem to.",
      question: "What else can you do?",
      rule: "can question without to",
    });
  }

  match = sentence.match(/^where\s+(i|you|we|they|she|he)\s+live$/i);
  if (match) {
    const subject = formatQuestionSubject(match[1] ?? "you");
    const auxiliary = ["she", "he"].includes(normalizeText(subject))
      ? "does"
      : "do";

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Where ${auxiliary} ${subject} live`,
        "?",
      ),
      explanation: `O erro esta na ordem da pergunta: usamos ${auxiliary} antes do sujeito.`,
      question: "Can you answer: I live in ____?",
      rule: "where question word order",
    });
  }

  match = sentence.match(/^why\s+(she|he|it)\s+is\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Why is ${subject} ${rest}`,
        "?",
      ),
      explanation:
        "O erro esta na ordem da pergunta: com be, colocamos is antes do sujeito.",
      question: `Can you answer why ${subject} is ${rest}?`,
      rule: "why be question word order",
    });
  }

  match = sentence.match(/^what\s+did\s+(i|you|she|he|we|they)\s+yesterday$/i);
  if (match) {
    const subject = formatQuestionSubject(match[1] ?? "you");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `What did ${subject} do yesterday`,
        "?",
      ),
      explanation:
        "O erro esta faltando do: depois de what did, usamos do para a acao.",
      question: "What did you do yesterday?",
      rule: "what did + do",
    });
  }

  match = sentence.match(/^i\s+likes\s+(.+)$/i);
  if (match) {
    const topic = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I like ${topic}`),
      explanation: "O erro esta em likes: com I usamos like sem -s.",
      question: "What else do you like?",
      rule: "I likes -> I like",
    });
  }

  match = sentence.match(/^(she|he)\s+like\s+(.+)$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "she");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} likes ${topic}`),
      explanation: `O erro esta em like: com ${subject.toLowerCase()} usamos likes.`,
      question: `Does ${subject.toLowerCase()} like chocolate too?`,
      rule: "she/he like -> she/he likes",
    });
  }

  match = sentence.match(/^i\s+has\s+(.+)$/i);
  if (match) {
    const object = addArticleIfNeeded(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I have ${object}`),
      explanation: "O erro esta em has: com I usamos have.",
      question: "What else do you have?",
      rule: "I has -> I have",
    });
  }

  match = sentence.match(/^(she|he)\s+have\s+(.+)$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "she");
    const object = addArticleIfNeeded(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} has ${object}`),
      explanation: `O erro esta em have: com ${subject.toLowerCase()} usamos has.`,
      question: `What else does ${subject.toLowerCase()} have?`,
      rule: "she/he have -> she/he has",
    });
  }

  match = sentence.match(/^(she|he|it)\s+don'?t\s+(.+)$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "she");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} doesn't ${rest}`),
      explanation: `O erro esta em don't: com ${subject.toLowerCase()} usamos doesn't.`,
      question: `What doesn't ${subject.toLowerCase()} like?`,
      rule: "she/he/it don't -> doesn't",
    });
  }

  match = sentence.match(/^(i|you|we|they)\s+doesn'?t\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "I", "start");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} don't ${rest}`),
      explanation: `O erro esta em doesn't: com ${subject} usamos don't.`,
      question: "What do you like instead?",
      rule: "I/you/we/they doesn't -> don't",
    });
  }

  match = sentence.match(/^i\s+am\s+have\s+(.+)$/i);
  if (match) {
    const object = addArticleIfNeeded(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I have ${object}`),
      explanation: "O erro esta em am have: para posse usamos I have, sem am.",
      question: "What else do you have?",
      rule: "I am have -> I have",
    });
  }

  match = sentence.match(/^i\s+am\s+like\s+(.+)$/i);
  if (match) {
    const topic = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I like ${topic}`),
      explanation:
        "O erro esta em am like: para falar do que voce gosta, usamos I like.",
      question: "What else do you like?",
      rule: "I am like -> I like",
    });
  }

  match = sentence.match(/^i\s+have\s+(\d{1,3})\s+years?\s+old$/i);
  if (match) {
    const age = match[1] ?? "";

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I am ${age} years old`),
      explanation: "O erro esta em have: para idade usamos am.",
      question: "Can you say it again?",
      rule: "I have years old -> I am years old",
    });
  }

  match = sentence.match(/^(she|he)\s+has\s+(\d{1,3})\s+years?\s+old$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "she");
    const possessive = normalizeText(subject) === "he" ? "his" : "her";
    const age = match[2] ?? "";

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `${subject} is ${age} years old`,
      ),
      explanation: `O erro esta em has: para idade com ${subject.toLowerCase()}, usamos is.`,
      question: `Can you say ${possessive} age again?`,
      rule: "she/he has years old -> is years old",
    });
  }

  match = sentence.match(
    /^(my\s+(?:brother|sister|mother|father))\s+have\s+(\d{1,3})\s+years?\s+old$/i,
  );
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "my brother");
    const age = match[2] ?? "";

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `${subject} is ${age} years old`,
      ),
      explanation: `O erro esta em have: para idade de ${subject.toLowerCase()}, usamos is.`,
      question: "Can you make one more family sentence?",
      rule: "family member have years old -> is years old",
    });
  }

  match = sentence.match(/^i\s+went\s+in\s+(.+?)(?:\s+yesterday)?$/i);
  if (match && hasAny(normalized, ["in school", "in the park", "in park"])) {
    const place = cleanCorrectionSentence(match[1] ?? "")
      .replace(/^the\s+/i, "the ")
      .replace(/^park$/i, "the park");
    const suffix = normalized.includes("yesterday") ? " yesterday" : "";

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `I went to ${place}${suffix}`,
      ),
      explanation: "O erro esta em in: com go/went para destino usamos to.",
      question: "What did you do there?",
      rule: "went in -> went to",
    });
  }

  match = sentence.match(
    /^(i|she|he|we|they|you)\s+(go|play|study|watch|walk|visit|eat|see|do|have|make|read)\b\s*(.*?)\s+yesterday$/i,
  );
  if (match) {
    const subject = match[1] ?? "I";
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const pastVerb = pastVerbMap[verb];

    if (pastVerb) {
      const question = /\bschool\b/i.test(rest)
        ? "What did you do at school?"
        : "What else did you do yesterday?";

      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `${capitalizeFirstWord(subject)} ${pastVerb}${rest ? ` ${rest}` : ""} yesterday`,
        ),
        explanation: `O erro esta em ${verb}: yesterday pede passado, entao usamos ${pastVerb}.`,
        question,
        rule: "yesterday with present verb -> past verb",
      });
    }
  }

  match = sentence.match(
    /^yesterday\s+(i|she|he|we|they|you)\s+(go|play|study|watch|walk|visit|eat|see|do|have|make|read)\b\s*(.*)$/i,
  );
  if (match) {
    const subject = match[1] ?? "I";
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const pastVerb = pastVerbMap[verb];

    if (pastVerb) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `Yesterday ${formatEnglishSubject(subject, "middle")} ${pastVerb}${rest ? ` ${rest}` : ""}`,
        ),
        explanation: `O erro esta em ${verb}: yesterday pede passado, entao usamos ${pastVerb}.`,
        question: "Can you say one more thing in the past?",
        rule: "yesterday before present verb -> past verb",
      });
    }
  }

  match = sentence.match(
    /^(she|he|it|my\s+(?:mother|father|brother|sister))\s+(play|work|study|go|watch|eat|like|want|live|read|walk|visit|make)\b\s*(.*)$/i,
  );
  if (match && !normalized.includes("yesterday")) {
    const subject = capitalizeFirstWord(match[1] ?? "she");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const correctedVerb = formatThirdPersonVerb(verb);

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `${subject} ${correctedVerb}${rest ? ` ${rest}` : ""}`,
      ),
      explanation: `O erro esta em ${verb}: com ${subject.toLowerCase()}, o verbo ganha -s no presente.`,
      question: `Can you make one more sentence about ${subject.toLowerCase()}?`,
      rule: "third person present simple needs -s",
    });
  }

  match = sentence.match(
    /^(i|you|we|they)\s+(plays|works|studies|goes|watches|eats|likes|wants|lives|reads|walks|visits|makes)\b\s*(.*)$/i,
  );
  if (match && !normalized.includes("yesterday")) {
    const subject = formatEnglishSubject(match[1] ?? "they", "start");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const baseVerb = getBaseVerbFromThirdPerson(verb);

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `${subject} ${baseVerb}${rest ? ` ${rest}` : ""}`,
      ),
      explanation: `O erro esta em ${verb}: com ${subject}, usamos o verbo sem -s.`,
      question: "Can you make one more present sentence?",
      rule: "I/you/we/they present simple without -s",
    });
  }

  match = sentence.match(
    /^(i|you|she|he|we|they)\s+will\s+([a-z]+)\b\s*(.*)$/i,
  );
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "I", "start");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const baseVerb = getBaseVerbFromThirdPerson(verb);

    if (baseVerb !== verb) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `${subject} will ${baseVerb}${rest ? ` ${rest}` : ""}`,
        ),
        explanation: `O erro esta em ${verb}: depois de will usamos o verbo base ${baseVerb}.`,
        question: "What will you do tomorrow?",
        rule: "will + base verb",
      });
    }
  }

  match = sentence.match(/^i\s+no\s+will\s+(.+)$/i);
  if (match) {
    const action = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I will not ${action}`),
      explanation:
        "O erro esta em no will: para negar no futuro usamos will not.",
      question: "What will you do instead?",
      rule: "no will -> will not",
    });
  }

  match = sentence.match(/^there\s+is\s+((?:two|three|four|five|many)\s+.+)$/i);
  if (match) {
    const rest = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`There are ${rest}`),
      explanation: "O erro esta em is: com quantidade plural usamos there are.",
      question: "Can you make one more there are sentence?",
      rule: "there is with plural quantity -> there are",
    });
  }

  match = sentence.match(/^there\s+are\s+(a|an)\s+(.+)$/i);
  if (match) {
    const article = normalizeText(match[1] ?? "a");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `There is ${article} ${rest}`,
      ),
      explanation:
        "O erro esta em are: com uma coisa singular usamos there is.",
      question: "What else is there?",
      rule: "there are with singular article -> there is",
    });
  }

  match = sentence.match(/^have\s+(a|an)\s+(.+)\s+on\s+the\s+table$/i);
  if (match) {
    const article = normalizeText(match[1] ?? "a");
    const object = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `There is ${article} ${object} on the table`,
      ),
      explanation:
        "O erro esta em have: para dizer que algo existe em um lugar, usamos there is.",
      question: "What else is on the table?",
      rule: "have on the table -> there is",
    });
  }

  match = sentence.match(/^i\s+like\s+the\s+([a-z]+)$/i);
  if (match) {
    const topic = normalizeText(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I like ${topic}`),
      explanation: `O erro esta em the ${topic}: para gosto geral, normalmente nao usamos the.`,
      question: `What else do you like?`,
      rule: "general like without the",
    });
  }

  match = sentence.match(/^i\s+have\s+(\d+|two|three|four|five)\s+([a-z]+)$/i);
  if (match) {
    const quantity = normalizeText(match[1] ?? "two");
    const noun = normalizeText(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `I have ${quantity} ${pluralizePracticeWord(noun)}`,
      ),
      explanation: `O erro esta em ${noun}: depois de ${quantity}, usamos plural.`,
      question: "How many do you have?",
      rule: "quantity needs plural noun",
    });
  }

  match = sentence.match(
    /^there\s+are\s+(many|two|three|four|five)\s+([a-z]+)$/i,
  );
  if (match) {
    const quantity = normalizeText(match[1] ?? "many");
    const noun = normalizeText(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `There are ${quantity} ${pluralizePracticeWord(noun)}`,
      ),
      explanation: `O erro esta em ${noun}: com ${quantity}, usamos plural.`,
      question: "Can you make one more plural sentence?",
      rule: "there are quantity needs plural noun",
    });
  }

  match = sentence.match(/^(she|he|i|you|we|they)\s+likes?\s+([a-z]+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "start");
    const noun = normalizeText(match[2] ?? "");
    const plural = pluralPracticeWords[noun];

    if (plural) {
      const verb = ["she", "he"].includes(normalizeText(subject))
        ? "likes"
        : "like";

      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `${subject} ${verb} ${plural}`,
        ),
        explanation: `O erro esta em ${noun}: para gosto geral, usamos plural.`,
        question: `What kind of ${plural} do you like?`,
        rule: "general like with plural noun",
      });
    }
  }

  match = sentence.match(/^i\s+am\s+in\s+home$/i);
  if (match) {
    return buildCorrectionPlan({
      correctedSentence: "I am at home.",
      explanation: "O erro esta em in: com home parado, usamos at home.",
      question: "Are you at home now?",
      rule: "in home -> at home",
    });
  }

  match = sentence.match(/^i\s+go\s+to\s+home$/i);
  if (match) {
    return buildCorrectionPlan({
      correctedSentence: "I go home.",
      explanation: "O erro esta em to home: com go home, nao usamos to.",
      question: "When do you go home?",
      rule: "go to home -> go home",
    });
  }

  match = sentence.match(/^i\s+live\s+at\s+(.+)$/i);
  if (match) {
    const place = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I live in ${place}`),
      explanation: `O erro esta em at: para pais ou cidade, usamos in.`,
      question: `Can you say one more sentence about ${place}?`,
      rule: "live at country/city -> live in",
    });
  }

  match = sentence.match(/^i\s+went\s+in\s+(.+)$/i);
  if (match) {
    const place = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I went to ${place}`),
      explanation: "O erro esta em in: com go/went para destino usamos to.",
      question: "What did you do there?",
      rule: "went in -> went to",
    });
  }

  match = sentence.match(/^i\s+would\s+like\s+([a-z]+)\b\s*(.*)$/i);
  if (match) {
    const verb = normalizeText(match[1] ?? "");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    if (pastVerbMap[verb] || verb === "eat" || verb === "go") {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `I would like to ${verb}${rest ? ` ${rest}` : ""}`,
        ),
        explanation: `O erro esta em ${verb}: depois de would like usamos to + verbo.`,
        question: "What would you like to do?",
        rule: "would like to + verb",
      });
    }
  }

  match = sentence.match(/^i\s+like\s+to\s+([a-z]+)$/i);
  if (match) {
    const topic = normalizeText(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I like ${topic}`),
      explanation: `O erro esta em to ${topic}: para gostar de comida/coisa, usamos I like ${topic}.`,
      question: `What else do you like?`,
      rule: "like to noun -> like noun",
    });
  }

  match = sentence.match(/^(i|she|he)\s+wants?\s+([a-z]+)\b\s*(.*)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "I", "start");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const wantVerb = ["she", "he"].includes(normalizeText(subject))
      ? "wants"
      : "want";

    if (pastVerbMap[verb] || verb === "go" || verb === "eat") {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `${subject} ${wantVerb} to ${verb}${rest ? ` ${rest}` : ""}`,
        ),
        explanation: `O erro esta em ${verb}: depois de ${wantVerb} usamos to + verbo.`,
        question: "What do you want to do next?",
        rule: "want/wants to + verb",
      });
    }
  }

  match = sentence.match(/^(i|she|he|you|we|they)\s+can\s+to\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "I", "start");
    const action = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} can ${action}`),
      explanation: "O erro esta em to: depois de can usamos o verbo sem to.",
      question: "What else can you do?",
      rule: "can without to",
    });
  }

  match = sentence.match(
    /^(she|he|i|you|we|they)\s+can\s+([a-z]+s)\b\s*(.*)$/i,
  );
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "start");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const baseVerb = getBaseVerbFromThirdPerson(verb);

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `${subject} can ${baseVerb}${rest ? ` ${rest}` : ""}`,
      ),
      explanation: `O erro esta em ${verb}: depois de can usamos o verbo base ${baseVerb}.`,
      question: "What else can you do?",
      rule: "can + base verb",
    });
  }

  match = sentence.match(/^he\s+name\s+is\s+(.+)$/i);
  if (match) {
    const name = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`His name is ${name}`),
      explanation: "O erro esta em he: para posse usamos his.",
      question: "Can you say one more name sentence?",
      rule: "he name -> his name",
    });
  }

  match = sentence.match(/^she\s+name\s+is\s+(.+)$/i);
  if (match) {
    const name = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`Her name is ${name}`),
      explanation: "O erro esta em she: para posse usamos her.",
      question: "Can you say one more name sentence?",
      rule: "she name -> her name",
    });
  }

  match = sentence.match(/^my\s+(mother|father|brother|sister)\s+name$/i);
  if (match) {
    const person = normalizeText(match[1] ?? "mother");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`My ${person}'s name`),
      explanation: `O erro esta em ${person} name: para posse, usamos ${person}'s name.`,
      question: "Can you complete it with a name?",
      rule: "family member possessive 's",
    });
  }

  match = sentence.match(/^this\s+is\s+me\s+(.+)$/i);
  if (match) {
    const object = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`This is my ${object}`),
      explanation: "O erro esta em me: para posse usamos my.",
      question: "Can you show one more thing you have?",
      rule: "me book -> my book",
    });
  }

  match = sentence.match(/^i\s+like\s+([a-z]+)$/i);
  if (match) {
    const singular = normalizeText(match[1] ?? "");
    const plural = pluralPracticeWords[singular];

    if (plural) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(`I like ${plural}`),
        explanation: `O erro esta em ${singular}: para categoria geral usamos plural.`,
        question: `What kind of ${plural} do you like?`,
        rule: "category noun after I like -> plural",
      });
    }
  }

  match = sentence.match(
    /^my\s+favorite\s+(animal|fruit)\s+is\s+([a-z]+(?:\s+[a-z]+)?)$/i,
  );
  if (match && !startsWithArticle(match[2] ?? "")) {
    const kind = normalizeText(match[1] ?? "animal");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `My favorite ${kind} is ${getArticleForWord(topic)} ${topic}`,
      ),
      explanation: `O erro esta em ${topic}: antes de ${topic}, usamos ${getArticleForWord(topic)}.`,
      question:
        kind === "animal"
          ? "Can you make one more animal sentence?"
          : "Can you make one more fruit sentence?",
      rule: "missing a/an after favorite animal/fruit",
    });
  }

  match = sentence.match(
    /^(i\s+(?:have|want)|she\s+(?:has|wants)|he\s+(?:has|wants))\s+([a-z]+)$/i,
  );
  if (match) {
    const start = match[1] ?? "I have";
    const object = normalizeText(match[2] ?? "");

    if (countableArticleWords.has(object) && !startsWithArticle(object)) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `${capitalizeFirstWord(start)} ${getArticleForWord(object)} ${object}`,
        ),
        explanation: `O erro esta em ${object}: antes de ${object}, usamos ${getArticleForWord(object)}.`,
        question: "Can you make one more sentence with a or an?",
        rule: "missing a/an before singular count noun",
      });
    }
  }

  match = sentence.match(/^what\s+(she|he)\s+likes?\??$/i);
  if (match) {
    const subject = normalizeText(match[1] ?? "she");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `What does ${subject} like`,
        "?",
      ),
      explanation:
        "O erro esta na ordem da pergunta: com she/he usamos does e o verbo fica like.",
      question: `Can you ask one more question with does ${subject}?`,
      rule: "question order with she/he",
    });
  }

  match = sentence.match(/^what\s+(i|you|we|they)\s+like\??$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `What do ${subject} like`,
        "?",
      ),
      explanation:
        "O erro esta na ordem da pergunta: com I/you/we/they usamos do.",
      question: "Can you ask one more question with do?",
      rule: "question order with do",
    });
  }

  match = sentence.match(/^does\s+(she|he)\s+likes\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Does ${subject} like ${topic}`,
        "?",
      ),
      explanation: "O erro esta em likes: depois de does, o verbo fica sem -s.",
      question: `What else does ${subject} like?`,
      rule: "does + verb without -s",
    });
  }

  match = sentence.match(
    /^does\s+(i|you|we|they)\s+(play|like|study|work|go|eat|watch|read|want|live)\b\s*(.*)$/i,
  );
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Do ${subject} ${verb}${rest ? ` ${rest}` : ""}`,
        "?",
      ),
      explanation: `O erro esta em does: com ${subject} usamos do.`,
      question: "Can you make one more do question?",
      rule: "does I/you/we/they -> do I/you/we/they",
    });
  }

  match = sentence.match(/^does\s+(i|you|we|they)\s+like\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Do ${subject} like ${topic}`,
        "?",
      ),
      explanation: `O erro esta em does: com ${subject} usamos do.`,
      question: "Can you make one more do question?",
      rule: "does I/you/we/they -> do I/you/we/they",
    });
  }

  match = sentence.match(
    /^do\s+(she|he|it)\s+(play|like|study|work|go|eat|watch|read|want|live)\b\s*(.*)$/i,
  );
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Does ${subject} ${verb}${rest ? ` ${rest}` : ""}`,
        "?",
      ),
      explanation: `O erro esta em do: com ${subject} a pergunta usa does.`,
      question: "Can you make another does question?",
      rule: "do she/he/it -> does she/he/it",
    });
  }

  match = sentence.match(/^do\s+(she|he)\s+like\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Does ${subject} like ${topic}`,
        "?",
      ),
      explanation: `O erro esta em do: com ${subject} a pergunta usa does.`,
      question: `Can you make another does question?`,
      rule: "do she/he -> does she/he",
    });
  }

  match = sentence.match(/^do\s+(i|you|we|they)\s+likes\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Do ${subject} like ${topic}`,
        "?",
      ),
      explanation: "O erro esta em likes: depois de do, o verbo fica sem -s.",
      question: "Can you make one more do question?",
      rule: "do + verb without -s",
    });
  }

  match = sentence.match(/^(you|i|we|they)\s+like\s+(.+)$/i);
  if (match && hasQuestionMark) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Do ${subject} like ${topic}`,
        "?",
      ),
      explanation:
        "O erro esta na ordem da pergunta: pergunta simples precisa de do no comeco.",
      question: "Can you ask one more question with do?",
      rule: "missing do in question",
    });
  }

  match = sentence.match(/^(she|he)\s+likes?\s+(.+)$/i);
  if (match && hasQuestionMark) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `Does ${subject} like ${topic}`,
        "?",
      ),
      explanation:
        "O erro esta na ordem da pergunta: pergunta com she/he precisa de does.",
      question: `Can you ask another question about ${subject}?`,
      rule: "missing does in question",
    });
  }

  match = sentence.match(/^(i|she|he|it)\s+were\s+(.+)$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "I");
    const explanationSubject = subject === "I" ? "I" : subject.toLowerCase();
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} was ${rest}`),
      explanation: `O erro esta em were: com ${explanationSubject}, usamos was.`,
      question: "Can you make one more past sentence?",
      rule: "I/she/he/it were -> was",
    });
  }

  match = sentence.match(/^(we|they|you)\s+was\s+(.+)$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "they");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} were ${rest}`),
      explanation: `O erro esta em was: com ${subject.toLowerCase()}, usamos were.`,
      question: "Can you make one more sentence with were?",
      rule: "we/they/you was -> were",
    });
  }

  match = sentence.match(/^i\s+(?:is|are)\s+(.+)$/i);
  if (match) {
    const rest = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I am ${rest}`),
      explanation: "O erro esta em is/are: com I usamos am.",
      question: "Can you make one more sentence with I am?",
      rule: "I is/are -> I am",
    });
  }

  match = sentence.match(/^(you|we|they)\s+is\s+(.+)$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "they");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} are ${rest}`),
      explanation: `O erro esta em is: com ${subject.toLowerCase()}, usamos are.`,
      question: "Can you make one more sentence with are?",
      rule: "you/we/they is -> are",
    });
  }

  match = sentence.match(/^(she|he|it)\s+are\s+(.+)$/i);
  if (match) {
    const subject = capitalizeFirstWord(match[1] ?? "she");
    const rest = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`${subject} is ${rest}`),
      explanation: `O erro esta em are: com ${subject.toLowerCase()}, usamos is.`,
      question: "Can you make one more sentence with is?",
      rule: "she/he/it are -> is",
    });
  }

  return undefined;
}

function getSimpleEnglishPracticeMatch(text: string): {
  favoriteKind?: string;
  pattern: CattySimpleEnglishPattern;
  topic: string;
} | null {
  const sentence = stripCattyAddress(text)
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .trim();
  const patterns: Array<{
    favoriteKindIndex?: number;
    pattern: CattySimpleEnglishPattern;
    regex: RegExp;
    topicIndex: number;
  }> = [
    {
      pattern: "dislike",
      regex: /^i\s+don'?t\s+like(?:\s+(.*))?$/i,
      topicIndex: 1,
    },
    {
      pattern: "like",
      regex: /^i\s+like(?:\s+(.*))?$/i,
      topicIndex: 1,
    },
    {
      favoriteKindIndex: 1,
      pattern: "favorite",
      regex: /^my\s+favorite\s+([a-zA-Z\s-]{2,32})\s+is\s*(.*)$/i,
      topicIndex: 2,
    },
    {
      pattern: "have",
      regex: /^i\s+have\s*(.*)$/i,
      topicIndex: 1,
    },
    {
      pattern: "can",
      regex: /^i\s+can\s*(.*)$/i,
      topicIndex: 1,
    },
    {
      pattern: "want",
      regex: /^i\s+want\s*(.*)$/i,
      topicIndex: 1,
    },
    {
      pattern: "am",
      regex: /^i\s+am\s*(.*)$/i,
      topicIndex: 1,
    },
    {
      pattern: "third_person_likes",
      regex: /^(?:she|he)\s+likes(?:\s+(.*))?$/i,
      topicIndex: 1,
    },
    {
      pattern: "today",
      regex: /^today\s+i\s*(.*)$/i,
      topicIndex: 1,
    },
    {
      pattern: "yesterday",
      regex: /^yesterday\s+i\s*(.*)$/i,
      topicIndex: 1,
    },
    {
      pattern: "went",
      regex: /^i\s+went\s*(.*)$/i,
      topicIndex: 1,
    },
    {
      pattern: "played",
      regex: /^i\s+played\s*(.*)$/i,
      topicIndex: 1,
    },
  ];

  for (const pattern of patterns) {
    const match = sentence.match(pattern.regex);

    if (!match) {
      continue;
    }

    return {
      favoriteKind:
        pattern.favoriteKindIndex === undefined
          ? undefined
          : cleanSimpleEnglishTopic(match[pattern.favoriteKindIndex] ?? ""),
      pattern: pattern.pattern,
      topic: cleanSimpleEnglishTopic(match[pattern.topicIndex] ?? ""),
    };
  }

  return null;
}

function isSimpleEnglishPracticeCandidate(text: string) {
  const sentence = stripCattyAddress(text);
  const normalized = normalizeText(sentence);
  const tokens = getWordTokens(sentence);

  if (
    tokens.length < 2 ||
    tokens.length > 16 ||
    /[?]/.test(sentence) ||
    hasAny(normalized, [
      "answer",
      "api",
      "code",
      "correct",
      "exercise",
      "help",
      "homework",
      "question",
      "teacher",
      "translate",
    ])
  ) {
    return false;
  }

  return Boolean(getSimpleEnglishPracticeMatch(sentence));
}

function getRecentSimpleEnglishTopic(
  history: CattyMessage[],
  currentText: string,
) {
  const normalizedCurrent = normalizeText(
    stripCattyAddress(currentText),
  ).trim();

  for (const message of [...history].reverse()) {
    if (message.from !== "user") {
      continue;
    }

    const normalizedMessage = normalizeText(
      stripCattyAddress(message.text),
    ).trim();

    if (normalizedMessage === normalizedCurrent) {
      continue;
    }

    const match = getSimpleEnglishPracticeMatch(message.text);

    if (match?.topic && !isIncompleteSimpleEnglishTopic(match.topic)) {
      return match.topic;
    }
  }

  return "";
}

function extractLikeTopicFromText(text: string) {
  const correction = buildCommonEnglishCorrectionPlan(text);
  const candidates = [
    stripCattyAddress(text),
    correction?.correctedSentence ?? "",
  ];

  for (const candidate of candidates) {
    const match = cleanCorrectionSentence(candidate).match(
      /\bi\s+like\s+([a-zA-Z][a-zA-Z\s-]{0,80})(?:[.!?]|$)/i,
    );
    const topic = cleanSimpleEnglishTopic(match?.[1] ?? "").replace(
      /\s+and\s*$/i,
      "",
    );

    if (topic && !isIncompleteSimpleEnglishTopic(topic)) {
      return topic;
    }
  }

  return "";
}

function getRecentLikeTopic(history: CattyMessage[], currentText: string) {
  const normalizedCurrent = normalizeText(
    stripCattyAddress(currentText),
  ).trim();

  for (const message of [...history].reverse()) {
    if (message.from !== "user") {
      continue;
    }

    const normalizedMessage = normalizeText(
      stripCattyAddress(message.text),
    ).trim();

    if (normalizedMessage === normalizedCurrent) {
      continue;
    }

    const topic = extractLikeTopicFromText(message.text);

    if (topic) {
      return topic;
    }
  }

  return "";
}

function getSimpleEnglishFragment(text: string) {
  const fragment = cleanSimpleEnglishTopic(stripCattyAddress(text));
  const normalized = normalizeText(fragment);
  const tokens = getWordTokens(fragment);

  if (
    tokens.length < 1 ||
    tokens.length > 4 ||
    /[?]/.test(fragment) ||
    !/^[a-zA-Z][a-zA-Z\s-]*$/.test(fragment) ||
    getSimpleEnglishPracticeMatch(fragment) ||
    buildCommonEnglishCorrectionPlan(fragment) ||
    hasAny(normalized, [
      "answer",
      "api",
      "code",
      "correct",
      "exercise",
      "help",
      "homework",
      "nao entendi",
      "question",
      "teacher",
      "translate",
    ])
  ) {
    return "";
  }

  return fragment;
}

function getTopicTokenVariants(token: string) {
  const variants = new Set([token]);

  if (token.endsWith("s") && token.length > 3) {
    variants.add(token.slice(0, -1));
  } else if (token.length > 2) {
    variants.add(`${token}s`);
  }

  return variants;
}

function fragmentOverlapsTopic(fragment: string, topic: string) {
  const fragmentTokens = getWordTokens(fragment).map((token) =>
    normalizeText(token),
  );
  const topicTokens = getWordTokens(topic).map((token) => normalizeText(token));

  return topicTokens.some((topicToken) => {
    const variants = getTopicTokenVariants(topicToken);

    return fragmentTokens.some((fragmentToken) => variants.has(fragmentToken));
  });
}

function buildFragmentContinuationQuestion(
  fragment: string,
  historyTopic: string,
) {
  const normalizedFragment = normalizeText(fragment);
  const normalizedHistoryTopic = normalizeText(historyTopic);

  if (
    /\b(?:car|cars)\b/.test(normalizedFragment) ||
    /\b(?:car|cars)\b/.test(normalizedHistoryTopic)
  ) {
    if (/\bblue\s+cars?\b/.test(normalizedFragment)) {
      return "Do you like red cars too?";
    }

    if (
      /\b(?:red|black|white|green|yellow)\s+cars?\b/.test(normalizedFragment)
    ) {
      return "Do you like blue cars too?";
    }

    return "Can you make one more car sentence?";
  }

  return `Can you add one more sentence about ${historyTopic}?`;
}

function getStandaloneFragmentPractice(
  fragment: string,
): { question: string; suggestedSentence: string; topic: string } | undefined {
  const normalized = normalizeText(fragment);

  if (normalized === "chocolate") {
    return {
      question: "Do you like pizza too?",
      suggestedSentence: "I like chocolate.",
      topic: "chocolate",
    };
  }

  if (normalized === "pizza") {
    return {
      question: "Do you like chocolate too?",
      suggestedSentence: "I like pizza.",
      topic: "pizza",
    };
  }

  if (/\b(?:red|blue|black|white|green|yellow)\s+cars?\b/.test(normalized)) {
    const color = normalized.split(" ")[0] ?? "red";

    return {
      question:
        color === "blue"
          ? "Do you like red cars too?"
          : "Do you like blue cars too?",
      suggestedSentence: formatCorrectionSentence(`I like ${fragment}`),
      topic: "cars",
    };
  }

  if (normalized === "cars" || normalized === "car") {
    return {
      question: "What color cars do you like?",
      suggestedSentence: "I like cars.",
      topic: "cars",
    };
  }

  return undefined;
}

function isStandalonePracticeFragment(text: string) {
  const fragment = getSimpleEnglishFragment(text);

  return Boolean(fragment && getStandaloneFragmentPractice(fragment));
}

function buildCattyFragmentContinuityPlan(
  text: string,
  history: CattyMessage[],
): CattyConversationContinuityPlan | undefined {
  const fragment = getSimpleEnglishFragment(text);

  if (!fragment) {
    return undefined;
  }

  const historyTopic = getRecentLikeTopic(history, text);

  if (!historyTopic || !fragmentOverlapsTopic(fragment, historyTopic)) {
    const standalonePractice = getStandaloneFragmentPractice(fragment);

    if (!standalonePractice) {
      return undefined;
    }

    return {
      historyTopic: undefined,
      isFragment: true,
      isIncomplete: false,
      pattern: "like",
      prompt: [
        "Fragmento curto de pratica detectado sem historico suficiente.",
        `Fragmento atual: ${fragment}.`,
        `Frase sugerida: ${standalonePractice.suggestedSentence}`,
        `Pergunta curta sugerida: ${standalonePractice.question}`,
        "Transforme o fragmento em frase completa e continue com uma pergunta pequena.",
      ].join(" "),
      question: standalonePractice.question,
      suggestedSentence: standalonePractice.suggestedSentence,
      topic: standalonePractice.topic,
    };
  }

  const suggestedSentence = formatCorrectionSentence(`I like ${fragment}`);
  const question = buildFragmentContinuationQuestion(fragment, historyTopic);

  return {
    historyTopic,
    isFragment: true,
    isIncomplete: false,
    pattern: "like",
    prompt: [
      "Fragmento curto de continuidade detectado.",
      `Assunto recente do aluno: ${historyTopic}.`,
      `Fragmento atual: ${fragment}.`,
      `Frase sugerida: ${suggestedSentence}`,
      `Pergunta curta sugerida: ${question}`,
      "Ajude a transformar o fragmento em frase completa e mantenha o mesmo assunto.",
    ].join(" "),
    question,
    suggestedSentence,
    topic: fragment,
  };
}

function buildSimpleEnglishContinuationQuestion(input: {
  favoriteKind?: string;
  historyTopic?: string;
  pattern: CattySimpleEnglishPattern;
  topic: string;
}) {
  const normalizedTopic = normalizeText(input.topic);
  const normalizedHistoryTopic = normalizeText(input.historyTopic ?? "");

  if (isIncompleteSimpleEnglishTopic(input.topic)) {
    if (input.pattern === "favorite") {
      return "Complete it with one favorite thing: My favorite animal is ____.";
    }

    if (input.pattern === "dislike") {
      return "Complete it like this: I don't like ____, but I like ____.";
    }

    return "Complete it with one small word or idea.";
  }

  if (input.pattern === "like") {
    if (
      input.historyTopic &&
      normalizedHistoryTopic &&
      normalizedHistoryTopic !== normalizedTopic
    ) {
      return `Can you join them with and? Try: I like ${input.historyTopic} and ${input.topic}.`;
    }

    if (/\b(?:car|cars)\b/.test(normalizedTopic)) {
      return "What color cars do you like?";
    }

    return `What else do you like? Try: I like ${input.topic} and ____.`;
  }

  if (input.pattern === "dislike") {
    return "What do you like instead? Try: I like ____.";
  }

  if (input.pattern === "favorite") {
    const correction = getSimpleEnglishFavoriteCorrection(
      input.favoriteKind ?? "",
      input.topic,
    );

    if (correction) {
      return `Can you say: ${correction}`;
    }

    return `Nice choice. Why do you like ${input.topic}?`;
  }

  if (input.pattern === "have") {
    return "Can you add a color, number or detail?";
  }

  if (input.pattern === "can") {
    return "Can you make one more sentence with I can?";
  }

  if (input.pattern === "want") {
    return `Can you add why? Try: I want ${input.topic} because ____.`;
  }

  if (input.pattern === "am") {
    return "Can you add why? Try: I am happy because ____.";
  }

  if (input.pattern === "third_person_likes") {
    return "Who likes it too?";
  }

  if (input.pattern === "today") {
    return "What will you do next today?";
  }

  if (input.pattern === "went") {
    return "Who went with you?";
  }

  if (input.pattern === "played" || input.pattern === "yesterday") {
    return "Can you say one more thing in the past?";
  }

  return "Tell me one more thing.";
}

function buildCattyConversationContinuityPlan(
  text: string,
  history: CattyMessage[] = [],
): CattyConversationContinuityPlan | undefined {
  const followUp = buildCattyConversationFollowUpPlan(text, history);

  if (followUp) {
    return followUp;
  }

  if (!isSimpleEnglishPracticeCandidate(text)) {
    return buildCattyFragmentContinuityPlan(text, history);
  }

  const match = getSimpleEnglishPracticeMatch(text);

  if (!match) {
    return undefined;
  }

  const isIncomplete = isIncompleteSimpleEnglishTopic(match.topic);
  const correction =
    match.pattern === "favorite" && !isIncomplete
      ? getSimpleEnglishFavoriteCorrection(
          match.favoriteKind ?? "",
          match.topic,
        )
      : "";
  const historyTopic = getRecentSimpleEnglishTopic(history, text);
  const likeHistoryTopic =
    match.pattern === "like" ? getRecentLikeTopic(history, text) : "";
  const question = buildSimpleEnglishContinuationQuestion({
    ...match,
    historyTopic: likeHistoryTopic || undefined,
  });
  const topic = isIncomplete && historyTopic ? historyTopic : match.topic;

  return {
    correction: correction || undefined,
    historyTopic: historyTopic || undefined,
    isIncomplete,
    pattern: match.pattern,
    prompt: [
      `Frase simples de pratica detectada (${match.pattern}).`,
      topic ? `Assunto principal: ${topic}.` : "Assunto principal incompleto.",
      historyTopic ? `Assunto recente do aluno: ${historyTopic}.` : "",
      correction ? `Microcorrecao sugerida: ${correction}` : "",
      `Pergunta curta sugerida: ${question}`,
      "Continue o mesmo assunto; elogie ou corrija de leve e faca apenas uma pergunta relacionada.",
    ]
      .filter(Boolean)
      .join(" "),
    question,
    topic,
  };
}

function formatCattyContinuityPromptContext(
  continuity?: CattyConversationContinuityPlan,
) {
  if (!continuity) {
    return "Nenhuma frase simples detectada.";
  }

  return [
    `Padrao: ${continuity.pattern}.`,
    continuity.isFollowUp ? "Mensagem atual e resposta curta da pergunta anterior." : "",
    continuity.isFragment ? "Mensagem atual e fragmento de continuidade." : "",
    continuity.previousQuestion
      ? `Ultima pergunta da Catty: ${continuity.previousQuestion}`
      : "",
    continuity.userAnswer
      ? `Resposta curta do aluno: ${continuity.userAnswer}`
      : "",
    continuity.shortAnswerKind
      ? `Tipo de resposta curta: ${continuity.shortAnswerKind}.`
      : "",
    continuity.topic
      ? `Assunto principal: ${continuity.topic}.`
      : "Assunto principal incompleto.",
    continuity.historyTopic
      ? `Assunto recente no historico: ${continuity.historyTopic}.`
      : "",
    continuity.suggestedSentence
      ? `Frase completa sugerida: ${continuity.suggestedSentence}`
      : "",
    continuity.correction ? `Microcorrecao: ${continuity.correction}` : "",
    `Pergunta sugerida: ${continuity.question}`,
    `Pergunta bilingue sugerida: ${formatBilingualQuestion(continuity.question)}`,
    continuity.prompt,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatCattyCorrectionPromptContext(
  correction?: CattyGrammarCorrectionPlan,
) {
  if (!correction) {
    return "Nenhuma correcao local detectada.";
  }

  return correction.prompt;
}

function hasRecentContext(history: CattyMessage[], currentText: string) {
  return Boolean(getRecentUserContext(history, currentText));
}

function hasHomeworkPrompt(text: string) {
  const normalized = normalizeText(text);

  return (
    hasAny(normalized, [
      "enunciado",
      "exercise",
      "pergunta",
      "question",
      "questao",
      "texto",
    ]) || getWordTokens(text).length >= 12
  );
}

function extractTargetWord(text: string) {
  const patterns = [
    /what does\s+["']?([a-zA-Z-]{2,30})["']?\s+mean/i,
    /meaning of\s+["']?([a-zA-Z-]{2,30})["']?/i,
    /o que significa\s+["']?([a-zA-Z-]{2,30})["']?/i,
    /significa\s+["']?([a-zA-Z-]{2,30})["']?/i,
    /palavra\s+["']?([a-zA-Z-]{2,30})["']?/i,
    /word\s+["']?([a-zA-Z-]{2,30})["']?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1]?.trim();

    if (match) {
      return match;
    }
  }

  return "";
}

function detectCattyIntent(
  text: string,
  context?: CattyPageContext,
): { confidence: CattyResponsePlan["confidence"]; intent: CattyIntent } {
  const normalized = normalizeText(text);
  const mixedIntentCount = countMixedIntentSignals(text, context);
  const scopeTopic = getCattyScopeTopic(text, context);

  if (hasReadyAnswerSignal(text)) {
    return { confidence: "high", intent: "ready_answer_request" };
  }

  if (hasCodeApiRequest(text, context)) {
    return { confidence: "high", intent: "code_api_request" };
  }

  if (hasQuestionPracticeRequest(text)) {
    return { confidence: "high", intent: "practice_english" };
  }

  if (
    mixedIntentCount >= 2 &&
    (isLongQuestion(text) || getWordTokens(text).length >= 18)
  ) {
    return { confidence: "medium", intent: "complex_question" };
  }

  if (
    isLikelyEnglishCorrectionCandidate(text) ||
    hasAny(normalized, [
      "corrige",
      "corrigir",
      "correct",
      "frase",
      "grammar",
      "gramatica",
      "phrase",
      "sentence",
    ])
  ) {
    return { confidence: "high", intent: "correct_sentence" };
  }

  if (hasTranslationSignal(text)) {
    return { confidence: "high", intent: "translate_sentence" };
  }

  if (isSimpleEnglishPracticeCandidate(text)) {
    return { confidence: "high", intent: "practice_english" };
  }

  if (isStandalonePracticeFragment(text)) {
    return { confidence: "high", intent: "practice_english" };
  }

  if (scopeTopic) {
    return { confidence: "high", intent: "out_of_scope" };
  }

  if (
    isLongQuestion(text) &&
    !isHomeworkContext(context) &&
    !hasAny(normalized, ["answer", "gabarito", "homework", "resposta"])
  ) {
    return { confidence: "medium", intent: "complex_question" };
  }

  if (
    hasAny(normalized, [
      "meaning",
      "mean",
      "o que significa",
      "palavra",
      "significa",
      "vocabulario",
      "word",
    ])
  ) {
    return { confidence: "high", intent: "explain_word" };
  }

  if (hasCandyXpSignal(text, context)) {
    return { confidence: "high", intent: "candy_xp" };
  }

  if (isEducatorContext(context) && hasAny(normalized, ["feedback"])) {
    return { confidence: "high", intent: "teacher_feedback" };
  }

  if (hasTeacherActivityCreationSignal(text, context)) {
    return { confidence: "high", intent: "teacher_activity_creation" };
  }

  if (hasLessonMaterialSignal(text, context)) {
    return { confidence: "medium", intent: "lesson_material" };
  }

  if (isBareConfusionQuestion(text)) {
    return { confidence: "low", intent: "confusing_question" };
  }

  if (hasAny(normalized, ["estou travado", "preso", "travad", "travou"])) {
    return { confidence: "high", intent: "motivation" };
  }

  if (
    isHomeworkContext(context) ||
    hasAny(normalized, [
      "answer",
      "answers",
      "dever",
      "gabarito",
      "homework",
      "resposta",
      "responder",
    ])
  ) {
    return { confidence: "high", intent: "homework_hint" };
  }

  if (
    context?.task === "mensagens" ||
    hasAny(normalized, ["mensagem", "message", "teacher", "prof"])
  ) {
    return { confidence: "medium", intent: "teacher_message" };
  }

  if (isVagueQuestion(text)) {
    return { confidence: "low", intent: "confusing_question" };
  }

  if (
    hasAny(normalized, [
      "anima",
      "cansad",
      "desanimo",
      "motivacao",
      "motiva",
      "preso",
      "preguica",
      "travad",
    ])
  ) {
    return { confidence: "high", intent: "motivation" };
  }

  if (
    hasAny(normalized, [
      "english",
      "estudar",
      "ingles",
      "learn",
      "practice",
      "praticar",
      "study",
      "treinar",
    ])
  ) {
    return { confidence: "medium", intent: "practice_english" };
  }

  if (
    context?.area === "admin" ||
    context?.area === "teacher" ||
    hasAny(normalized, [
      "agenda",
      "aula ao vivo",
      "ava",
      "contrato",
      "entrar",
      "financeiro",
      "login",
      "senha",
    ])
  ) {
    return { confidence: "medium", intent: "ava_help" };
  }

  return { confidence: "low", intent: "confusing_question" };
}

function isEnglishMessage(text: string) {
  const normalized = normalizeText(text);
  const englishMatches = countSignalMatches(normalized, englishSignals);
  const portugueseMatches = countSignalMatches(normalized, portugueseSignals);
  const onlySimpleLatin = /^[a-z0-9\s?'".,!:-]+$/.test(normalized);

  return (
    englishMatches > 0 &&
    (englishMatches > portugueseMatches ||
      (portugueseMatches === 0 && onlySimpleLatin))
  );
}

function buildEnglishReply(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);
  const contextLabel = getContextLabel(context);

  if (
    hasAny(normalized, ["homework", "answer", "answers"]) ||
    context?.task === "homeworks"
  ) {
    return "Nya, I will not give the full answer, but I can give a good clue: look at the verb first. Send one sentence and I will guide you. 🐱";
  }

  if (
    hasAny(normalized, ["correct", "grammar", "sentence", "say"]) ||
    hasAny(normalized, ["phrase"])
  ) {
    if (hasAny(normalized, ["i has"])) {
      return "Awnn, almost there. Better: I have a book. English tip: with I, use have. Em portugues: com I, usamos have.";
    }

    return "Awnn, almost there. Send one sentence and I will make it smoother with one tiny reason.";
  }

  if (
    context?.task === "mensagens" ||
    hasAny(normalized, ["message", "teacher"])
  ) {
    return "Pss pss, I can help you write a kind message. Try: Hi teacher, I have a question about the activity.";
  }

  if (hasAny(normalized, ["how are you", "hello", "hi"])) {
    return "Miauw, hi sweet learner. Catty is ready. Try this: I can learn a little English every day.";
  }

  if (hasAny(normalized, ["practice", "study", "learn", "english"])) {
    return "Bora estudar, Candy student. Say this out loud: I am getting better at English one step at a time.";
  }

  if (hasAny(normalized, ["what does", "mean", "word"])) {
    return "Miauw, let's go by parts. Send me the word and I will explain it with a simple example.";
  }

  return `Nya, I am here with you on ${contextLabel}. Write one small English sentence and I will help you polish it.`;
}

function buildPortugueseReply(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);

  if (hasAny(normalized, ["aula ao vivo", "meet", "jitsi"])) {
    return "Miauw, a aula ao vivo esta em manutencao por enquanto. Use Aulas, Homework ou Mensagens ate a equipe liberar a sala de video de novo.";
  }

  if (hasAny(normalized, ["homework", "atividade", "dever"])) {
    return "Nya, nao vou te dar a resposta pronta, mas te dou uma pista boa: olha primeiro o verbo e o que a pergunta pede. Manda uma frase se quiser.";
  }

  if (hasAny(normalized, ["senha", "login", "entrar"])) {
    return "Awnn, se o acesso travar, peca para o admin redefinir sua senha. Eu fico aqui torcendo para voce voltar ao estudo.";
  }

  if (hasAny(normalized, ["contrato", "contratos"])) {
    return "Nya, contratos ficam em Meus contratos dentro do AVA. Se algo nao aparecer, avise a Candy para conferir com seguranca.";
  }

  if (hasAny(normalized, ["plano", "planos", "preco", "valor"])) {
    return "Miauw, para planos e valores, fale direto com a Candy. Eu fico aqui cuidando do seu animo de estudo.";
  }

  if (hasAny(normalized, ["anima", "estudar", "ingles", "ringles", "cansad"])) {
    return "Bora estudar, aluno Candy. Hoje vale meta pequena: leia uma frase em English, repita em voz alta e comemore. ✨";
  }

  if (hasAny(normalized, ["corrige", "corrigir", "frase", "gramatica"])) {
    return "Awnn, quase la. Manda uma frase curtinha e eu te devolvo uma versao melhor com uma explicacao simples.";
  }

  if (hasAny(normalized, ["teacher", "prof", "mensagem", "falar"])) {
    return "Nya, para falar com a teacher, use Mensagens no AVA. Escreva simples e direto; pedir ajuda ja e progresso.";
  }

  if (context?.area === "teacher" && hasAny(normalized, ["feedback"])) {
    return "Pss pss, teacher, tenta assim: Voce se esforcou bem hoje. Agora revise uma frase com calma e tente de novo. Pequeno progresso conta.";
  }

  if (context?.area === "teacher") {
    return "Pss pss, teacher, eu posso ajudar com instrucao clara, feedback fofo ou frase exemplo para aula. O que vamos montar?";
  }

  if (context?.area === "admin") {
    return "Miauw, no admin eu oriento caminhos do AVA, mas nao mexo em cadastro, senha ou dado sensivel. Qual tarefa voce esta organizando?";
  }

  if (context?.task === "aulas") {
    return "Miauw, vamos por partes. Nas aulas, posso explicar vocabulario e montar uma frase exemplo. Manda a palavra que ficou dificil.";
  }

  return "Bora estudar, aluno Candy. Uma frase por vez ja conta. Me pergunte sobre homework, aula ao vivo ou mande uma frase em English.";
}

function buildScopeRedirectEnglishReply(topic: CattyScopeTopic | null) {
  if (topic === "cake") {
    return "Awnn, let's turn that into English. The sentence is: I make a cake. Want to learn the ingredients in English?";
  }

  if (topic === "cooking") {
    return "Uwau, let's turn that into English 🥗✨ You can say: I make a salad. Want to add the ingredients?";
  }

  if (topic === "finance") {
    return "Nya, money advice is outside my study corner. We can practice words like price, save and plan. Which word do you want?";
  }

  if (topic === "health" || topic === "legal") {
    return "Awnn, that topic needs a real specialist. I can help you say the idea in simple English, one sentence at a time.";
  }

  return "Miauw, that is outside my Candy study corner. I can turn it into English practice with one short sentence.";
}

function buildCodeApiEnglishReply() {
  return "Pss pss, I am Catty from Candy English. I can help you explain that idea in English or build a sentence for class.";
}

function buildCandyXpEnglishReply() {
  return "Miauw, Candy XP is your mission path. I can help you understand the task, but I will not give the final answer. Which mission are you on?";
}

function buildLessonMaterialEnglishReply() {
  return "Awnn, let's use the lesson material step by step. Send me the word or sentence from the material, and I will explain it simply.";
}

function buildTeacherActivityEnglishReply() {
  return "Pss pss, teacher, choose one target sentence, one simple instruction, and one answer type. Want it for listening, reading, or writing?";
}

function buildScopeRedirectPortugueseReply(topic: CattyScopeTopic | null) {
  if (topic === "cake") {
    return "Awnn, vamos transformar isso em English? A frase e: I make a cake. Quer aprender os ingredientes em ingles?";
  }

  if (topic === "cooking") {
    return "Uwau, vamos transformar isso em English? 🥗✨ Voce pode dizer: I make a salad. Quer colocar os ingredientes na frase?";
  }

  if (topic === "finance") {
    return "Nya, financas nao e meu cantinho de estudo. Posso transformar em vocabulario: price, save, plan. Qual palavra voce quer treinar?";
  }

  if (topic === "health" || topic === "legal") {
    return "Awnn, esse assunto precisa de um especialista de verdade. Eu posso te ajudar a dizer a ideia em ingles simples, uma frase por vez.";
  }

  return "Miauw, esse assunto foge um pouco da aula. Posso transformar em pratica de English com uma frase curta.";
}

function buildCodeApiPortugueseReply() {
  return "Pss pss, eu sou a Catty de estudos da Candy English. Posso te ajudar a explicar essa ideia em ingles ou montar uma frase para aula.";
}

function buildCandyXpPortugueseReply() {
  return "Miauw, Candy XP e seu caminho de missoes. Eu te ajudo a entender a atividade, mas nao dou resposta final. Qual missao voce abriu?";
}

function buildLessonMaterialPortugueseReply() {
  return "Awnn, vamos usar o material da aula por partes. Me manda a palavra ou frase do material que eu explico simples.";
}

function buildTeacherActivityPortugueseReply() {
  return "Pss pss, teacher, escolha uma frase-alvo, uma instrucao simples e uma forma de resposta. Quer montar para listening, reading ou writing?";
}

type PersonalizeCattyReplyInput = {
  context?: CattyPageContext;
  history: CattyMessage[];
  intent: CattyIntent;
  language: CattyResponsePlan["language"];
  sessionContext?: CattySessionContext;
  text: string;
};

const nameFriendlyIntents: CattyIntent[] = [
  "candy_xp",
  "confusing_question",
  "correct_sentence",
  "homework_hint",
  "motivation",
  "practice_english",
  "teacher_activity_creation",
  "teacher_feedback",
];

function countReplyEmojis(text: string) {
  return text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
}

function getPersonalizationEmoji(intent: CattyIntent, reply: string) {
  if (countReplyEmojis(reply) >= 2) {
    return "";
  }

  const emojiByIntent: Partial<Record<CattyIntent, string>> = {
    candy_xp: "🎯",
    confusing_question: "🐾",
    correct_sentence: "😺",
    homework_hint: "🐾",
    motivation: "🚀",
    practice_english: "🚀",
    teacher_activity_creation: "😺",
    teacher_feedback: "😺",
  };

  return emojiByIntent[intent] ?? "✨";
}

function getSafeReplyFirstName(sessionContext?: CattySessionContext) {
  const firstName = sanitizeContextText(sessionContext?.firstName, 24);

  if (!firstName || firstName.includes("@")) {
    return "";
  }

  return firstName;
}

function hasSensitiveNameContext(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);
  const task = getTaskText(context);

  return (
    task.includes("apis-senhas") ||
    task.includes("contratos") ||
    task.includes("financeiro") ||
    hasAny(normalized, [
      "api key",
      "chave",
      "contrato",
      "credencial",
      "documento",
      "pagamento",
      "senha",
      "token",
    ])
  );
}

function hasRoleAddressedReply(
  reply: string,
  sessionContext?: CattySessionContext,
) {
  if (sessionContext?.role === "STUDENT") {
    return false;
  }

  return /\b(admin|teacher)\b/i.test(reply);
}

function shouldUseNameInReply(
  reply: string,
  input: PersonalizeCattyReplyInput,
) {
  const firstName = getSafeReplyFirstName(input.sessionContext);

  if (
    !firstName ||
    hasSensitiveNameContext(input.text, input.context) ||
    hasRoleAddressedReply(reply, input.sessionContext)
  ) {
    return false;
  }

  if (normalizeText(reply).includes(normalizeText(firstName))) {
    return false;
  }

  return (
    input.history.length <= 2 || nameFriendlyIntents.includes(input.intent)
  );
}

function removeRepeatedPersonalizationEmoji(reply: string, emoji: string) {
  if (!emoji) {
    return reply;
  }

  const firstIndex = reply.indexOf(emoji);

  if (firstIndex === -1) {
    return reply;
  }

  const repeatedIndex = reply.indexOf(emoji, firstIndex + emoji.length);

  if (repeatedIndex === -1) {
    return reply;
  }

  const before = reply.slice(0, repeatedIndex).trimEnd();
  const after = reply.slice(repeatedIndex + emoji.length).trimStart();
  const spacer = /[.!?]$/.test(before) ? " " : ". ";

  return `${before}${spacer}${after}`.replace(/\s{2,}/g, " ");
}

function personalizeCattyReply(
  reply: string,
  input: PersonalizeCattyReplyInput,
) {
  if (!shouldUseNameInReply(reply, input)) {
    return reply;
  }

  const firstName = getSafeReplyFirstName(input.sessionContext);
  const emoji = getPersonalizationEmoji(input.intent, reply);
  const nameChunk = emoji ? `${firstName} ${emoji}` : firstName;
  const openings = ["Miauw, ", "Awnn, ", "Uwau, ", "Pss pss, ", "Nya, "];

  for (const opening of openings) {
    if (reply.startsWith(opening)) {
      return removeRepeatedPersonalizationEmoji(
        `${opening}${nameChunk} ${reply.slice(opening.length)}`,
        emoji,
      );
    }
  }

  if (reply.startsWith("Bora estudar, aluno Candy")) {
    const rest = reply
      .replace(/^Bora estudar, aluno Candy(?:\s*🚀)?\.?\s*/u, "")
      .trim();

    return removeRepeatedPersonalizationEmoji(
      `Bora estudar, ${nameChunk}. ${rest}`,
      emoji,
    );
  }

  if (reply.startsWith("Bora estudar, Candy student")) {
    const rest = reply
      .replace(/^Bora estudar, Candy student(?:\s*🚀)?\.?\s*/u, "")
      .trim();

    return removeRepeatedPersonalizationEmoji(
      `Bora estudar, ${nameChunk}. ${rest}`,
      emoji,
    );
  }

  return removeRepeatedPersonalizationEmoji(
    `Miauw, ${nameChunk} ${reply}`,
    emoji,
  );
}

function buildSimpleEnglishContinuityReply(
  continuity: CattyConversationContinuityPlan,
) {
  const normalizedTopic = normalizeText(continuity.topic);
  const bilingualQuestion = formatBilingualQuestion(continuity.question);

  if (continuity.isFollowUp && continuity.suggestedSentence) {
    const sentence = formatFollowUpSentenceWithTranslation(
      continuity.suggestedSentence,
    );

    if (continuity.correction) {
      const reaction =
        continuity.shortAnswerKind === "yes_no" ? "Pss pss, small fix" : "Awnn";
      const correction = continuity.correction.trim().replace(/[.]+$/g, ".");

      return `${reaction} ${correction} ${bilingualQuestion}`;
    }

    if (continuity.shortAnswerKind === "fragment") {
      if (/\b(?:car|cars)\b/.test(normalizedTopic)) {
        return `Uwau, vruum vruum. ${sentence} ${bilingualQuestion}`;
      }

      return `Uwau, da para virar frase: ${sentence} ${bilingualQuestion}`;
    }

    if (continuity.shortAnswerKind === "reason") {
      return `Awnn, nice reason. ${sentence} ${bilingualQuestion}`;
    }

    return `Awnn, nice answer. ${sentence} ${bilingualQuestion}`;
  }

  if (continuity.isIncomplete) {
    return `Awnn, almost there 😺 ${bilingualQuestion}`;
  }

  if (continuity.isFragment && continuity.suggestedSentence) {
    if (/\b(?:car|cars)\b/.test(normalizedTopic)) {
      return `Uwau, da para virar frase: ${continuity.suggestedSentence} Vruum vruum 🚗 ${bilingualQuestion}`;
    }

    return `Miauw, vamos colocar em frase: ${continuity.suggestedSentence} ${bilingualQuestion}`;
  }

  if (
    continuity.pattern === "favorite" &&
    continuity.correction &&
    hasAny(normalizedTopic, ["capivara", "capybara"])
  ) {
    return `Miauw, capybara mode 🦫✨ Cute choice! ${formatBilingualQuestion(
      "Can you say: My favorite animal is a capybara?",
    )}`;
  }

  if (
    continuity.pattern === "like" &&
    /\b(?:car|cars)\b/.test(normalizedTopic)
  ) {
    return `Uwau, vruum vruum 🚗 You like cars! ${formatBilingualQuestion(
      "What color cars do you like?",
    )}`;
  }

  if (continuity.correction) {
    return `Awnn, tiny fix 😺 ${continuity.correction} ${bilingualQuestion}`;
  }

  if (continuity.pattern === "like") {
    return `Awnn, nice sentence 😺 ${bilingualQuestion}`;
  }

  if (continuity.pattern === "dislike") {
    return `Awnn, good sentence 😺 ${bilingualQuestion}`;
  }

  if (continuity.pattern === "favorite") {
    return `Miauw, cute choice ✨ ${bilingualQuestion}`;
  }

  if (continuity.pattern === "played" || continuity.pattern === "went") {
    return `Uwau, past sentence spotted 🎯 ${bilingualQuestion}`;
  }

  if (continuity.pattern === "today" || continuity.pattern === "yesterday") {
    return `Miauw, good time sentence ✨ ${bilingualQuestion}`;
  }

  return `Uwau, good sentence 😺 ${bilingualQuestion}`;
}

function buildGrammarCorrectionFallbackReply(
  correction: CattyGrammarCorrectionPlan,
  context?: CattyPageContext,
) {
  const normalizedRule = normalizeText(correction.rule);

  if (isHomeworkContext(context)) {
    return `Pss pss, se isso for homework, eu nao dou gabarito final 🐾 Mas a estrutura parecida e: Better: ${formatBilingualCorrectedSentence(
      correction.correctedSentence,
    )} English tip: ${correction.englishTip} Em portugues: ${correction.portugueseTip} Agora tente aplicar esse padrao no seu exercicio.`;
  }

  const reaction = normalizedRule.includes("years old")
    ? "Miauw, em ingles fica 😺"
    : normalizedRule.includes("went") || normalizedRule.includes("yesterday")
      ? "Pss pss, ajuste pequeno 🐾"
      : normalizedRule.includes("she/he") ||
          normalizedRule.includes("does") ||
          normalizedRule.includes("do ")
        ? "Uwau, small fix ✨"
        : normalizedRule.includes("favorite")
          ? "Awnn, quase perfeito ✨"
          : "Awnn, quase la 😺";

  return `${reaction} Better: ${formatBilingualCorrectedSentence(
    correction.correctedSentence,
  )} English tip: ${correction.englishTip} Em portugues: ${
    correction.portugueseTip
  } ${formatBilingualQuestion(correction.question)}`;
}

function buildPlannedEnglishReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
  history: CattyMessage[],
  sessionContext?: CattySessionContext,
  correction?: CattyGrammarCorrectionPlan,
  continuity?: CattyConversationContinuityPlan,
  questionPractice?: CattyQuestionPracticePlan,
) {
  const normalized = normalizeText(text);
  const contextLabel = getContextLabel(context);
  const correctionFragment = extractCorrectionFragment(text);
  const targetWord = extractTargetWord(text);
  const translationFragment = extractTranslationFragment(text);
  const continuityPlan =
    continuity ?? buildCattyConversationContinuityPlan(text, history);

  if (intent === "code_api_request") {
    return buildCodeApiEnglishReply();
  }

  if (intent === "out_of_scope") {
    return buildScopeRedirectEnglishReply(getCattyScopeTopic(text, context));
  }

  if (intent === "candy_xp") {
    return personalizeCattyReply(buildCandyXpEnglishReply(), {
      context,
      history,
      intent,
      language: "English",
      sessionContext,
      text,
    });
  }

  if (intent === "teacher_activity_creation") {
    return personalizeCattyReply(buildTeacherActivityEnglishReply(), {
      context,
      history,
      intent,
      language: "English",
      sessionContext,
      text,
    });
  }

  if (intent === "lesson_material") {
    return buildLessonMaterialEnglishReply();
  }

  if (
    correction &&
    (intent === "correct_sentence" || intent === "practice_english")
  ) {
    return personalizeCattyReply(
      buildGrammarCorrectionFallbackReply(correction, context),
      {
        context,
        history,
        intent: "correct_sentence",
        language: "English",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "practice_english" && questionPractice) {
    return personalizeCattyReply(
      buildQuestionPracticeFallbackReply(questionPractice),
      {
        context,
        history,
        intent,
        language: "English",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "practice_english" && continuityPlan) {
    return personalizeCattyReply(
      buildSimpleEnglishContinuityReply(continuityPlan),
      {
        context,
        history,
        intent,
        language: "English",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "ready_answer_request") {
    return personalizeCattyReply(
      "Nya, final answer is not allowed 😹 but a good clue is allowed: look at the verb first. Send the sentence and I will guide you.",
      {
        context,
        history,
        intent,
        language: "English",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "homework_hint") {
    if (
      hasAny(normalized, [
        "answer",
        "do it for me",
        "give me the answer",
        "the answer",
      ])
    ) {
      return personalizeCattyReply(
        "Nya, I will not give the final answer 😹 but I can help. Send the exercise and I will show a similar example.",
        {
          context,
          history,
          intent,
          language: "English",
          sessionContext,
          text,
        },
      );
    }

    return personalizeCattyReply(
      hasHomeworkPrompt(text)
        ? "Pss pss, Catty tip 🐾 I do not give the final answer, but I can show a similar example. Send the part that made you stuck."
        : "Awnn, I think the exercise is missing 🐾 Send me the question text, and I will give you a clue without the final answer.",
      {
        context,
        history,
        intent,
        language: "English",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "translate_sentence") {
    return translationFragment
      ? "Miauw, I can translate it, but if this is homework I will explain the idea instead of giving the final answer."
      : "Miauw, send me the exact sentence you want to translate. Tiny text first, then I help.";
  }

  if (intent === "correct_sentence") {
    if (!correctionFragment) {
      return personalizeCattyReply(
        "Miauw, send me the sentence you want to correct 😺 I will fix it and show where the error is.",
        {
          context,
          history,
          intent,
          language: "English",
          sessionContext,
          text,
        },
      );
    }

    if (hasAny(normalized, ["i has"])) {
      return "Awnn, almost there. Better: I have a book. English tip: with I, use have. Em portugues: com I, usamos have.";
    }

    if (hasAny(normalized, ["she go"])) {
      if (hasAny(normalized, ["yesterday"])) {
        return "Uwau, tiny fix. Better: She went to school yesterday. English tip: with yesterday, use the past form; go becomes went. Em portugues: com yesterday, usamos passado; go vira went.";
      }

      return "Uwau, tiny fix. Better: She goes to school. English tip: with she, add -s to the verb. Em portugues: com she, o verbo ganha -s.";
    }

    return getQuotedFragment(text)
      ? "Awnn, I can polish that. Send one short version or tell me the tense you want: present or past."
      : "Awnn, send the exact sentence you want me to correct, and I will give one better version with a tiny reason.";
  }

  if (intent === "teacher_message") {
    return "Pss pss, I can help you write a kind message. Try: Hi teacher, I have a question about the activity.";
  }

  if (intent === "explain_word") {
    if (targetWord.toLowerCase() === "playground") {
      return "Miauw, playground means parquinho: a place where children play. Example: The kids are in the playground.";
    }

    return targetWord
      ? `Miauw, "${targetWord}" is the word. Send the sentence where it appears, and I will explain the meaning in context.`
      : "Miauw, send me the exact word, and I will explain it with one simple example.";
  }

  if (intent === "motivation" || intent === "practice_english") {
    return personalizeCattyReply(
      "Bora estudar, Candy student 🚀 Say this out loud: I am getting better at English one step at a time.",
      {
        context,
        history,
        intent,
        language: "English",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "complex_question") {
    return "Pss pss, big question. Let's go by parts: first choose the sentence to fix or the word to understand.";
  }

  if (intent === "confusing_question") {
    if (isHomeworkContext(context)) {
      return personalizeCattyReply(
        "Awnn, I understood it is about the activity 🐾 Send me the exact bit from the exercise.",
        {
          context,
          history,
          intent,
          language: "English",
          sessionContext,
          text,
        },
      );
    }

    return personalizeCattyReply(
      hasRecentContext(history, text)
        ? "Awnn, tell me one thing 🐾 do you want a question, a correction, or a clue?"
        : "Awnn, tell me one thing 🐾 do you want a question, a correction, or a clue?",
      {
        context,
        history,
        intent,
        language: "English",
        sessionContext,
        text,
      },
    );
  }

  return `Nya, I am here with you on ${contextLabel}. Write one small English sentence and I will help you polish it.`;
}

function buildPlannedPortugueseReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
  history: CattyMessage[],
  sessionContext?: CattySessionContext,
  correction?: CattyGrammarCorrectionPlan,
  questionPractice?: CattyQuestionPracticePlan,
) {
  const normalized = normalizeText(text);
  const correctionFragment = extractCorrectionFragment(text);
  const targetWord = extractTargetWord(text);
  const translationFragment = extractTranslationFragment(text);

  if (intent === "code_api_request") {
    return buildCodeApiPortugueseReply();
  }

  if (intent === "out_of_scope") {
    return buildScopeRedirectPortugueseReply(getCattyScopeTopic(text, context));
  }

  if (intent === "candy_xp") {
    return personalizeCattyReply(buildCandyXpPortugueseReply(), {
      context,
      history,
      intent,
      language: "Portuguese",
      sessionContext,
      text,
    });
  }

  if (intent === "teacher_activity_creation") {
    return personalizeCattyReply(buildTeacherActivityPortugueseReply(), {
      context,
      history,
      intent,
      language: "Portuguese",
      sessionContext,
      text,
    });
  }

  if (intent === "lesson_material") {
    return buildLessonMaterialPortugueseReply();
  }

  if (hasAny(normalized, ["aula ao vivo", "meet", "jitsi"])) {
    return "Miauw, a aula ao vivo esta em manutencao por enquanto. Use Aulas, Homework ou Mensagens ate a equipe liberar a sala de video de novo.";
  }

  if (intent === "ready_answer_request") {
    return personalizeCattyReply(
      "Nya, resposta pronta nao rola 😹 mas pista boa rola: olha primeiro o verbo da frase.",
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "homework_hint") {
    if (
      hasAny(normalized, [
        "faz pra mim",
        "faz por mim",
        "faca pra mim",
        "me da a resposta",
        "resposta pronta",
      ])
    ) {
      return personalizeCattyReply(
        "Nya, eu nao faco por voce nem dou resposta pronta 😹 Mas me manda o exercicio e eu te mostro um exemplo parecido.",
        {
          context,
          history,
          intent,
          language: "Portuguese",
          sessionContext,
          text,
        },
      );
    }

    return personalizeCattyReply(
      hasHomeworkPrompt(text)
        ? "Pss pss, dica da Catty 🐾 eu nao dou a resposta pronta, mas posso te mostrar um exemplo parecido. Me manda a parte que travou."
        : "Awnn, acho que faltou o exercicio 🐾 Me manda o enunciado ou o texto da pergunta, que eu te dou uma pista boa.",
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "translate_sentence") {
    return translationFragment
      ? "Miauw, eu posso traduzir, mas se for homework eu explico a ideia sem entregar a resposta final."
      : "Miauw, me manda a frase exata que voce quer traduzir. Uma frase curtinha ja basta.";
  }

  if (
    correction &&
    (intent === "correct_sentence" || intent === "practice_english")
  ) {
    return personalizeCattyReply(
      buildGrammarCorrectionFallbackReply(correction, context),
      {
        context,
        history,
        intent: "correct_sentence",
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "practice_english" && questionPractice) {
    return personalizeCattyReply(
      buildQuestionPracticeFallbackReply(questionPractice),
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (hasAny(normalized, ["senha", "login", "entrar"])) {
    return "Awnn, se o acesso travar, peca para o admin redefinir sua senha. Eu fico aqui torcendo para voce voltar ao estudo.";
  }

  if (hasAny(normalized, ["contrato", "contratos"])) {
    return "Nya, contratos ficam em Meus contratos dentro do AVA. Se algo nao aparecer, avise a Candy para conferir com seguranca.";
  }

  if (hasAny(normalized, ["plano", "planos", "preco", "valor"])) {
    return "Miauw, para planos e valores, fale direto com a Candy. Eu fico aqui cuidando do seu animo de estudo.";
  }

  if (intent === "motivation") {
    return personalizeCattyReply(
      "Bora estudar, aluno Candy 🚀 Hoje vale meta pequena: leia uma frase em English, repita em voz alta e comemore.",
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "correct_sentence") {
    if (!correctionFragment) {
      return personalizeCattyReply(
        "Miauw, me manda a frase que voce quer corrigir 😺 Eu corrijo e mostro onde esta o erro.",
        {
          context,
          history,
          intent,
          language: "Portuguese",
          sessionContext,
          text,
        },
      );
    }

    if (hasAny(normalized, ["i has"])) {
      return "Awnn, quase la. A forma melhor e: I have a book. Com I, usamos have.";
    }

    if (hasAny(normalized, ["she go"])) {
      if (hasAny(normalized, ["yesterday"])) {
        return "Uwau, quase la. A forma melhor e: She went to school yesterday. Como tem yesterday, use went.";
      }

      return "Uwau, quase la. A forma melhor e: She goes to school. Com he, she ou it, o verbo ganha -s.";
    }

    return personalizeCattyReply(
      "Awnn, manda a frase exata que voce quer corrigir 😺 Eu devolvo uma versao melhor e um motivo bem simples.",
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "explain_word") {
    if (targetWord.toLowerCase() === "playground") {
      return "Miauw, playground quer dizer parquinho: um lugar onde criancas brincam. Exemplo: The kids are in the playground.";
    }

    return targetWord
      ? `Miauw, manda a frase onde "${targetWord}" aparece. Ai eu explico pelo contexto, sem complicar.`
      : "Miauw, qual palavra voce quer entender? Me manda so a palavra ou a frase onde ela aparece.";
  }

  if (intent === "teacher_message") {
    return "Nya, para falar com a teacher, use Mensagens no AVA. Escreva simples e direto; pedir ajuda ja e progresso.";
  }

  if (intent === "teacher_feedback") {
    return personalizeCattyReply(
      "Catty mode on, teacher 😺 manda o feedback bruto que eu deixo mais fofo, claro e com cara de Candy.",
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "complex_question") {
    return "Pss pss, tem bastante coisa ai. Vamos por partes: escolha primeiro a frase para corrigir ou a palavra para entender.";
  }

  if (intent === "confusing_question") {
    if (isHomeworkContext(context)) {
      return personalizeCattyReply(
        "Awnn, entendi que e sobre a atividade 🐾 Me manda o trecho exato do exercicio.",
        {
          context,
          history,
          intent,
          language: "Portuguese",
          sessionContext,
          text,
        },
      );
    }

    return personalizeCattyReply(
      hasRecentContext(history, text)
        ? "Awnn, me diz so uma coisa 🐾 voce quer uma pergunta, uma correcao ou uma dica?"
        : "Awnn, me diz so uma coisa 🐾 voce quer uma pergunta, uma correcao ou uma dica?",
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (intent === "practice_english") {
    return personalizeCattyReply(
      "Bora estudar, aluno Candy 🚀 Treino rapido: escreva uma frase com I like e eu corrijo com carinho.",
      {
        context,
        history,
        intent,
        language: "Portuguese",
        sessionContext,
        text,
      },
    );
  }

  if (context?.area === "teacher") {
    return "Pss pss, teacher, eu posso ajudar com instrucao clara, feedback fofo ou frase exemplo para aula. O que vamos montar?";
  }

  if (context?.area === "admin") {
    return "Miauw, no admin eu oriento caminhos do AVA, mas nao mexo em cadastro, senha ou dado sensivel. Qual tarefa voce esta organizando?";
  }

  if (context?.task === "aulas") {
    return "Miauw, vamos por partes. Nas aulas, posso explicar vocabulario e montar uma frase exemplo. Manda a palavra que ficou dificil.";
  }

  return "Bora estudar, aluno Candy. Uma frase por vez ja conta. Me pergunte sobre homework, aula ao vivo ou mande uma frase em English.";
}

function buildPlannedFallbackReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
  history: CattyMessage[],
  sessionContext?: CattySessionContext,
  correction?: CattyGrammarCorrectionPlan,
  continuity?: CattyConversationContinuityPlan,
  questionPractice?: CattyQuestionPracticePlan,
) {
  const shouldUseEnglishReply =
    isEnglishMessage(text) || Boolean(continuity) || Boolean(questionPractice);
  const plannedReply = shouldUseEnglishReply
    ? buildPlannedEnglishReply(
        text,
        context,
        intent,
        history,
        sessionContext,
        correction,
        continuity,
        questionPractice,
      )
    : buildPlannedPortugueseReply(
        text,
        context,
        intent,
        history,
        sessionContext,
        correction,
        questionPractice,
      );

  return (
    plannedReply ||
    (shouldUseEnglishReply
      ? buildEnglishReply(text, context)
      : buildPortugueseReply(text, context))
  );
}

export function buildCattyResponsePlan(
  text: string,
  context?: CattyPageContext,
  history: CattyMessage[] = [],
  sessionContext?: CattySessionContext,
): CattyResponsePlan {
  let { confidence, intent } = detectCattyIntent(text, context);
  const correction = buildCommonEnglishCorrectionPlan(text);
  const continuity = buildCattyConversationContinuityPlan(text, history);
  const questionPractice = buildCattyQuestionPracticePlan(text, history);

  if (
    (continuity?.isFragment || continuity?.isFollowUp) &&
    intent === "confusing_question"
  ) {
    confidence = "high";
    intent = "practice_english";
  }

  if (questionPractice) {
    confidence = "high";
    intent = "practice_english";
  }

  const language =
    isEnglishMessage(text) || continuity || questionPractice
      ? "English"
      : "Portuguese";

  return {
    confidence,
    correction,
    continuity,
    fallbackReply: buildPlannedFallbackReply(
      text,
      context,
      intent,
      history,
      sessionContext,
      correction,
      continuity,
      questionPractice,
    ),
    intent,
    instruction: intentInstructions[intent],
    label: intentLabels[intent],
    language,
    questionPractice,
  };
}

export function buildFallbackCattyReply(
  text: string,
  context?: CattyPageContext,
  history?: CattyMessage[],
  sessionContext?: CattySessionContext,
) {
  return buildCattyResponsePlan(text, context, history, sessionContext)
    .fallbackReply;
}

export function getCattyPreferredLanguage(text: string) {
  return isEnglishMessage(text) ? "English" : "Portuguese";
}

function limitCattyEmojis(text: string) {
  let allowedEmojiCount = 0;
  const maxAllowedEmojis = 2;

  return text
    .replace(/\p{Extended_Pictographic}/gu, (emoji) => {
      if (
        !CATTY_ALLOWED_EMOJIS.includes(
          emoji as (typeof CATTY_ALLOWED_EMOJIS)[number],
        )
      ) {
        return "";
      }

      allowedEmojiCount += 1;

      return allowedEmojiCount <= maxAllowedEmojis ? emoji : "";
    })
    .replace(/\ufe0f/g, "");
}

export function sanitizeCattyReply(text: string) {
  const clean = limitCattyEmojis(
    text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/[#*_`>]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

  if (clean.length <= 700) {
    return clean;
  }

  return `${clean.slice(0, 697).trim()}...`;
}

export function hasDisallowedCattyText(text: string) {
  const normalized = normalizeText(text);

  return disallowedCattyTerms.some((term) => normalized.includes(term));
}

export function shouldUseOpenAiForCatty(text: string) {
  return /\bcatty\b/.test(normalizeText(text));
}

function sanitizeHistoryText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 700);
}

function sanitizeContextText(text?: string | null, maxLength = 40) {
  return text?.replace(/\s+/g, " ").trim().slice(0, maxLength) || "";
}

function getSafeSessionContextLine(sessionContext?: CattySessionContext) {
  const role = sessionContext?.role ?? "desconhecida";
  const firstName = sanitizeContextText(sessionContext?.firstName, 24);
  const studentLevel = sanitizeContextText(sessionContext?.studentLevel, 40);
  const parts = [`role=${role}`];

  if (firstName) {
    parts.push(`primeiro nome=${firstName}`);
  }

  if (sessionContext?.role === "STUDENT" && studentLevel) {
    parts.push(`nivel do aluno=${studentLevel}`);
  }

  return parts.join("; ");
}

function getCattyLearningPromptLine(items: CattyLearningPromptItem[]) {
  if (items.length === 0) {
    return "Sem memoria aprovada relevante.";
  }

  return items
    .slice(0, 3)
    .map((item, index) => {
      const parts = [
        `${index + 1}. ${sanitizeContextText(item.title, 90)} (${item.category}${item.intent ? `, ${sanitizeContextText(item.intent, 40)}` : ""})`,
        item.userPrompt
          ? `pergunta: ${sanitizeContextText(item.userPrompt, 160)}`
          : null,
        item.badReply
          ? `evitar: ${sanitizeContextText(item.badReply, 160)}`
          : null,
        item.idealReply
          ? `resposta ideal: ${sanitizeContextText(item.idealReply, 220)}`
          : null,
        item.notes
          ? `observacao: ${sanitizeContextText(item.notes, 220)}`
          : null,
        item.tags.length > 0
          ? `tags: ${item.tags.map((tag) => sanitizeContextText(tag, 32)).join(", ")}`
          : null,
      ].filter(Boolean);

      return parts.join("; ");
    })
    .join("\n")
    .slice(0, 1800);
}

function getCattyUserMemoryPromptLine(items: CattyUserMemoryPromptItem[]) {
  if (items.length === 0) {
    return "Sem memoria pessoal ativa para este usuario.";
  }

  const limitedItems = items.slice(0, 5);
  const difficulties = limitedItems
    .filter((item) => item.category === "DIFFICULTY")
    .slice(0, 2)
    .map((item) => sanitizeContextText(item.value, 80));
  const interests = limitedItems
    .filter((item) => ["FAVORITE_THEME", "INTEREST"].includes(item.category))
    .slice(0, 2)
    .map((item) => sanitizeContextText(item.value, 80));
  const memoryLines = limitedItems.map((item, index) => {
    const parts = [
      `${index + 1}. ${item.category}/${sanitizeContextText(item.key, 48)}: ${sanitizeContextText(item.value, 120)}`,
      `confianca=${item.confidence}`,
      `origem=${item.source}`,
    ];

    return parts.join("; ");
  });

  return [
    "Uso: encaixe naturalmente; ignore se nao combinar com a pergunta; nao repita o mesmo gosto toda hora.",
    interests.length > 0
      ? `Interesses/temas favoritos relevantes: ${interests.join(", ")}.`
      : null,
    difficulties.length > 0
      ? `Dificuldades de aprendizado relevantes: ${difficulties.join(", ")}.`
      : null,
    "Memorias relevantes (max 5):",
    memoryLines.join("\n"),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1300);
}

export function buildCattyInput(
  message: string,
  history: CattyMessage[],
  context?: CattyPageContext,
  plan = buildCattyResponsePlan(message, context, history),
  sessionContext?: CattySessionContext,
  learningContext: CattyLearningPromptItem[] = [],
  userMemoryContext: CattyUserMemoryPromptItem[] = [],
  userArtifactContext: CattyArtifactCustomItem[] = [],
) {
  const safeHistory = history
    .slice(-8)
    .map((item) => ({
      from: item.from,
      text: sanitizeHistoryText(item.text),
    }))
    .filter((item) => item.text.length > 0);
  const lines = safeHistory.map((item) => {
    const speaker = item.from === "catty" ? "Catty" : "Aluno";

    return `${speaker}: ${item.text}`;
  });
  const artifactSelection = pickCattyArtifactForContext({
    customArtifacts: userArtifactContext,
    intent: plan.intent,
    memories: userMemoryContext,
    message,
  });
  const scenarioSelection = selectCattyScenariosForPrompt({
    context,
    history,
    intent: plan.intent,
    memories: userMemoryContext,
    message,
  });

  return [
    `Idioma esperado para a resposta: ${plan.language}.`,
    `Area atual: ${context?.area ?? "unknown"}.`,
    `Tarefa atual: ${context?.task ? sanitizeContextText(context.task, 80) : "sem tarefa especifica"}.`,
    `Contexto atual da tela: ${getContextLabel(context)}.`,
    `Contexto seguro do usuario: ${getSafeSessionContextLine(sessionContext)}.`,
    `Intencao detectada: ${plan.label} (${plan.confidence}).`,
    `Intencao tecnica: ${plan.intent}.`,
    `Plano da Catty: ${plan.instruction}`,
    "Regra de personalidade da Catty: gatinha mascote-professora da Candy English, resposta curta, fofa, didatica e com no maximo um bordao e ate dois emojis.",
    "Regra de uso do nome: se houver primeiro nome seguro, use de forma natural no comeco da conversa, motivacao, correcao, homework ou Candy XP, mas nao em toda resposta nem em assunto sensivel.",
    "Regra de roteamento interno: Gemini e o padrao; OpenAI so quando a mensagem chama Catty; se provedores falharem, usar fallback local; baloes automaticos nao chamam IA.",
    "Regra bilingue de pratica: quando o aluno escrever/praticar ingles ou quando voce fizer uma pergunta em ingles, mostre a traducao em portugues logo depois usando `English question = traducao curta`.",
    "Formato ideal: abertura curta da Catty, ajuda principal e uma pergunta pequena com traducao quando estiver em ingles.",
    "Regra de pergunta pedida: se o aluno pedir uma pergunta, faca a pergunta diretamente; use o tema pedido ou uma pergunta curta de pratica se nao houver tema; toda pergunta em ingles deve vir com `= portugues`.",
    "Regra de continuidade: quando a mensagem atual for uma frase curta em ingles, mantenha o mesmo assunto, elogie ou corrija de leve e faca uma pergunta curta relacionada com traducao em portugues.",
    "Regra de correcao conversacional: quando houver correcao local detectada, nao peca a frase de novo. Use: abertura curta, `Better: ...`, `English tip: ...`, `Em portugues: ...` e pergunta final em ingles com `= portugues`.",
    "Regra de correcao em homework: nao entregue gabarito final; use a correcao como estrutura parecida e convide o aluno a aplicar o padrao.",
    "Regra de homework: nunca entregue resposta final; de pista, exemplo parecido ou um passo de raciocinio.",
    "Regra de escopo: se o assunto fugir de ingles, Candy English ou AVA, transforme em vocabulario, frase curta ou pratica de conversacao.",
    "Regra de memoria aprovada: use no maximo 3 memorias do Catty Learning Center apenas como guia de estilo, exemplo ou vocabulario; nao trate como dado interno do aluno e nao invente informacoes.",
    "Regra de memoria pessoal: use somente memorias pessoais ACTIVE deste proprio usuario como tempero leve em exemplo, incentivo ou estilo; nao mencione que salvou memoria e nunca use dado sensivel.",
    "Regra de artefato de personalidade: quando houver tema sugerido, use no maximo um som, emoji ou mini-bordao do tema, apenas se encaixar naturalmente; configuracoes ativas do painel Catty Learning: gostos tem prioridade; se o aluno pedir para parar com um tema, ignore esse artefato.",
    "Regra de repertorio: use os cenarios selecionados como exemplo de tom, formato e regra pedagogica; nao copie se o contexto nao combinar.",
    "Regra para ADMIN/TEACHER: pode ajudar com instrucao, atividade, exemplo e feedback um pouco mais completo, mas sem textao, lista gigante ou prometer executar acoes.",
    "Use nome, role e nivel apenas para ajustar tom e exemplo. Nao invente dados do AVA.",
    "Se a mensagem estiver vaga ou confusa, peca uma informacao especifica em vez de inventar.",
    "Se a mensagem for grande, responda por partes e escolha apenas o proximo passo mais util.",
    "Memoria aprovada da Catty:",
    getCattyLearningPromptLine(learningContext),
    "Memoria pessoal segura do usuario:",
    getCattyUserMemoryPromptLine(userMemoryContext),
    "Continuidade conversacional:",
    formatCattyContinuityPromptContext(plan.continuity),
    "Correcao local detectada:",
    formatCattyCorrectionPromptContext(plan.correction),
    "Pergunta pedida pelo aluno:",
    formatCattyQuestionPracticePromptContext(plan.questionPractice),
    "Artefato de personalidade sugerido:",
    formatCattyArtifactPromptContext(artifactSelection, {
      history,
      intent: plan.intent,
      message,
    }),
    "Cenarios de repertorio da Catty:",
    formatCattyScenarioPromptContext(scenarioSelection),
    "Conversa recente:",
    lines.length > 0 ? lines.join("\n") : "Sem historico anterior.",
    `Mensagem atual do aluno: ${sanitizeHistoryText(message)}`,
  ].join("\n");
}
