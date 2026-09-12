import { z } from "zod";
import { readBoundedJson } from "./domain";

type Config = { baseUrl: string; instance: string; apiKey: string; webhookSecret: string };
export class TransportError extends Error {
  constructor(message: "TRANSPORT_REJECTED" | "TRANSPORT_UNAVAILABLE" | "TRANSPORT_INVALID", readonly uncertain = false, readonly status?: number) {
    super(message);
  }
}
const stateSchema = z.object({ instance: z.object({ state: z.enum(["open", "close", "connecting"]) }) });
const sentSchema = z.object({ key: z.object({ id: z.string().min(1).max(200) }) });
const qrSchema = z.object({ base64: z.string().max(300_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/) });

export class EvolutionTransport {
  constructor(private config: Config, private request: typeof fetch = fetch) {}
  private async call(path: string, body?: unknown, sending = false) {
    let response: Response;
    try {
      response = await this.request(`${this.config.baseUrl}${path}`, {
        method: body === undefined ? "GET" : "POST", redirect: "error", cache: "no-store",
        headers: { apikey: this.config.apiKey, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000),
      });
    } catch { throw new TransportError("TRANSPORT_UNAVAILABLE", sending); }
    if (!response.ok) {
      await response.body?.cancel();
      // Evolution 2.3.0 can wrap post-send failures in HTTP 400. Only auth
      // rejection is proven to occur before the provider attempts delivery.
      throw new TransportError("TRANSPORT_REJECTED", sending && ![401, 403].includes(response.status), response.status);
    }
    try {
      return await readBoundedJson(new Request("http://localhost", { method: "POST", body: response.body, duplex: "half" } as RequestInit), 350_000);
    } catch { throw new TransportError("TRANSPORT_INVALID", sending); }
  }
  async state() {
    const parsed = stateSchema.safeParse(await this.call(`/instance/connectionState/${this.config.instance}`));
    if (!parsed.success) throw new TransportError("TRANSPORT_INVALID");
    return parsed.data.instance.state;
  }
  async prepare() {
    try { await this.state(); }
    catch (error) {
      if (!(error instanceof TransportError) || error.status !== 404) throw error;
      await this.call("/instance/create", { instanceName: this.config.instance, integration: "WHATSAPP-BAILEYS", qrcode: false, rejectCall: true, groupsIgnore: true, readMessages: false, readStatus: false, syncFullHistory: false });
    }
    await this.configureWebhook();
  }
  async configureWebhook() {
    await this.call(`/webhook/set/${this.config.instance}`, { webhook: {
      enabled: true, url: "http://app:3000/api/catty/whatsapp/webhook",
      headers: { "x-catty-webhook": this.config.webhookSecret },
      byEvents: false, base64: false, events: ["MESSAGES_UPSERT"],
    } });
  }
  async connect() {
    const parsed = qrSchema.safeParse(await this.call(`/instance/connect/${this.config.instance}`));
    if (!parsed.success) throw new TransportError("TRANSPORT_INVALID");
    return parsed.data.base64;
  }
  async send(phone: string, text: string) {
    if (!/^[1-9]\d{9,14}$/.test(phone) || !text.trim() || text.length > 1800) throw new TransportError("TRANSPORT_INVALID");
    const parsed = sentSchema.safeParse(await this.call(`/message/sendText/${this.config.instance}`, { number: phone, text, linkPreview: false }, true));
    if (!parsed.success) throw new TransportError("TRANSPORT_INVALID", true);
    return parsed.data.key.id;
  }
}
