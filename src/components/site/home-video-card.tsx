"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type HomeVideoCardProps = {
  className?: string;
  label: string;
  src: string;
  title: string;
};

const controlButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/[0.82] px-4 text-sm font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0.55rem_1.2rem_rgba(44,19,56,0.18)] outline-none transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_0.7rem_1.35rem_rgba(44,19,56,0.24)] active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary";

export function HomeVideoCard({
  className,
  label,
  src,
  title,
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

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/[0.78] p-2 shadow-2xl shadow-primary/14 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-primary/20",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.25rem] border border-primary/15 bg-white">
        <video
          ref={videoRef}
          aria-label={label}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          className="aspect-video h-full w-full bg-white object-cover object-center"
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <h2 className="min-w-0 text-lg font-bold leading-tight text-primary sm:text-xl">
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={isPlaying ? `Pausar ${label}` : `Iniciar ${label}`}
            aria-pressed={isPlaying}
            onClick={togglePlay}
            className={cn(controlButtonClass, isPlaying && "bg-secondary/90")}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
            <span className="hidden sm:inline">
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
            className={cn(controlButtonClass, !isMuted && "bg-secondary/90")}
          >
            {isMuted ? (
              <VolumeX aria-hidden="true" className="size-4" />
            ) : (
              <Volume2 aria-hidden="true" className="size-4" />
            )}
            <span className="hidden sm:inline">
              {isMuted ? "Som" : "Ligado"}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
