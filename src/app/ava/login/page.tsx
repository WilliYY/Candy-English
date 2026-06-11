import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Home } from "lucide-react";
import { auth } from "@/lib/auth";
import { isMaintenanceModeEnabled } from "@/lib/app-settings";
import { getDefaultAvaPath, isRole } from "@/lib/roles";
import { LoginForm } from "@/components/ava/login-form";
import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Login AVA",
};

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
    <section className="candy-deep relative isolate flex min-h-screen min-w-0 flex-col overflow-hidden px-5 py-6 text-white sm:px-8">
      <video
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-cover opacity-75"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      >
        <source src="/brand/ava-login.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-[1] bg-[#2c1338]/72" />
      <div className="candy-kinetic-grid absolute inset-0 z-[2] opacity-55" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="rounded-full bg-white/95 px-5 py-2.5 shadow-xl shadow-black/10 ring-1 ring-white/70">
          <BrandLogo
            animated={false}
            className="h-14 w-[220px] overflow-hidden rounded-full sm:h-16 sm:w-[270px]"
            imageClassName="w-[210px] scale-100 group-hover:scale-[1.015] sm:w-[245px]"
          />
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-full border-white/35 bg-white/90 text-primary shadow-lg shadow-black/10 hover:bg-white hover:text-primary"
        >
          <Link href="/">
            <Home data-icon="inline-start" />
            Home
          </Link>
        </Button>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 py-8 lg:grid-cols-[0.85fr_1fr]">
        <div className="hidden max-w-lg flex-col gap-8 lg:flex">
          <BrandLogo
            className="candy-logo-soft h-24 w-[360px] overflow-visible"
            imageClassName="w-[430px] brightness-[1.32] saturate-[1.18] drop-shadow-[0_18px_34px_rgb(255_255_255_/_0.16)]"
            variant="light"
          />
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/65">
              Candy English AVA
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-normal">
              Entre e continue seus estudos.
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 justify-center lg:justify-end">
          <Card className="w-full min-w-0 max-w-md border-white/70 bg-white/96 shadow-2xl shadow-black/20">
            <CardHeader>
              <CardTitle className="text-2xl">Entrar no AVA</CardTitle>
            </CardHeader>
            <CardContent>
              {maintenanceMode ? (
                <div className="mb-5 rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-primary">
                  Manutencao Candy ativa: alunos entram novamente quando a
                  manutencao terminar. Admins e teachers podem acessar
                  normalmente.
                </div>
              ) : null}
              <Suspense
                fallback={
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                }
              >
                <LoginForm maintenanceMode={maintenanceMode} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
