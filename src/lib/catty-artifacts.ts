import type { CattyIntent } from "./catty";
import { normalizeCattyUserMemoryText } from "@/lib/validations/catty-user-memory";
import type {
  CattyUserMemoryCategoryInput,
  CattyUserMemorySourceInput,
} from "@/lib/validations/catty-user-memory";

export type CattyArtifactThemeId =
  | "capybara"
  | "cars"
  | "games"
  | "pokemon"
  | "princess"
  | "soccer";

export type CattyArtifactMemoryItem = {
  category: CattyUserMemoryCategoryInput;
  confidence: number;
  key: string;
  source?: CattyUserMemorySourceInput;
  updatedAt?: Date | null;
  usageCount?: number;
  value: string;
};

export type CattyArtifactDefinition = {
  catchphrases: string[];
  emojis: string[];
  example: string;
  genericHints: string[];
  id: CattyArtifactThemeId;
  keywords: string[];
  label: string;
  sounds: string[];
  toneRule: string;
};

export type CattyArtifactSelection = {
  artifact: CattyArtifactDefinition;
  reason: "current_message" | "memory";
  score: number;
};

export type CattyArtifactAvoidanceCandidate = {
  category: "STYLE";
  confidence: number;
  key: string;
  value: string;
};

const artifactFriendlyIntents = new Set<CattyIntent>([
  "candy_xp",
  "confusing_question",
  "correct_sentence",
  "explain_word",
  "motivation",
  "out_of_scope",
  "practice_english",
  "translate_sentence",
]);

const artifactBlockedIntents = new Set<CattyIntent>([
  "ava_help",
  "code_api_request",
  "homework_hint",
  "ready_answer_request",
  "teacher_activity_creation",
  "teacher_feedback",
  "teacher_message",
]);

export const CATTY_ARTIFACT_THEMES: CattyArtifactDefinition[] = [
  {
    catchphrases: [
      "modo turbo",
      "pit stop do English",
      "checkpoint de pista",
      "corrida de vocabulario",
    ],
    emojis: ["🏎", "🚗", "🏁"],
    example: "I drive a red car.",
    genericHints: [
      "pit stop do English",
      "modo turbo da frase",
      "vruum vruum, uma curva por vez",
    ],
    id: "cars",
    keywords: [
      "carro",
      "carros",
      "corrida",
      "formula 1",
      "f1",
      "moto",
      "velocidade",
      "vruum",
    ],
    label: "carros",
    sounds: ["vruum vruum", "vrum"],
    toneRule:
      "Use energia de pista, mas sem transformar toda resposta em corrida.",
  },
  {
    catchphrases: [
      "modo capivara calma",
      "passinho tranquilo",
      "energia de capivara focada",
      "calma de rio",
    ],
    emojis: ["🦫", "🐾", "✨"],
    example: "The capybara is drinking water.",
    genericHints: [
      "modo capivara calma",
      "passinho tranquilo",
      "energia de capivara focada",
    ],
    id: "capybara",
    keywords: [
      "capivara",
      "capivaras",
      "capybara",
      "animal fofo",
      "animais fofos",
      "bichinho",
    ],
    label: "capivara",
    sounds: ["nhac nhac"],
    toneRule:
      "Use calma e foco, como uma pausa tranquila antes da pratica.",
  },
  {
    catchphrases: [
      "XP de treinador",
      "evoluiu",
      "super effective",
      "missao de evolucao",
    ],
    emojis: ["⚡", "🎯", "✨"],
    example: "My monster is strong today.",
    genericHints: [
      "XP de treinador",
      "super effective no English",
      "evoluiu um pouquinho",
    ],
    id: "pokemon",
    keywords: [
      "pokemon",
      "pokémon",
      "pikachu",
      "treinador",
      "evoluir",
      "evolucao",
      "evolução",
      "super effective",
    ],
    label: "Pokemon",
    sounds: ["pika pika"],
    toneRule:
      "Use vibe de treino e evolucao sem fingir ser conteudo oficial de marca.",
  },
  {
    catchphrases: [
      "modo conto de fadas",
      "missao real",
      "coroa do vocabulario",
      "brilho de castelo",
    ],
    emojis: ["✨", "👑", "🍬"],
    example: "The princess is reading a book.",
    genericHints: [
      "missao real do English",
      "modo conto de fadas",
      "brilho de frase",
    ],
    id: "princess",
    keywords: [
      "princesa",
      "princesas",
      "disney",
      "conto de fadas",
      "castelo",
      "magia",
      "royal",
    ],
    label: "princesa/contos de fadas",
    sounds: ["plim plim"],
    toneRule:
      "Use brilho e fantasia generica, sem citar personagens protegidos como oficiais.",
  },
  {
    catchphrases: [
      "gol de vocabulario",
      "treino de frase",
      "partiu segundo tempo",
      "toque curto no English",
    ],
    emojis: ["⚽", "🎯", "🚀"],
    example: "I play soccer with my friends.",
    genericHints: [
      "treino de frase",
      "gol de vocabulario",
      "partiu segundo tempo do English",
    ],
    id: "soccer",
    keywords: [
      "futebol",
      "bola",
      "gol",
      "jogo",
      "time",
      "campeonato",
      "soccer",
    ],
    label: "futebol",
    sounds: ["goool"],
    toneRule:
      "Use energia de treino e jogo, sem alongar a resposta como narracao.",
  },
  {
    catchphrases: [
      "level up",
      "checkpoint",
      "boss da gramatica",
      "missao desbloqueada",
    ],
    emojis: ["🎮", "🎯", "🚀"],
    example: "I reached the next level.",
    genericHints: [
      "checkpoint do English",
      "level up da frase",
      "boss da gramatica",
    ],
    id: "games",
    keywords: [
      "game",
      "games",
      "jogo",
      "jogos",
      "minecraft",
      "roblox",
      "videogame",
      "level",
      "boss",
      "checkpoint",
    ],
    label: "games",
    sounds: ["pling"],
    toneRule:
      "Use linguagem de fase, XP e checkpoint, sem exagerar em gamer slang.",
  },
];

