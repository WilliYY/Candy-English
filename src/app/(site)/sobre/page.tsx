import type { Metadata } from "next";
import { BookOpen, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";
import { getSitePageContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Sobre",
};

export const dynamic = "force-dynamic";

export default async function SobrePage() {
  const content = await getSitePageContent("sobre");

  return (
    <InstitutionalPage
      eyebrow="Sobre"
      title={content.title}
      description={content.description}
      ctaLabel={content.ctaLabel}
      sections={[
        {
          title: "Foco no aluno",
          text: "Cada aula parte do nivel, objetivo, rotina e dificuldade real do aluno. O caminho de estudo se adapta a pessoa, nao o contrario.",
          icon: HeartHandshake,
        },
        {
          title: "Aula personalizada",
          text: "Conversacao, vocabulario, gramatica e pratica entram na medida certa para o que o aluno precisa agora, com ritmo humano e metas possiveis.",
          icon: BookOpen,
        },
        {
          title: "AVA para estudar melhor",
          text: "Aulas, materiais, vocabulario, homework e feedback ficam organizados no AVA, para revisar com clareza sem perder conteudo em mensagens soltas.",
          icon: ShieldCheck,
        },
        {
          title: "Continuidade entre aulas",
          text: "Depois de cada encontro, o aluno sabe o que revisar, o que praticar e qual e o proximo passo para evoluir com mais seguranca.",
          icon: Sparkles,
        },
      ]}
    />
  );
}
