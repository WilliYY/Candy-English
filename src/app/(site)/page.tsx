import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { HomeHero } from "@/components/site/home-hero";
import { SectionShell } from "@/components/site/section-shell";
import { Button } from "@/components/ui/button";

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

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <SectionShell
        eyebrow="Metodologia"
        title="Uma rotina de ingles que nao se perde depois da aula."
        description="A Candy English combina aula personalizada, pratica guiada e feedback registrado para o aluno saber exatamente o que fazer em seguida."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <article
              key={item.title}
              className="flex min-h-72 flex-col justify-between rounded-lg border bg-card p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-primary">
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
      </SectionShell>

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

      <section className="candy-deep border-b text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:px-8">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/75">
              <Sparkles aria-hidden="true" />
              Proxima evolucao
            </span>
            <h2 className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Agora o site tambem acompanha a qualidade da escola.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-white/75">
              Visual roxo, movimento suave, paginas institucionais claras e uma
              base pronta para crescer com gestao, seguranca e operacao.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="w-fit bg-white text-[#2c1338] hover:bg-[#fce5d8]"
          >
            <Link href="/contato">
              Quero estudar ingles
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
