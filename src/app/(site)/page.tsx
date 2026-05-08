import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Facebook,
  GraduationCap,
  Instagram,
  Mail,
  MessageSquareText,
} from "lucide-react";
import {
  HomeHero,
  homeMethodVideoUrl,
} from "@/components/site/home-hero";
import { SectionShell } from "@/components/site/section-shell";
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

const promises = [
  "Plano claro para estudar entre aulas",
  "Materiais e vocabulario sempre acessiveis",
  "Homework online com feedback da teacher",
  "Base propria, sem WordPress e sem dependencia de hospedagem compartilhada",
];

const whatsappUrl =
  "https://wa.me/5544997382355?text=Ol%C3%A1%21%20Tenho%20interesse%20em%20mais%20informa%C3%A7%C3%B5es";

const contactLinks = [
  {
    detail: "+55 44 99738-2355",
    href: whatsappUrl,
    icon: WhatsAppIcon,
    label: "WhatsApp",
  },
  {
    detail: "@candyenglish",
    href: "/contato",
    icon: Instagram,
    label: "Instagram",
  },
  {
    detail: "Candy English",
    href: "/contato",
    icon: Facebook,
    label: "Facebook",
  },
  {
    detail: "candyenglishbr@gmail.com",
    href: "mailto:candyenglishbr@gmail.com",
    icon: Mail,
    label: "Email",
  },
];

export default async function HomePage() {
  const content = await getSitePageContent("home");

  return (
    <>
      <HomeHero content={content} />

      <section className="relative isolate overflow-hidden border-b text-white">
        <video
          aria-label="Fundo em video para metodologia Candy English"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        >
          <source src={homeMethodVideoUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(43,18,55,0.88),rgba(43,18,55,0.56)_48%,rgba(43,18,55,0.76))]" />
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8 lg:py-28">
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

          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((item) => (
              <article
                key={item.title}
                className="flex min-h-64 flex-col justify-between rounded-lg border border-white/25 bg-white/88 p-6 text-primary shadow-2xl shadow-black/15 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1"
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

      <SectionShell className="bg-[#fce5d8]" title="O AVA ja acompanha o essencial.">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-primary">
              <GraduationCap aria-hidden="true" />
              Teacher, student e admin
            </div>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Um ambiente simples para ensinar, praticar e corrigir.
            </h2>
            <Button asChild className="w-fit">
              <Link href="/ava">
                Acessar AVA
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {promises.map((item) => (
              <div
                key={item}
                className="flex min-h-32 items-start gap-3 rounded-lg bg-white p-5"
              >
                <CheckCircle2 className="mt-1 text-primary" aria-hidden="true" />
                <p className="leading-7 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <section className="border-b bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:px-8">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted px-3 py-2 text-sm font-medium text-primary">
              <WhatsAppIcon className="size-4" />
              Contatos Candy English
            </span>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Fale com a Candy por onde for mais facil.
            </h2>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              WhatsApp para conversa rapida e canais sociais para acompanhar
              avisos, rotina de aulas e novidades da escola.
            </p>
            <Button asChild className="w-fit">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                Falar no WhatsApp
                <ArrowRight data-icon="inline-end" />
              </a>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {contactLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  item.href.startsWith("http") ? "noreferrer" : undefined
                }
                className="group flex min-h-28 items-center gap-4 rounded-lg border bg-background p-5 transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-sm"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                  <item.icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{item.label}</span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
