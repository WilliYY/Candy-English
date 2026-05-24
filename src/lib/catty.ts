export type CattyMessage = {
  from: "catty" | "user";
  text: string;
};

export type CattyPageContext = {
  area?: "site" | "login" | "admin" | "teacher" | "student" | "unknown";
  task?: string;
};

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
  "do",
  "does",
  "english",
  "good",
  "grammar",
  "hello",
  "help",
  "hi",
  "how",
  "is",
  "learn",
  "mean",
  "practice",
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

function isEnglishMessage(text: string) {
  const normalized = normalizeText(text);
  const englishMatches = englishSignals.filter((term) =>
    normalized.includes(term),
  ).length;
  const portugueseMatches = portugueseSignals.filter((term) =>
    normalized.includes(term),
  ).length;
  const onlySimpleLatin = /^[a-z0-9\s?'".,!:-]+$/.test(normalized);

  return (
    englishMatches > 0 &&
    (englishMatches >= portugueseMatches || onlySimpleLatin)
  );
}

function buildEnglishReply(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);
  const contextLabel = getContextLabel(context);

  if (
    hasAny(normalized, ["homework", "answer", "answers"]) ||
    context?.task === "homeworks"
  ) {
    return "Tiny study rule: I can guide you, but I will not give the whole answer. Send one sentence from the homework and I will explain what it asks.";
  }

  if (
    hasAny(normalized, ["correct", "grammar", "sentence", "say"]) ||
    hasAny(normalized, ["phrase"])
  ) {
    return "Send one sentence. I will give you a cleaner version and one tiny reason, nice and simple.";
  }

  if (
    context?.task === "mensagens" ||
    hasAny(normalized, ["message", "teacher"])
  ) {
    return "I can help you write a kind message in English. Try: Hi teacher, I have a question about the activity.";
  }

  if (hasAny(normalized, ["how are you", "hello", "hi"])) {
    return "Hi, sweet learner. I am ready to study with you. Try this: I can learn a little English every day.";
  }

  if (hasAny(normalized, ["practice", "study", "learn", "english"])) {
    return "Yes. Let us practice gently. Say this out loud: I am getting better at English one step at a time.";
  }

  if (hasAny(normalized, ["what does", "mean", "word"])) {
    return "Send me the word and I will help with a simple meaning. Small words, big progress.";
  }

  if (hasAny(normalized, ["grammar", "sentence", "say"])) {
    return "Send one sentence and I will help make it clearer. You are already practicing, and that counts.";
  }

  return `I am here with you on ${contextLabel}. Write one small English sentence and I will help you polish it.`;
}

function buildPortugueseReply(text: string, context?: CattyPageContext) {
  const normalized = normalizeText(text);

  if (hasAny(normalized, ["aula ao vivo", "meet", "jitsi"])) {
    return "Quando a teacher abrir a aula ao vivo, ela aparece no AVA. Entre por ali, permita camera e microfone, e pronto.";
  }

  if (hasAny(normalized, ["homework", "atividade", "dever"])) {
    return "Eu te ajudo a entender o enunciado, mas sem entregar a resposta pronta. Manda uma frase da atividade e eu explico o que ela esta pedindo.";
  }

  if (hasAny(normalized, ["senha", "login", "entrar"])) {
    return "Se o acesso travar, peca para o admin redefinir sua senha. Depois volte com calma para continuar estudando.";
  }

  if (hasAny(normalized, ["contrato", "contratos"])) {
    return "Os contratos ficam em Meus contratos dentro do AVA. Se algo nao aparecer, avise a Candy para conferir seu cadastro.";
  }

  if (hasAny(normalized, ["plano", "planos", "preco", "valor"])) {
    return "Para planos e valores, o melhor caminho e falar direto com a Candy. Eu fico aqui cuidando do seu animo de estudo.";
  }

  if (hasAny(normalized, ["anima", "estudar", "ingles", "ringles", "cansad"])) {
    return "Combinado: hoje vale uma meta pequena. Leia uma frase em ingles, repita em voz alta e comemore. Pequeno tambem e progresso.";
  }

  if (hasAny(normalized, ["corrige", "corrigir", "frase", "gramatica"])) {
    return "Manda uma frase curtinha. Eu te devolvo uma versao melhor e uma explicacao simples, sem bronca e sem complicar.";
  }

  if (hasAny(normalized, ["teacher", "prof", "mensagem", "falar"])) {
    return "Para falar com a teacher, use Mensagens no AVA. Escreva simples e direto; a parte dificil voce ja fez: pediu ajuda.";
  }

  if (context?.area === "teacher") {
    return "Posso te ajudar a escrever instrucoes mais claras, feedback carinhoso ou uma frase exemplo para a aula. Me diga o que voce quer montar.";
  }

  if (context?.area === "admin") {
    return "No admin eu posso orientar caminhos da plataforma, mas nao mexo em cadastro, senha ou dados sensiveis. Me diga qual tarefa voce esta organizando.";
  }

  if (context?.task === "aulas") {
    return "Nas aulas, posso explicar vocabulario e montar uma frase exemplo. Manda a palavra que ficou dificil.";
  }

  return "Estou aqui para deixar o estudo mais leve. Me pergunte sobre homework, aula ao vivo ou mande uma frase em ingles para praticar.";
}

export function buildFallbackCattyReply(
  text: string,
  context?: CattyPageContext,
) {
  return isEnglishMessage(text)
    ? buildEnglishReply(text, context)
    : buildPortugueseReply(text, context);
}

export function getCattyPreferredLanguage(text: string) {
  return isEnglishMessage(text) ? "English" : "Portuguese";
}

export function sanitizeCattyReply(text: string) {
  const clean = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2600-\u27bf]/g, "")
    .replace(/[\ud800-\udbff][\udc00-\udfff]/g, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= 700) {
    return clean;
  }

  return `${clean.slice(0, 697).trim()}...`;
}

export function hasDisallowedCattyText(text: string) {
  const normalized = normalizeText(text);

  return disallowedCattyTerms.some((term) => normalized.includes(term));
}

function sanitizeHistoryText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 700);
}

export function buildCattyInput(
  message: string,
  history: CattyMessage[],
  context?: CattyPageContext,
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
    `Idioma esperado para a resposta: ${getCattyPreferredLanguage(message)}.`,
    `Contexto atual da tela: ${getContextLabel(context)}.`,
    "Conversa recente:",
    lines.length > 0 ? lines.join("\n") : "Sem historico anterior.",
    `Mensagem atual do aluno: ${sanitizeHistoryText(message)}`,
  ].join("\n");
}
