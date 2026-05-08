import type { Metadata } from "next";
import { Mail, Send, ShieldCheck } from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
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
      ctaHref="mailto:candyenglishbr@gmail.com"
      sections={[
        {
          title: "Email oficial",
          text: "candyenglishbr@gmail.com",
          icon: Mail,
        },
        {
          title: "WhatsApp",
          text: "+55 44 99738-2355 para conversa rapida com a Candy English.",
          icon: WhatsAppIcon,
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
