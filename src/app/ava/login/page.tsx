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
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_0.9fr] lg:px-8">
      <div className="flex max-w-xl flex-col gap-6">
        <Image
          src="/brand/candy-mark.svg"
          alt=""
          width={56}
          height={56}
          priority
          className="size-14"
        />
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
            Entrar no AVA
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Acesse aulas, materiais, homeworks e feedbacks da Candy English com
            sua conta.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Carregando...</p>
            }
          >
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </section>
  );
}
