import { getWhatsappConfig } from "@/lib/catty-whatsapp/config";
import { readBoundedJson, secretMatches } from "@/lib/catty-whatsapp/domain";
import { receiveWhatsapp } from "@/lib/catty-whatsapp/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const config = getWhatsappConfig();
  if (!config || !secretMatches(request.headers.get("x-catty-webhook") ?? "", config.webhookSecret)) return Response.json({ ok: false }, { status: 401 });
  let body: unknown;
  try { body = await readBoundedJson(request); }
  catch { return Response.json({ ok: false }, { status: 400 }); }
  try {
    await receiveWhatsapp(body, config);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ ok: false }, { status: 503 }); }
}
