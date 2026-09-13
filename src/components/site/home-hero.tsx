import Link from "next/link";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { HomeBannerCarousel } from "@/components/site/home-banner-carousel";
import { Button } from "@/components/ui/button";
import styles from "./home-hero.module.css";

export const homeMethodVideoUrl = "/brand/informacoes.mp4";

export const homeLoopVideoUrl = "/brand/home.mp4";
export const homeHeroVideoUrl = "/brand/home-candy-2.mp4";

type HomeHeroProps = {
  content?: {
    ctaLabel: string;
    description: string;
    title: string;
  };
};

export function HomeHero({ content }: HomeHeroProps) {
  const title =
    content?.title ?? "Fale ingles com aulas personalizadas e no seu estilo!";
  const description =
    content?.description ??
    "Aulas personalizadas com materiais, vocabulario, homework online e devolutivas em um AVA proprio para acompanhar cada passo.";

  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><Sparkles aria-hidden="true" size={16} /> SEU INGLÊS. SEU JEITO.</p>
          <h1 id="home-title" className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          <div className={styles.actions}>
            <Button
              asChild
              size="lg"
              className={styles.primary}
            >
              <Link href="/contato">
                {content?.ctaLabel ?? "Começar conversa"}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className={styles.secondary}
            >
              <Link href="/ava">Entrar no AVA</Link>
            </Button>
          </div>
          <p className={styles.locations}>Ivaté · Douradina <span aria-hidden="true">/</span> Aulas com a sua cara</p>
        </div>
        <div className={styles.studio}>
          <div className={styles.studioHeading}>
            <span className={styles.sticker}>Hello, Candy!</span>
            <span className={styles.studioLabel}>DÊ O PLAY. CONHEÇA A CANDY.</span>
          </div>
          <HomeBannerCarousel className={styles.carousel} />
          <p className={styles.studioNote}>Um pouco das nossas aulas. Muito do nosso jeito.</p>
        </div>
      </div>
      <a className={styles.explore} href="#jeito-candy">Conheça nosso jeito de ensinar <ArrowDown aria-hidden="true" size={16} /></a>
    </section>
  );
}
