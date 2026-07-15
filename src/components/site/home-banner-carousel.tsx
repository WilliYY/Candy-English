"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import type { MouseEvent, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type HomeBannerSlide =
  | {
      description: string;
      id: string;
      label: string;
      src: string;
      title: string;
      type: "image";
    }
  | {
      description: string;
      id: string;
      label: string;
      src: string;
      title: string;
      type: "video";
    };

const AUTO_ROTATE_MS = 8_000;
const DRAG_LIMIT_RATIO = 0.28;
const DRAG_MOVE_GUARD_PX = 8;
const DRAG_THRESHOLD_PX = 48;

const slides: HomeBannerSlide[] = [
  {
    description: "Conheca o jeito Candy de aprender ingles.",
    id: "intro-1",
    label: "Intro Candy English 1",
    src: "/brand/intro-1.mp4",
    title: "Intro 1",
    type: "video",
  },
  {
    description: "Aula em grupo, material pratico e rotina leve.",
    id: "aula-julho-2026",
    label: "Alunos Candy English em aula",
    src: "/brand/home-banner-aula-julho-2026.jpeg",
    title: "Aula Candy",
    type: "image",
  },
  {
    description: "Teacher Milena mostrando como estudar com a Candy.",
    id: "intro-2",
    label: "Intro Candy English 2",
    src: "/brand/intro-2.mp4",
    title: "Intro 2",
    type: "video",
  },
];

const arrowButtonClass =
  "absolute top-1/2 z-20 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/75 bg-white/90 text-primary shadow-[0_0.75rem_1.5rem_rgba(44,19,56,0.22)] outline-none transition hover:-translate-y-[52%] hover:bg-white focus-visible:ring-2 focus-visible:ring-primary sm:size-12";

const videoButtonClass =
  "inline-flex size-10 items-center justify-center rounded-full border border-white/75 bg-white/92 text-primary shadow-[0_0.6rem_1.25rem_rgba(44,19,56,0.22)] outline-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:ring-2 focus-visible:ring-primary";

