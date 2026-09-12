import { writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

const secret = process.env.CATTY_WHATSAPP_WORKER_SECRET ?? "";
if (secret.length < 32) throw new Error("Worker secret missing or invalid");
let stopping = false;
let wasHealthy = null;
const controller = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopping = true; controller.abort(); });
while (!stopping) {
  let healthy = false;
  try {
    const response = await fetch("http://app:3000/api/catty/whatsapp/worker", {
      method: "POST", redirect: "error", headers: { "x-catty-worker": secret },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]),
    });
    healthy = response.ok;
    await response.body?.cancel();
    if (healthy) await writeFile("/tmp/catty-worker-health", String(Date.now()), { mode: 0o600 });
  } catch { /* Log health transitions only; never payloads or tokens. */ }
  if (healthy !== wasHealthy && !stopping) console.log(healthy ? "Catty worker healthy" : "Catty worker unavailable; inspect admin status and configuration");
  wasHealthy = healthy;
  await setTimeout(10_000, undefined, { signal: controller.signal }).catch(() => {});
}
