import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AdminUsersSheet,
  filterAdminUsersSheetRows,
  type AdminUsersSheetRow,
} from "@/components/ava/admin-users-sheet";

const rows: AdminUsersSheetRow[] = [
  {
    accessActions: <button type="button">Redefinir senha</button>,
    attentionClassName: "border-amber-200",
    attentionLabel: "Nivel pendente",
    contactActions: null,
    createdAtLabel: "20/08/2026",
    email: "aluno@example.com",
    history: ["Cadastrado em 20/08/2026"],
    id: "student-1",
    initials: "AL",
    isActive: true,
    name: "Aluno Teste",
    phone: null,
    poloLabel: "Polo 1 · Ivaté",
    poloTone: "ivate",
    poloUnits: ["IVATE"],
    profileSummary: "Aluno sem nivel definido",
    role: "STUDENT",
  },
  {
    accessActions: <button type="button">Excluir conta</button>,
    attentionClassName: "border-emerald-200",
    attentionLabel: "Admin ativo",
    contactActions: null,
    createdAtLabel: "10/08/2026",
    email: "admin@example.com",
    history: ["Cadastrado em 10/08/2026"],
    id: "admin-1",
    initials: "AD",
    isActive: true,
    name: "Admin Teste",
    phone: "(44) 99999-0000",
    poloLabel: "Todos os polos",
    poloTone: "all",
    poloUnits: ["IVATE", "DOURADINA"],
    profileSummary: "Administracao",
    role: "ADMIN",
  },
];

test("renders the user sheet in role order with expandable access actions", () => {
  const markup = renderToStaticMarkup(<AdminUsersSheet rows={rows} />);

  assert.match(markup, /Planilha de usuarios/);
  assert.match(markup, /Planilha de usuarios com rolagem horizontal/);
  assert.ok(markup.indexOf("Admin Teste") < markup.indexOf("Aluno Teste"));
  assert.match(markup, />Admin</);
  assert.match(markup, />Aluno</);
  assert.match(markup, /Buscar nome, e-mail ou telefone/);
  assert.match(markup, /Todos os polos/);
  assert.match(markup, /Polo 1 · Ivaté/);
  assert.match(markup, /Senha protegida/);
  assert.match(markup, /Identificação/);
  assert.match(markup, /Histórico rápido/);
  assert.match(markup, /Painel de gestão/);
  assert.match(markup, /data-user-detail-viewport="true"/);
  assert.match(markup, /w-\[100cqw\]/);
  assert.match(markup, /xl:pr-\[17rem\]/);
  assert.doesNotMatch(markup, /min-w-\[1520px\]/);
  assert.match(markup, /O painel aberto acompanha a área visível/);
  assert.doesNotMatch(markup, /line-clamp-2/);
  assert.match(markup, /admin@example.com/);
  assert.match(markup, /aria-label="Gerenciar Admin Teste/);
  assert.match(markup, /Excluir conta/);
  assert.match(markup, /Redefinir senha/);
});

test("filters the sheet by accent-insensitive search, role and polo", () => {
  assert.deepEqual(
    filterAdminUsersSheetRows(rows, {
      poloFilter: "IVATE",
      query: "ALUNO",
      roleFilter: "STUDENT",
    }).map((row) => row.id),
    ["student-1"],
  );

  assert.deepEqual(
    filterAdminUsersSheetRows(rows, {
      poloFilter: "DOURADINA",
      query: "",
      roleFilter: "STUDENT",
    }),
    [],
  );
});
