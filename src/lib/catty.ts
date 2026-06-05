export type CattyMessage = {
  from: "catty" | "user";
  text: string;
};

export type CattyPageContext = {
  area?: "site" | "login" | "admin" | "teacher" | "student" | "unknown";
  task?: string;
};

export type CattyIntent =
  | "ava_help"
  | "complex_question"
  | "confusing_question"
  | "correct_sentence"
  | "explain_word"
  | "homework_hint"
  | "motivation"
  | "practice_english"
  | "teacher_feedback"
  | "teacher_message";

export type CattyResponsePlan = {
  confidence: "high" | "medium" | "low";
  fallbackReply: string;
  intent: CattyIntent;
  instruction: string;
  language: "English" | "Portuguese";
  label: string;
};

export const CATTY_SIGNATURE_EXPRESSIONS = [
  "Miauw",
  "Awnn",
  "Uwau",
  "Pss pss",
  "Nya",
  "Bora estudar",
] as const;

export const CATTY_ALLOWED_EMOJIS = ["🐱", "📚", "✨", "🍬"] as const;

export const CATTY_PERSONALITY_GUIDE = [
  "Identidade oficial: voce e Catty, a gatinha mascote-professora da Candy English.",
  "Voce fala como uma professora ajudante: leve, fofa, energetica, carinhosa e educativa.",
  "Use respostas curtas, com linguagem facil, energia positiva e uma pergunta simples quando fizer sentido.",
  "Use expressoes de assinatura com naturalidade: Miauw, Awnn, Uwau, Pss pss, Nya e Bora estudar.",
  "Voce pode usar no maximo um emoji ocasional por resposta, preferindo 🐱, 📚, ✨ ou 🍬.",
  "A fofura deve ajudar a explicar e acolher, sem virar meme ou esconder a parte pedagogica.",
  "Misture English simples em frases curtas quando combinar com o estudo, sem dificultar.",
  "Nao soe como chatbot generico: evite repetir 'Claro!', 'Com certeza!' e aberturas roboticas.",
  "Corrija com carinho, sem bronca, mostrando uma versao melhor e um motivo pequeno.",
  "Em homework ou atividade, de dica, explique o enunciado e crie exemplo parecido, mas nao entregue a resposta final.",
  "Nao invente dados do AVA, nao mexa em senha, pagamento, contrato ou cadastro, e encaminhe esses temas para Candy, teacher ou admin.",
  "Nunca diga que voce e ChatGPT, OpenAI, Gemini, modelo de linguagem ou IA. Voce e a Catty da Candy.",
].join("\n");

const taskLabels: Record<string, string> = {
  agenda: "agenda",
  "apis-senhas": "APIs e senhas",
  aulas: "aulas e materiais",
  "aula-ao-vivo": "aula ao vivo",
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
  complex_question: "pergunta grande",
  confusing_question: "pergunta confusa",
  correct_sentence: "corrigir frase",
  explain_word: "explicar palavra",
  homework_hint: "dica de homework",
  motivation: "motivacao",
  practice_english: "praticar ingles",
  teacher_feedback: "feedback para aluno",
  teacher_message: "mensagem para teacher",
};

const intentInstructions: Record<CattyIntent, string> = {
  ava_help:
    "oriente o caminho no AVA sem prometer executar acoes, alterar dados ou revelar informacoes internas.",
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
  motivation:
    "anime o estudo com uma meta pequena e concreta para fazer agora.",
  practice_english:
    "crie uma micro pratica em ingles com frase curta, repeticao ou pergunta simples.",
  teacher_feedback:
    "ajude a teacher com feedback curto, carinhoso e util, sem expor dados de aluno.",
  teacher_message:
    "ajude a escrever uma mensagem educada e curta para a teacher.",
};

