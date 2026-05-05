import type { Metadata } from "next";
import { AvaPlaceholder } from "@/components/ava/ava-placeholder";

export const metadata: Metadata = {
  title: "Student AVA",
};

export default function StudentPage() {
  return (
    <AvaPlaceholder
      title="Student"
      description="Página inicial vazia para a área do aluno."
      items={["Materiais disponíveis", "Atividades online", "Feedbacks recebidos"]}
    />
  );
}
