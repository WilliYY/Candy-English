"use client";

import { useEffect, useRef, useState } from "react";

type InstitutionalBackgroundVideoProps = {
  src: string;
};

const VIDEO_BREAKPOINT_QUERY = "(min-width: 768px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function InstitutionalBackgroundVideo({
  src,
}: InstitutionalBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canUseVideo, setCanUseVideo] = useState(false);

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
    const video = videoRef.current;

    if (!video || !canUseVideo) {
      return;
    }

    const backgroundVideo = video;
    let isVisible = true;

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
  }, [canUseVideo]);

  return (
    <>
      <div className="site-institutional-video-fallback absolute inset-0 -z-20" />
      {canUseVideo ? (
        <video
          ref={videoRef}
          aria-hidden="true"
          autoPlay
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
