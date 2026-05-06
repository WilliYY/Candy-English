import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type InstitutionalSection = {
  title: string;
  text: string;
  icon?: LucideIcon;
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
    <>
      <section className="candy-deep relative isolate overflow-hidden text-white">
        <div className="candy-kinetic-grid absolute inset-0" />
        <div className="relative z-20 mx-auto flex min-h-[420px] w-full max-w-7xl flex-col justify-center gap-7 px-6 py-16 lg:px-8">
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
            className="w-fit bg-[#e57cd8] text-[#2c1338] hover:bg-[#f7a8ed]"
          >
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="relative z-20 mx-auto grid w-full max-w-7xl gap-5 px-6 py-16 md:grid-cols-2 lg:px-8">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="group flex min-h-64 flex-col justify-between rounded-lg border bg-card p-6 transition-transform duration-300 hover:-translate-y-1"
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
    </>
  );
}
