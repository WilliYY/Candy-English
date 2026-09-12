import assert from "node:assert/strict";
import { test } from "node:test";
import { extractIncoming, isOptOut, normalizePhone, secretMatches } from "../catty-whatsapp/domain";
import { decrypt, encrypt, phoneHash } from "../catty-whatsapp/crypto";

const now = new Date("2026-09-11T12:00:00Z");
function event(overrides: Record<string, unknown> = {}) {
  return { event: "messages.upsert", instance: "catty-test", data: {
    key: { id: "test-message", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
    messageTimestamp: now.getTime() / 1000,
    message: { conversation: "Oi Catty\nVamos praticar?" }, ...overrides,
  } };
}
test("normaliza somente telefone internacional explícito", () => {
  assert.equal(normalizePhone("+55 (11) 99999-9999"), "5511999999999");
  for (const phone of ["11999999999", "abc5511999999999", "00000000000", "55", "55:123456789"])
    assert.throws(() => normalizePhone(phone));
});
test("extrai texto recente e preserva quebras de linha", () => {
  assert.equal(extractIncoming(event(), "catty-test", now)?.text, "Oi Catty\nVamos praticar?");
  assert.equal(extractIncoming(event(), "outra-instancia", now), null);
});
test("ignora próprios, grupos, status, mídia, LID sem telefone e timestamp inválido", () => {
  for (const key of [
    { id: "id", remoteJid: "5511999999999@s.whatsapp.net", fromMe: true },
    { id: "id", remoteJid: "5511999999999@s.whatsapp.net" },
    { id: "id", remoteJid: "123@g.us", fromMe: false },
    { id: "id", remoteJid: "status@broadcast", fromMe: false },
    { id: "id", remoteJid: "123@lid", fromMe: false },
  ]) assert.equal(extractIncoming(event({ key }), "catty-test", now), null);
  for (const value of [0, undefined, "errado", now.getTime() / 1000 - 301, now.getTime() / 1000 + 61])
    assert.equal(extractIncoming(event({ messageTimestamp: value }), "catty-test", now), null);
  assert.equal(extractIncoming(event({ message: { imageMessage: { caption: "oi" } } }), "catty-test", now), null);
});
test("aceita LID somente com remoteJidAlt telefônico fornecido pelo transporte", () => {
  assert.equal(extractIncoming(event({ key: { id: "id", remoteJid: "123@lid", remoteJidAlt: "5511999999999@s.whatsapp.net", fromMe: false } }), "catty-test", now)?.phone, "5511999999999");
});
test("opt-out é determinístico, independente da IA", () => {
  for (const text of ["SAIR", "parar", "stop", "não quero receber mensagens", "cancelar mensagens"])
    assert.equal(isOptOut(text), true);
  assert.equal(isOptOut("Como usar stop em inglês?"), false);
});
test("segredo vazio nunca autentica", () => {
  assert.equal(secretMatches("", ""), false);
  assert.equal(secretMatches("x".repeat(32), "x".repeat(32)), true);
  assert.equal(secretMatches("x".repeat(32), "y".repeat(32)), false);
});
test("criptografia aleatória, autenticada e vinculada ao propósito", () => {
  const key = "ab".repeat(32);
  const a = encrypt("mensagem privada", "message:test", key);
  assert.notEqual(a, encrypt("mensagem privada", "message:test", key));
  assert.equal(decrypt(a, "message:test", key), "mensagem privada");
  assert.throws(() => decrypt(a, "phone:test", key));
  assert.throws(() => decrypt(a, "message:test", "cd".repeat(32)));
  assert.throws(() => encrypt("oi", "test", "invalid"));
  assert.equal(phoneHash("5511999999999", key), phoneHash("5511999999999", key));
  assert.notEqual(phoneHash("5511999999999", key), phoneHash("5511999999999", "cd".repeat(32)));
});
