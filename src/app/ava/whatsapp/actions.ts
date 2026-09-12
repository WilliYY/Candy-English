"use server";

import { revalidatePath } from "next/cache";
import { manageWhatsapp, requireWhatsappAdmin, WhatsappAdminError } from "@/lib/catty-whatsapp/admin";
export async function whatsappAction(action: string, input?: unknown): Promise<{ ok: boolean; message: string; qr?: string; state?: string }> {
  try {
    const actor = await requireWhatsappAdmin();
    const result = await manageWhatsapp(actor.id, action, input);
    revalidatePath("/ava/whatsapp");
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, message: error instanceof WhatsappAdminError ? error.message : "Não foi possível concluir. Verifique o transporte e tente novamente. Nenhum segredo foi exibido." };
  }
}
