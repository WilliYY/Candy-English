import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Instagram,
  Mail,
  MessageSquareText,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  HomeHero,
  homeLoopVideoUrl,
  homeMethodVideoUrl,
} from "@/components/site/home-hero";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { getSitePageContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const workflow = [
  {
    title: "A aula nasce com objetivo",
    description: "Teacher registra tema, resumo, data, material e vocabulario.",
    icon: ClipboardCheck,
  },
  {
    title: "O aluno pratica no AVA",
    description: "Cada homework aparece na area student, pronta para resposta.",
    icon: BookOpen,
  },
  {
    title: "Feedback fecha o ciclo",
    description: "A correcao fica salva para orientar a proxima etapa.",
    icon: MessageSquareText,
  },
];

const whatsappUrl =
  "https://wa.me/5544997382355?text=Ol%C3%A1%21%20Tenho%20interesse%20em%20mais%20informa%C3%A7%C3%B5es";

const contactLinks = [
  {
    description:
      "Canal principal para tirar duvidas e combinar proximos passos.",
    detail: "+55 44 99738-2355",
    href: whatsappUrl,
    icon: WhatsAppIcon,
    label: "WhatsApp",
  },
  {
    description: "Rotina da escola, avisos e bastidores das aulas.",
    detail: "@candyenglish.oficial",
    href: "https://www.instagram.com/candyenglish.oficial/",
    icon: Instagram,
    label: "Instagram",
  },
  {
    description: "Melhor para propostas, documentos e assuntos mais longos.",
    detail: "candyenglishbr@gmail.com",
    href: "mailto:candyenglishbr@gmail.com",
    icon: Mail,
    label: "Email",
  },
];

type HomePageProps = {
  searchParams?: Promise<{
    cadastro?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const content = await getSitePageContent("home");
  const showRegistrationSuccess = params?.cadastro === "sucesso";

  return (
    <>
      {showRegistrationSuccess ? (
        <div className="fixed inset-x-0 top-4 z-50 px-4 pt-[env(safe-area-inset-top)] sm:top-5">
          <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-emerald-200 bg-white/96 px-4 py-3 text-primary shadow-2xl shadow-primary/18 ring-1 ring-white/80 backdrop-blur-md">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-900">
                Cadastro enviado com sucesso.
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                A equipe Candy vai analisar seus dados e entrar em contato.
              </p>
            </div>
            <Link
              href="/"
              aria-label="Fechar aviso de cadastro enviado"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-primary/60 transition hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <X aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      ) : null}

      <HomeHero content={content} />

      <section className="home-method-video-section relative isolate flex overflow-hidden border-b text-white">
        <video
          aria-label="Fundo em video para metodologia Candy English"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="home-method-video absolute inset-0 -z-20 h-full w-full object-cover"
        >
          <source src={homeMethodVideoUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(43,18,55,0.68),rgba(43,18,55,0.34)_50%,rgba(43,18,55,0.58))]" />
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-28 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-8">
          <div className="flex flex-col gap-5">
            <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">
              Metodologia
            </span>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Uma rotina de ingles que nao se perde depois da aula.
            </h2>
            <p className="max-w-xl text-base leading-8 text-white/78">
              A Candy English combina aula personalizada, pratica guiada e
              feedback registrado para o aluno saber exatamente o que fazer em
              seguida.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {workflow.map((item) => (
              <article
                key={item.title}
                className="flex min-h-72 flex-col justify-between rounded-lg border border-white/30 bg-white/90 p-6 text-primary shadow-2xl shadow-black/15 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-white/70 hover:bg-white"
              >
                <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <item.icon aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-3">
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#fef7f3] pb-44 lg:pb-52">
        <video
          aria-label="Fundo em video para contato Candy English"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="home-final-video absolute inset-0 z-0 h-full w-full object-cover"
        >
          <source
            src={homeLoopVideoUrl}
            type="video/mp4"
            media="(prefers-reduced-motion: no-preference)"
          />
        </video>
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(254,247,243,0.88),rgba(254,247,243,0.68)_48%,rgba(254,247,243,0.9))]" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-white/82 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur">
              <WhatsAppIcon className="size-4" />
              Contatos Candy English
            </span>
            <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
              Fale com a Candy por onde for mais facil.
            </h2>
            <p className="max-w-lg text-base leading-8 text-muted-foreground md:text-lg">
              WhatsApp para conversa rapida e canais sociais para acompanhar
              avisos, rotina de aulas e novidades da escola.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-fit rounded-full px-7 shadow-lg shadow-primary/15"
              >
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  Falar no WhatsApp
                  <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-fit rounded-full border-primary/20 bg-white/72 px-7 text-primary hover:bg-white"
              >
                <a href="mailto:candyenglishbr@gmail.com">
                  Enviar email
                  <Mail aria-hidden="true" className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <a
              href={contactLinks[0].href}
              target="_blank"
              rel="noreferrer"
              className="group relative min-h-80 overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground shadow-2xl shadow-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-primary/25"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-white/70 to-secondary" />
              <span className="absolute bottom-0 right-0 h-28 w-28 translate-x-10 translate-y-10 rounded-tl-full border-l border-t border-white/10 bg-white/5" />
              <span className="relative flex h-full flex-col justify-between gap-10">
                <span className="flex items-start justify-between gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/16 transition-transform duration-300 group-hover:scale-105">
                    <WhatsAppIcon aria-hidden="true" className="size-7" />
                  </span>
                  <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                    principal
                  </span>
                </span>

                <span>
                  <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                    resposta rapida
                  </span>
                  <span className="mt-3 block text-3xl font-semibold">
                    WhatsApp
                  </span>
                  <span className="mt-4 block max-w-sm text-sm leading-7 text-white/75">
                    {contactLinks[0].description}
                  </span>
                </span>

                <span className="flex items-center justify-between gap-4 rounded-lg border border-white/15 bg-white/10 p-4 text-sm font-semibold backdrop-blur transition-colors group-hover:bg-white/14">
                  <span className="break-words">{contactLinks[0].detail}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 shrink-0 transition-transform group-hover:translate-x-1"
                  />
                </span>
              </span>
            </a>

            <div className="grid gap-4">
              {contactLinks.slice(1).map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  className="group flex min-h-36 flex-col justify-between gap-5 rounded-lg border border-primary/12 bg-white/88 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/28 hover:bg-white hover:shadow-xl hover:shadow-primary/10"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <item.icon aria-hidden="true" className="size-5" />
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-primary/35 transition-all group-hover:translate-x-1 group-hover:text-primary"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold">
                      {item.label}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </span>
                    <span className="mt-3 block break-words text-sm font-medium text-primary">
                      {item.detail}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
