import type { Metadata } from "next";
import { InstitutionalPage } from "@/components/site/institutional-page";

export const metadata: Metadata = {
  title: "Metodologia",
};

export default function MetodologiaPage() {
  return (
    <InstitutionalPage
      title="Metodologia"
      description="A aprendizagem combina objetivos práticos, repertório útil e acompanhamento contínuo para manter o aluno em movimento."
      sections={[
        {
          title: "Aulas com direção",
          text: "Cada aula parte de objetivos reais do aluno e se conecta a materiais, vocabulários e atividades que fortalecem o aprendizado depois do encontro.",
        },
        {
          title: "Prática e feedback",
          text: "As homeworks online e correções futuras dentro do AVA ajudarão a registrar progresso, dúvidas e próximos passos.",
        },
      ]}
    />
  );
}
