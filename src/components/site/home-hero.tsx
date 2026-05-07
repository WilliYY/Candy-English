import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const heroVideoUrl =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

type HomeHeroProps = {
  content?: {
    ctaLabel: string;
    description: string;
    title: string;
  };
};

export function HomeHero({ content }: HomeHeroProps) {
  const title = content?.title ?? "Fale ingles com clareza, rotina e feedback.";
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
        className="absolute inset-0 z-0 h-full w-full object-cover"
      >
        <source src={heroVideoUrl} type="video/mp4" />
      </video>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-6 pb-28 pt-36 text-center sm:pb-36 sm:pt-44 lg:px-8">
        <div className="flex min-w-0 flex-col items-center gap-7">
          <div className="liquid-glass animate-fade-rise inline-flex w-fit max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/88">
            <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
            Ingles vivo, organizado e acompanhado
          </div>

          <div className="flex flex-col items-center gap-6">
            <p className="animate-fade-rise text-sm font-medium uppercase tracking-[0.24em] text-white/78">
              Candy English
            </p>
            <h1
              className="animate-fade-rise max-w-6xl break-words text-5xl font-normal leading-[1.02] tracking-normal text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.34)] sm:text-6xl md:text-7xl lg:text-8xl"
              style={{ fontFamily: "var(--font-display)" }}
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
              className="liquid-glass rounded-full bg-white/[0.03] px-14 py-5 text-base text-white transition-transform hover:scale-[1.03] hover:bg-white/10"
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
              className="liquid-glass rounded-full bg-white/[0.03] px-10 py-5 text-base text-white transition-transform hover:scale-[1.03] hover:bg-white/10"
            >
              <Link href="/ava">Entrar no AVA</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
