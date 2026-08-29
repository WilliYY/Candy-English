import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AdminUsersView } from "@/components/ava/admin-users-view";

test("opens the user base as a spreadsheet while keeping the cards option", () => {
  const markup = renderToStaticMarkup(
    <AdminUsersView
      cards={<p>Conteudo dos cartoes</p>}
      sheet={<p>Conteudo da planilha</p>}
    />,
  );

  assert.match(markup, /Visualizacao da base/);
  assert.match(markup, /Planilha/);
  assert.match(markup, /Cartoes/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /Conteudo da planilha/);
  assert.doesNotMatch(markup, /Conteudo dos cartoes/);
});
