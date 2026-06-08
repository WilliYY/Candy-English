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
          ? "border-primary/55 bg-white/55 shadow-[0_10px_22px_rgba(65,42,76,0.12),inset_0_0_0_1px_rgba(255,255,255,0.78)]"
          : "border-primary/20 bg-white/24 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]",
        className,
      )}
    >
      <span className="absolute inset-x-2 top-1/2 border-t border-dashed border-primary/22" />
      <span
        className={cn(
          "absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border shadow-sm",
          selected
            ? "size-9 border-primary bg-primary text-primary-foreground"
            : "size-8 border-primary/25 bg-white/85 text-primary",
        )}
      >
        <Volume2
          aria-hidden="true"
          className={selected ? "size-4" : "size-3.5"}
        />
      </span>
      {selected && !text ? (
        <span className="absolute -top-7 right-0 rounded-[3px] border border-primary/15 bg-white/95 px-2 py-1 text-[10px] font-semibold leading-none text-primary shadow-sm">
          texto pendente
        </span>
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

  async function playListening() {
    if (!canPlay || isLoading) {
      return;
    }

    const speed = nextSpeed;

    setError("");
    setIsLoading(true);

    try {
      let audioUrl = objectUrlsRef.current[speed];

      if (!audioUrl) {
        const response = await fetch(
          listeningUrl(fieldId, speed, sentenceText),
        );

        if (!response.ok) {
          throw new Error("Audio indisponivel.");
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        objectUrlsRef.current[speed] = audioUrl;
      }

      audioRef.current?.pause();

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await audio.play();
      setNextSpeed(nextListeningSpeed[speed]);
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
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-[4px] border border-primary/8 bg-white/[0.03]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-2 top-1/2 border-t border-dashed border-primary/18"
      />
      <button
        aria-label={`${label}. Ouvir frase em velocidade ${speedLabel}. Voz gerada por IA.`}
        className="group pointer-events-auto absolute right-0 top-1/2 z-20 flex size-[clamp(28px,42cqh,42px)] -translate-y-1/2 items-center justify-center rounded-full border border-primary/25 bg-white/90 text-primary shadow-[0_6px_18px_rgba(65,42,76,0.2)] transition hover:-translate-y-1/2 hover:scale-105 hover:border-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-55"
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
