import { getPrisma } from "@/lib/prisma";

export const SITE_PAGE_DEFAULTS = {
  contato: {
    ctaLabel: "Acessar AVA",
    description:
      "Use esta pagina como base institucional. Quando os canais oficiais estiverem definidos, os links diretos de email e WhatsApp entram aqui.",
    title: "Converse com a Candy English e encontre o melhor caminho.",
  },
  home: {
    ctaLabel: "Comecar conversa",
    description:
      "Aulas personalizadas com materiais, vocabulario, homework online e devolutivas em um AVA proprio para acompanhar cada passo.",
    title: "Fale ingles com clareza, rotina e feedback.",
  },
  metodologia: {
    ctaLabel: "Ver planos",
    description:
      "A metodologia prioriza uso real do ingles, revisao inteligente e acompanhamento para o aluno saber onde esta e qual e o proximo passo.",
    title: "Aula, pratica e feedback no mesmo caminho.",
  },
  planos: {
    ctaLabel: "Chamar no contato",
    description:
      "Esta pagina prepara a apresentacao comercial da Candy English sem criar pagamento nesta fase. O foco agora e clareza para o aluno interessado.",
    title: "Planos pensados por rotina, objetivo e acompanhamento.",
  },
  sobre: {
    ctaLabel: "Falar com a Candy",
    description:
      "A Candy English une aulas proximas, materiais organizados e acompanhamento continuo para que o aluno evolua com clareza.",
    title: "Uma escola de ingles com cuidado humano e base digital propria.",
  },
} as const;

export type SitePageSlug = keyof typeof SITE_PAGE_DEFAULTS;

export async function getSitePageContent(slug: SitePageSlug) {
  const fallback = SITE_PAGE_DEFAULTS[slug];

  try {
    const prisma = getPrisma();
    const content = await prisma.sitePageContent.findUnique({
      where: { slug },
      select: {
        ctaLabel: true,
        description: true,
        title: true,
      },
    });

    return {
      ctaLabel: content?.ctaLabel ?? fallback.ctaLabel,
      description: content?.description ?? fallback.description,
      title: content?.title ?? fallback.title,
    };
  } catch {
    return fallback;
  }
}
