import { CATTY_ARTIFACT_THEMES } from "@/lib/catty-artifacts";
import { canAccessCattyUserMemoryTarget } from "@/lib/catty-user-memory";
import { upsertCattyUserArtifact } from "@/lib/catty-user-artifacts";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import {
  cattyArtifactEnrichmentRequestSchema,
  cattyArtifactEnrichmentReviewSchema,
  cattyArtifactEnrichmentStatusUpdateSchema,
  hasBlockedCattyArtifactText,
  type CattyArtifactEnrichmentRequestInput,
  type CattyArtifactEnrichmentReviewInput,
  type CattyArtifactEnrichmentStatusInput,
  type CattyArtifactEnrichmentStatusUpdateInput,
} from "@/lib/validations/catty-artifacts";
import {
  hasSensitiveCattyUserMemoryText,
  normalizeCattyUserMemoryText,
} from "@/lib/validations/catty-user-memory";

type ActorContext = {
  actorRole: Role;
  actorUserId: string;
};

type EnrichmentRequestInput = CattyArtifactEnrichmentRequestInput & ActorContext;
type EnrichmentReviewInput = CattyArtifactEnrichmentReviewInput & ActorContext;
type EnrichmentStatusUpdateInput =
  CattyArtifactEnrichmentStatusUpdateInput & ActorContext;

type SearchResult = {
  snippet: string;
  title: string;
  url: string;
};

type VocabularySuggestion = {
  example: string;
  meaning: string;
  word: string;
};

type EnrichmentSuggestion = {
  cautions: string[];
  failureReason?: string | null;
  provider: string;
  query: string;
  safeSummary: string;
  sources: SearchResult[];
  suggestedBalloons: string[];
  suggestedCatchphrases: string[];
  suggestedEmojis: string[];
  suggestedExamples: string[];
  suggestedSounds: string[];
  suggestedVocabulary: VocabularySuggestion[];
};

export type CattyArtifactEnrichmentSourceRow = {
  snippet: string;
  title: string;
  url: string;
};

export type CattyArtifactEnrichmentVocabularyRow = {
  example: string;
  meaning: string;
  word: string;
};

export type CattyArtifactEnrichmentRow = {
  cacheId: string | null;
  cautions: string[];
  createdAt: string;
  createdByName: string | null;
  failureReason: string | null;
  id: string;
  label: string;
  provider: string;
  query: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  safeSummary: string | null;
  sources: CattyArtifactEnrichmentSourceRow[];
  status: CattyArtifactEnrichmentStatusInput;
  suggestedBalloons: string[];
  suggestedCatchphrases: string[];
  suggestedEmojis: string[];
  suggestedExamples: string[];
  suggestedSounds: string[];
  suggestedVocabulary: CattyArtifactEnrichmentVocabularyRow[];
  targetUserId: string | null;
  targetUserName: string | null;
  themeId: string;
  updatedAt: string;
};

const DEFAULT_CACHE_DAYS = 90;
const ENRICHMENT_PANEL_LIMIT = 80;
const MAX_SEARCH_RESULTS = 5;
const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

const genericEmojis = ["✨", "📚", "🍬"];
const genericSounds = ["pling"];

