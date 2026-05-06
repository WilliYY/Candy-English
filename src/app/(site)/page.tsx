import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    title: "Aulas com direcao",
    description: "Cada aluno segue um plano claro, com ritmo, objetivos e registros em um so lugar.",
    icon: GraduationCap,
  },
  {
    title: "Materiais organizados",
    description: "Conteudos, vocabularios e homeworks ficam conectados ao percurso do aluno.",
    icon: BookOpen,
  },
  {
    title: "Feedback visivel",
    description: "Correcoes e orientacoes ficam disponiveis para consulta depois da aula.",
    icon: CheckCircle2,
  },
];

const workflow = [
  {
    title: "Teacher prepara",
    description: "Aulas, materiais e vocabulario entram no AVA.",
    icon: ClipboardCheck,
  },
  {
    title: "Aluno pratica",
    description: "As atividades ficam acessiveis em uma area propria.",
    icon: BookOpen,
  },
  {
    title: "Feedback fecha o ciclo",
    description: "A teacher corrige e orienta o proximo passo.",
    icon: MessageSquareText,
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b bg-secondary">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-background lg:block" />
        <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="relative z-10 flex max-w-2xl flex-col gap-7">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <CheckCircle2 aria-hidden="true" />
              Site institucional + AVA em producao
            </div>
            <div className="flex flex-col gap-5">
              <h1 className="text-5xl font-semibold leading-tight tracking-normal text-foreground sm:text-6xl lg:text-7xl">
                Candy English
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Ingles personalizado com aulas, materiais, homeworks e feedbacks
                em uma experiencia propria, simples de acompanhar e feita para
                evoluir junto com cada aluno.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/metodologia">
                  Conhecer metodologia
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/ava">Acessar AVA</Link>
              </Button>
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-xl items-center justify-center lg:max-w-2xl">
            <div className="absolute inset-x-10 top-10 h-28 rounded-lg bg-accent/15" />
            <Image
              src="/brand/lesson-preview.svg"
              alt="Previa visual de uma aula organizada no AVA Candy English"
              width={680}
              height={680}
              priority
              className="relative h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">
              Como fica na pratica
            </span>
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
              Um caminho simples entre aula, pratica e feedback.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((item) => (
              <div
                key={item.title}
                className="flex min-h-52 flex-col justify-between rounded-lg border bg-card p-5"
              >
                <item.icon className="text-primary" aria-hidden="true" />
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary/60">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-16 md:grid-cols-3 lg:px-8">
          {highlights.map((item) => (
            <div key={item.title} className="flex flex-col gap-4">
              <span className="flex size-11 items-center justify-center rounded-lg bg-background text-primary">
                <item.icon aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
