import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    title: "Aulas personalizadas",
    description: "Planos de estudo adaptados ao ritmo, objetivos e rotina de cada aluno.",
    icon: GraduationCap,
  },
  {
    title: "Materiais organizados",
    description: "Conteúdos, vocabulários e homeworks preparados para continuidade entre as aulas.",
    icon: BookOpen,
  },
  {
    title: "Feedback claro",
    description: "Correções e orientações em um AVA próprio, pensado para acompanhamento real.",
    icon: CheckCircle2,
  },
];

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden border-b bg-background">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-[1fr_0.9fr] lg:px-8">
          <div className="flex max-w-2xl flex-col gap-7">
            <div className="flex flex-col gap-5">
              <h1 className="text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                Candy English
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Inglês personalizado para alunos que querem aprender com leveza,
                direção e acompanhamento próximo, agora com um AVA próprio para
                organizar aulas, materiais e feedbacks.
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

          <div className="relative mx-auto w-full max-w-md">
            <Image
              src="/brand/lesson-preview.svg"
              alt="Prévia visual de uma aula organizada no AVA Candy English"
              width={520}
              height={520}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="bg-secondary/60">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-6 py-14 md:grid-cols-3 lg:px-8">
          {highlights.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="text-primary" aria-hidden="true" />
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
