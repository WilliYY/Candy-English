import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight, BookOpen, Headphones, MessageCircle, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { isMaintenanceModeEnabled } from "@/lib/app-settings";
import { getDefaultAvaPath, isRole } from "@/lib/roles";
import { LoginForm } from "@/components/ava/login-form";
import { LoginExperience } from "@/components/ava/login-experience";
import { BrandLogo } from "@/components/site/brand-logo";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Login AVA" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const [session, maintenanceMode] = await Promise.all([
    auth(),
    isMaintenanceModeEnabled(),
  ]);

  if (isRole(session?.user?.role)) {
    redirect(getDefaultAvaPath(session.user.role));
  }

  return (
    <LoginExperience>
      <header className={styles.header}>
        <div className={styles.logo}>
          <BrandLogo animated={false} className="h-12 w-36 overflow-hidden sm:h-14 sm:w-52" imageClassName="w-36 sm:w-52" />
        </div>
        <Link href="/" className={styles.homeLink}>
          <span>Ir para o site</span><ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </header>

      <div className={styles.layout}>
        <div className={styles.welcome}>
          <p className={styles.eyebrow}><span /> SEU ESPAÇO CANDY</p>
          <h1 className={styles.headline}>
            Seu próximo<br /><em lang="en">Hello!</em><br />começa aqui.
          </h1>
          <p className={styles.intro}>Um pouquinho de prática. Muitas novas possibilidades. Vamos continuar seu inglês?</p>
          <div className={styles.conversation} aria-hidden="true">
            <div className={styles.englishBubble}><MessageCircle size={21} /><span lang="en">Ready for a sweet start?</span><Sparkles size={18} /></div>
            <div className={styles.replyBubble}>Sempre! <span lang="en">Let&apos;s go.</span><ArrowUpRight size={20} /></div>
          </div>
          <ul className={styles.features} aria-label="No seu AVA">
            <li><BookOpen aria-hidden="true" size={17} /> Suas aulas</li>
            <li><Headphones aria-hidden="true" size={17} /> Sua prática</li>
            <li><Sparkles aria-hidden="true" size={17} /> Seu progresso</li>
          </ul>
        </div>

        <section className={styles.panel} aria-labelledby="login-title">
          <div className={styles.panelAccent} aria-hidden="true"><span /><span /><span /></div>
          <div className={styles.panelBody}>
            <p className={styles.panelEyebrow}>BOM TER VOCÊ AQUI</p>
            <h2 id="login-title" className={styles.panelTitle}>Entrar no AVA</h2>
            <p className={styles.panelDescription}>Entre com seu e-mail e senha para continuar.</p>
            {maintenanceMode ? (
              <p role="status" className={styles.maintenance}>Manutenção Candy ativa: alunos entram novamente quando a manutenção terminar. Admins e professores podem acessar normalmente.</p>
            ) : null}
            <Suspense fallback={<p role="status" className="py-6 text-sm text-muted-foreground">Carregando acesso...</p>}>
              <LoginForm maintenanceMode={maintenanceMode} />
            </Suspense>
            <p className={styles.privacy}>Seus dados têm cuidado por aqui.<br /><Link href="/privacidade">Privacidade e cookies</Link></p>
          </div>
        </section>
      </div>
    </LoginExperience>
  );
}
