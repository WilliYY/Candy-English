import assert from "node:assert/strict";
import { test } from "node:test";
import { EvolutionTransport, TransportError } from "../catty-whatsapp/transport";
const config = { baseUrl: "http://catty-evolution:8080", instance: "candy-catty", apiKey: "fake-test-only", webhookSecret: "w".repeat(32) };
test("envio usa destino fixo e não segue redirecionamento", async () => {
  const transport = new EvolutionTransport(config, async (url, init) => {
    assert.equal(url, "http://catty-evolution:8080/message/sendText/candy-catty");
    assert.equal(init?.redirect, "error");
    assert.deepEqual(JSON.parse(String(init?.body)), { number: "5511999999999", text: "Oi", linkPreview: false });
    return Response.json({ key: { id: "provider-id" } });
  });
  assert.equal(await transport.send("5511999999999", "Oi"), "provider-id");
});
test("timeout e respostas ambíguas não autorizam repetição automática", async () => {
  for (const response of [null, Response.json({ error: "segredo" }, { status: 500 }), Response.json({ error: "erro após enviar" }, { status: 400 }), Response.json({})]) {
    const transport = new EvolutionTransport(config, async () => { if (!response) throw new Error("private-network"); return response; });
    await assert.rejects(transport.send("5511999999999", "Oi"), (e: unknown) => e instanceof TransportError && e.uncertain && !e.message.includes("segredo"));
  }
});
test("erro 401 é falha de autenticação; corpo do provedor não vaza", async () => {
  const transport = new EvolutionTransport(config, async () => Response.json({ secret: "private" }, { status: 401 }));
  await assert.rejects(transport.send("5511999999999", "Oi"), (e: unknown) => e instanceof TransportError && !e.uncertain && e.message === "TRANSPORT_REJECTED");
});
test("QR aceita apenas PNG base64 e status tem contrato limitado", async () => {
  const transport = new EvolutionTransport(config, async () => Response.json({ base64: "data:text/html;base64,PHNjcmlwdD4=" }));
  await assert.rejects(transport.connect());
  const valid = new EvolutionTransport(config, async () => Response.json({ instance: { state: "open", owner: "private" } }));
  assert.equal(await valid.state(), "open");
});
test("webhook autentica por header; segredo não entra na URL", async () => {
  const transport = new EvolutionTransport(config, async (url, init) => {
    assert.equal(url, "http://catty-evolution:8080/webhook/set/candy-catty");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.webhook.url, "http://app:3000/api/catty/whatsapp/webhook");
    assert.equal(body.webhook.headers["x-catty-webhook"], config.webhookSecret);
    assert.deepEqual(body.webhook.events, ["MESSAGES_UPSERT"]);
    return Response.json({});
  });
  await transport.configureWebhook();
});
