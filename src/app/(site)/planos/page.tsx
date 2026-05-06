import type { Metadata } from "next";
import {
  CalendarDays,
  GraduationCap,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";
import { getSitePageContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Planos",
};

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const content = await getSitePageContent("planos");

  return (
    <InstitutionalPage
      eyebrow="Planos"
      title={content.title}
      description={content.description}
      ctaLabel={content.ctaLabel}
      ctaHref="/contato"
      sections={[
        {
          title: "Aulas recorrentes",
          text: "Para alunos que precisam de consistencia semanal, revisao e acompanhamento progressivo.",
          icon: Repeat2,
        },
        {
          title: "Reforco pontual",
          text: "Para objetivos especificos como prova, entrevista, viagem ou retomada de ingles.",
          icon: CalendarDays,
        },
        {
          title: "Acompanhamento no AVA",
          text: "Materiais, homeworks e feedbacks ficam organizados na area do aluno.",
          icon: GraduationCap,
        },
        {
          title: "Matricula por conversa",
          text: "O contato inicial define melhor formato, frequencia e disponibilidade antes de qualquer pagamento futuro.",
          icon: MessageCircle,
        },
      ]}
    />
  );
}
