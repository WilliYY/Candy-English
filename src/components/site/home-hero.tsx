import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const activity = [
  "Speaking",
  "Homework",
  "Feedback",
  "Vocabulary",
  "Confidence",
  "Fluency",
];

type HomeHeroProps = {
  content?: {
    ctaLabel: string;
    description: string;
    title: string;
  };
};

export function HomeHero({ content }: HomeHeroProps) {
  return (
    <section className="candy-deep relative isolate min-h-[calc(100svh-5rem)] overflow-hidden text-white">
      <video
        className="absolute inset-0 size-full object-cover opacity-35"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src="/media/nuvem-fundo.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#2c1338]/72" />
      <div className="candy-kinetic-grid absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#fefbfa] to-transparent" />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 pb-16 pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-16">
        <div className="candy-reveal flex max-w-3xl flex-col justify-center gap-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 backdrop-blur">
            <CheckCircle2 aria-hidden="true" />
            Ingles vivo, organizado e acompanhado
          </div>

          <div className="flex flex-col gap-5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#e57cd8]">
              Candy English
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-normal sm:text-6xl lg:text-7xl">
              {content?.title ?? "Fale ingles com clareza, rotina e feedback."}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/75 md:text-lg">
              {content?.description ??
                "Aulas personalizadas com materiais, vocabulario, homework online e devolutivas em um AVA proprio para acompanhar cada passo."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-[#e57cd8] text-[#2c1338] hover:bg-[#f7a8ed]"
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
              className="border-white/25 bg-white/10 text-white hover:bg-white hover:text-[#2c1338]"
            >
              <Link href="/ava">Entrar no AVA</Link>
            </Button>
          </div>
        </div>

        <div className="candy-reveal-delay relative min-h-[420px] lg:min-h-[560px]">
          <div className="absolute right-0 top-0 hidden w-[74%] overflow-hidden rounded-lg border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur md:block candy-float-slow">
            <div className="mb-5 flex items-center justify-between text-sm text-white/70">
              <span>Aula de hoje</span>
              <span>19:00</span>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-white p-5 text-[#2c1338]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <BookOpen aria-hidden="true" />
                  Simple past in conversation
                </div>
                <p className="text-sm leading-6 text-[#6b5a74]">
                  Revisao guiada, vocabulario de rotina e pratica oral com
                  perguntas abertas.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#fce5d8] p-4 text-[#2c1338]">
                  <strong className="text-2xl">12</strong>
                  <p className="text-sm">termos novos</p>
                </div>
                <div className="rounded-lg bg-[#e57cd8] p-4 text-[#2c1338]">
                  <strong className="text-2xl">1</strong>
                  <p className="text-sm">homework</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-0 w-[78%] max-w-md rounded-lg border border-white/15 bg-white p-5 text-[#2c1338] shadow-2xl candy-float-medium">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#412a4c] text-white">
                <MessageSquareText aria-hidden="true" />
              </span>
              <div>
                <strong>Feedback enviado</strong>
                <p className="text-sm text-[#6b5a74]">Pronunciation + fluency</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-[#6b5a74]">
              Great progress. Next class: connect your answers with more detail
              and natural transitions.
            </p>
          </div>

          <Image
            src="/brand/logo-3.svg"
            alt="Marca Candy English"
            width={520}
            height={650}
            priority
            unoptimized
            className="absolute left-[42%] top-8 hidden h-auto w-[42%] -translate-x-1/2 opacity-95 md:block"
          />
        </div>
      </div>

      <div className="relative border-y border-white/10 bg-white/10 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
        <div className="candy-marquee flex w-[200%] gap-10 whitespace-nowrap">
          {[...activity, ...activity, ...activity, ...activity].map(
            (item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
