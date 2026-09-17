import { getWhatsappConfig } from "@/lib/catty-whatsapp/config";
import { secretMatches } from "@/lib/catty-whatsapp/domain";
import { runWhatsappWorker } from "@/lib/catty-whatsapp/worker";
import { runMorningWorker } from "@/lib/catty-whatsapp/morning-worker";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = getWhatsappConfig();
  if (!config || !secretMatches(request.headers.get("x-catty-worker") ?? "", config.workerSecret)) return Response.json({ ok: false }, { status: 401 });
  try {
    // Distinct authorization: the morning routine never resumes private conversations.
    const [morning, result] = await Promise.all([
      runMorningWorker(config).catch(() => ({ failed: true })),
      runWhatsappWorker(config),
    ]);
    return Response.json({ ok: !("failed" in morning), ...result, morning }, { status: "failed" in morning ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ ok: false }, { status: 503 }); }
}
