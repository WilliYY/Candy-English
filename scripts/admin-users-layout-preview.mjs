// Local-only visual fixture. No database, credentials, server actions or real users.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminUsersSheet } from './src/components/ava/admin-users-sheet';
const roles = ['ADMIN', 'TEACHER', 'STUDENT'];
const rows = roles.map((role, i) => ({
 id: 'fixture-' + i, role, name: ['Administrador de teste', 'Professora de teste com nome completo longo', 'Aluno de teste com sobrenome muito comprido'][i],
 initials: ['AD','PR','AL'][i], email: 'contato.com.nome.completo.'+i+'@exemplo.invalid',
 phone: '(44) 99999-0000', isActive: true, createdAtLabel: '14/09/2026',
 poloLabel: i===0?'Todos os polos':i===1?'Ivaté + Douradina':'Polo 1 · Ivaté',
 poloTone: i===0?'all':i===1?'multiple':'ivate', poloUnits: i===2?['IVATE']:['IVATE','DOURADINA'],
 profileSummary: i===1?'Professor sem biografia cadastrada':'Perfil de teste',
 attentionLabel: i===1?'Biografia pendente':'Cadastro pronto', attentionClassName: 'border-amber-200 bg-amber-50 text-amber-900',
 history: ['Cadastrado em 14/09/2026','28 alunos vinculados','121 aulas criadas','121 homeworks','39 feedbacks','0 aulas ao vivo','0 conversas','0 contratos enviados'],
 contactActions: i===2?<details className="rounded-lg border p-4"><summary>Editar dados do aluno</summary><label>Nome completo<input className="mt-2 w-full rounded border p-3" defaultValue="Aluno de teste" /></label></details>:null,
 accessActions: <><details className="rounded border p-3"><summary>Excluir conta</summary><label>Motivo<input className="w-full rounded border p-3" /></label><button type="button">Cancelar</button></details><details className="rounded border p-3"><summary>Acesso e senha</summary><label>Senha temporária<input className="w-full rounded border p-3" type="password" /></label></details></>
}));
createRoot(document.getElementById('root')).render(<div className="grid min-h-screen xl:grid-cols-[360px_minmax(0,1fr)]"><aside className="hidden border-r bg-primary/5 p-6 xl:block">Candy English · ambiente de teste</aside><main className="min-w-0"><section id="fixture-panel" className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 PANEL_WIDTH"><div className="rounded-xl border p-4 sm:p-6"><AdminUsersSheet rows={rows}/></div></section></main></div>);
`;

async function buildFixture() {
  const panel = fs.readFileSync(path.join(root, "src/components/ava/admin-users-panel.tsx"), "utf8");
  const expanded = panel.includes('activeTask === "usuarios" ? "max-w-none"');
  const js = await esbuild.build({
    stdin: { contents: fixture.replace("PANEL_WIDTH", expanded ? "max-w-none" : "max-w-7xl"), loader: "tsx", resolveDir: root },
    bundle: true, write: false, platform: "browser", format: "iife",
    tsconfig: path.join(root, "tsconfig.json"),
    define: { "process.env.NODE_ENV": '"development"' },
  });
  const cssPath = path.join(root, "src/app/globals.css");
  const css = await postcss([tailwind({ base: root })]).process(fs.readFileSync(cssPath, "utf8"), { from: cssPath });
  return { js: js.outputFiles[0].text, css: css.css };
}

let assets;
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/") assets = await buildFixture();
    if (req.url === "/fixture.js") {
      res.setHeader("Content-Type", "text/javascript");
      return res.end(assets.js);
    }
    if (req.url === "/fixture.css") {
      res.setHeader("Content-Type", "text/css");
      return res.end(assets.css);
    }
    if (req.url !== "/") { res.writeHead(404); return res.end(); }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end('<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Gestão de usuários · teste isolado</title></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
  } catch (error) {
    console.error(error.message);
    res.writeHead(500); res.end("Fixture indisponível");
  }
});
server.listen(3112, "127.0.0.1", () => console.log("Fixture isolada: http://127.0.0.1:3112"));