function compactText(text: string, maxLength: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeArtifactText(text: string) {
  return normalizeCattyUserMemoryText(text).replace(/[^a-z0-9 ]+/g, " ");
}

function themeMatchesText(theme: CattyArtifactDefinition, text: string) {
  const normalized = normalizeArtifactText(text);

  return theme.keywords.some((keyword) =>
    normalized.includes(normalizeArtifactText(keyword)),
  );
}

function getAvoidedThemeIds(memories: CattyArtifactMemoryItem[]) {
  const avoided = new Set<CattyArtifactThemeId>();

  for (const memory of memories) {
    if (memory.category !== "STYLE") {
      continue;
    }

    const normalized = normalizeArtifactText(`${memory.key} ${memory.value}`);

    for (const theme of CATTY_ARTIFACT_THEMES) {
      if (
        normalized.includes(`avoid_${theme.id}`) ||
        (normalized.includes("evitar") && themeMatchesText(theme, normalized))
      ) {
        avoided.add(theme.id);
      }
    }
  }

  return avoided;
}

function scoreArtifactFromMemory(input: {
  memory: CattyArtifactMemoryItem;
  message?: string;
  theme: CattyArtifactDefinition;
}) {
  const memoryText = `${input.memory.category} ${input.memory.key} ${input.memory.value}`;
  const matchesMemory = themeMatchesText(input.theme, memoryText);

  if (!matchesMemory) {
    return 0;
  }

  const messageHit = input.message
    ? themeMatchesText(input.theme, input.message)
    : false;

  return (
    6 +
    (messageHit ? 7 : 0) +
    Math.min(input.memory.confidence / 25, 4) +
    Math.min(input.memory.usageCount ?? 0, 6) * 0.2
  );
}

function shouldUseMemoryArtifact(input: {
  intent: CattyIntent;
  message?: string;
  themeId: CattyArtifactThemeId;
}) {
  if (!artifactFriendlyIntents.has(input.intent)) {
    return false;
  }

  const hash = stableHash(
    `${input.themeId}:${input.intent}:${normalizeArtifactText(input.message ?? "")}`,
  );

  return hash % 3 !== 0;
}

export function pickCattyArtifactForContext(input: {
  intent: CattyIntent;
  memories?: CattyArtifactMemoryItem[];
  message?: string;
}): CattyArtifactSelection | null {
  const memories = input.memories ?? [];
  const avoided = getAvoidedThemeIds(memories);
  const directTheme = CATTY_ARTIFACT_THEMES.find(
    (theme) => !avoided.has(theme.id) && themeMatchesText(theme, input.message ?? ""),
  );

  if (directTheme && !artifactBlockedIntents.has(input.intent)) {
    return {
      artifact: directTheme,
      reason: "current_message",
      score: 20,
    };
  }

  let best: CattyArtifactSelection | null = null;

  for (const theme of CATTY_ARTIFACT_THEMES) {
    if (avoided.has(theme.id)) {
      continue;
    }

    const score = memories.reduce(
      (total, memory) =>
        total +
        scoreArtifactFromMemory({
          memory,
          message: input.message,
          theme,
        }),
      0,
    );

    if (score <= 0) {
      continue;
    }

    if (!best || score > best.score) {
      best = {
        artifact: theme,
        reason: "memory",
        score,
      };
    }
  }

  if (
    !best ||
    !shouldUseMemoryArtifact({
      intent: input.intent,
      message: input.message,
      themeId: best.artifact.id,
    })
  ) {
    return null;
  }

  return best;
}

export function formatCattyArtifactPromptContext(
  selection: CattyArtifactSelection | null,
) {
  if (!selection) {
    return "Sem artefato de personalidade sugerido.";
  }

  const theme = selection.artifact;

  return [
    `Tema sugerido: ${theme.label} (${selection.reason}).`,
    `Emojis permitidos do tema: ${theme.emojis.join(" ")}.`,
    `Sons/onomatopeias: ${theme.sounds.join(", ")}.`,
    `Mini-bordoes: ${theme.catchphrases.join(", ")}.`,
    `Exemplo curto seguro: ${theme.example}.`,
    `Regra do tema: ${theme.toneRule}`,
    "Use no maximo um artefato e apenas se encaixar naturalmente; se for correcao seria, seja discreta.",
  ].join("\n");
}

function getFallbackHintForIntent(
  selection: CattyArtifactSelection | null,
  intent: CattyIntent,
) {
  if (!selection || artifactBlockedIntents.has(intent)) {
    return "";
  }

  const theme = selection.artifact;

  if (intent === "confusing_question") {
    return theme.genericHints[0] ?? "";
  }

  if (intent === "correct_sentence") {
    return theme.genericHints[1] ?? theme.genericHints[0] ?? "";
  }

  if (intent === "practice_english" || intent === "candy_xp") {
    return theme.genericHints[2] ?? theme.genericHints[0] ?? "";
  }

  if (intent === "out_of_scope") {
    return theme.genericHints[0] ?? "";
  }

  return "";
}

function replyAlreadyHasArtifact(reply: string, theme: CattyArtifactDefinition) {
  const normalizedReply = normalizeArtifactText(reply);

  return (
    theme.emojis.some((emoji) => reply.includes(emoji)) ||
    theme.catchphrases.some((phrase) =>
      normalizedReply.includes(normalizeArtifactText(phrase)),
    ) ||
    theme.genericHints.some((hint) =>
      normalizedReply.includes(normalizeArtifactText(hint)),
    )
  );
}

export function applyCattyArtifactToReply(input: {
  intent: CattyIntent;
  reply: string;
  selection: CattyArtifactSelection | null;
}) {
  const hint = getFallbackHintForIntent(input.selection, input.intent);
  const theme = input.selection?.artifact;

  if (!hint || !theme || replyAlreadyHasArtifact(input.reply, theme)) {
    return input.reply;
  }

  const emoji = theme.emojis[0] ?? "";
  const artifactChunk = emoji ? `${hint} ${emoji}` : hint;
  const openings = ["Miauw, ", "Awnn, ", "Uwau, ", "Pss pss, ", "Nya, "];

  for (const opening of openings) {
    if (input.reply.startsWith(opening)) {
      return compactText(
        `${opening}${artifactChunk}. ${input.reply.slice(opening.length)}`,
        700,
      );
    }
  }

  return compactText(`${artifactChunk}. ${input.reply}`, 700);
}

export function extractCattyArtifactAvoidanceCandidates(
  message: string,
): CattyArtifactAvoidanceCandidate[] {
  const normalized = normalizeArtifactText(message);
  const hasAvoidanceSignal =
    /\b(?:para|pare|parar|nao usa|nao usar|nao use|sem|chega)\b/.test(
      normalized,
    ) &&
    /\b(?:usar|falar|tema|exemplo|exemplos|emoji|meme|bordao)\b/.test(
      normalized,
    );

  if (!hasAvoidanceSignal) {
    return [];
  }

  return CATTY_ARTIFACT_THEMES.filter((theme) =>
    themeMatchesText(theme, normalized),
  )
    .map((theme) => ({
      category: "STYLE" as const,
      confidence: 92,
      key: `avoid_${theme.id}`,
      value: `evitar artefatos de ${theme.label}`,
    }))
    .slice(0, 2);
}
