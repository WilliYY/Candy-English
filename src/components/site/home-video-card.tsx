"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type HomeVideoCardProps = {
  className?: string;
  controlsClassName?: string;
  label: string;
  src: string;
};

export function HomeVideoCard({
  className,
  controlsClassName,
  label,
  src,
}: HomeVideoCardProps) {
  const id = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleExternalPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== id) {
        video.pause();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    window.addEventListener("candy-home-video-play", handleExternalPlay);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      window.removeEventListener("candy-home-video-play", handleExternalPlay);
    };
  }, [id]);

  const playVideo = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("candy-home-video-play", { detail: { id } }),
    );

    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const pauseVideo = () => {
    videoRef.current?.pause();
  };

  const toggleMuted = () => {
    setIsMuted((current) => !current);
  };

  return (
    <article className={cn("absolute origin-center overflow-visible", className)}>
      <div className="h-full w-full overflow-hidden bg-white">
        <video
          ref={videoRef}
          aria-label={label}
          className="h-full w-full bg-white object-contain object-center"
          muted={isMuted}
          playsInline
          preload="metadata"
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>

      <div
        className={cn(
          "absolute grid h-[20%] w-full grid-cols-[1fr_1fr_0.7fr] gap-2",
          controlsClassName,
        )}
      >
        <button
          type="button"
          aria-label={`Pausar ${label}`}
          onClick={pauseVideo}
          className="rounded-full bg-transparent outline-none transition focus-visible:bg-white/80 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="sr-only">Stop</span>
        </button>
        <button
          type="button"
          aria-label={`Iniciar ${label}`}
          aria-pressed={isPlaying}
          onClick={playVideo}
          className="rounded-full bg-transparent outline-none transition focus-visible:bg-white/80 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="sr-only">Play</span>
        </button>
        <button
          type="button"
          aria-label={isMuted ? "Liberar som" : "Bloquear som"}
          title={isMuted ? "Liberar som" : "Bloquear som"}
          onClick={toggleMuted}
          className="rounded-full bg-transparent outline-none transition focus-visible:bg-white/80 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="sr-only">
            {isMuted ? "Liberar som" : "Bloquear som"}
          </span>
        </button>
      </div>
    </article>
  );
}
