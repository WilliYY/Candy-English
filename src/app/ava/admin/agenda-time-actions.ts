"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { AgendaTimeChangeError, type AgendaTimeChangeInput } from "@/lib/agenda-time-change";
import { changeAgendaTime } from "@/lib/agenda-time-operations";

export async function updateAgendaTime(input: AgendaTimeChangeInput) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "Você não tem permissão para editar a agenda." };
  }
  const actor = await getPrisma().user.findUnique({
    where: { id: session.user.id }, select: { id: true, role: true, isActive: true },
  });
  if (!actor || !actor.isActive || actor.role !== "ADMIN") {
    return { ok: false, message: "Você não tem permissão para editar a agenda." };
  }
  try {
    const result = await changeAgendaTime(actor, input);
    revalidatePath("/ava/admin");
    revalidatePath("/ava/rotina");
    return { ok: true, message: result.count ? `Horário salvo em ${result.count} aula(s).` : "O horário já está atualizado." };
  } catch (error) {
    return { ok: false, message: error instanceof AgendaTimeChangeError ? error.message : "Não foi possível salvar. Atualize a agenda antes de tentar novamente." };
  }
}
