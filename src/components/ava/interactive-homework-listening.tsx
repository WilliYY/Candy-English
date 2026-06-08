"use client";

import { LoaderCircle, Volume1, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { normalizeListeningSentence } from "@/lib/interactive-homework-fields";
import { cn } from "@/lib/utils";

type ListeningSpeed = "normal" | "slow";

const nextListeningSpeed = {
  normal: "slow",
  slow: "normal",
} satisfies Record<ListeningSpeed, ListeningSpeed>;

const listeningSpeedLabels = {
  normal: "normal",
  slow: "mais devagar",
} satisfies Record<ListeningSpeed, string>;

function hashListeningSentence(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function listeningUrl(
  fieldId: string,
  speed: ListeningSpeed,
  sentence: string,
) {
  const params = new URLSearchParams({
    speed,
    v: hashListeningSentence(sentence),
  });

  return `/ava/homework-listening/${fieldId}?${params.toString()}`;
}

export function InteractiveHomeworkListeningPreview({
  className,
  selected = false,
  sentence,
}: {
  className?: string;
  selected?: boolean;
  sentence?: string | null;
}) {
  const text = normalizeListeningSentence(sentence ?? "");

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center rounded-[4px] border transition",
        selected
          ? "border-primary/65 bg-primary/[0.035] shadow-[0_10px_24px_rgba(65,42,76,0.14),inset_0_0_0_1px_rgba(255,255,255,0.55)]"
          : "border-primary/25 bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]",
        className,
      )}
    >
      <span
        className={cn(
          "absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border shadow-sm",
          selected
            ? "size-9 border-primary bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(65,42,76,0.26)]"
            : "size-8 border-primary/25 bg-white/92 text-primary shadow-[0_4px_12px_rgba(65,42,76,0.16)]",
        )}
      >
        <Volume2
          aria-hidden="true"
          className={selected ? "size-4" : "size-3.5"}
        />
      </span>
      {selected && !text ? (
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full border border-white bg-amber-400 shadow-sm" />
      ) : null}
    </span>
  );
}

export function InteractiveHomeworkListeningPlayer({
  className,
  fieldId,
  label,
  sentence,
  style,
}: {
  className?: string;
  fieldId: string;
  label: string;
  sentence?: string | null;
  style: CSSProperties;
}) {
  const sentenceText = normalizeListeningSentence(sentence ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextSpeed, setNextSpeed] = useState<ListeningSpeed>("normal");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlsRef = useRef<Partial<Record<ListeningSpeed, string>>>({});
  const canPlay = sentenceText.length > 0;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      Object.values(objectUrlsRef.current).forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  useEffect(() => {
    audioRef.current?.pause();
    Object.values(objectUrlsRef.current).forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    objectUrlsRef.current = {};
    setNextSpeed("normal");
    setError("");
  }, [sentenceText]);

  async function loadListeningAudio(speed: ListeningSpeed) {
    let audioUrl = objectUrlsRef.current[speed];

    if (audioUrl) {
      return audioUrl;
    }

    const response = await fetch(listeningUrl(fieldId, speed, sentenceText));

    if (!response.ok) {
      throw new Error("Audio indisponivel.");
    }

    const blob = await response.blob();
    audioUrl = URL.createObjectURL(blob);
    objectUrlsRef.current[speed] = audioUrl;

    return audioUrl;
  }

  async function warmNextListeningAudio(speed: ListeningSpeed) {
    try {
      await loadListeningAudio(speed);
    } catch {
      // First click should keep working even if the warm-up fetch fails.
    }
  }

  async function playListening() {
    if (!canPlay || isLoading) {
      return;
    }

    const speed = nextSpeed;
    const nextSpeedAfterPlay = nextListeningSpeed[speed];

    setError("");
    setIsLoading(true);

    try {
      const audioUrl = await loadListeningAudio(speed);
      audioRef.current?.pause();

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await audio.play();
      setNextSpeed(nextSpeedAfterPlay);
      void warmNextListeningAudio(nextSpeedAfterPlay);
    } catch {
      setError("Nao foi possivel tocar agora.");
    } finally {
      setIsLoading(false);
    }
  }

  const Icon = nextSpeed === "slow" ? Volume1 : Volume2;
  const speedLabel = listeningSpeedLabels[nextSpeed];

  return (
    <div
      className={cn("absolute pointer-events-none", className)}
      style={{
        ...style,
        containerType: "size",
      }}
    >
      <button
        aria-label={`${label}. Ouvir frase em velocidade ${speedLabel}. Voz gerada por IA.`}
        className="group pointer-events-auto absolute right-0 top-1/2 z-20 flex size-[clamp(30px,44cqh,42px)] -translate-y-1/2 items-center justify-center rounded-full border border-primary/25 bg-white/95 text-primary shadow-[0_8px_22px_rgba(65,42,76,0.22)] transition hover:-translate-y-1/2 hover:scale-105 hover:border-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-55"
        disabled={!canPlay || isLoading}
        onClick={playListening}
        title={`Voz gerada por IA - proximo audio: ${speedLabel}`}
        type="button"
      >
        {isLoading ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Icon aria-hidden="true" className="size-4" />
        )}
        <span className="pointer-events-none absolute -top-7 right-0 hidden whitespace-nowrap rounded-[3px] border border-primary/15 bg-white/95 px-2 py-1 text-[10px] font-bold text-primary shadow-sm group-hover:inline-flex group-focus-visible:inline-flex">
          {canPlay ? `IA - ${speedLabel}` : "sem frase"}
        </span>
      </button>
      {error ? (
        <span className="absolute -bottom-6 right-0 z-20 whitespace-nowrap rounded-[3px] border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 shadow-sm">
          {error}
        </span>
      ) : null}
    </div>
  );
}
