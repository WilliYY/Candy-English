import Link from "next/link";
import type { CSSProperties } from "react";

const footerBubbles = Array.from({ length: 128 }, (_, index) => {
  const size = 1.6 + ((index * 17) % 46) / 10;
  const distance = 3 + ((index * 23) % 13);
  const position = (index * 37) % 100;
  const time = 5.5 + ((index * 19) % 70) / 10;
  const delay = -1 * (((index * 29) % 90) / 10);

  return {
    "--size": `${size.toFixed(1)}rem`,
    "--distance": `${distance.toFixed(1)}rem`,
    "--position": `${position}%`,
    "--time": `${time.toFixed(1)}s`,
    "--delay": `${delay.toFixed(1)}s`,
  } as CSSProperties;
});

export function SiteFooter() {
  return (
    <footer className="candy-footer relative isolate overflow-hidden border-t border-[#e57cd8]/25 bg-[#2c1338] text-white">
      <svg className="hidden" aria-hidden="true" focusable="false">
        <defs>
          <filter id="candy-footer-blob">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <div className="candy-footer-bubbles" aria-hidden="true">
        {footerBubbles.map((style, index) => (
          <span className="candy-footer-bubble" key={index} style={style} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-gradient-to-b from-[#e57cd8]/18 via-[#fce5d8]/8 to-transparent" />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-6 pb-32 pt-32 md:grid-cols-[1fr_1fr] md:items-end md:pb-12 md:pt-28 lg:px-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="w-fit text-2xl font-semibold tracking-normal text-white"
          >
            Candy English
          </Link>
          <p className="max-w-md text-sm font-semibold uppercase tracking-[0.18em] text-[#e57cd8]">
            Aprender ingles nunca foi tao doce
          </p>
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
    </footer>
  );
}
