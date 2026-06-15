"use client";

import { useEffect, useRef, useState } from "react";

type InstitutionalBackgroundVideoProps = {
  src: string;
};

type WindowWithIdleCallback = Window &
  typeof globalThis & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
  };

const VIDEO_BREAKPOINT_QUERY = "(min-width: 768px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function InstitutionalBackgroundVideo({
  src,
}: InstitutionalBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canUseVideo, setCanUseVideo] = useState(false);
  const [shouldMountVideo, setShouldMountVideo] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia(VIDEO_BREAKPOINT_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    function updateVideoPreference() {
      setCanUseVideo(desktopQuery.matches && !reducedMotionQuery.matches);
    }

    updateVideoPreference();
    desktopQuery.addEventListener("change", updateVideoPreference);
    reducedMotionQuery.addEventListener("change", updateVideoPreference);

    return () => {
      desktopQuery.removeEventListener("change", updateVideoPreference);
      reducedMotionQuery.removeEventListener("change", updateVideoPreference);
    };
  }, []);

  useEffect(() => {
    if (!canUseVideo) {
      setShouldMountVideo(false);
      return;
    }

    const idleWindow = window as WindowWithIdleCallback;
    let timeoutHandle: number | null = null;
    let idleHandle: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(
        () => setShouldMountVideo(true),
        { timeout: 1200 },
      );
    } else {
      timeoutHandle = window.setTimeout(() => setShouldMountVideo(true), 700);
    }

    return () => {
      if (idleHandle !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [canUseVideo]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !canUseVideo || !shouldMountVideo) {
      return;
    }

    const backgroundVideo = video;
    let isVisible = true;

    backgroundVideo.playbackRate = 0.85;

    async function playVideo() {
      if (!isVisible || !backgroundVideo.paused) {
        return;
      }

      try {
        await backgroundVideo.play();
      } catch {
        // Autoplay can be blocked by the browser; the static fallback remains visible.
      }
    }

    function pauseVideo() {
      if (!backgroundVideo.paused) {
        backgroundVideo.pause();
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = Boolean(entry?.isIntersecting);

        if (isVisible) {
          void playVideo();
        } else {
          pauseVideo();
        }
      },
      { threshold: 0.08 },
    );

    observer.observe(backgroundVideo);
    void playVideo();

    return () => {
      observer.disconnect();
      pauseVideo();
    };
  }, [canUseVideo, shouldMountVideo]);

  return (
    <>
      <div className="site-institutional-video-fallback absolute inset-0 -z-20" />
      {canUseVideo && shouldMountVideo ? (
        <video
          ref={videoRef}
          aria-hidden="true"
          className="site-institutional-video absolute inset-0 -z-20 h-full w-full object-cover"
          disablePictureInPicture
          loop
          muted
          playsInline
          preload="none"
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : null}
    </>
  );
}
