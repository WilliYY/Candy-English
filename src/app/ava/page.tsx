import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDefaultAvaPath } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const areas = [
  {
    href: "/ava/admin",
    title: "Área admin",
    description: "Base reservada para gestão de usuários, alunos e configuração do AVA.",
  },
  {
    href: "/ava/teacher",
    title: "Área teacher",
    description: "Base reservada para aulas, materiais, homeworks e feedbacks.",
  },
  {
    href: "/ava/student",
    title: "Área student",
    description: "Base reservada para materiais, atividades online e acompanhamento.",
  },
];

export default async function AvaHomePage() {
  const session = await auth();

  if (session?.user?.role) {
    redirect(getDefaultAvaPath(session.user.role));
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
          AVA Candy English
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Entre com seu email e senha para acessar sua area no AVA.
        </p>
        <Button asChild className="mt-6">
          <Link href="/ava/login">Entrar no AVA</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {areas.map((area) => (
          <Link key={area.href} href={area.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  {area.title}
                  <ArrowRight aria-hidden="true" className="text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-muted-foreground">{area.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
