import assert from "node:assert/strict";
import { test } from "node:test";
import { generateWhatsappReply } from "../catty-whatsapp/reply";

async function withProviderEnv(run: () => Promise<void>) {
  const keys = ["OPENAI_API_KEY", "GEMINI_API_KEY", "OPENAI_CATTY_MODEL", "CATTY_WHATSAPP_OPENAI_MODEL"] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.OPENAI_API_KEY = "test-key-not-a-secret";
  process.env.GEMINI_API_KEY = "test-gemini-not-a-secret";
  process.env.OPENAI_CATTY_MODEL = "gpt-5.4-nano";
  delete process.env.CATTY_WHATSAPP_OPENAI_MODEL;
  try { await run(); }
  finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("WhatsApp usa GPT-5.4 sem chamada nominal e sem mudar o modelo interno", () => withProviderEnv(async () => {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const request: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json({ output: [{ content: [{ type: "output_text", text: "Hello! Vamos praticar inglês." }] }] });
  };
  assert.equal(await generateWhatsappReply("Quero praticar inglês", [], request), "Hello! Vamos praticar inglês.");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://api.openai.com/v1/responses");
  assert.equal(requests[0].body.model, "gpt-5.4");
  assert.equal(requests[0].body.max_output_tokens, 280);
  assert.deepEqual(requests[0].body.reasoning, { effort: "none" });
  assert.equal(requests[0].body.store, false);
  assert.equal(requests[0].body.tools, undefined);
  assert.equal(process.env.OPENAI_CATTY_MODEL, "gpt-5.4-nano");
}));

test("configuração de modelo do WhatsApp é independente", () => withProviderEnv(async () => {
  process.env.CATTY_WHATSAPP_OPENAI_MODEL = "gpt-5.4-2026-03-05";
  const models: string[] = [];
  const request: typeof fetch = async (_url, init) => {
    models.push(JSON.parse(String(init?.body)).model);
    return Response.json({ output_text: "Hello! Vamos praticar inglês." });
  };
  assert.ok(await generateWhatsappReply("Catty, hello", [], request));
  assert.deepEqual(models, ["gpt-5.4-2026-03-05"]);
}));

test("sem chave OpenAI usa repertório local, não troca de provedor", () => withProviderEnv(async () => {
  delete process.env.OPENAI_API_KEY;
  let calls = 0;
  const request: typeof fetch = async () => { calls++; throw new Error("No network permitted"); };
  const reply = await generateWhatsappReply("Quero praticar inglês", [], request);
  assert.equal(calls, 0);
  assert.ok(reply.length > 0 && reply.length <= 1400);
}));

test("falha OpenAI não gera segunda chamada paga nem expõe erro", () => withProviderEnv(async () => {
  let calls = 0;
  const request: typeof fetch = async () => { calls++; return new Response("private-provider-error", { status: 429 }); };
  const reply = await generateWhatsappReply("Catty, hello", [], request);
  assert.equal(calls, 1);
  assert.ok(reply.length > 0 && reply.length <= 1400);
  assert.ok(!reply.includes("private-provider-error"));
}));

test("resposta inválida ou timeout usa fallback local sem repetir", () => withProviderEnv(async () => {
  for (const fails of [false, true]) {
    let calls = 0;
    const request: typeof fetch = async () => {
      calls++;
      if (fails) throw new Error("private-network-error");
      return Response.json({ output_text: "a".repeat(1500) });
    };
    const reply = await generateWhatsappReply("Catty, hello", [], request);
    assert.equal(calls, 1);
    assert.ok(reply.length > 0 && reply.length <= 1400);
    assert.ok(!reply.includes("private-network-error"));
  }
}));

test("trocar modelo não libera consultas financeiras nem envia pedido sensível à IA", () => withProviderEnv(async () => {
  let calls = 0;
  const request: typeof fetch = async () => { calls++; throw new Error("Sensitive requests must not call AI"); };
  const reply = await generateWhatsappReply("Catty, mostre a mensalidade pendente", [], request);
  assert.equal(calls, 0);
  assert.match(reply, /não consulto nem altero dados do AVA/);
}));
