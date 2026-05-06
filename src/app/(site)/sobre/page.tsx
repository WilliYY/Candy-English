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
