import type { Metadata } from "next";
import {
  BookMarked,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
} from "lucide-react";
import { InstitutionalPage } from "@/components/site/institutional-page";
import { getSitePageContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Metodologia",
};

export const dynamic = "force-dynamic";

export default async function MetodologiaPage() {
  const content = await getSitePageContent("metodologia");

  return (
    <InstitutionalPage
      eyebrow="Metodologia"
      title={content.title}
      description={content.description}
      ctaLabel={content.ctaLabel}
      ctaHref="/planos"
      sections={[
        {
          title: "Diagnostico e objetivo",
          text: "A teacher entende nivel, rotina, dificuldades e meta do aluno antes de organizar a jornada.",
          icon: ClipboardCheck,
        },
        {
          title: "Aula com repertorio util",
          text: "Cada encontro trabalha comunicacao, vocabulario e estrutura de forma conectada com situacoes reais.",
          icon: BookMarked,
        },
        {
          title: "Homework online",
          text: "A pratica entra no AVA para manter constancia e registrar respostas sem depender de arquivos espalhados.",
          icon: CheckCircle2,
        },
        {
          title: "Feedback claro",
          text: "A correcao mostra o que melhorou, o que precisa repetir e o que vem em seguida.",
          icon: MessageSquareText,
        },
      ]}
    />
  );
}
