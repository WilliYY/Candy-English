import type { Metadata } from "next";
import { Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";
import { getSitePageContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Contato",
};

export const dynamic = "force-dynamic";

export default async function ContatoPage() {
  const content = await getSitePageContent("contato");

  return (
    <InstitutionalPage
      eyebrow="Contato"
      title={content.title}
      description={content.description}
      ctaLabel={content.ctaLabel}
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
