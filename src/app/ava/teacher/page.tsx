import type { Metadata } from "next";
import { AvaPlaceholder } from "@/components/ava/ava-placeholder";

export const metadata: Metadata = {
  title: "Teacher AVA",
};

export default function TeacherPage() {
  return (
    <AvaPlaceholder
      title="Teacher"
      description="Página inicial vazia para a área da teacher."
      items={["Cadastro de aulas", "Materiais da aula", "Homeworks e feedbacks"]}
    />
  );
}
