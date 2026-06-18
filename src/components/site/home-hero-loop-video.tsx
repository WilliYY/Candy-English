"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type HomeHeroLoopVideoProps = {
  className?: string;
  label: string;
  media?: string;
  src: string;
};

export function HomeHeroLoopVideo({
  className,
  label,
  media,
  src,
}: HomeHeroLoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const startMutedLoop = async () => {
      try {
        await video.play();
      } catch {
        // Browser can still require a user gesture in unusual contexts.
      }
    };

    video.addEventListener("canplay", startMutedLoop, { once: true });
    void startMutedLoop();

    return () => {
      video.removeEventListener("canplay", startMutedLoop);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      aria-label={label}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      className={cn(
        "home-candy-video-bg block h-full min-h-[inherit] w-full flex-1 bg-white object-contain",
        className,
      )}
    >
      <source src={src} type="video/mp4" media={media} />
    </video>
  );
}
