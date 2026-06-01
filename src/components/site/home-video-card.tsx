"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type HomeVideoCardProps = {
  className?: string;
  label: string;
  src: string;
  title: string;
  variant?: "support" | "embedded";
};

const controlButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/[0.82] px-4 text-sm font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0.55rem_1.2rem_rgba(44,19,56,0.18)] outline-none transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_0.7rem_1.35rem_rgba(44,19,56,0.24)] active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary";
const embeddedControlButtonClass =
  "inline-flex size-9 items-center justify-center rounded-full border border-white/80 bg-white/[0.86] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_0.45rem_1rem_rgba(44,19,56,0.18)] outline-none transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary";

export function HomeVideoCard({
  className,
  label,
  src,
  title,
  variant = "support",
}: HomeVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const startMutedLoop = async () => {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("canplay", startMutedLoop, { once: true });
    void startMutedLoop();

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("canplay", startMutedLoop);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!video.paused) {
      video.pause();
      return;
    }

    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const toggleMuted = () => {
    setIsMuted((current) => !current);
  };

  const isEmbedded = variant === "embedded";
  const buttonClassName = isEmbedded
    ? embeddedControlButtonClass
    : controlButtonClass;

  return (
    <article
      className={cn(
        "group flex min-h-0 flex-col overflow-hidden border border-white/80 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-primary/25",
        isEmbedded
          ? "rounded-[1.15rem] bg-white/[0.9] p-1.5 shadow-2xl shadow-primary/18 hover:shadow-primary/24"
          : "rounded-[1.75rem] bg-white/[0.86] p-2 shadow-2xl shadow-primary/14 hover:shadow-primary/20 lg:h-full",
        className,
      )}
    >
      <div
        className={cn(
          "aspect-video overflow-hidden border border-primary/15 bg-white",
          isEmbedded
            ? "rounded-[0.9rem]"
            : "rounded-[1.25rem] lg:aspect-auto lg:min-h-0 lg:flex-1",
        )}
      >
        <video
          ref={videoRef}
          aria-label={label}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          className="block h-full w-full bg-white object-contain object-center"
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-3",
          isEmbedded ? "px-2 py-2" : "px-3 py-3",
        )}
      >
        <h2
          className={cn(
            "min-w-0 font-bold leading-tight text-primary",
            isEmbedded ? "text-sm sm:text-base" : "text-lg sm:text-xl",
          )}
        >
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={isPlaying ? `Pausar ${label}` : `Iniciar ${label}`}
            aria-pressed={isPlaying}
            title={isPlaying ? "Pausar" : "Iniciar"}
            onClick={togglePlay}
            className={cn(buttonClassName, isPlaying && "bg-secondary/90")}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
            <span className={cn(isEmbedded ? "sr-only" : "hidden sm:inline")}>
              {isPlaying ? "Pausar" : "Play"}
            </span>
          </button>
          <button
            type="button"
            aria-label={
              isMuted ? `Ligar som de ${label}` : `Desligar som de ${label}`
            }
            aria-pressed={!isMuted}
            title={isMuted ? "Ligar som" : "Desligar som"}
            onClick={toggleMuted}
            className={cn(buttonClassName, !isMuted && "bg-secondary/90")}
          >
            {isMuted ? (
              <VolumeX aria-hidden="true" className="size-4" />
            ) : (
              <Volume2 aria-hidden="true" className="size-4" />
            )}
            <span className={cn(isEmbedded ? "sr-only" : "hidden sm:inline")}>
              {isMuted ? "Som" : "Ligado"}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
