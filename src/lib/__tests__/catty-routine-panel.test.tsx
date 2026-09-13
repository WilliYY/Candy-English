import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CattyRoutinePanel } from "@/components/ava/catty-routine-panel";
import { getRoutineActivities } from "@/lib/catty-whatsapp/routine-domain";
import type { RoutineOverview } from "@/lib/catty-whatsapp/routine-data";

export const overview: RoutineOverview = {
  period: { date: "2026-09-12", month: 9, year: 2026 }, generatedAt: "2026-09-12T22:00:00Z",
  configured: true, paused: true, workerOnline: true, pendingCount: 0,
  activities: getRoutineActivities({ configured: true, paused: true, workerOnline: true }),
  lessons: [{ id: "a", name: "Aluno com nome completo para conferir a leitura sem cortes", time: "08:00", unit: "IVATE", status: "SCHEDULED" }],
  payments: [{ id: "p", name: "Aluno Exemplo", unit: "IVATE", amountCents: 20000, day: 10, status: "OVERDUE" }],
  sweets: [{ id: "s", name: "Professora Exemplo", unit: "DOURADINA", amountCents: 600, due: "2026-09-10", linked: false, items: [{ name: "Doce Exemplo", quantity: 2, amountCents: 600 }] }],
  audit: [],
};

test("Rotina renderiza consulta acessível sem prometer avisos agendados", () => {
  const html = renderToStaticMarkup(<CattyRoutinePanel data={overview} />);
  assert.match(html, /<h1[^>]*>Rotina/);
  assert.match(html, /Somente admin/);
  assert.match(html, /method="get"/);
  assert.match(html, /Nenhum disparo agendado/);
  assert.match(html, /Aluno com nome completo para conferir a leitura sem cortes/);
  assert.match(html, /Doce Exemplo/);
  assert.match(html, /Mensalidade/);
  assert.doesNotMatch(html, /truncate|Enviar agora|name="phone"/);
});
