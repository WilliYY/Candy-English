import assert from "node:assert/strict";
import test from "node:test";
import { generateMorningMessage } from "../catty-whatsapp/morning-reply";

test("morning generation is bounded, English-only and separate from the AVA prompt", async () => {
  let calls = 0;
  const request: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.model, "gpt-5.4");
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, 320);
    assert.match(body.instructions, /English only/);
    assert.match(body.input, /Thursday/);
    assert.doesNotMatch(body.input, /StudentProfile|FinancialPayment|phone|email/);
    return Response.json({ status: "completed", output_text: JSON.stringify({ sentences: ["Hope your first class gives you something to smile about.", "Give yourself a little breathing room between lessons!"] }) });
  };
  const reply = await generateMorningMessage(new Date("2026-09-17T11:00:00Z"), [], { request, apiKey: "test-key", model: "gpt-5.4" });
  assert.match(reply, /Thursday/);
  assert.match(reply, /Hope your first class/);
  assert.equal(calls, 1);
});
test("invalid or repeated responses stop after at most two paid requests", async () => {
  let calls = 0;
  const request: typeof fetch = async () => { calls++; return Response.json({ status: "completed", output_text: '{"sentences":["Bom dia professores!","Have a nice day!"]}' }); };
  await assert.rejects(generateMorningMessage(new Date(), [], { request, apiKey: "test-key", model: "gpt-5.4" }), /MORNING_GENERATION_FAILED/);
  assert.equal(calls, 2);
});
test("provider outage or missing key sends no stock/repeated fallback", async () => {
  let calls = 0;
  const request: typeof fetch = async () => { calls++; return new Response(null, { status: 503 }); };
  await assert.rejects(generateMorningMessage(new Date(), [], { request, apiKey: "test-key", model: "gpt-5.4" }));
  assert.equal(calls, 1);
  await assert.rejects(generateMorningMessage(new Date(), [], { request, apiKey: "", model: "gpt-5.4" }));
  assert.equal(calls, 1);
});
