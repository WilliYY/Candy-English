import type { Metadata } from "next";
import { Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";

export const metadata: Metadata = {
  title: "Contato",
};

export default function ContatoPage() {
  return (
    <InstitutionalPage
      eyebrow="Contato"
      title="Converse com a Candy English e encontre o melhor caminho."
      description="Use esta pagina como base institucional. Quando os canais oficiais estiverem definidos, os links diretos de email e WhatsApp entram aqui."
      ctaLabel="Acessar AVA"
      ctaHref="/ava"
      sections={[
        {
          title: "Email oficial",
          text: "Espaco reservado para o email institucional da Candy English.",
          icon: Mail,
        },
        {
          title: "WhatsApp",
          text: "Espaco reservado para botao de conversa direta quando o numero oficial estiver confirmado.",
          icon: MessageCircle,
        },
        {
          title: "Mensagem guiada",
          text: "A proxima fase pode incluir formulario com nome, objetivo, nivel e melhor horario.",
          icon: Send,
        },
        {
          title: "Dados protegidos",
          text: "Credenciais e informacoes internas continuam fora do GitHub e ficam somente no ambiente do servidor.",
          icon: ShieldCheck,
        },
      ]}
    />
  );
}
