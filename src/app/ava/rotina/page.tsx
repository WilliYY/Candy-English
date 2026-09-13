import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AvaWorkspaceShell } from "@/components/ava/ava-workspace-shell";
import { CattyRoutinePanel } from "@/components/ava/catty-routine-panel";
import { CattyRoutineLoading } from "@/components/ava/catty-routine-loading";
import { requireAvaRole } from "@/lib/authorization";
import { buildAvaCallbackUrl } from "@/lib/ava-callback-url";
import { requireWhatsappAdmin } from "@/lib/catty-whatsapp/admin";
import { getAdminRoutineOverview } from "@/lib/catty-whatsapp/routine-data";
import { routineDateSchema } from "@/lib/validations/catty-routine";

export const metadata: Metadata = { title: "Rotina da Catty" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function RoutineContent({ actor, date }: { actor: Awaited<ReturnType<typeof requireWhatsappAdmin>>; date?: string }) {
  const data = await getAdminRoutineOverview(actor, date);
  return <CattyRoutinePanel data={data} />;
}

export default async function RoutinePage({ searchParams }: { searchParams?: Promise<{ date?: string }> }) {
  const params = await searchParams;
  await requireAvaRole(["ADMIN"], buildAvaCallbackUrl("/ava/rotina", params, ["date"]));
  const actor = await requireWhatsappAdmin().catch(() => null);
  if (!actor) redirect("/ava/login");
  if (params?.date && !routineDateSchema.safeParse(params.date).success) {
    return <AvaWorkspaceShell area="AVA"><section className="rounded-xl border bg-card p-6"><h1 className="text-2xl font-bold">Rotina</h1><p role="alert" className="my-4">Data inválida. Escolha um dia entre 2020 e 2100.</p><Link href="/ava/rotina" className="font-semibold underline">Consultar hoje</Link></section></AvaWorkspaceShell>;
  }
  // Keep the streaming boundary below both guards so denied requests retain HTTP redirects.
  return <AvaWorkspaceShell area="AVA"><Suspense fallback={<CattyRoutineLoading />}><RoutineContent actor={actor} date={params?.date} /></Suspense></AvaWorkspaceShell>;
}
