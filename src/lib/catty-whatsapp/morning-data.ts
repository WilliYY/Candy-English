import { getPrisma } from "@/lib/prisma";
import { getWhatsappConfig } from "./config";
import { decrypt } from "./crypto";
import { morningContext, morningDue, MORNING_ID, nextMorningAt } from "./morning-domain";
import { isActiveWhatsappAdmin } from "./permissions";

export async function getMorningOverview(actor: { role: string; isActive: boolean; deletedAt: Date | null }) {
  if (!isActiveWhatsappAdmin(actor)) throw new Error("ADMIN_REQUIRED");
  const store = getPrisma();
  const now = new Date();
  const config = getWhatsappConfig();
  const [routine, runs] = await Promise.all([
    store.cattyMorningRoutine.findUnique({ where: { id: MORNING_ID } }),
    store.cattyMorningRun.findMany({ where: { routineId: MORNING_ID }, orderBy: { createdAt: "desc" }, take: 7 }),
  ]);
  const due = routine && morningDue(routine, now) && !runs.some(run => run.dateKey === morningContext(now).date);
  return {
    configured: Boolean(config), enabled: routine?.enabled ?? false, version: routine?.updatedAt.toISOString() ?? null,
    nextAt: routine?.enabled ? (due ? now : nextMorningAt(now)).toISOString() : null,
    runs: runs.map(run => {
      let text: string | null = null;
      if (run.replyCiphertext && config) {
        try { text = decrypt(run.replyCiphertext, `morning-reply:${run.id}`, config.encryptionKey); } catch { /* No ciphertext or secrets in UI errors. */ }
      }
      return { id: run.id, date: run.dateKey, status: run.status, text };
    }),
  };
}
export type MorningOverview = Awaited<ReturnType<typeof getMorningOverview>>;
