import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeHeroLoopVideo } from "@/components/site/home-hero-loop-video";
import { HomeVideoCard } from "@/components/site/home-video-card";
import { Button } from "@/components/ui/button";

export const homeMethodVideoUrl =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

export const homeLoopVideoUrl = "/brand/home.mp4";
export const homeHeroVideoUrl = "/brand/home-candy-2.mp4";

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

      <div className="relative z-10 mx-auto flex w-full max-w-[98rem] flex-col justify-center px-3 pb-20 pt-28 sm:px-5 sm:pb-24 sm:pt-32 lg:px-8">
        <h1 className="sr-only">{title}</h1>
        <p className="sr-only">{description}</p>

        <div className="mx-auto w-full max-w-[82rem]">
          <div className="animate-fade-rise relative isolate aspect-[4/5] min-h-[34rem] overflow-hidden rounded-[2rem] border border-white/80 bg-white p-1.5 shadow-2xl shadow-primary/14 backdrop-blur-sm sm:aspect-[16/11] sm:min-h-[43rem] lg:aspect-[16/9] lg:min-h-0">
            <div className="absolute inset-2 overflow-hidden rounded-[1.5rem] bg-white">
              <HomeHeroLoopVideo
                label="Home Candy English"
                src={homeHeroVideoUrl}
                className="absolute inset-0 rounded-[1.5rem] object-top scale-[1.01] sm:scale-[1.025] lg:scale-[1.035]"
              />
            </div>

            <div className="pointer-events-none absolute inset-2 z-[1] rounded-[1.5rem] bg-[linear-gradient(90deg,rgba(255,255,255,0.14),transparent_35%,rgba(255,255,255,0.18))]" />

            <div className="animate-fade-rise-delay relative z-10 grid min-h-[32rem] content-end gap-3 p-3 pt-44 sm:min-h-[41rem] sm:grid-cols-2 sm:p-5 sm:pt-56 lg:absolute lg:bottom-[6.5%] lg:left-[6%] lg:min-h-0 lg:w-[70%] lg:max-w-[64rem] lg:gap-4 lg:p-0 xl:bottom-[7%] xl:left-[6%] xl:w-[69%]">
              <HomeVideoCard
                label="Intro Candy English 1"
                src="/brand/intro-1.mp4"
                title="Intro 1"
                variant="embedded"
              />
              <HomeVideoCard
                label="Intro Candy English 2"
                src="/brand/intro-2.mp4"
                title="Intro 2"
                variant="embedded"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center sm:mt-5">
          <div className="animate-fade-rise-delay-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full rounded-full bg-white px-10 py-5 text-base font-semibold text-primary shadow-2xl shadow-black/20 transition-transform hover:scale-[1.03] hover:bg-white/90 sm:w-auto sm:px-14"
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
              className="w-full rounded-full border-white/70 bg-[#14071b] px-10 py-5 text-base font-semibold text-white shadow-2xl shadow-black/20 transition-transform hover:scale-[1.03] hover:bg-[#21102a] hover:text-white sm:w-auto"
            >
              <Link href="/ava">Entrar no AVA</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
