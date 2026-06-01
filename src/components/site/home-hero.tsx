import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeVideoCard } from "@/components/site/home-video-card";
import { Button } from "@/components/ui/button";

export const homeMethodVideoUrl =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

export const homeLoopVideoUrl = "/brand/home.mp4";
export const homeHeroVideoUrl = "/brand/home-candy.mp4";

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
    <section className="candy-home-clean relative isolate flex min-h-screen overflow-hidden text-primary">
      <div className="candy-home-clean-field absolute inset-0 z-0" />
      <div className="absolute inset-x-0 top-0 z-[1] h-44 bg-gradient-to-b from-[#fce5d8]/60 to-transparent" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-center px-4 pb-20 pt-32 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
        <h1 className="sr-only">{title}</h1>
        <p className="sr-only">{description}</p>

        <div className="home-mockup-stage relative mx-auto aspect-video w-full max-w-[70rem] overflow-visible rounded-[2rem] shadow-2xl shadow-primary/15">
          <video
            aria-label="Fundo animado Candy English"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="home-candy-video-bg h-full w-full rounded-[2rem] object-contain"
          >
            <source src={homeHeroVideoUrl} type="video/mp4" />
          </video>
          <HomeVideoCard
            label="Intro Candy English 2"
            src="/brand/intro-2.mp4"
            className="left-[4.1%] top-[11.8%] h-[40.8%] w-[35.4%]"
            controlsClassName="top-[111%] w-[91%]"
          />
          <HomeVideoCard
            label="Intro Candy English 1"
            src="/brand/intro-1.mp4"
            className="left-[38.4%] top-[24%] h-[43.5%] w-[37.5%]"
            controlsClassName="top-[104%] w-[91%]"
          />
        </div>

        <div className="mt-4 flex justify-center sm:mt-5">
          <div className="animate-fade-rise-delay-2 flex flex-col gap-3 sm:flex-row">
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
