import type { Metadata } from "next";
import { requireAvaRole } from "@/lib/authorization";
import { AvaDashboard } from "@/components/ava/ava-dashboard";

export const metadata: Metadata = {
  title: "Student AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StudentPage() {
  const session = await requireAvaRole(
    ["ADMIN", "TEACHER", "STUDENT"],
    "/ava/student",
  );

  return (
    <AvaDashboard
      title="Student"
      description="Area inicial do aluno para consultar materiais, atividades e feedbacks."
      items={["Materiais disponíveis", "Atividades online", "Feedbacks recebidos"]}
      user={session.user}
    />
  );
}
