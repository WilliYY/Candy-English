import type { Metadata } from "next";
import { requireAvaRole } from "@/lib/authorization";
import { AvaDashboard } from "@/components/ava/ava-dashboard";

export const metadata: Metadata = {
  title: "Teacher AVA",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TeacherPage() {
  const session = await requireAvaRole(["ADMIN", "TEACHER"], "/ava/teacher");

  return (
    <AvaDashboard
      title="Teacher"
      description="Area inicial da teacher para organizar aulas, materiais e feedbacks."
      items={["Cadastro de aulas", "Materiais da aula", "Homeworks e feedbacks"]}
      user={session.user}
    />
  );
}