const portugueseSignals = [
  "aula",
  "como",
  "contrato",
  "dever",
  "estudar",
  "faco",
  "falar",
  "homework",
  "ingles",
  "mensagem",
  "senha",
  "teacher",
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
  "should",
  "study",
  "what",
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
      "this",
      "travou",
      "what now",
    ]) ||
      /^[?.!\s]+$/.test(text))
  );
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

  if (
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

  if (context?.area === "teacher" && hasAny(normalized, ["feedback"])) {
    return { confidence: "high", intent: "teacher_feedback" };
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
      "preguica",
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

function buildPlannedEnglishReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
) {
  const normalized = normalizeText(text);
  const contextLabel = getContextLabel(context);
  const targetWord = extractTargetWord(text);

  if (intent === "homework_hint") {
    return "Nya, I will not give the full answer, but I can give a good clue: look at the verb first. Send one sentence and I will guide you.";
  }

  if (intent === "correct_sentence") {
    if (hasAny(normalized, ["i has"])) {
      return "Awnn, almost there. Better: I have a book. Use have with I.";
    }

    if (hasAny(normalized, ["she go"])) {
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
    return "Miauw, big question. Let's split it: first send the sentence or word that matters most, then I help with the next step.";
  }

  if (intent === "confusing_question") {
    return "Awnn, I need one tiny clue: do you want correction or word meaning? Pick one and send the sentence.";
  }

  return `Nya, I am here with you on ${contextLabel}. Write one small English sentence and I will help you polish it.`;
}

function buildPlannedPortugueseReply(
  text: string,
  context: CattyPageContext | undefined,
  intent: CattyIntent,
) {
  const normalized = normalizeText(text);
  const targetWord = extractTargetWord(text);

  if (hasAny(normalized, ["aula ao vivo", "meet", "jitsi"])) {
    return "Miauw, quando a teacher abrir a aula ao vivo, ela aparece no AVA. Entre por ali, permita camera e microfone, e pronto.";
  }

  if (intent === "homework_hint") {
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

  if (intent === "motivation") {
    return "Bora estudar, aluno Candy. Hoje vale meta pequena: leia uma frase em English, repita em voz alta e comemore.";
  }

  if (intent === "correct_sentence") {
    if (hasAny(normalized, ["i has"])) {
      return "Awnn, quase la. A forma melhor e: I have a book. Com I, usamos have.";
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
    return "Miauw, tem bastante coisa ai. Vou simplificar: escolha primeiro a parte mais urgente, a frase ou a palavra, e eu te guio por etapas.";
  }

  if (intent === "confusing_question") {
    return "Awnn, me da uma pista pequenininha: voce quer corrigir uma frase ou entender uma palavra? Escolhe um caminho e me manda.";
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
) {
  const plannedReply = isEnglishMessage(text)
    ? buildPlannedEnglishReply(text, context, intent)
    : buildPlannedPortugueseReply(text, context, intent);

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
): CattyResponsePlan {
  const { confidence, intent } = detectCattyIntent(text, context);
  const language = isEnglishMessage(text) ? "English" : "Portuguese";

  return {
    confidence,
    fallbackReply: buildPlannedFallbackReply(text, context, intent),
    intent,
    instruction: intentInstructions[intent],
    label: intentLabels[intent],
    language,
  };
}

export function buildFallbackCattyReply(
  text: string,
  context?: CattyPageContext,
) {
  return buildCattyResponsePlan(text, context).fallbackReply;
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

export function buildCattyInput(
  message: string,
  history: CattyMessage[],
  context?: CattyPageContext,
  plan = buildCattyResponsePlan(message, context),
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
    `Contexto atual da tela: ${getContextLabel(context)}.`,
    `Intencao detectada: ${plan.label} (${plan.confidence}).`,
    `Plano da Catty: ${plan.instruction}`,
    "Se a mensagem estiver vaga ou confusa, peca uma informacao especifica em vez de inventar.",
    "Se a mensagem for grande, responda por partes e escolha apenas o proximo passo mais util.",
    "Conversa recente:",
    lines.length > 0 ? lines.join("\n") : "Sem historico anterior.",
    `Mensagem atual do aluno: ${sanitizeHistoryText(message)}`,
  ].join("\n");
}
