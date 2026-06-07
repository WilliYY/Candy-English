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
  | "third_person_likes"
  | "today"
  | "want"
  | "went"
  | "yesterday";

export type CattyConversationContinuityPlan = {
  correction?: string;
  historyTopic?: string;
  isFragment?: boolean;
  isIncomplete: boolean;
  pattern: CattySimpleEnglishPattern;
  prompt: string;
  question: string;
  suggestedSentence?: string;
  topic: string;
};

export type CattyGrammarCorrectionPlan = {
  correctedSentence: string;
  explanation: string;
  homeworkExplanation: string;
  prompt: string;
  question: string;
  rule: string;
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
  const task = context.task ? taskLabels[context.task] ?? context.task : "";

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

  if (
    hasCodeApiRequest(text, context)
  ) {
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
    hasAny(normalized, [
      "como assim",
      "nao entendi",
      "nao sei",
      "o que faco",
    ])
  );
}

function hasTranslationSignal(text: string) {
  const normalized = normalizeText(text);

  return hasAny(normalized, [
    "traducao",
    "traduz",
    "translate",
    "translation",
  ]);
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

  const match = text.match(
    /(?:traduz(?:a|ir)?|translate(?:\s+this)?|translation)\s*:?\s+(.{3,160})/i,
  )?.[1]?.trim();

  if (!match) {
    return "";
  }

  const normalized = normalizeText(match);

  if (
    hasAny(normalized, ["a frase", "em ingles", "esta frase", "isso", "uma frase"]) &&
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

  return afterColon.length >= 2 && afterColon.length <= 120
    ? afterColon
    : "";
}

function extractCorrectionFragment(text: string) {
  const quoted = getQuotedFragment(text);

  if (quoted) {
    return quoted;
  }

  const match = text.match(
    /(?:corrige|corrigir|correct(?:\s+this\s+phrase)?|frase|phrase|sentence)\s*:?\s+(.{3,140})/i,
  )?.[1]?.trim();

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
    hasAny(normalized, ["meaning", "o que significa", "palavra", "significa", "word"]),
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

function cleanSimpleEnglishTopic(value: string) {
  return value
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/g, "")
    .trim()
    .slice(0, 80);
}

function isIncompleteSimpleEnglishTopic(value: string) {
  const normalized = normalizeText(value).replace(/[_\s.]+/g, " ").trim();

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

  if (!normalizedKind.includes("animal") || !needsFavoriteAnimalArticle(topic)) {
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
  const match = stripped.match(
    /(?:corrige|corrigir|correct(?:\s+this)?(?:\s+phrase|\s+sentence)?|melhora(?:r)?(?:\s+minha\s+frase)?|frase|phrase|sentence)\s*:?\s+(.{3,160})/i,
  )?.[1]?.trim();

  return match || stripped;
}

const countableArticleWords = new Set([
  "animal",
  "apple",
  "book",
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

function getArticleForWord(word: string) {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
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

function buildCorrectionPlan(input: {
  correctedSentence: string;
  explanation: string;
  question: string;
  rule: string;
}): CattyGrammarCorrectionPlan {
  return {
    correctedSentence: input.correctedSentence,
    explanation: input.explanation,
    homeworkExplanation: `Use essa estrutura parecida: ${input.correctedSentence} ${input.explanation}`,
    prompt: [
      `Erro comum detectado: ${input.rule}.`,
      `Frase corrigida: ${input.correctedSentence}`,
      `Explicacao simples: ${input.explanation}`,
      `Continuacao relacionada: ${input.question}`,
      "Responda no formato: reacao curta da Catty, Melhor: frase corrigida, explicacao simples e uma pergunta relacionada.",
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
        explanation: "Pergunta com she/he precisa de does.",
        question: `Can you ask another question about ${subject}?`,
        rule: "missing does in question",
      });
    }

    match = sentence.match(/^(i|you|we|they)\s+likes?\s+(.+)$/i);
    if (match) {
      const subject = formatEnglishSubject(match[1] ?? "you", "middle");
      const topic = cleanCorrectionSentence(match[2] ?? "");

      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(`Do ${subject} like ${topic}`, "?"),
        explanation: "Pergunta simples precisa de do no comeco.",
        question: "Can you ask one more question with do?",
        rule: "missing do in question",
      });
    }
  }

  match = sentence.match(/^i\s+likes\s+(.+)$/i);
  if (match) {
    const topic = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I like ${topic}`),
      explanation: "Com I, usamos like sem -s.",
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
      explanation: `Com ${subject.toLowerCase()}, o verbo ganha -s.`,
      question: `Does ${subject.toLowerCase()} like chocolate too?`,
      rule: "she/he like -> she/he likes",
    });
  }

  match = sentence.match(/^i\s+has\s+(.+)$/i);
  if (match) {
    const object = addArticleIfNeeded(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I have ${object}`),
      explanation: "Com I, usamos have.",
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
      explanation: `Com ${subject.toLowerCase()}, usamos has.`,
      question: `What else does ${subject.toLowerCase()} have?`,
      rule: "she/he have -> she/he has",
    });
  }

  match = sentence.match(/^i\s+am\s+like\s+(.+)$/i);
  if (match) {
    const topic = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I like ${topic}`),
      explanation: "Para falar do que voce gosta, usamos I like, sem am.",
      question: "What else do you like?",
      rule: "I am like -> I like",
    });
  }

  match = sentence.match(/^i\s+have\s+(\d{1,3})\s+years?\s+old$/i);
  if (match) {
    const age = match[1] ?? "";

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I am ${age} years old`),
      explanation: "Para idade, usamos I am.",
      question: "Can you say your age again?",
      rule: "I have years old -> I am years old",
    });
  }

  match = sentence.match(/^i\s+went\s+in\s+(.+?)(?:\s+yesterday)?$/i);
  if (match && hasAny(normalized, ["in school", "in the park", "in park"])) {
    const place = cleanCorrectionSentence(match[1] ?? "")
      .replace(/^the\s+/i, "the ")
      .replace(/^park$/i, "the park");
    const suffix = normalized.includes("yesterday") ? " yesterday" : "";

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I went to ${place}${suffix}`),
      explanation: "Usamos go/went to para destino.",
      question: "What did you do there?",
      rule: "went in -> went to",
    });
  }

  match = sentence.match(/^(i|she|he|we|they|you)\s+(go|play|study|watch|walk|visit|eat|see|do|have|make|read)\b\s*(.*?)\s+yesterday$/i);
  if (match) {
    const subject = match[1] ?? "I";
    const verb = normalizeText(match[2] ?? "");
    const rest = cleanCorrectionSentence(match[3] ?? "");
    const pastVerb = pastVerbMap[verb];

    if (pastVerb) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `${capitalizeFirstWord(subject)} ${pastVerb}${rest ? ` ${rest}` : ""} yesterday`,
        ),
        explanation: "Com yesterday, usamos o verbo no passado.",
        question: "What else did you do yesterday?",
        rule: "yesterday with present verb -> past verb",
      });
    }
  }

  match = sentence.match(/^yesterday\s+(i|she|he|we|they|you)\s+(go|play|study|watch|walk|visit|eat|see|do|have|make|read)\b\s*(.*)$/i);
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
        explanation: "Com yesterday, usamos o verbo no passado.",
        question: "Can you say one more thing in the past?",
        rule: "yesterday before present verb -> past verb",
      });
    }
  }

  match = sentence.match(/^i\s+like\s+([a-z]+)$/i);
  if (match) {
    const singular = normalizeText(match[1] ?? "");
    const plural = pluralPracticeWords[singular];

    if (plural) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(`I like ${plural}`),
        explanation: "Para falar da categoria em geral, usamos plural.",
        question: `What kind of ${plural} do you like?`,
        rule: "category noun after I like -> plural",
      });
    }
  }

  match = sentence.match(/^my\s+favorite\s+(animal|fruit)\s+is\s+([a-z]+(?:\s+[a-z]+)?)$/i);
  if (match && !startsWithArticle(match[2] ?? "")) {
    const kind = normalizeText(match[1] ?? "animal");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(
        `My favorite ${kind} is ${getArticleForWord(topic)} ${topic}`,
      ),
      explanation: `Antes de ${topic}, usamos ${getArticleForWord(topic)}.`,
      question:
        kind === "animal"
          ? "Can you make one more animal sentence?"
          : "Can you make one more fruit sentence?",
      rule: "missing a/an after favorite animal/fruit",
    });
  }

  match = sentence.match(/^(i\s+(?:have|want)|she\s+(?:has|wants)|he\s+(?:has|wants))\s+([a-z]+)$/i);
  if (match) {
    const start = match[1] ?? "I have";
    const object = normalizeText(match[2] ?? "");

    if (countableArticleWords.has(object) && !startsWithArticle(object)) {
      return buildCorrectionPlan({
        correctedSentence: formatCorrectionSentence(
          `${capitalizeFirstWord(start)} ${getArticleForWord(object)} ${object}`,
        ),
        explanation: `Antes de ${object}, usamos ${getArticleForWord(object)}.`,
        question: "Can you make one more sentence with a or an?",
        rule: "missing a/an before singular count noun",
      });
    }
  }

  match = sentence.match(/^what\s+(she|he)\s+likes?\??$/i);
  if (match) {
    const subject = normalizeText(match[1] ?? "she");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`What does ${subject} like`, "?"),
      explanation: "Em pergunta com she/he, usamos does e o verbo fica like.",
      question: `Can you ask one more question with does ${subject}?`,
      rule: "question order with she/he",
    });
  }

  match = sentence.match(/^what\s+(i|you|we|they)\s+like\??$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`What do ${subject} like`, "?"),
      explanation: "Em pergunta com I/you/we/they, usamos do.",
      question: "Can you ask one more question with do?",
      rule: "question order with do",
    });
  }

  match = sentence.match(/^does\s+(she|he)\s+likes\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`Does ${subject} like ${topic}`, "?"),
      explanation: "Depois de does, o verbo fica sem -s.",
      question: `What else does ${subject} like?`,
      rule: "does + verb without -s",
    });
  }

  match = sentence.match(/^do\s+(she|he)\s+like\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`Does ${subject} like ${topic}`, "?"),
      explanation: `Com ${subject}, a pergunta usa does.`,
      question: `Can you make another does question?`,
      rule: "do she/he -> does she/he",
    });
  }

  match = sentence.match(/^do\s+(i|you|we|they)\s+likes\s+(.+)$/i);
  if (match) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`Do ${subject} like ${topic}`, "?"),
      explanation: "Depois de do, o verbo fica sem -s.",
      question: "Can you make one more do question?",
      rule: "do + verb without -s",
    });
  }

  match = sentence.match(/^(you|i|we|they)\s+like\s+(.+)$/i);
  if (match && hasQuestionMark) {
    const subject = formatEnglishSubject(match[1] ?? "you", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`Do ${subject} like ${topic}`, "?"),
      explanation: "Pergunta simples precisa de do no comeco.",
      question: "Can you ask one more question with do?",
      rule: "missing do in question",
    });
  }

  match = sentence.match(/^(she|he)\s+likes?\s+(.+)$/i);
  if (match && hasQuestionMark) {
    const subject = formatEnglishSubject(match[1] ?? "she", "middle");
    const topic = cleanCorrectionSentence(match[2] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`Does ${subject} like ${topic}`, "?"),
      explanation: "Pergunta com she/he precisa de does.",
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
      explanation: `Com ${explanationSubject}, usamos was.`,
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
      explanation: `Com ${subject.toLowerCase()}, usamos were.`,
      question: "Can you make one more sentence with were?",
      rule: "we/they/you was -> were",
    });
  }

  match = sentence.match(/^i\s+(?:is|are)\s+(.+)$/i);
  if (match) {
    const rest = cleanCorrectionSentence(match[1] ?? "");

    return buildCorrectionPlan({
      correctedSentence: formatCorrectionSentence(`I am ${rest}`),
      explanation: "Com I, usamos am.",
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
      explanation: `Com ${subject.toLowerCase()}, usamos are.`,
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
      explanation: `Com ${subject.toLowerCase()}, usamos is.`,
      question: "Can you make one more sentence with is?",
      rule: "she/he/it are -> is",
    });
  }

  return undefined;
}

function getSimpleEnglishPracticeMatch(text: string):
  | {
      favoriteKind?: string;
      pattern: CattySimpleEnglishPattern;
      topic: string;
    }
  | null {
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
  const normalizedCurrent = normalizeText(stripCattyAddress(currentText)).trim();

  for (const message of [...history].reverse()) {
    if (message.from !== "user") {
      continue;
    }

    const normalizedMessage = normalizeText(stripCattyAddress(message.text)).trim();

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
  const normalizedCurrent = normalizeText(stripCattyAddress(currentText)).trim();

  for (const message of [...history].reverse()) {
    if (message.from !== "user") {
      continue;
    }

    const normalizedMessage = normalizeText(stripCattyAddress(message.text)).trim();

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

function buildFragmentContinuationQuestion(fragment: string, historyTopic: string) {
  const normalizedFragment = normalizeText(fragment);
  const normalizedHistoryTopic = normalizeText(historyTopic);

  if (
    /\b(?:car|cars)\b/.test(normalizedFragment) ||
    /\b(?:car|cars)\b/.test(normalizedHistoryTopic)
  ) {
    return "Can you make one more car sentence?";
  }

  return `Can you add one more sentence about ${historyTopic}?`;
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
    return undefined;
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
      ? getSimpleEnglishFavoriteCorrection(match.favoriteKind ?? "", match.topic)
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
    continuity.isFragment ? "Mensagem atual e fragmento de continuidade." : "",
    continuity.topic
      ? `Assunto principal: ${continuity.topic}.`
      : "Assunto principal incompleto.",
    continuity.historyTopic
      ? `Assunto recente no historico: ${continuity.historyTopic}.`
      : "",
    continuity.suggestedSentence
      ? `Frase completa sugerida: ${continuity.suggestedSentence}`
      : "",
    continuity.correction
      ? `Microcorrecao: ${continuity.correction}`
      : "",
    `Pergunta sugerida: ${continuity.question}`,
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
      return "Awnn, almost there. Better: I have a book. Use have with I.";
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
    return "Miauw, quando a teacher abrir a aula ao vivo, ela aparece no AVA. Entre por ali, permita camera e microfone, e pronto.";
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

  if (continuity.isIncomplete) {
    return `Awnn, almost there 😺 ${continuity.question}`;
  }

  if (continuity.isFragment && continuity.suggestedSentence) {
    return `Awnn, nice detail 😺 You can say: ${continuity.suggestedSentence} ${continuity.question}`;
  }

  if (
    continuity.pattern === "favorite" &&
    continuity.correction &&
    hasAny(normalizedTopic, ["capivara", "capybara"])
  ) {
    return "Miauw, capybara mode 🦫✨ Cute choice! Can you say: My favorite animal is a capybara?";
  }

  if (
    continuity.pattern === "like" &&
    /\b(?:car|cars)\b/.test(normalizedTopic)
  ) {
    return "Uwau, vruum vruum 🚗 You like cars! What color cars do you like?";
  }

  if (continuity.correction) {
    return `Awnn, tiny fix 😺 ${continuity.correction} ${continuity.question}`;
  }

  if (continuity.pattern === "like") {
    return `Awnn, nice sentence 😺 ${continuity.question}`;
  }

  if (continuity.pattern === "dislike") {
    return `Awnn, good sentence 😺 ${continuity.question}`;
  }

  if (continuity.pattern === "favorite") {
    return `Miauw, cute choice ✨ ${continuity.question}`;
  }

  if (continuity.pattern === "played" || continuity.pattern === "went") {
    return `Uwau, past sentence spotted 🎯 ${continuity.question}`;
  }

  if (continuity.pattern === "today" || continuity.pattern === "yesterday") {
    return `Miauw, good time sentence ✨ ${continuity.question}`;
  }

  return `Uwau, good sentence 😺 ${continuity.question}`;
}

function buildGrammarCorrectionFallbackReply(
  correction: CattyGrammarCorrectionPlan,
  context?: CattyPageContext,
) {
  const normalizedRule = normalizeText(correction.rule);

  if (isHomeworkContext(context)) {
    return `Pss pss, se isso for homework, eu nao dou gabarito final 🐾 Mas a estrutura parecida e: ${correction.correctedSentence} ${correction.explanation} Agora tente aplicar esse padrao no seu exercicio.`;
  }

  const reaction = normalizedRule.includes("years old")
    ? "Miauw, em ingles fica 😺"
    : normalizedRule.includes("went") ||
        normalizedRule.includes("yesterday")
      ? "Pss pss, ajuste pequeno 🐾"
      : normalizedRule.includes("she/he") ||
          normalizedRule.includes("does") ||
          normalizedRule.includes("do ")
        ? "Uwau, small fix ✨"
        : normalizedRule.includes("favorite")
          ? "Awnn, quase perfeito ✨"
          : "Awnn, quase la 😺";

  return `${reaction} Melhor: ${correction.correctedSentence} ${correction.explanation} ${correction.question}`;
}

function buildPlannedEnglishReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
  history: CattyMessage[],
  sessionContext?: CattySessionContext,
  correction?: CattyGrammarCorrectionPlan,
) {
  const normalized = normalizeText(text);
  const contextLabel = getContextLabel(context);
  const correctionFragment = extractCorrectionFragment(text);
  const targetWord = extractTargetWord(text);
  const translationFragment = extractTranslationFragment(text);
  const continuity = buildCattyConversationContinuityPlan(text, history);

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

  if (correction && (intent === "correct_sentence" || intent === "practice_english")) {
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

  if (intent === "practice_english" && continuity) {
    return personalizeCattyReply(buildSimpleEnglishContinuityReply(continuity), {
      context,
      history,
      intent,
      language: "English",
      sessionContext,
      text,
    });
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
        "Miauw, send me the sentence you want to correct 😺 Then I will fix it and explain it super shortly.",
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
      return "Awnn, almost there. Better: I have a book. Use have with I.";
    }

    if (hasAny(normalized, ["she go"])) {
      if (hasAny(normalized, ["yesterday"])) {
        return "Uwau, tiny fix: She went to school yesterday. With yesterday, use went.";
      }

      return "Uwau, tiny fix: She goes to school. With he, she or it, add -s to the verb.";
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
        ? "Awnn, I understood that one part got confusing 🐾 Send me the exact bit from the exercise."
        : "Awnn, tell me one thing 🐾 did you get stuck on the word, the sentence, or the exercise?",
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
    return "Miauw, quando a teacher abrir a aula ao vivo, ela aparece no AVA. Entre por ali, permita camera e microfone, e pronto.";
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

  if (correction && (intent === "correct_sentence" || intent === "practice_english")) {
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
        "Miauw, me manda a frase que voce quer corrigir 😺 A Catty arruma e explica rapidinho.",
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
        ? "Awnn, entendi que uma parte ficou confusa 🐾 Me manda o trecho exato do exercicio."
        : "Awnn, me diz so uma coisa 🐾 voce travou na palavra, na frase ou no exercicio?",
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
) {
  const shouldUseEnglishReply = isEnglishMessage(text) || Boolean(continuity);
  const plannedReply = shouldUseEnglishReply
    ? buildPlannedEnglishReply(
        text,
        context,
        intent,
        history,
        sessionContext,
        correction,
      )
    : buildPlannedPortugueseReply(
        text,
        context,
        intent,
        history,
        sessionContext,
        correction,
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

  if (continuity?.isFragment && intent === "confusing_question") {
    confidence = "high";
    intent = "practice_english";
  }

  const language = isEnglishMessage(text) || continuity ? "English" : "Portuguese";

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
    ),
    intent,
    instruction: intentInstructions[intent],
    label: intentLabels[intent],
    language,
  };
}

export function buildFallbackCattyReply(
  text: string,
  context?: CattyPageContext,
  history?: CattyMessage[],
  sessionContext?: CattySessionContext,
) {
  return buildCattyResponsePlan(
    text,
    context,
    history,
    sessionContext,
  ).fallbackReply;
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
        item.badReply ? `evitar: ${sanitizeContextText(item.badReply, 160)}` : null,
        item.idealReply
          ? `resposta ideal: ${sanitizeContextText(item.idealReply, 220)}`
          : null,
        item.notes ? `observacao: ${sanitizeContextText(item.notes, 220)}` : null,
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
    .filter((item) =>
      ["FAVORITE_THEME", "INTEREST"].includes(item.category),
    )
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
    "Formato ideal: abertura curta da Catty, ajuda principal e uma pergunta pequena ou proximo passo.",
    "Regra de continuidade: quando a mensagem atual for uma frase curta em ingles, mantenha o mesmo assunto, elogie ou corrija de leve e faca uma pergunta curta relacionada. Nao responda generico nem troque de tema.",
    "Regra de correcao conversacional: quando houver correcao local detectada, nao peca a frase de novo. Use: reacao curta, `Melhor: ...`, explicacao simples em uma frase e uma pergunta relacionada.",
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
