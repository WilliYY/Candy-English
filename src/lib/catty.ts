import { CATTY_ALLOWED_EMOJIS } from "./catty-personality";

export {
  CATTY_ALLOWED_EMOJIS,
  CATTY_BRAIN_RULES,
  CATTY_PERSONALITY_GUIDE,
  CATTY_SCOPE_GUIDE,
  CATTY_SIGNATURE_EXPRESSIONS,
} from "./catty-personality";

export type CattyMessage = {
  from: "catty" | "user";
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

export type CattyResponsePlan = {
  confidence: "high" | "medium" | "low";
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
  "good",
  "grammar",
  "has",
  "have",
  "he",
  "hello",
  "help",
  "hi",
  "how",
  "is",
  "learn",
  "mean",
  "practice",
  "phrase",
  "say",
  "sentence",
  "she",
  "school",
  "should",
  "study",
  "they",
  "what",
  "went",
  "why",
  "word",
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
    tokens.length >= 4 &&
    tokens.length <= 14 &&
    hasAny(normalized, [
      "he go",
      "i has",
      "she go",
      "they is",
      "we is",
      "you is",
    ])
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
    return "Miauw, do you want to learn how to say that in English? We can start with: I make a salad with lettuce and tomatoes. Want to build your sentence?";
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
    return "Miauw, voce quer aprender a falar isso em ingles? Podemos comecar com: I make a salad with lettuce and tomatoes. Quer montar sua frase?";
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

function buildPlannedEnglishReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
  history: CattyMessage[],
) {
  const normalized = normalizeText(text);
  const contextLabel = getContextLabel(context);
  const correctionFragment = extractCorrectionFragment(text);
  const targetWord = extractTargetWord(text);
  const translationFragment = extractTranslationFragment(text);

  if (intent === "code_api_request") {
    return buildCodeApiEnglishReply();
  }

  if (intent === "out_of_scope") {
    return buildScopeRedirectEnglishReply(getCattyScopeTopic(text, context));
  }

  if (intent === "candy_xp") {
    return buildCandyXpEnglishReply();
  }

  if (intent === "teacher_activity_creation") {
    return buildTeacherActivityEnglishReply();
  }

  if (intent === "lesson_material") {
    return buildLessonMaterialEnglishReply();
  }

  if (intent === "ready_answer_request") {
    return "Nya, final answer is not allowed. Here is a clue: look at the verb first. Send the sentence and I will guide you.";
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
      return "Nya, I will not give the final answer, but I can help. Send the exercise and I will show a similar example.";
    }

    return hasHomeworkPrompt(text)
      ? "Pss pss, Catty tip: I do not give the final answer, but I can show a similar example. Send the part that made you stuck."
      : "Awnn, I think the exercise is missing. Send me the question text, and I will give you a clue without the final answer.";
  }

  if (intent === "translate_sentence") {
    return translationFragment
      ? "Miauw, I can translate it, but if this is homework I will explain the idea instead of giving the final answer."
      : "Miauw, send me the exact sentence you want to translate. Tiny text first, then I help.";
  }

  if (intent === "correct_sentence") {
    if (!correctionFragment) {
      return "Miauw, send me the sentence you want to correct. Then I will fix it and explain it super shortly.";
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
    return "Bora estudar, Candy student. Say this out loud: I am getting better at English one step at a time.";
  }

  if (intent === "complex_question") {
    return "Pss pss, big question. Let's go by parts: first choose the sentence to fix or the word to understand.";
  }

  if (intent === "confusing_question") {
    if (isHomeworkContext(context)) {
      return "Awnn, I understood it is about the activity. Send me the exact bit from the exercise.";
    }

    return hasRecentContext(history, text)
      ? "Awnn, I understood that one part got confusing. Send me the exact bit from the exercise."
      : "Awnn, tell me one thing: did you get stuck on the word, the sentence, or the exercise?";
  }

  return `Nya, I am here with you on ${contextLabel}. Write one small English sentence and I will help you polish it.`;
}

function buildPlannedPortugueseReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
  history: CattyMessage[],
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
    return buildCandyXpPortugueseReply();
  }

  if (intent === "teacher_activity_creation") {
    return buildTeacherActivityPortugueseReply();
  }

  if (intent === "lesson_material") {
    return buildLessonMaterialPortugueseReply();
  }

  if (hasAny(normalized, ["aula ao vivo", "meet", "jitsi"])) {
    return "Miauw, quando a teacher abrir a aula ao vivo, ela aparece no AVA. Entre por ali, permita camera e microfone, e pronto.";
  }

  if (intent === "ready_answer_request") {
    return "Nya, resposta pronta nao pode. Mas te dou uma pista boa: olha primeiro o verbo da frase.";
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
      return "Nya, eu nao faco por voce nem dou resposta pronta. Mas me manda o exercicio e eu te mostro um exemplo parecido.";
    }

    return hasHomeworkPrompt(text)
      ? "Pss pss, dica da Catty: eu nao dou a resposta pronta, mas posso te mostrar um exemplo parecido. Me manda a parte que travou."
      : "Awnn, acho que faltou o exercicio. Me manda o enunciado ou o texto da pergunta, que eu te dou uma pista boa.";
  }

  if (intent === "translate_sentence") {
    return translationFragment
      ? "Miauw, eu posso traduzir, mas se for homework eu explico a ideia sem entregar a resposta final."
      : "Miauw, me manda a frase exata que voce quer traduzir. Uma frase curtinha ja basta.";
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
    return "Bora estudar, aluno Candy. Hoje vale meta pequena: leia uma frase em English, repita em voz alta e comemore.";
  }

  if (intent === "correct_sentence") {
    if (!correctionFragment) {
      return "Miauw, me manda a frase que voce quer corrigir. Ai eu arrumo e explico bem curtinho.";
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

    return "Awnn, manda a frase exata que voce quer corrigir. Eu devolvo uma versao melhor e um motivo bem simples.";
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
    return "Pss pss, teacher, tenta assim: Voce se esforcou bem hoje. Agora revise uma frase com calma e tente de novo. Pequeno progresso conta.";
  }

  if (intent === "complex_question") {
    return "Pss pss, tem bastante coisa ai. Vamos por partes: escolha primeiro a frase para corrigir ou a palavra para entender.";
  }

  if (intent === "confusing_question") {
    if (isHomeworkContext(context)) {
      return "Awnn, entendi que e sobre a atividade. Me manda o trecho exato do exercicio.";
    }

    return hasRecentContext(history, text)
      ? "Awnn, entendi que uma parte ficou confusa. Me manda o trecho exato do exercicio."
      : "Awnn, me diz so uma coisa: voce travou na palavra, na frase ou no exercicio?";
  }

  if (intent === "practice_english") {
    return "Bora estudar, aluno Candy. Treino rapido: escreva uma frase com I like e eu corrijo com carinho.";
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
) {
  const plannedReply = isEnglishMessage(text)
    ? buildPlannedEnglishReply(text, context, intent, history)
    : buildPlannedPortugueseReply(text, context, intent, history);

  return (
    plannedReply ||
    (isEnglishMessage(text)
      ? buildEnglishReply(text, context)
      : buildPortugueseReply(text, context))
  );
}

export function buildCattyResponsePlan(
  text: string,
  context?: CattyPageContext,
  history: CattyMessage[] = [],
): CattyResponsePlan {
  const { confidence, intent } = detectCattyIntent(text, context);
  const language = isEnglishMessage(text) ? "English" : "Portuguese";

  return {
    confidence,
    fallbackReply: buildPlannedFallbackReply(text, context, intent, history),
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
) {
  return buildCattyResponsePlan(text, context, history).fallbackReply;
}

export function getCattyPreferredLanguage(text: string) {
  return isEnglishMessage(text) ? "English" : "Portuguese";
}

function limitCattyEmojis(text: string) {
  let allowedEmojiCount = 0;

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

      return allowedEmojiCount <= 1 ? emoji : "";
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

export function buildCattyInput(
  message: string,
  history: CattyMessage[],
  context?: CattyPageContext,
  plan = buildCattyResponsePlan(message, context, history),
  sessionContext?: CattySessionContext,
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

  return [
    `Idioma esperado para a resposta: ${plan.language}.`,
    `Area atual: ${context?.area ?? "unknown"}.`,
    `Tarefa atual: ${context?.task ? sanitizeContextText(context.task, 80) : "sem tarefa especifica"}.`,
    `Contexto atual da tela: ${getContextLabel(context)}.`,
    `Contexto seguro do usuario: ${getSafeSessionContextLine(sessionContext)}.`,
    `Intencao detectada: ${plan.label} (${plan.confidence}).`,
    `Intencao tecnica: ${plan.intent}.`,
    `Plano da Catty: ${plan.instruction}`,
    "Regra de personalidade da Catty: gatinha mascote-professora da Candy English, resposta curta, fofa, didatica e com no maximo um bordao ou emoji.",
    "Regra de roteamento interno: Gemini e o padrao; OpenAI so quando a mensagem chama Catty; se provedores falharem, usar fallback local; baloes automaticos nao chamam IA.",
    "Formato ideal: abertura curta da Catty, ajuda principal e uma pergunta pequena ou proximo passo.",
    "Regra de homework: nunca entregue resposta final; de pista, exemplo parecido ou um passo de raciocinio.",
    "Regra de escopo: se o assunto fugir de ingles, Candy English ou AVA, transforme em vocabulario, frase curta ou pratica de conversacao.",
    "Regra para ADMIN/TEACHER: pode ajudar com instrucao, atividade, exemplo e feedback um pouco mais completo, mas sem textao, lista gigante ou prometer executar acoes.",
    "Use nome, role e nivel apenas para ajustar tom e exemplo. Nao invente dados do AVA.",
    "Se a mensagem estiver vaga ou confusa, peca uma informacao especifica em vez de inventar.",
    "Se a mensagem for grande, responda por partes e escolha apenas o proximo passo mais util.",
    "Conversa recente:",
    lines.length > 0 ? lines.join("\n") : "Sem historico anterior.",
    `Mensagem atual do aluno: ${sanitizeHistoryText(message)}`,
  ].join("\n");
}