function compactText(text: string, maxLength: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeThemeId(value: string) {
  return normalizeCattyUserMemoryText(value)
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function normalizeThemeLabel(value: string) {
  return compactText(value, 64);
}

function uniqueList(items: Array<string | null | undefined>, maxItems: number) {
  return [
    ...new Set(
      items
        .map((item) => compactText(item ?? "", 90))
        .filter((item) => item.length > 0),
    ),
  ].slice(0, maxItems);
}

function stableCacheKey(input: { label: string; provider: string; themeId: string }) {
  return [
    "catty-artifact",
    input.provider,
    normalizeThemeId(input.themeId),
    normalizeCattyUserMemoryText(input.label).replace(/[^a-z0-9]+/g, "-"),
  ].join(":");
}

function getCacheDays() {
  const parsed = Number.parseInt(
    process.env.CATTY_ARTIFACT_SEARCH_CACHE_DAYS ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CACHE_DAYS;
}

function getConfiguredProvider() {
  const provider =
    process.env.CATTY_ARTIFACT_SEARCH_PROVIDER?.trim().toLowerCase() ||
    "offline";

  return provider === "brave" ? "brave" : "offline";
}

function isEnrichmentEnabled() {
  return process.env.CATTY_ARTIFACT_ENRICHMENT_ENABLED !== "false";
}

function isBrandLikeTheme(label: string) {
  const normalized = normalizeCattyUserMemoryText(label);

  return [
    "barbie",
    "disney",
    "harry potter",
    "minecraft",
    "pokemon",
    "roblox",
    "star wars",
  ].some((term) => normalized.includes(term));
}

function findBuiltInTheme(themeId: string, label: string) {
  const normalized = normalizeCattyUserMemoryText(`${themeId} ${label}`);

  return CATTY_ARTIFACT_THEMES.find((theme) => {
    if (theme.id === themeId) {
      return true;
    }

    return theme.keywords.some((keyword) =>
      normalized.includes(normalizeCattyUserMemoryText(keyword)),
    );
  });
}

function classifyGenericTopic(label: string) {
  const normalized = normalizeCattyUserMemoryText(label);

  if (
    ["dino", "dinossauro", "dinosaur"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return {
      catchphrases: [
        "modo dino curioso",
        "passinho jurassico",
        "fossil de vocabulario",
      ],
      emojis: ["🦖", "🌿", "✨"],
      examples: ["The dinosaur is big.", "The dinosaur is reading a book."],
      sounds: ["rawr"],
      vocabulary: [
        {
          example: "The dinosaur is big.",
          meaning: "dinossauro",
          word: "dinosaur",
        },
      ],
    };
  }

  if (
    ["minecraft", "roblox", "game", "jogo"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return {
      catchphrases: ["checkpoint", "level up", "missao desbloqueada"],
      emojis: ["🎮", "⭐", "✨"],
      examples: ["I build a house.", "The game is fun."],
      sounds: ["pling"],
      vocabulary: [
        {
          example: "I build a house.",
          meaning: "construir",
          word: "build",
        },
      ],
    };
  }

  if (
    ["barbie", "princesa", "princess", "disney"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return {
      catchphrases: ["modo brilho", "missao real", "glitter do English"],
      emojis: ["✨", "👑", "🍬"],
      examples: ["The doll is beautiful.", "The princess is reading."],
      sounds: ["plim plim"],
      vocabulary: [
        {
          example: "The doll is beautiful.",
          meaning: "boneca",
          word: "doll",
        },
      ],
    };
  }

  return {
    catchphrases: [
      `modo ${label} focado`,
      `missao ${label}`,
      `${label} no English`,
    ],
    emojis: genericEmojis,
    examples: [`I like ${label}.`, `${label} is fun.`],
    sounds: genericSounds,
    vocabulary: [
      {
        example: `I like ${label}.`,
        meaning: label,
        word: label,
      },
    ],
  };
}

function buildSearchQuery(label: string) {
  return `${label} contexto seguro para aula infantil vocabulario ingles emojis`;
}

function safeSourceRows(results: SearchResult[]) {
  return results
    .map((result) => ({
      snippet: compactText(result.snippet, 220),
      title: compactText(result.title, 120),
      url: compactText(result.url, 240),
    }))
    .filter((result) => result.title || result.url)
    .slice(0, MAX_SEARCH_RESULTS);
}

async function searchWithBrave(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY nao configurada.");
  }

  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(MAX_SEARCH_RESULTS));
  url.searchParams.set("country", "BR");
  url.searchParams.set("search_lang", "pt-br");
  url.searchParams.set("ui_lang", "pt-BR");
  url.searchParams.set("safesearch", "strict");
  url.searchParams.set("result_filter", "web");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
    method: "GET",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Brave Search retornou status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    web?: {
      results?: Array<{
        description?: string;
        title?: string;
        url?: string;
      }>;
    };
  };

  return (payload.web?.results ?? [])
    .map((result) => ({
      snippet: result.description ?? "",
      title: result.title ?? "",
      url: result.url ?? "",
    }))
    .filter((result) => result.title || result.snippet || result.url)
    .slice(0, MAX_SEARCH_RESULTS);
}

async function getSearchResults(input: {
  label: string;
  provider: string;
  query: string;
}) {
  if (input.provider !== "brave") {
    return {
      failureReason: "Busca externa desativada; sugestao gerada localmente.",
      provider: "offline",
      results: [] as SearchResult[],
    };
  }

  try {
    const results = await searchWithBrave(input.query);

    return {
      failureReason:
        results.length === 0
          ? "A busca nao retornou resultados uteis; sugestao gerada localmente."
          : null,
      provider: "brave",
      results,
    };
  } catch (error) {
    return {
      failureReason:
        error instanceof Error
          ? error.message
          : "Busca externa falhou; sugestao gerada localmente.",
      provider: "offline",
      results: [] as SearchResult[],
    };
  }
}

function buildSuggestion(input: {
  failureReason?: string | null;
  label: string;
  provider: string;
  query: string;
  results: SearchResult[];
  themeId: string;
}): EnrichmentSuggestion {
  const builtIn = findBuiltInTheme(input.themeId, input.label);
  const generic = classifyGenericTopic(input.label);
  const summaryBits = safeSourceRows(input.results)
    .map((source) => source.snippet || source.title)
    .filter(Boolean)
    .slice(0, 3);
  const safeSummary =
    summaryBits.length > 0
      ? `Tema "${input.label}" pesquisado para inspirar exemplos leves de ingles. Pontos uteis: ${summaryBits.join(" ")}`
      : `Tema "${input.label}" preparado com artefatos seguros para exemplos leves de ingles.`;
  const suggestedEmojis = builtIn?.emojis.length
    ? builtIn.emojis
    : generic.emojis;
  const suggestedCatchphrases = builtIn?.catchphrases.length
    ? builtIn.catchphrases
    : generic.catchphrases;
  const suggestedSounds = builtIn?.sounds.length ? builtIn.sounds : generic.sounds;
  const suggestedExamples = uniqueList(
    [
      builtIn?.example,
      ...generic.examples,
      `I like ${input.label}.`,
    ],
    5,
  );
  const vocabulary = builtIn
    ? [
        {
          example: builtIn.example,
          meaning: builtIn.label,
          word: builtIn.label,
        },
      ]
    : generic.vocabulary;
  const cautions = uniqueList(
    [
      "Usar como tempero leve, sem repetir em toda resposta.",
      "Priorizar clareza em correcao de frase e homework.",
      isBrandLikeTheme(input.label)
        ? "Tema de marca/personagem: usar como inspiracao de aula, sem fingir ser oficial nem copiar textos."
        : null,
      input.failureReason
        ? `Aviso da busca: ${input.failureReason}`
        : null,
    ],
    5,
  );

  return {
    cautions,
    failureReason: input.failureReason ?? null,
    provider: input.provider,
    query: input.query,
    safeSummary: compactText(safeSummary, 650),
    sources: safeSourceRows(input.results),
    suggestedBalloons: uniqueList(
      [
        `Miauw, hoje o English vai no modo ${input.label} ✨`,
        `Awnn, uma frase por vez com energia de ${input.label}.`,
      ],
      4,
    ),
    suggestedCatchphrases: uniqueList(suggestedCatchphrases, 8),
    suggestedEmojis: uniqueList(suggestedEmojis, 8),
    suggestedExamples,
    suggestedSounds: uniqueList(suggestedSounds, 6),
    suggestedVocabulary: vocabulary.slice(0, 5).map((item) => ({
      example: compactText(item.example, 140),
      meaning: compactText(item.meaning, 80),
      word: compactText(item.word, 50),
    })),
  };
}

function toSuggestionFromCache(cache: {
  cautions: string[];
  provider: string;
  query: string;
  safeSummary: string | null;
  sources: unknown;
  suggestedBalloons: string[];
  suggestedCatchphrases: string[];
  suggestedEmojis: string[];
  suggestedExamples: string[];
  suggestedSounds: string[];
  suggestedVocabulary: unknown;
}): EnrichmentSuggestion {
  return {
    cautions: cache.cautions,
    provider: cache.provider,
    query: cache.query,
    safeSummary: cache.safeSummary ?? "",
    sources: parseSourceRows(cache.sources),
    suggestedBalloons: cache.suggestedBalloons,
    suggestedCatchphrases: cache.suggestedCatchphrases,
    suggestedEmojis: cache.suggestedEmojis,
    suggestedExamples: cache.suggestedExamples,
    suggestedSounds: cache.suggestedSounds,
    suggestedVocabulary: parseVocabularyRows(cache.suggestedVocabulary),
  };
}

function parseSourceRows(value: unknown): CattyArtifactEnrichmentSourceRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const source = item as {
        snippet?: unknown;
        title?: unknown;
        url?: unknown;
      };

      return {
        snippet: typeof source.snippet === "string" ? source.snippet : "",
        title: typeof source.title === "string" ? source.title : "",
        url: typeof source.url === "string" ? source.url : "",
      };
    })
    .filter((item): item is CattyArtifactEnrichmentSourceRow => item !== null)
    .slice(0, MAX_SEARCH_RESULTS);
}

