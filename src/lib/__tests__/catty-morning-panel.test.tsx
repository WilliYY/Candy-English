import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CattyMorningPanel } from "@/components/ava/catty-morning-panel";

test("morning panel separates private pause and shows acceptance without claiming delivery", () => {
  const html = renderToStaticMarkup(<CattyMorningPanel data={{ configured: true, enabled: true, version: null, nextAt: "2026-09-18T11:00:00Z", runs: [{ id: "synthetic", date: "2026-09-17", status: "SENT", text: "Good morning! It's Thursday!" }] }} />);
  assert.match(html, /08:00/);
  assert.match(html, /São Paulo/);
  assert.match(html, /lang="en"/);
  assert.match(html, /Aceita pelo WhatsApp/);
  assert.match(html, /não comprova entrega/);
  assert.doesNotMatch(html, /truncate|groupCiphertext|groupHash/);
});
