import assert from "node:assert/strict";
import { test } from "node:test";
import { isActiveWhatsappAdmin } from "../catty-whatsapp/permissions";
import { getWhatsappConfig } from "../catty-whatsapp/config";
import { readBoundedJson } from "../catty-whatsapp/domain";
import { whatsappContactSchema, whatsappSendSchema } from "../validations/catty-whatsapp";

test("somente admin atual ativo e não excluído administra WhatsApp", () => {
  assert.equal(isActiveWhatsappAdmin({ role: "ADMIN", isActive: true, deletedAt: null }), true);
  for (const user of [null, { role: "STUDENT", isActive: true, deletedAt: null }, { role: "TEACHER", isActive: true, deletedAt: null }, { role: "ADMIN", isActive: false, deletedAt: null }, { role: "ADMIN", isActive: true, deletedAt: new Date() }]) assert.equal(isActiveWhatsappAdmin(user), false);
});
test("cadastro e envio exigem autorização, confirmação e UUID", () => {
  assert.equal(whatsappContactSchema.safeParse({ name: "Teste", phone: "+5511000000000", consent: false }).success, false);
  assert.equal(whatsappSendSchema.safeParse({ contactId: "id", text: "Mensagem", confirmed: true, operationId: "not-an-id" }).success, false);
});
test("configuração incompleta ou segredos repetidos deixam integração desligada", () => {
  const names = ["CATTY_WHATSAPP_ENABLED", "CATTY_WHATSAPP_ENCRYPTION_KEY", "CATTY_WHATSAPP_WEBHOOK_SECRET", "CATTY_WHATSAPP_WORKER_SECRET", "CATTY_EVOLUTION_API_KEY"];
  const old = names.map(name => process.env[name]);
  try {
    for (const name of names) delete process.env[name];
    assert.equal(getWhatsappConfig(), null);
    process.env.CATTY_WHATSAPP_ENABLED = "true";
    for (const name of names.slice(1)) process.env[name] = "ab".repeat(32);
    assert.equal(getWhatsappConfig(), null);
    names.slice(1).forEach((name, index) => { process.env[name] = String(index + 1).repeat(64); });
    assert.ok(getWhatsappConfig());
  } finally { names.forEach((name, index) => { if (old[index] === undefined) delete process.env[name]; else process.env[name] = old[index]; }); }
});
test("corpo chunked acima do limite é interrompido", async () => {
  const request = new Request("http://localhost", { method: "POST", body: JSON.stringify({ message: "a".repeat(200) }) });
  await assert.rejects(readBoundedJson(request, 100), /BODY_TOO_LARGE/);
  assert.deepEqual(await readBoundedJson(new Request("http://localhost", { method: "POST", body: '{"ok":true}' })), { ok: true });
});
