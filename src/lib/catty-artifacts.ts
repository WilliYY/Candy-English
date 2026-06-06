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
  | "soccer"
  | (string & {});

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
  customArtifactId?: string;
  emojis: string[];
  example: string;
  genericHints: string[];
  id: CattyArtifactThemeId;
  isPrimary?: boolean;
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

type CattyArtifactHistoryItem = {
  from?: "catty" | "user";
  text: string;
};

type CattyArtifactReplyVariant = {
  emoji?: string;
  kind: "catchphrase" | "example" | "sound";
  text: string;
};

export type CattyArtifactAvoidanceCandidate = {
  category: "STYLE";
  confidence: number;
  key: string;
  value: string;
};

export type CattyArtifactCustomItem = {
  catchphrases: string[];
  emojis: string[];
  example?: string | null;
  id: string;
  isPrimary?: boolean;
  label: string;
  sounds: string[];
  themeId: string;
  toneRule?: string | null;
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

function getCustomArtifactKeywords(artifact: CattyArtifactCustomItem) {
  return [
    artifact.themeId,
    artifact.label,
    ...artifact.catchphrases,
    ...artifact.sounds,
    artifact.example ?? "",
    artifact.toneRule ?? "",
  ]
    .flatMap((item) => normalizeArtifactText(item).split(/\s+/))
    .filter((item) => item.length >= 3);
}

function mergeCustomArtifactWithTheme(
  base: CattyArtifactDefinition,
  custom: CattyArtifactCustomItem,
): CattyArtifactDefinition {
  const catchphrases =
    custom.catchphrases.length > 0 ? custom.catchphrases : base.catchphrases;
  const sounds = custom.sounds.length > 0 ? custom.sounds : base.sounds;

  return {
    ...base,
    catchphrases,
    customArtifactId: custom.id,
    emojis: custom.emojis.length > 0 ? custom.emojis : base.emojis,
    example: custom.example || base.example,
    genericHints: catchphrases.length > 0 ? catchphrases : base.genericHints,
    isPrimary: custom.isPrimary,
    keywords: [...new Set([...base.keywords, ...getCustomArtifactKeywords(custom)])],
    label: custom.label || base.label,
    sounds,
    toneRule: custom.toneRule || base.toneRule,
  };
}

function customArtifactToDefinition(
  custom: CattyArtifactCustomItem,
): CattyArtifactDefinition {
  const catchphrases = custom.catchphrases.length > 0 ? custom.catchphrases : [
    custom.label,
  ];
  const sounds = custom.sounds;

  return {
    catchphrases,
    customArtifactId: custom.id,
    emojis: custom.emojis,
    example: custom.example || `I like ${custom.label}.`,
    genericHints: catchphrases,
    id: custom.themeId,
    isPrimary: custom.isPrimary,
    keywords: [...new Set(getCustomArtifactKeywords(custom))],
    label: custom.label,
    sounds,
    toneRule:
      custom.toneRule ||
      "Use como tempero leve de personalidade, sem forcar em toda resposta.",
  };
}

function getAvailableArtifactThemes(
  customArtifacts?: CattyArtifactCustomItem[],
) {
  if (!customArtifacts || customArtifacts.length === 0) {
    return CATTY_ARTIFACT_THEMES;
  }

  const customByThemeId = new Map(
    customArtifacts.map((artifact) => [artifact.themeId, artifact]),
  );
  const builtInIds = new Set(CATTY_ARTIFACT_THEMES.map((theme) => theme.id));
  const mergedBuiltIns = CATTY_ARTIFACT_THEMES.map((theme) => {
    const custom = customByThemeId.get(theme.id);

    return custom ? mergeCustomArtifactWithTheme(theme, custom) : theme;
  });
  const customOnly = customArtifacts
    .filter((artifact) => !builtInIds.has(artifact.themeId))
    .map(customArtifactToDefinition);

  return [...customOnly, ...mergedBuiltIns];
}

function getAvoidedThemeIds(
  memories: CattyArtifactMemoryItem[],
  themes: CattyArtifactDefinition[],
) {
  const avoided = new Set<CattyArtifactThemeId>();

  for (const memory of memories) {
    if (memory.category !== "STYLE") {
      continue;
    }

    const normalized = normalizeArtifactText(`${memory.key} ${memory.value}`);

    for (const theme of themes) {
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
    (input.theme.isPrimary ? 3 : 0) +
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

function getRecentCattyArtifactTexts(history?: CattyArtifactHistoryItem[]) {
  return (history ?? [])
    .filter((item) => item.from !== "user")
    .slice(-4)
    .map((item) => normalizeArtifactText(item.text))
    .filter(Boolean);
}

function getRecentCattyArtifactRawTexts(history?: CattyArtifactHistoryItem[]) {
  return (history ?? [])
    .filter((item) => item.from !== "user")
    .slice(-4)
    .map((item) => item.text)
    .filter(Boolean);
}

function getBaseHintForIntent(
  theme: CattyArtifactDefinition,
  intent: CattyIntent,
) {
  if (intent === "confusing_question") {
    return theme.genericHints[0] ?? theme.catchphrases[0] ?? "";
  }

  if (intent === "correct_sentence") {
    return theme.genericHints[1] ?? theme.genericHints[0] ?? "";
  }

  if (
    intent === "candy_xp" ||
    intent === "motivation" ||
    intent === "practice_english"
  ) {
    return theme.genericHints[2] ?? theme.genericHints[0] ?? "";
  }

  if (intent === "out_of_scope") {
    return theme.genericHints[0] ?? "";
  }

  return theme.genericHints[0] ?? "";
}

function shouldKeepArtifactSubtle(input: {
  intent: CattyIntent;
  message?: string;
}) {
  const normalized = normalizeArtifactText(input.message ?? "");

  return (
    input.intent === "correct_sentence" ||
    input.intent === "explain_word" ||
    normalized.includes("serio") ||
    normalized.includes("frustr") ||
    normalized.includes("dificil") ||
    normalized.includes("nao entendi")
  );
}

function getArtifactVariantCandidates(input: {
  intent: CattyIntent;
  message?: string;
  selection: CattyArtifactSelection;
}) {
  const theme = input.selection.artifact;
  const baseHint = getBaseHintForIntent(theme, input.intent);
  const subtle = shouldKeepArtifactSubtle({
    intent: input.intent,
    message: input.message,
  });
  const variants: CattyArtifactReplyVariant[] = [];

  if (baseHint) {
    variants.push({
      emoji: theme.emojis[0],
      kind: "catchphrase",
      text: baseHint,
    });
  }

  if (!subtle && theme.sounds[0] && baseHint) {
    variants.push({
      emoji: theme.emojis[1] ?? theme.emojis[0],
      kind: "sound",
      text: `${theme.sounds[0]}, ${baseHint}`,
    });
  }

  const alternateCatchphrase =
    theme.catchphrases.find((phrase) => phrase !== baseHint) ??
    theme.catchphrases[0];

  if (alternateCatchphrase && alternateCatchphrase !== baseHint) {
    variants.push({
      emoji: theme.emojis[1] ?? theme.emojis[0],
      kind: "catchphrase",
      text: alternateCatchphrase,
    });
  }

  if (!subtle && theme.example) {
    variants.push({
      emoji: theme.emojis[2] ?? theme.emojis[0],
      kind: "example",
      text: `exemplo do tema: ${theme.example}`,
    });
  }

  return variants;
}

function variantAppearsInRecent(
  variant: CattyArtifactReplyVariant,
  recentRawTexts: string[],
  recentTexts: string[],
) {
  const normalizedVariant = normalizeArtifactText(variant.text);

  return recentTexts.some(
    (text) => normalizedVariant && text.includes(normalizedVariant),
  ) || Boolean(
    variant.emoji && recentRawTexts.some((text) => text.includes(variant.emoji ?? "")),
  );
}

export function pickCattyArtifactReplyVariant(input: {
  history?: CattyArtifactHistoryItem[];
  intent: CattyIntent;
  message?: string;
  selection: CattyArtifactSelection | null;
}) {
  if (!input.selection || artifactBlockedIntents.has(input.intent)) {
    return null;
  }

  const variants = getArtifactVariantCandidates({
    intent: input.intent,
    message: input.message,
    selection: input.selection,
  });

  if (variants.length === 0) {
    return null;
  }

  const recentTexts = getRecentCattyArtifactTexts(input.history);
  const recentRawTexts = getRecentCattyArtifactRawTexts(input.history);
  const freshVariants = variants.filter(
    (variant) => !variantAppearsInRecent(variant, recentRawTexts, recentTexts),
  );
  const pool = freshVariants.length > 0 ? freshVariants : variants;
  const index =
    stableHash(
      `${input.selection.artifact.id}:${input.intent}:${normalizeArtifactText(
        input.message ?? "",
      )}:${recentTexts.join("|")}`,
    ) % pool.length;

  return pool[index];
}

export function pickCattyArtifactForContext(input: {
  customArtifacts?: CattyArtifactCustomItem[];
  intent: CattyIntent;
  memories?: CattyArtifactMemoryItem[];
  message?: string;
}): CattyArtifactSelection | null {
  const memories = input.memories ?? [];
  const themes = getAvailableArtifactThemes(input.customArtifacts);
  const avoided = getAvoidedThemeIds(memories, themes);
  const directTheme = themes.find(
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

  for (const theme of themes) {
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
  options?: {
    history?: CattyArtifactHistoryItem[];
    intent?: CattyIntent;
    message?: string;
  },
) {
  if (!selection) {
    return "Sem artefato de personalidade sugerido.";
  }

  const theme = selection.artifact;
  const variant =
    options?.intent
      ? pickCattyArtifactReplyVariant({
          history: options.history,
          intent: options.intent,
          message: options.message,
          selection,
        })
      : null;
  const recentTexts = getRecentCattyArtifactTexts(options?.history);

  return [
    `Tema sugerido: ${theme.label} (${selection.reason}).`,
    `Emojis permitidos do tema: ${theme.emojis.join(" ")}.`,
    `Sons/onomatopeias: ${theme.sounds.join(", ")}.`,
    `Mini-bordoes: ${theme.catchphrases.join(", ")}.`,
    `Exemplo curto seguro: ${theme.example}.`,
    variant
      ? `Variacao sugerida agora: ${variant.kind} - ${variant.text}${variant.emoji ? ` ${variant.emoji}` : ""}.`
      : null,
    recentTexts.length > 0
      ? `Evite repetir elementos recentes: ${recentTexts.slice(-2).join(" | ")}.`
      : null,
    `Regra do tema: ${theme.toneRule}`,
    "Use no maximo um artefato e apenas se encaixar naturalmente; se for correcao seria, seja discreta e priorize clareza.",
  ]
    .filter(Boolean)
    .join("\n");
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
  history?: CattyArtifactHistoryItem[];
  intent: CattyIntent;
  message?: string;
  reply: string;
  selection: CattyArtifactSelection | null;
}) {
  const variant = pickCattyArtifactReplyVariant({
    history: input.history,
    intent: input.intent,
    message: input.message,
    selection: input.selection,
  });
  const hint = variant?.text ?? "";
  const theme = input.selection?.artifact;

  if (!hint || !theme || replyAlreadyHasArtifact(input.reply, theme)) {
    return input.reply;
  }

  const emoji = variant?.emoji ?? theme.emojis[0] ?? "";
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
