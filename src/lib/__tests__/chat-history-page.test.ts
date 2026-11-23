import assert from "node:assert/strict";
import test from "node:test";
import { chatHistoryPage, chatHistoryQuery, mobileChatHistoryResponse, parseChatHistoryCursor } from "../chat-history-page";

test("installed chat clients receive only the original response fields until they request pagination", () => {
  const page = { messages: [{ id: "message" }], nextBefore: "older" };
  assert.deepEqual(mobileChatHistoryResponse(page, new URLSearchParams()), { ok: true, messages: page.messages });
  const pagination = new URLSearchParams({ pagination: "1" });
  assert.deepEqual(mobileChatHistoryResponse(page, pagination), { ok: true, ...page });
  assert.deepEqual(mobileChatHistoryResponse({ messages: [], nextBefore: null }, pagination), { ok: true, messages: [], nextBefore: null });
});

test("chat keeps the latest 200 and pages backwards across equal timestamps", () => {
  const createdAt = new Date("2026-11-22T12:00:00.000Z");
  const rows = Array.from({ length: 201 }, (_, i) => ({
    id: String(201 - i).padStart(3, "0"), createdAt,
  }));
  const query = chatHistoryQuery();
  assert.equal(query.take, 201);
  assert.deepEqual(query.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  const first = chatHistoryPage(rows);
  assert.equal(first.messages[0].id, "002");
  assert.equal(first.messages.at(-1)?.id, "201");
  const cursor = parseChatHistoryCursor(first.nextBefore!);
  assert.deepEqual(cursor, { createdAt, id: "002" });
  assert.deepEqual(chatHistoryQuery(cursor!).where, {
    OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: "002" } }],
  });
  assert.deepEqual(chatHistoryPage(rows.slice(-1)), { messages: [rows[200]], nextBefore: null });
  assert.equal(parseChatHistoryCursor("not-a-date|001"), null);
});
