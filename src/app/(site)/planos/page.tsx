import type { Metadata } from "next";
import { InstitutionalPage } from "@/components/site/institutional-page";

export const metadata: Metadata = {
  title: "Planos",
};

export default function PlanosPage() {
  return (
    <InstitutionalPage
      title="Planos"
      description="Os planos serão apresentados com clareza, respeitando diferentes necessidades de frequência, acompanhamento e objetivos."
      sections={[
        {
          title: "Organização inicial",
          text: "Nesta fase, a página reserva a estrutura institucional para os planos sem implementar pagamento, checkout ou integrações comerciais.",
        },
        {
          title: "Próximos passos",
          text: "Depois da base do AVA, esta área poderá receber descrições detalhadas, condições de matrícula e chamadas de contato.",
        },
      ]}
    />
  );
}
