export type CattyMessage = {
  from: "catty" | "user";
  text: string;
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

function buildEnglishReply(text: string) {
  const normalized = normalizeText(text);

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

  return "I like that you wrote in English. Keep going. Try one more sentence and make it a tiny bit clearer.";
}

function buildPortugueseReply(text: string) {
  const normalized = normalizeText(text);

  if (hasAny(normalized, ["aula ao vivo", "meet", "jitsi"])) {
    return "Quando a teacher abrir a aula ao vivo, ela aparece no AVA. Entre por ali, permita camera e microfone, e pronto.";
  }

  if (hasAny(normalized, ["homework", "atividade", "dever"])) {
    return "Abra Responder homework, escolha a atividade e faca um pedacinho por vez. Sem pressa: consistencia ganha de correria.";
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

  if (hasAny(normalized, ["teacher", "prof", "mensagem", "falar"])) {
    return "Para falar com a teacher, use Mensagens no AVA. Escreva simples e direto; a parte dificil voce ja fez: pediu ajuda.";
  }

  return "Estou aqui para deixar o estudo mais leve. Me pergunte sobre homework, aula ao vivo ou mande uma frase em ingles para praticar.";
}

export function buildFallbackCattyReply(text: string) {
  return isEnglishMessage(text)
    ? buildEnglishReply(text)
    : buildPortugueseReply(text);
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

export function buildCattyInput(message: string, history: CattyMessage[]) {
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
    "Conversa recente:",
    lines.length > 0 ? lines.join("\n") : "Sem historico anterior.",
    `Mensagem atual do aluno: ${sanitizeHistoryText(message)}`,
  ].join("\n");
}