function parseVocabularyRows(
  value: unknown,
): CattyArtifactEnrichmentVocabularyRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const vocabulary = item as {
        example?: unknown;
        meaning?: unknown;
        word?: unknown;
      };

      return {
        example: typeof vocabulary.example === "string" ? vocabulary.example : "",
        meaning: typeof vocabulary.meaning === "string" ? vocabulary.meaning : "",
        word: typeof vocabulary.word === "string" ? vocabulary.word : "",
      };
    })
    .filter(
      (item): item is CattyArtifactEnrichmentVocabularyRow =>
        item !== null && Boolean(item.word),
    )
    .slice(0, 5);
}

function getSearchableText(input: { label: string; themeId: string }) {
  return `${input.themeId} ${input.label}`;
}

function assertSafeThemeText(input: { label: string; themeId: string }) {
  const text = getSearchableText(input);

  if (hasSensitiveCattyUserMemoryText(text)) {
    return "Esse interesse contem dado sensivel. Use apenas tema leve.";
  }

  if (hasBlockedCattyArtifactText(text)) {
    return "Esse interesse parece sensivel ou inadequado para aula.";
  }

  return null;
}

async function getOrCreateCache(input: {
  forceRefresh?: boolean;
  label: string;
  provider: string;
  themeId: string;
}) {
  const prisma = getPrisma();
  const query = buildSearchQuery(input.label);
  const builtInTheme = findBuiltInTheme(input.themeId, input.label);
  const effectiveProvider =
    builtInTheme && !input.forceRefresh ? "built-in" : input.provider;
  const cacheKey = stableCacheKey({
    label: input.label,
    provider: effectiveProvider,
    themeId: input.themeId,
  });
  const now = new Date();
  const cache = await prisma.cattyArtifactEnrichmentCache.findUnique({
    where: {
      cacheKey,
    },
  });

  if (
    cache &&
    !input.forceRefresh &&
    (!cache.expiresAt || cache.expiresAt > now)
  ) {
    return {
      cache,
      fromCache: true,
      suggestion: toSuggestionFromCache(cache),
    };
  }

  const search =
    builtInTheme && !input.forceRefresh
      ? {
          failureReason:
            "Tema ja conhecido pela Catty; sugestao criada pela base interna sem busca externa.",
          provider: "built-in",
          results: [] as SearchResult[],
        }
      : await getSearchResults({
          label: input.label,
          provider: input.provider,
          query,
        });
  const suggestion = buildSuggestion({
    failureReason: search.failureReason,
    label: input.label,
    provider: search.provider,
    query,
    results: search.results,
    themeId: input.themeId,
  });
  const expiresAt = new Date(
    now.getTime() + getCacheDays() * 24 * 60 * 60 * 1000,
  );
  const nextCache = await prisma.cattyArtifactEnrichmentCache.upsert({
    create: {
      cacheKey,
      cautions: suggestion.cautions,
      expiresAt,
      label: input.label,
      provider: suggestion.provider,
      query,
      safeSummary: suggestion.safeSummary,
      sources: suggestion.sources,
      suggestedBalloons: suggestion.suggestedBalloons,
      suggestedCatchphrases: suggestion.suggestedCatchphrases,
      suggestedEmojis: suggestion.suggestedEmojis,
      suggestedExamples: suggestion.suggestedExamples,
      suggestedSounds: suggestion.suggestedSounds,
      suggestedVocabulary: suggestion.suggestedVocabulary,
      themeId: input.themeId,
    },
    update: {
      cautions: suggestion.cautions,
      expiresAt,
      label: input.label,
      provider: suggestion.provider,
      query,
      safeSummary: suggestion.safeSummary,
      sources: suggestion.sources,
      suggestedBalloons: suggestion.suggestedBalloons,
      suggestedCatchphrases: suggestion.suggestedCatchphrases,
      suggestedEmojis: suggestion.suggestedEmojis,
      suggestedExamples: suggestion.suggestedExamples,
      suggestedSounds: suggestion.suggestedSounds,
      suggestedVocabulary: suggestion.suggestedVocabulary,
      themeId: input.themeId,
    },
    where: {
      cacheKey,
    },
  });

  return {
    cache: nextCache,
    fromCache: false,
    suggestion,
  };
}

