import { createHash } from "node:crypto";

import { normalizeListeningSentence } from "@/lib/interactive-homework-fields";

export type ListeningSpeedMode = "normal" | "slow";

const OPENAI_TTS_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "marin",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "cedar",
]);
const DEFAULT_OPENAI_TTS_VOICE = "coral";
const LISTENING_CACHE_TTL_MS = 60 * 60 * 1000;
const LISTENING_CACHE_MAX_ENTRIES = 100;
const LISTENING_CACHE_MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const LISTENING_CACHE_MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const LISTENING_RATE_LIMIT_WINDOW_MS = 60_000;
const LISTENING_RATE_LIMIT_MAX_REQUESTS = 10;

type ListeningSpeechResult =
  | {
      audio: ArrayBuffer;
      contentType: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
      status: number;
    };

const listeningCache = new Map<
  string,
  { audio: ArrayBuffer; contentType: string; expiresAt: number }
>();
const listeningInFlight = new Map<string, Promise<ListeningSpeechResult>>();
const listeningRateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();
let listeningCacheBytes = 0;

export function getListeningSpeedMode(request: Request): ListeningSpeedMode {
  const speed = new URL(request.url).searchParams.get("speed");
  return speed === "slow" ? "slow" : "normal";
}

function getOpenAiVoice() {
  const voice =
    process.env.OPENAI_LISTENING_TTS_VOICE?.trim() || DEFAULT_OPENAI_TTS_VOICE;

  return OPENAI_TTS_VOICES.has(voice) ? voice : DEFAULT_OPENAI_TTS_VOICE;
}

function getOpenAiModel() {
  return (
    process.env.OPENAI_LISTENING_TTS_MODEL?.trim() || "gpt-4o-mini-tts"
  );
}

function getOpenAiSpeechBody(
  input: string,
  mode: ListeningSpeedMode,
  model: string,
  voice: string,
) {
  const body: {
    input: string;
    instructions?: string;
    model: string;
    response_format: "mp3";
    speed: number;
    voice: string;
  } = {
    input,
    model,
    response_format: "mp3",
    speed: mode === "slow" ? 0.72 : 1,
    voice,
  };

  if (model.includes("gpt-4o")) {
    body.instructions =
      mode === "slow"
        ? "Speak the English sentence with a warm, smiling, cheerful female English teacher tone, a little slower for a beginner student. Keep pronunciation clear, friendly, and encouraging."
        : "Speak the English sentence with a warm, smiling, cheerful female English teacher tone. Keep pronunciation clear, natural, friendly, and encouraging.";
  }

  return body;
}

function getListeningCacheKey(
  input: string,
  mode: ListeningSpeedMode,
  model: string,
  voice: string,
) {
  return createHash("sha256")
    .update(JSON.stringify({ input, mode, model, voice }))
    .digest("hex");
}

function deleteListeningCacheEntry(key: string) {
  const existing = listeningCache.get(key);

  if (existing) {
    listeningCacheBytes = Math.max(
      0,
      listeningCacheBytes - existing.audio.byteLength,
    );
    listeningCache.delete(key);
  }
}

function cleanExpiredListeningState(now: number) {
  for (const [key, value] of listeningCache.entries()) {
    if (value.expiresAt <= now) {
      deleteListeningCacheEntry(key);
    }
  }

  if (listeningRateLimitStore.size > 1000) {
    for (const [key, value] of listeningRateLimitStore.entries()) {
      if (value.resetAt <= now) {
        listeningRateLimitStore.delete(key);
      }
    }
  }
}

function isListeningRateLimited(key: string, now: number) {
  const current = listeningRateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    listeningRateLimitStore.set(key, {
      count: 1,
      resetAt: now + LISTENING_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  return current.count > LISTENING_RATE_LIMIT_MAX_REQUESTS;
}

export async function synthesizeListeningSpeech(
  sentence: string | null,
  mode: ListeningSpeedMode,
  rateLimitKey: string,
): Promise<ListeningSpeechResult> {
  const input = normalizeListeningSentence(sentence ?? "");

  if (!input) {
    return {
      message: "Texto do listening não configurado.",
      ok: false,
      status: 400,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      message: "Áudio OpenAI indisponível.",
      ok: false,
      status: 503,
    };
  }

  const model = getOpenAiModel();
  const voice = getOpenAiVoice();
  const now = Date.now();
  const cacheKey = getListeningCacheKey(input, mode, model, voice);
  cleanExpiredListeningState(now);

  const cached = listeningCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return {
      audio: cached.audio.slice(0),
      contentType: cached.contentType,
      ok: true,
    };
  }

  const inFlight = listeningInFlight.get(cacheKey);

  if (inFlight) {
    return inFlight;
  }

  if (isListeningRateLimited(rateLimitKey, now)) {
    return {
      message: "Muitas solicitações de áudio. Aguarde um minuto.",
      ok: false,
      status: 429,
    };
  }

  const generation = (async (): Promise<ListeningSpeechResult> => {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        body: JSON.stringify(getOpenAiSpeechBody(input, mode, model, voice)),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        console.warn(`Listening OpenAI TTS failed: status ${response.status}`);
        return {
          message: "Áudio indisponível.",
          ok: false,
          status: 502,
        };
      }

      const audio = await response.arrayBuffer();
      const responseContentType = response.headers.get("Content-Type");
      const contentType =
        responseContentType &&
        /^audio\/[a-z0-9.+-]+$/i.test(responseContentType)
          ? responseContentType
          : "audio/mpeg";

      if (
        audio.byteLength <= LISTENING_CACHE_MAX_AUDIO_BYTES &&
        audio.byteLength <= LISTENING_CACHE_MAX_TOTAL_BYTES
      ) {
        deleteListeningCacheEntry(cacheKey);

        while (
          listeningCache.size >= LISTENING_CACHE_MAX_ENTRIES ||
          listeningCacheBytes + audio.byteLength >
            LISTENING_CACHE_MAX_TOTAL_BYTES
        ) {
          const oldestKey = listeningCache.keys().next().value;

          if (typeof oldestKey !== "string") {
            break;
          }

          deleteListeningCacheEntry(oldestKey);
        }

        listeningCache.set(cacheKey, {
          audio,
          contentType,
          expiresAt: now + LISTENING_CACHE_TTL_MS,
        });
        listeningCacheBytes += audio.byteLength;
      }

      return {
        audio,
        contentType,
        ok: true,
      };
    } catch {
      return {
        message: "Áudio indisponível.",
        ok: false,
        status: 502,
      };
    }
  })();

  listeningInFlight.set(cacheKey, generation);

  try {
    return await generation;
  } finally {
    if (listeningInFlight.get(cacheKey) === generation) {
      listeningInFlight.delete(cacheKey);
    }
  }
}
