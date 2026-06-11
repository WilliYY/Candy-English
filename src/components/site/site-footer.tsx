import Link from "next/link";
import type { CSSProperties } from "react";
import { BrandLogo } from "@/components/site/brand-logo";

const footerBubbles = Array.from({ length: 72 }, (_, index) => {
  const size = 2.4 + ((index * 17) % 48) / 10;
  const distance = 6.5 + ((index * 23) % 62) / 10;
  const position = -6 + ((index * 37) % 112);
  const time = 3.2 + ((index * 19) % 28) / 10;
  const delay = -1 * (1.8 + ((index * 29) % 32) / 10);

  return {
    "--size": `${size.toFixed(1)}rem`,
    "--distance": `${distance.toFixed(1)}rem`,
    "--lift-mid": `-${(distance * 0.55).toFixed(1)}rem`,
    "--lift": `-${distance.toFixed(1)}rem`,
    "--position": `${position}%`,
    "--time": `${time.toFixed(1)}s`,
    "--delay": `${delay.toFixed(1)}s`,
  } as CSSProperties;
});

export function SiteFooter() {
  return (
    <footer className="candy-footer relative isolate -mt-40 overflow-visible text-white md:-mt-44 lg:-mt-48">
      <svg className="hidden" aria-hidden="true" focusable="false">
        <defs>
          <filter id="candy-footer-blob">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="blob"
            />
          </filter>
        </defs>
      </svg>
      <div className="candy-footer-bubbles" aria-hidden="true">
        {footerBubbles.map((style, index) => (
          <span className="candy-footer-bubble" key={index} style={style} />
        ))}
      </div>
      <div className="candy-footer-content relative z-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-32 pt-14 md:grid-cols-[1fr_1fr] md:items-end md:pb-12 md:pt-12 lg:px-8">
          <div className="flex flex-col gap-4">
            <BrandLogo
              className="-ml-3 h-[5.25rem] w-[320px] overflow-visible"
              imageClassName="w-[400px]"
              variant="light"
            />
          </div>
          <nav
            aria-label="Rodape"
            className="flex flex-wrap gap-4 text-sm text-white/70 md:justify-end"
          >
            <Link className="hover:text-white" href="/sobre">
              Sobre
            </Link>
            <Link className="hover:text-white" href="/metodologia">
              Metodologia
            </Link>
            <Link className="hover:text-white" href="/contato">
              Contato
            </Link>
            <Link className="hover:text-white" href="/ava">
              AVA
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