export async function requestCattyArtifactEnrichment(
  input: EnrichmentRequestInput,
) {
  const parsed = cattyArtifactEnrichmentRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise o interesse antes de enriquecer.",
    };
  }

  if (!isEnrichmentEnabled()) {
    return {
      ok: false,
      message: "Enriquecimento de temas da Catty esta desativado no ambiente.",
    };
  }

  if (input.actorRole === "STUDENT") {
    return {
      ok: false,
      message:
        "Aluno pode sugerir tema, mas enriquecimento e aprovacao ficam com Admin/Teacher.",
    };
  }

  const themeId = normalizeThemeId(parsed.data.themeId);
  const label = normalizeThemeLabel(parsed.data.label);
  const unsafeReason = assertSafeThemeText({ label, themeId });

  if (unsafeReason) {
    return {
      ok: false,
      message: unsafeReason,
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: parsed.data.targetUserId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para enriquecer tema desse aluno.",
    };
  }

  const provider = getConfiguredProvider();
  const prisma = getPrisma();
  const { cache, fromCache, suggestion } = await getOrCreateCache({
    forceRefresh: parsed.data.forceRefresh,
    label,
    provider,
    themeId,
  });
  const existingArtifact = await prisma.cattyUserArtifact.findUnique({
    select: {
      id: true,
    },
    where: {
      userId_themeId: {
        themeId,
        userId: parsed.data.targetUserId,
      },
    },
  });
  const enrichment = await prisma.cattyArtifactEnrichment.create({
    data: {
      artifactId: existingArtifact?.id ?? null,
      cacheId: cache.id,
      cautions: suggestion.cautions,
      createdByUserId: input.actorUserId,
      failureReason: suggestion.failureReason ?? null,
      label,
      provider: suggestion.provider,
      query: suggestion.query,
      safeSummary: suggestion.safeSummary,
      sources: suggestion.sources,
      status: "READY_FOR_REVIEW",
      suggestedBalloons: suggestion.suggestedBalloons,
      suggestedCatchphrases: suggestion.suggestedCatchphrases,
      suggestedEmojis: suggestion.suggestedEmojis,
      suggestedExamples: suggestion.suggestedExamples,
      suggestedSounds: suggestion.suggestedSounds,
      suggestedVocabulary: suggestion.suggestedVocabulary,
      targetUserId: parsed.data.targetUserId,
      themeId,
    },
  });

  return {
    enrichmentId: enrichment.id,
    ok: true,
    message: fromCache
      ? "Sugestao recuperada do cache e enviada para revisao."
      : suggestion.provider === "built-in"
        ? "Tema conhecido pela Catty: sugestao interna enviada para revisao."
      : suggestion.provider === "brave"
        ? "Busca feita e sugestao enviada para revisao."
        : "Sugestao local criada para revisao. Configure Brave Search para busca web real.",
  };
}

