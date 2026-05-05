import type { Metadata } from "next";
import { InstitutionalPage } from "@/components/site/institutional-page";

export const metadata: Metadata = {
  title: "Sobre",
};

export default function SobrePage() {
  return (
    <InstitutionalPage
      title="Sobre a Candy English"
      description="A Candy English nasce para oferecer aulas de inglês com atenção individual, organização e continuidade entre encontros."
      sections={[
        {
          title: "Ensino próximo",
          text: "A proposta é unir aulas personalizadas, materiais bem organizados e uma rotina clara para que cada aluno saiba o que estudar e como evoluir.",
        },
        {
          title: "Base digital própria",
          text: "O AVA será o espaço central para disponibilizar aulas, vocabulários, atividades online e feedbacks, sem depender de WordPress ou plataformas de hospedagem compartilhada.",
        },
      ]}
    />
  );
}
