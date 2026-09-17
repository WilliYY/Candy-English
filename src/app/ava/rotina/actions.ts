"use server";

import { revalidatePath } from "next/cache";
import { requireWhatsappAdmin } from "@/lib/catty-whatsapp/admin";
import { configureMorningRoutine, MorningAdminError } from "@/lib/catty-whatsapp/morning-admin";

export async function morningRoutineAction(input: unknown) {
  try {
    const actor = await requireWhatsappAdmin();
    const result = await configureMorningRoutine(actor.id, input);
    revalidatePath("/ava/rotina");
    return { ok: true, message: result.message };
  } catch (error) {
    return { ok: false, message: error instanceof MorningAdminError ? error.message : "Não foi possível alterar a rotina. Atualize a página e confira sua permissão." };
  }
}