export async function approveCattyArtifactEnrichment(
  input: EnrichmentReviewInput,
) {
  const parsed = cattyArtifactEnrichmentReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revise a sugestao antes de aprovar.",
    };
  }

  if (input.actorRole === "STUDENT") {
    return {
      ok: false,
      message: "Aluno nao pode aprovar sugestao da Catty sozinho.",
    };
  }

  const prisma = getPrisma();
  const enrichment = await prisma.cattyArtifactEnrichment.findUnique({
    select: {
      id: true,
      status: true,
      targetUserId: true,
    },
    where: {
      id: parsed.data.enrichmentId,
    },
  });

  if (!enrichment?.targetUserId) {
    return {
      ok: false,
      message: "Nao encontrei essa sugestao para aprovar.",
    };
  }

  if (!["READY_FOR_REVIEW", "PENDING", "FAILED"].includes(enrichment.status)) {
    return {
      ok: false,
      message: "Essa sugestao ja foi revisada.",
    };
  }

  const result = await upsertCattyUserArtifact({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    blockedReason: input.blockedReason,
    catchphrasesText: input.catchphrasesText,
    emojisText: input.emojisText,
    example: input.example,
    label: input.label,
    soundsText: input.soundsText,
    status: "ACTIVE",
    targetUserId: enrichment.targetUserId,
    themeId: input.themeId,
    toneRule: input.toneRule,
  });

  if (!result.ok) {
    return result;
  }

  await prisma.cattyArtifactEnrichment.update({
    data: {
      artifactId: result.artifactId ?? null,
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      status: "APPROVED",
    },
    where: {
      id: enrichment.id,
    },
  });

  return {
    artifactId: result.artifactId,
    ok: true,
    message: "Sugestao aprovada e artefato ativado para a Catty.",
  };
}

