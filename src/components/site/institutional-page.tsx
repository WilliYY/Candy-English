import type { ComponentType, SVGProps } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type InstitutionalSection = {
  title: string;
  text: string;
  icon?: IconComponent;
};

type InstitutionalPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  sections: InstitutionalSection[];
  ctaLabel?: string;
  ctaHref?: string;
};

export function InstitutionalPage({
  ctaHref = "/contato",
  ctaLabel = "Falar com a Candy",
  description,
  eyebrow,
  sections,
  title,
}: InstitutionalPageProps) {
  return (
    <div className="relative isolate overflow-hidden bg-primary text-white">
      <video
        aria-label="Fundo em video das informacoes Candy English"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      >
        <source src="/brand/informacoes.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(39,14,50,0.82),rgba(39,14,50,0.58)_42%,rgba(39,14,50,0.9))]" />

      <section className="relative overflow-hidden">
        <div className="candy-kinetic-grid absolute inset-0 opacity-45" />
        <div className="relative z-20 mx-auto flex min-h-[500px] w-full max-w-7xl flex-col justify-center gap-7 px-6 py-20 lg:px-8">
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-[#e57cd8]">
            {eyebrow}
          </span>
          <h1 className="max-w-5xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
            {title}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-white/75 md:text-lg">
            {description}
          </p>
          <Button
            asChild
            size="lg"
            className="w-fit bg-white text-primary hover:bg-white/90"
          >
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="relative border-y border-white/15 bg-white/10 backdrop-blur-sm">
        <div className="relative z-20 mx-auto grid w-full max-w-7xl gap-5 px-6 py-16 md:grid-cols-2 lg:px-8">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="group flex min-h-64 flex-col justify-between rounded-lg border border-white/35 bg-white/88 p-6 text-foreground shadow-2xl shadow-black/10 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-4">
                  {section.icon ? (
                    <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-primary">
                      <section.icon aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-2xl font-semibold tracking-normal">
                    {section.title}
                  </h2>
                  <p className="leading-7 text-muted-foreground">
                    {section.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
