"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";

const CANDY_COUNT = 25;
const gifSprites = [
  { src: "/media/sprites/gato-hapy.gif", size: 62 },
  { src: "/media/sprites/mario.gif", size: 58 },
  { src: "/media/sprites/nyan.gif", size: 96 },
  { src: "/media/sprites/pato.gif", size: 68 },
  { src: "/media/sprites/toothless.gif", size: 74 },
];

type FloatingItem = {
  delay: number;
  drift: number;
  size: number;
  speed: number;
  src: string;
  x: number;
  y: number;
};

function createCandy(index: number): FloatingItem {
  return {
    delay: index * 0.37,
    drift: 18 + (index % 7) * 5,
    size: 26 + (index % 5) * 6,
    speed: 0.00018 + (index % 6) * 0.000025,
    src: "/brand/candy-bala.svg",
    x: ((index * 37) % 96) + 2,
    y: ((index * 53) % 86) + 6,
  };
}

function createGifSprite(index: number): FloatingItem {
  const sprite = gifSprites[index % gifSprites.length];
  const offset = CANDY_COUNT + index;

  return {
    delay: offset * 0.41,
    drift: 34 + (index % 4) * 8,
    size: sprite.size,
    speed: 0.00014 + (index % 5) * 0.000028,
    src: sprite.src,
    x: ((offset * 29) % 88) + 6,
    y: ((offset * 47) % 78) + 10,
  };
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
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduced.matches) {
      return;
    }

    function handleMouseMove(event: MouseEvent) {
      mouse.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let frame = 0;

    function animate(time: number) {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;

      items.forEach((item, index) => {
        const element = refs.current[index];

        if (!element) return;

        const baseX = Math.max(
          0,
          ((item.x / 100) * width +
            Math.sin(time * item.speed + item.delay) * item.drift) %
            width,
        );
        const baseY =
          ((item.y / 100) * height +
            Math.cos(time * item.speed * 1.7 + item.delay) * item.drift) %
          height;
        const dx = baseX - mouse.current.x;
        const dy = baseY - mouse.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repel = distance < 150 ? (150 - distance) / 150 : 0;
        const safeDistance = distance || 1;
        const offsetX = (dx / safeDistance) * repel * 90;
        const offsetY = (dy / safeDistance) * repel * 90;

        element.style.transform = `translate3d(${baseX + offsetX}px, ${baseY + offsetY}px, 0) rotate(${Math.sin(time * item.speed + index) * 24}deg)`;
      });

      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
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
          className="absolute left-0 top-0 opacity-75 drop-shadow-sm"
          style={{ height: item.size, width: item.size }}
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
