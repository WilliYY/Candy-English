import type { Metadata } from "next";
import { AvaPlaceholder } from "@/components/ava/ava-placeholder";

export const metadata: Metadata = {
  title: "Admin AVA",
};

export default function AdminPage() {
  return (
    <AvaPlaceholder
      title="Admin"
      description="Página inicial vazia para a área administrativa do AVA."
      items={["Gestão de usuários", "Cadastro de alunos", "Configurações do AVA"]}
    />
  );
}
