import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const homeMethodVideoUrl =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

const heroVideoUrl = "/brand/home.mp4";

type HomeHeroProps = {
  content?: {
    ctaLabel: string;
    description: string;
    title: string;
  };
};

export function HomeHero({ content }: HomeHeroProps) {
  const title =
    content?.title ?? "Fale ingles com aulas personalizadas e no seu estilo!";
  const description =
    content?.description ??
    "Aulas personalizadas com materiais, vocabulario, homework online e devolutivas em um AVA proprio para acompanhar cada passo.";

  return (
    <section className="relative isolate flex min-h-screen overflow-hidden text-white">
      <video
        aria-label="Fundo em video da Candy English"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 z-0 h-full w-full object-cover"
      >
        <source src={heroVideoUrl} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(12,4,20,0.16),rgba(12,4,20,0.04)_42%,rgba(12,4,20,0.22))]" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 pb-28 pt-36 text-center sm:pb-36 sm:pt-44 lg:px-8">
        <div className="flex min-w-0 flex-col items-center gap-7">
          <div className="hero-copy-glass flex max-w-6xl flex-col items-center gap-6 rounded-[2rem] border border-white/20 bg-primary/42 px-5 py-7 text-white shadow-2xl shadow-black/20 backdrop-blur-md sm:px-8 sm:py-8 lg:px-10">
            <p className="animate-fade-rise text-sm font-medium uppercase tracking-[0.24em] text-white/78">
              Candy English
            </p>
            <h1
              className="animate-fade-rise max-w-6xl break-words text-5xl font-bold leading-[1.02] tracking-normal text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.34)] sm:text-6xl md:text-7xl lg:text-8xl"
              style={{ fontFamily: "var(--font-display-rounded)" }}
            >
              {title}
            </h1>
            <p className="animate-fade-rise-delay mt-2 max-w-2xl break-words text-base font-medium leading-relaxed text-white/80 sm:text-lg">
              {description}
            </p>
          </div>

          <div className="animate-fade-rise-delay-2 mt-5 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white px-14 py-5 text-base font-semibold text-primary shadow-2xl shadow-black/20 transition-transform hover:scale-[1.03] hover:bg-white/90"
            >
              <Link href="/contato">
                {content?.ctaLabel ?? "Comecar conversa"}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/70 bg-[#14071b] px-10 py-5 text-base font-semibold text-white shadow-2xl shadow-black/20 transition-transform hover:scale-[1.03] hover:bg-[#21102a] hover:text-white"
            >
              <Link href="/ava">Entrar no AVA</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
