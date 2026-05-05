import type { Metadata } from "next";
import { requireAvaRole } from "@/lib/authorization";
import { AvaDashboard } from "@/components/ava/ava-dashboard";

export const metadata: Metadata = {
  title: "Admin AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const session = await requireAvaRole(["ADMIN"], "/ava/admin");

  return (
    <AvaDashboard
      title="Admin"
      description="Area administrativa inicial do AVA Candy English."
      items={["Gestão de usuários", "Cadastro de alunos", "Configurações do AVA"]}
      user={session.user}
    />
  );
}