export async function updateCattyArtifactEnrichmentStatus(
  input: EnrichmentStatusUpdateInput,
) {
  const parsed = cattyArtifactEnrichmentStatusUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Status invalido para a sugestao.",
    };
  }

  if (input.actorRole === "STUDENT") {
    return {
      ok: false,
      message: "Aluno nao pode revisar enriquecimento da Catty.",
    };
  }

  const prisma = getPrisma();
  const enrichment = await prisma.cattyArtifactEnrichment.findUnique({
    select: {
      id: true,
      targetUserId: true,
    },
    where: {
      id: parsed.data.enrichmentId,
    },
  });

  if (!enrichment?.targetUserId) {
    return {
      ok: false,
      message: "Nao encontrei essa sugestao.",
    };
  }

  const canAccess = await canAccessCattyUserMemoryTarget({
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    targetUserId: enrichment.targetUserId,
  });

  if (!canAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para revisar essa sugestao.",
    };
  }

  await prisma.cattyArtifactEnrichment.update({
    data: {
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      status: parsed.data.status,
    },
    where: {
      id: enrichment.id,
    },
  });

  return {
    ok: true,
    message:
      parsed.data.status === "REJECTED"
        ? "Sugestao recusada e fora do prompt da Catty."
        : "Sugestao arquivada.",
  };
}

export function mapCattyArtifactEnrichmentRow(enrichment: {
  cacheId: string | null;
  cautions: string[];
  createdAt: Date;
  createdByUser: { name: string | null } | null;
  failureReason: string | null;
  id: string;
  label: string;
  provider: string;
  query: string | null;
  reviewedAt: Date | null;
  reviewedByUser: { name: string | null } | null;
  safeSummary: string | null;
  sources: unknown;
  status: CattyArtifactEnrichmentStatusInput;
  suggestedBalloons: string[];
  suggestedCatchphrases: string[];
  suggestedEmojis: string[];
  suggestedExamples: string[];
  suggestedSounds: string[];
  suggestedVocabulary: unknown;
  targetUser: { email: string; name: string | null } | null;
  targetUserId: string | null;
  themeId: string;
  updatedAt: Date;
}): CattyArtifactEnrichmentRow {
  return {
    cacheId: enrichment.cacheId,
    cautions: enrichment.cautions,
    createdAt: enrichment.createdAt.toISOString(),
    createdByName: enrichment.createdByUser?.name ?? null,
    failureReason: enrichment.failureReason,
    id: enrichment.id,
    label: enrichment.label,
    provider: enrichment.provider,
    query: enrichment.query,
    reviewedAt: enrichment.reviewedAt?.toISOString() ?? null,
    reviewedByName: enrichment.reviewedByUser?.name ?? null,
    safeSummary: enrichment.safeSummary,
    sources: parseSourceRows(enrichment.sources),
    status: enrichment.status,
    suggestedBalloons: enrichment.suggestedBalloons,
    suggestedCatchphrases: enrichment.suggestedCatchphrases,
    suggestedEmojis: enrichment.suggestedEmojis,
    suggestedExamples: enrichment.suggestedExamples,
    suggestedSounds: enrichment.suggestedSounds,
    suggestedVocabulary: parseVocabularyRows(enrichment.suggestedVocabulary),
    targetUserId: enrichment.targetUserId,
    targetUserName: enrichment.targetUser
      ? enrichment.targetUser.name ?? enrichment.targetUser.email
      : null,
    themeId: enrichment.themeId,
    updatedAt: enrichment.updatedAt.toISOString(),
  };
}

export async function getCattyArtifactEnrichmentsForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const prisma = getPrisma();
  const enrichments = await prisma.cattyArtifactEnrichment.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      cacheId: true,
      cautions: true,
      createdAt: true,
      createdByUser: {
        select: {
          name: true,
        },
      },
      failureReason: true,
      id: true,
      label: true,
      provider: true,
      query: true,
      reviewedAt: true,
      reviewedByUser: {
        select: {
          name: true,
        },
      },
      safeSummary: true,
      sources: true,
      status: true,
      suggestedBalloons: true,
      suggestedCatchphrases: true,
      suggestedEmojis: true,
      suggestedExamples: true,
      suggestedSounds: true,
      suggestedVocabulary: true,
      targetUser: {
        select: {
          email: true,
          name: true,
        },
      },
      targetUserId: true,
      themeId: true,
      updatedAt: true,
    },
    take: ENRICHMENT_PANEL_LIMIT,
    where: {
      targetUserId: {
        in: userIds,
      },
    },
  });

  return enrichments.map(mapCattyArtifactEnrichmentRow);
}
