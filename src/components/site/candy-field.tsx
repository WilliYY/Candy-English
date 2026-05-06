"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";

const CANDY_COUNT = 25;
const gifSprites = [
  { src: "/media/sprites/gato-hapy.gif", size: 248 },
  { src: "/media/sprites/mario.gif", size: 232 },
  { src: "/media/sprites/nyan.gif", size: 384 },
  { src: "/media/sprites/pato.gif", size: 272 },
  { src: "/media/sprites/toothless.gif", size: 296 },
];

type FloatingItem = {
  damping: number;
  maxSpeed: number;
  phase: number;
  repelForce: number;
  repelRadius: number;
  rotation: number;
  size: number;
  src: string;
  wanderForce: number;
  wanderSpeed: number;
  x: number;
  y: number;
};

type FloatingState = {
  rotation: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.37 + salt * 41.19) * 10000;

  return value - Math.floor(value);
}

function createCandy(index: number): FloatingItem {
  return {
    damping: 0.93,
    maxSpeed: 42 + seeded(index, 7) * 24,
    phase: seeded(index, 3) * Math.PI * 2,
    repelForce: 540,
    repelRadius: 150,
    rotation: seeded(index, 8) * 360,
    size: 28 + Math.round(seeded(index, 1) * 24),
    src: "/brand/candy-bala.svg",
    wanderForce: 64 + seeded(index, 4) * 42,
    wanderSpeed: 0.00034 + seeded(index, 5) * 0.00018,
    x: 4 + seeded(index, 11) * 92,
    y: 8 + seeded(index, 12) * 82,
  };
}

function createGifSprite(index: number): FloatingItem {
  const sprite = gifSprites[index % gifSprites.length];
  const offset = CANDY_COUNT + index;

  return {
    damping: 0.9,
    maxSpeed: 58 + seeded(offset, 7) * 32,
    phase: seeded(offset, 3) * Math.PI * 2,
    repelForce: 720,
    repelRadius: 260,
    rotation: seeded(offset, 8) * 18 - 9,
    size: sprite.size,
    src: sprite.src,
    wanderForce: 88 + seeded(offset, 4) * 50,
    wanderSpeed: 0.0002 + seeded(offset, 5) * 0.00012,
    x: 6 + seeded(offset, 11) * 82,
    y: 10 + seeded(offset, 12) * 72,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function CandyField() {
  const items = useMemo(
    () => [
      ...Array.from({ length: CANDY_COUNT }, (_, index) =>
        createCandy(index),
      ),
      ...Array.from({ length: gifSprites.length * 2 }, (_, index) =>
        createGifSprite(index),
      ),
    ],
    [],
  );
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const states = useRef<Array<FloatingState | null>>([]);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduced.matches) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      mouse.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    function handlePointerLeave() {
      mouse.current = { x: -9999, y: -9999 };
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    let lastTime = 0;
    let frame = 0;

    function animate(time: number) {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.035) : 0.016;

      lastTime = time;

      items.forEach((item, index) => {
        const element = refs.current[index];

        if (!element) return;

        if (!states.current[index]) {
          states.current[index] = {
            rotation: item.rotation,
            vx: Math.cos(item.phase) * item.maxSpeed * 0.25,
            vy: Math.sin(item.phase) * item.maxSpeed * 0.25,
            x: (item.x / 100) * width,
            y: (item.y / 100) * height,
          };
        }

        const state = states.current[index];
        const centerX = state.x + item.size / 2;
        const centerY = state.y + item.size / 2;
        const dx = centerX - mouse.current.x;
        const dy = centerY - mouse.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repel =
          distance < item.repelRadius
            ? (1 - distance / item.repelRadius) ** 2
            : 0;
        const safeDistance = distance || 1;
        const edge = 70;
        const maxX = Math.max(width - item.size, 0);
        const maxY = Math.max(height - item.size, 0);
        const edgeForceX =
          state.x < edge
            ? (edge - state.x) * 4
            : state.x > maxX - edge
              ? (maxX - edge - state.x) * 4
              : 0;
        const edgeForceY =
          state.y < edge
            ? (edge - state.y) * 4
            : state.y > maxY - edge
              ? (maxY - edge - state.y) * 4
              : 0;
        const wanderX =
          Math.sin(time * item.wanderSpeed + item.phase) * item.wanderForce +
          Math.sin(time * item.wanderSpeed * 0.37 + item.phase * 2) *
            item.wanderForce *
            0.45;
        const wanderY =
          Math.cos(time * item.wanderSpeed * 1.23 + item.phase) *
            item.wanderForce +
          Math.sin(time * item.wanderSpeed * 0.53 + item.phase * 3) *
            item.wanderForce *
            0.35;

        state.vx +=
          (wanderX +
            edgeForceX +
            (dx / safeDistance) * repel * item.repelForce) *
          delta;
        state.vy +=
          (wanderY +
            edgeForceY +
            (dy / safeDistance) * repel * item.repelForce) *
          delta;

        const damping = item.damping ** (delta * 60);

        state.vx *= damping;
        state.vy *= damping;

        const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);

        if (speed > item.maxSpeed) {
          state.vx = (state.vx / speed) * item.maxSpeed;
          state.vy = (state.vy / speed) * item.maxSpeed;
        }

        state.x = clamp(state.x + state.vx * delta, -item.size * 0.12, maxX);
        state.y = clamp(state.y + state.vy * delta, -item.size * 0.12, maxY);
        state.rotation += state.vx * 0.006 * delta;

        element.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg)`;
      });

      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {items.map((item, index) => (
        <div
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className="absolute left-0 top-0 opacity-80 drop-shadow-sm will-change-transform"
          style={{
            height: item.size,
            transform: `translate3d(${item.x}vw, ${item.y}vh, 0) rotate(${item.rotation}deg)`,
            width: item.size,
          }}
        >
          <Image
            src={item.src}
            alt=""
            width={128}
            height={128}
            unoptimized
            className="size-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}
