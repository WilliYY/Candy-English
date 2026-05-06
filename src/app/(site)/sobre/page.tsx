import type { Metadata } from "next";
import { BookOpen, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";

export const metadata: Metadata = {
  title: "Sobre",
};

export default function SobrePage() {
  return (
    <InstitutionalPage
      eyebrow="Sobre"
      title="Uma escola de ingles com cuidado humano e base digital propria."
      description="A Candy English une aulas proximas, materiais organizados e acompanhamento continuo para que o aluno evolua com clareza."
      sections={[
        {
          title: "Ensino proximo",
          text: "Cada aluno tem objetivos, ritmo e necessidades diferentes. A aula parte dessa realidade e transforma o estudo em um caminho possivel.",
          icon: HeartHandshake,
        },
        {
          title: "Organizacao entre aulas",
          text: "Materiais, vocabulario, homework e feedback ficam conectados no AVA, evitando que o aprendizado se espalhe em arquivos soltos.",
          icon: BookOpen,
        },
        {
          title: "Base propria",
          text: "O projeto nao usa WordPress, nao depende da HostGator e roda em uma estrutura propria no servidor Oracle Ubuntu.",
          icon: ShieldCheck,
        },
        {
          title: "Experiencia viva",
          text: "O site usa movimento com intencao: mostrar ritmo, progresso e energia sem atrapalhar a leitura.",
          icon: Sparkles,
        },
      ]}
    />
  );
}