export function HomeBannerCarousel({ className }: { className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [mutedVideoIds, setMutedVideoIds] = useState<Record<string, boolean>>(
    {},
  );
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const dragStateRef = useRef({
    hasMoved: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
  });
  const suppressNextClickRef = useRef(false);
  const activeSlide = slides[activeIndex] ?? slides[0];
  const activeNumber = activeIndex + 1;

  const videoMutedState = useMemo(() => {
    return Object.fromEntries(
      slides
        .filter((slide) => slide.type === "video")
        .map((slide) => [slide.id, mutedVideoIds[slide.id] ?? true]),
    ) as Record<string, boolean>;
  }, [mutedVideoIds]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function refreshReducedMotion() {
      setPrefersReducedMotion(mediaQuery.matches);
    }

    refreshReducedMotion();
    mediaQuery.addEventListener("change", refreshReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", refreshReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isAutoPaused || isDragging) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTO_ROTATE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeIndex, isAutoPaused, isDragging, prefersReducedMotion]);

  useEffect(() => {
    for (const [slideId, video] of Object.entries(videoRefs.current)) {
      if (slideId !== activeSlide.id && video && !video.paused) {
        video.pause();
      }
    }

    setPlayingVideoId((current) => (current === activeSlide.id ? current : null));
  }, [activeSlide.id]);

  function showSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  function resetDrag(event?: PointerEvent<HTMLDivElement>) {
    const pointerId = dragStateRef.current.pointerId;

    if (event && pointerId !== null && event.currentTarget.hasPointerCapture(pointerId)) {
      event.currentTarget.releasePointerCapture(pointerId);
    }

    dragStateRef.current = {
      hasMoved: false,
      pointerId: null,
      startX: 0,
      startY: 0,
    };
    setDragOffset(0);
    setIsDragging(false);
  }

  function handleCarouselPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const target = event.target;

    if (
      target instanceof Element &&
      target.closest("[data-carousel-control='true']")
    ) {
      return;
    }

    dragStateRef.current = {
      hasMoved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCarouselPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (
      !dragState.hasMoved &&
      Math.abs(deltaX) < DRAG_MOVE_GUARD_PX &&
      Math.abs(deltaY) < DRAG_MOVE_GUARD_PX
    ) {
      return;
    }

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    const stageWidth = stageRef.current?.clientWidth ?? 1;
    const maxOffset = stageWidth * DRAG_LIMIT_RATIO;
    const limitedOffset = Math.max(Math.min(deltaX, maxOffset), -maxOffset);

    event.preventDefault();
    dragState.hasMoved = true;
    setIsDragging(true);
    setDragOffset(limitedOffset);
  }

  function handleCarouselPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const shouldChangeSlide =
      Math.abs(deltaX) >= DRAG_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY);

    if (dragState.hasMoved) {
      suppressNextClickRef.current = true;
    }

    if (shouldChangeSlide) {
      showSlide(deltaX < 0 ? activeIndex + 1 : activeIndex - 1);
    }

    resetDrag(event);
  }

  function handleCarouselClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressNextClickRef.current) {
      return;
    }

    suppressNextClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  async function toggleVideo(slide: Extract<HomeBannerSlide, { type: "video" }>) {
    const video = videoRefs.current[slide.id];

    if (!video) {
      return;
    }

    setIsAutoPaused(true);

    if (!video.paused) {
      video.pause();
      return;
    }

    try {
      await video.play();
    } catch {
      setPlayingVideoId(null);
    }
  }

  function toggleMuted(slide: Extract<HomeBannerSlide, { type: "video" }>) {
    const video = videoRefs.current[slide.id];
    const nextMuted = !(mutedVideoIds[slide.id] ?? true);

    if (video) {
      video.muted = nextMuted;
    }

    setMutedVideoIds((current) => ({
      ...current,
      [slide.id]: nextMuted,
    }));
  }

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[1.35rem] border border-white/85 bg-white/92 p-1.5 shadow-2xl shadow-primary/18 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-primary/24 sm:rounded-[1.65rem]",
        className,
      )}
      aria-label="Banners Candy English"
    >
      <div
        ref={stageRef}
        className={cn(
          "relative aspect-[4/3] touch-pan-y select-none overflow-hidden rounded-[1rem] bg-[#2c1338] sm:aspect-[16/10] sm:rounded-[1.25rem] lg:aspect-[16/9]",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerCancel={resetDrag}
        onClickCapture={handleCarouselClickCapture}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={handleCarouselPointerDown}
        onPointerMove={handleCarouselPointerMove}
        onPointerUp={handleCarouselPointerUp}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(229,124,216,0.42),transparent_32%),linear-gradient(135deg,#2c1338_0%,#412a4c_48%,#6b3a76_100%)]" />

        {slides.map((slide, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={slide.id}
              className={cn(
                "absolute inset-0 grid place-items-center",
                isDragging && isActive
                  ? "transition-none"
                  : "transition duration-500",
                isActive
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0",
              )}
              style={
                isActive && dragOffset !== 0
                  ? { transform: `translate3d(${dragOffset}px, 0, 0)` }
                  : undefined
              }
              aria-hidden={!isActive}
            >
              {slide.type === "image" ? (
                <Image
                  src={slide.src}
                  alt={slide.label}
                  fill
                  draggable={false}
                  sizes="(max-width: 767px) 23rem, 64rem"
                  className="relative z-10 object-contain object-center"
                />
              ) : (
                <button
                  type="button"
                  className="absolute inset-0 z-10 grid cursor-pointer place-items-center p-3 sm:p-5"
                  aria-label={`${playingVideoId === slide.id ? "Pausar" : "Reproduzir"} ${slide.label}`}
                  onClick={() => {
                    void toggleVideo(slide);
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(229,124,216,0.18),transparent_22%,transparent_78%,rgba(229,124,216,0.18))]"
                  />
                  <video
                    ref={(node) => {
                      videoRefs.current[slide.id] = node;
                    }}
                    aria-label={slide.label}
                    loop
                    muted={videoMutedState[slide.id]}
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 z-10 h-full w-full bg-[#4c245e] object-contain object-center"
                    onPlay={() => {
                      setIsAutoPaused(true);
                      setPlayingVideoId(slide.id);
                    }}
                    onPause={() => {
                      setPlayingVideoId((current) =>
                        current === slide.id ? null : current,
                      );
                    }}
                  >
                    <source src={slide.src} type="video/mp4" />
                  </video>
                  {playingVideoId !== slide.id ? (
                    <span className="absolute inset-0 z-20 grid place-items-center bg-black/10 text-white transition group-hover:bg-black/5">
                      <span className="inline-flex size-16 items-center justify-center rounded-full border border-white/80 bg-white/92 text-primary shadow-2xl shadow-black/20">
                        <Play aria-hidden="true" className="size-7" />
                      </span>
                    </span>
                  ) : null}
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          aria-label="Banner anterior"
          data-carousel-control="true"
          className={cn(arrowButtonClass, "left-3 sm:left-4")}
          onClick={() => showSlide(activeIndex - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Proximo banner"
          data-carousel-control="true"
          className={cn(arrowButtonClass, "right-3 sm:right-4")}
          onClick={() => showSlide(activeIndex + 1)}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>

        {activeSlide.type === "video" ? (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 sm:bottom-4 sm:right-4">
            <button
              type="button"
              data-carousel-control="true"
              aria-label={
                playingVideoId === activeSlide.id
                  ? `Pausar ${activeSlide.label}`
                  : `Reproduzir ${activeSlide.label}`
              }
              className={videoButtonClass}
              onClick={(event) => {
                event.stopPropagation();
                void toggleVideo(activeSlide);
              }}
            >
              {playingVideoId === activeSlide.id ? (
                <Pause aria-hidden="true" className="size-4" />
              ) : (
                <Play aria-hidden="true" className="size-4" />
              )}
            </button>
            <button
              type="button"
              data-carousel-control="true"
              aria-label={
                videoMutedState[activeSlide.id]
                  ? `Ligar som de ${activeSlide.label}`
                  : `Desligar som de ${activeSlide.label}`
              }
              className={videoButtonClass}
              onClick={(event) => {
                event.stopPropagation();
                toggleMuted(activeSlide);
              }}
            >
              {videoMutedState[activeSlide.id] ? (
                <VolumeX aria-hidden="true" className="size-4" />
              ) : (
                <Volume2 aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-3 pb-3 pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black leading-tight text-primary sm:text-lg">
              {activeSlide.title}
            </h2>
            <span className="rounded-full border border-primary/10 bg-secondary/80 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary">
              {activeNumber} de {slides.length}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold leading-5 text-muted-foreground">
            {activeSlide.description}
          </p>
        </div>

        <div
          className="flex shrink-0 items-center justify-center gap-2"
          aria-label="Indicadores do banner"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Mostrar banner ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={cn(
                "size-2.5 rounded-full border border-primary/20 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                index === activeIndex
                  ? "w-7 bg-primary"
                  : "bg-primary/18 hover:bg-primary/35",
              )}
              onClick={() => showSlide(index)}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
