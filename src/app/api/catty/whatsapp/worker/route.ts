import { getWhatsappConfig } from "@/lib/catty-whatsapp/config";
import { secretMatches } from "@/lib/catty-whatsapp/domain";
import { runWhatsappWorker } from "@/lib/catty-whatsapp/worker";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = getWhatsappConfig();
  if (!config || !secretMatches(request.headers.get("x-catty-worker") ?? "", config.workerSecret)) return Response.json({ ok: false }, { status: 401 });
  try {
    return Response.json({ ok: true, ...await runWhatsappWorker(config) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ ok: false }, { status: 503 }); }
}
