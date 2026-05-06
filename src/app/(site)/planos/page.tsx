import type { Metadata } from "next";
import { CalendarDays, GraduationCap, MessageCircle, Repeat2 } from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";

export const metadata: Metadata = {
  title: "Planos",
};

export default function PlanosPage() {
  return (
    <InstitutionalPage
      eyebrow="Planos"
      title="Planos pensados por rotina, objetivo e acompanhamento."
      description="Esta pagina prepara a apresentacao comercial da Candy English sem criar pagamento nesta fase. O foco agora e clareza para o aluno interessado."
      ctaLabel="Chamar no contato"
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
