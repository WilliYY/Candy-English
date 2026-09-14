import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgendaCompactSheet, type AgendaCompactRow } from "@/components/ava/agenda-compact-sheet";

const row = (id: string, unit: "IVATE" | "DOURADINA"): AgendaCompactRow => ({
  id, unit, name: `Nome completo do aluno ${id}`, phone: null, time: "08:00", detail: "Seg, Qua",
  statusLabel: "Previsto", statusClassName: "", onOpen: () => {},
});
test("planilha agrupa polos e preserva nomes completos com cabecalhos acessiveis", () => {
  const html = renderToStaticMarkup(<AgendaCompactSheet mode="DAY" rows={[row("b", "DOURADINA"), row("a", "IVATE")]} onSave={async () => ({ ok: true, message: "Salvo" })} />);
  assert.ok(html.indexOf("Polo 1 · Ivaté") < html.indexOf("Polo 2 · Douradina"));
  assert.match(html, /Nome completo do aluno a/);
  assert.match(html, /role="table"/);
  assert.match(html, /Horário/);
  assert.doesNotMatch(html, /truncate|line-clamp/);
});
test("planilha vazia orienta busca e polo", () => {
  const html = renderToStaticMarkup(<AgendaCompactSheet mode="MONTH" rows={[]} onSave={async () => ({ ok: true, message: "" })} />);
  assert.match(html, /Nenhum aluno/);
  assert.match(html, /polo/);
});
