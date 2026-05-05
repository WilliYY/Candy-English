import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";

export const metadata: Metadata = {
  title: "Contato",
};

export default function ContatoPage() {
  return (
    <InstitutionalPage
      title="Contato"
      description="Canal inicial para alunos interessados em aulas, planos e acesso futuro ao AVA."
      sections={[
        {
          title: "Email",
          text: "Adicione o endereço oficial da Candy English quando a comunicação institucional estiver definida.",
          icon: Mail,
        },
        {
          title: "WhatsApp",
          text: "A integração com formulários ou botões diretos pode ser adicionada em uma fase posterior.",
          icon: MessageCircle,
        },
      ]}
    />
  );
}
