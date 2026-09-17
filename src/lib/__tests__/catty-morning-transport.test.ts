import assert from "node:assert/strict";
import test from "node:test";
import { EvolutionTransport } from "../catty-whatsapp/transport";

const config = { baseUrl: "http://synthetic.invalid", instance: "fixture", apiKey: "synthetic", webhookSecret: "synthetic" };
test("group transport reads no participant data and sends only a validated group JID", async () => {
  const calls: string[] = [];
  const transport = new EvolutionTransport(config, async (url, options) => {
    calls.push(String(url));
    if (!options?.body) return Response.json([{ id: "123450000000@g.us", subject: "Interno", participants: ["must-not-leak"] }]);
    const payload = JSON.parse(String(options.body));
    assert.equal(payload.number, "123450000000@g.us");
    assert.equal(payload.linkPreview, false);
    return Response.json({ key: { id: "synthetic-result" } });
  });
  assert.deepEqual(await transport.groups(), [{ id: "123450000000@g.us", subject: "Interno" }]);
  assert.match(calls[0], /getParticipants=false$/);
  assert.equal(await transport.sendGroup("123450000000@g.us", "Hello everyone!"), "synthetic-result");
  for (const invalid of ["5511000000000", "status@broadcast", "123@s.whatsapp.net", "https://example.com"]) await assert.rejects(transport.sendGroup(invalid, "Hello!"));
  assert.equal(calls.length, 2);
});
