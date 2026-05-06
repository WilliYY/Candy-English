import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getDefaultAvaPath } from "@/lib/roles";
import { LoginForm } from "@/components/ava/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Login AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.role) {
    redirect(getDefaultAvaPath(session.user.role));
  }

  return (
    <section className="grid min-h-[calc(100svh-5rem)] grid-cols-1 bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <div className="candy-deep relative isolate hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="candy-kinetic-grid absolute inset-0" />
        <div className="relative flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
          Candy English AVA
        </div>

        <div className="relative flex max-w-xl flex-col gap-6">
          <Image
            src="/brand/logo-3.svg"
            alt="Candy English"
            width={220}
            height={220}
            priority
            unoptimized
            className="h-auto w-40"
          />
          <div className="flex flex-col gap-4">
            <h1 className="text-5xl font-semibold leading-[0.98] tracking-normal">
              Entre, estude e acompanhe seu progresso.
            </h1>
            <p className="text-lg leading-8 text-white/75">
              Login protegido para admin, teacher e student com rotas separadas
              e sessao JWT.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 text-sm">
          {["Aulas", "Homework", "Feedback"].map((item) => (
            <div key={item} className="rounded-lg bg-white/10 p-4">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 lg:px-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Entrar no AVA</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">Carregando...</p>
              }
            >
              <LoginForm
                googleEnabled={Boolean(
                  process.env.GOOGLE_CLIENT_ID &&
                    process.env.GOOGLE_CLIENT_SECRET,
                )}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
