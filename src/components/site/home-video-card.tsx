"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Play, Square, Volume2, VolumeX } from "lucide-react";
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
    <article
      className={cn(
        "absolute overflow-visible",
        className,
      )}
    >
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
          "absolute left-1/2 top-[calc(100%+0.75rem)] grid w-[114%] -translate-x-1/2 grid-cols-[1fr_1fr_auto] items-center gap-2",
          controlsClassName,
        )}
      >
        <button
          type="button"
          onClick={pauseVideo}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-2 text-sm font-bold text-primary shadow-md ring-1 ring-primary/10 transition hover:-translate-y-0.5 hover:bg-secondary md:h-10 md:gap-2 md:px-3"
        >
          <Square aria-hidden="true" className="size-4 fill-current" />
          <span className="hidden sm:inline">Stop</span>
        </button>
        <button
          type="button"
          aria-pressed={isPlaying}
          onClick={playVideo}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary/90 md:h-10 md:gap-2 md:px-3"
        >
          <Play aria-hidden="true" className="size-4 fill-current" />
          <span className="hidden sm:inline">Play</span>
        </button>
        <button
          type="button"
          aria-label={isMuted ? "Liberar som" : "Bloquear som"}
          title={isMuted ? "Liberar som" : "Bloquear som"}
          onClick={toggleMuted}
          className="inline-flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-primary/10 transition hover:-translate-y-0.5 hover:bg-secondary md:size-10"
        >
          {isMuted ? (
            <VolumeX aria-hidden="true" className="size-5" />
          ) : (
            <Volume2 aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>
    </article>
  );
}
