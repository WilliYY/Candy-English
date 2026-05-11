# 07 - Historico de Decisoes

## O que esta parte do sistema faz

Este documento registra decisoes tecnicas importantes. Sempre que uma decisao for tomada, alterada ou substituida, adicione uma nova entrada.

## Como registrar

Cada decisao deve conter:

- data aproximada;
- decisao tomada;
- motivo da decisao;
- arquivos ou modulos impactados;
- riscos ou cuidados futuros.

## Decisoes registradas

### 2026-05 - Aplicacao propria, nao WordPress

- Decisao: Candy English sera uma aplicacao Next.js propria.
- Motivo: AVA precisa de login, roles, dados escolares e permissoes finas.
- Impacto: projeto inteiro.
- Riscos/cuidados: nao migrar para WordPress sem decisao explicita.

### 2026-05 - AVA em `/ava`

- Decisao: manter AVA sob `/ava`.
- Motivo: separar site institucional e area logada sem outro dominio.
- Impacto: `src/app/ava/`, header do site, redirects.
- Riscos/cuidados: mudar rotas quebra links e deploy.

### 2026-05 - Auth.js com JWT e Credentials Provider

- Decisao: usar Auth.js/NextAuth v5 com credentials, senha bcrypt e JWT.
- Motivo: login proprio com roles e sem dependencia obrigatoria de provedor externo.
- Impacto: `src/lib/auth.ts`, `src/types/next-auth.d.ts`, `/api/auth`.
- Riscos/cuidados: proteger `AUTH_SECRET`; revisar revogacao de sessao no futuro.

### 2026-05 - Google login opcional

- Decisao: Google so fica ativo quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existem.
- Motivo: permitir login social sem bloquear ambiente local/servidor.
- Impacto: `src/lib/auth.ts`, login do AVA.
- Riscos/cuidados: Google aceita apenas emails ja cadastrados e ativos.

### 2026-05 - Autorizacao no servidor, nao no middleware Edge

- Decisao: paginas protegidas usam `requireAvaRole`; actions validam `auth()`.
- Motivo: evitar Prisma/pg no Edge e manter permissao perto da leitura/escrita.
- Impacto: `src/lib/authorization.ts`, paginas e actions do AVA.
- Riscos/cuidados: menus filtrados nao substituem validacao no servidor.

### 2026-05 - PostgreSQL interno no Docker

- Decisao: Postgres nao publica porta `5432`.
- Motivo: reduzir exposicao publica do banco.
- Impacto: `docker-compose.yml`, `.env.example`, deploy.
- Riscos/cuidados: acesso administrativo deve usar metodos seguros, nao abrir porta publica por conveniencia.

### 2026-05 - Uploads em storage/volume

- Decisao: fotos e contratos ficam em storage local/volume Docker; banco guarda metadados.
- Motivo: evitar arquivos grandes no banco e preservar dados entre recriacoes.
- Impacto: `src/lib/storage.ts`, rotas de avatar/contratos, `docker-compose.yml`.
- Riscos/cuidados: nao apagar `app-storage`; manter rotas protegidas.

### 2026-05 - Aula ao vivo com Jitsi

- Decisao: gerar sala Jitsi Meet quando teacher nao informa link externo.
- Motivo: entregar WebRTC embutido sem infraestrutura propria nesta fase.
- Impacto: `LiveSession`, `src/components/ava/live-class-room.tsx`, `next.config.ts`.
- Riscos/cuidados: revisar Permissions-Policy se trocar provedor.

### 2026-05 - AVA por tarefa com `?task=`

- Decisao: admin, teacher e student exibem uma tarefa principal por vez.
- Motivo: reduzir telas longas e tornar operacao mais clara.
- Impacto: `admin-users-panel`, `teacher-workspace`, `student-workspace`, sidebar.
- Riscos/cuidados: task ids viram links profundos; alterar com cuidado.

### 2026-05 - Catty nos paineis logados

- Decisao: Catty aparece tambem nos paineis logados do AVA.
- Motivo: pedido explicito de produto.
- Impacto: layout do AVA, `catty-widget`.
- Riscos/cuidados: garantir que nao cubra botoes criticos.

### 2026-05 - Financeiro recorrente

- Decisao: substituir linha financeira solta por `FinancialStudent`, `FinancialPayment` e `FinancialLog`.
- Motivo: alunos e dados fixos precisam permanecer mes a mes; observacao e pagamento sao mensais.
- Impacto: `prisma/schema.prisma`, migration `20260510203000_recurring_finance_students`, `admin-finance-panel`, actions admin.
- Riscos/cuidados: financeiro continua interno, sem gateway ou cobranca automatica.

### 2026-05 - Permissao de `/app/storage` no boot

- Decisao: container `app` ajusta permissao do volume e depois executa Next como `nextjs`.
- Motivo: smokes/ferramentas podem escrever no mesmo volume e causar `EACCES` para uploads.
- Impacto: `Dockerfile`, `docs/09-deploy-e-ambiente.md`.
- Riscos/cuidados: manter execucao do app sem privilegios depois do ajuste.

### 2026-05-11 - Serie oficial de documentacao

- Decisao: criar docs numerados `00` a `09` e `13` como memoria longa oficial.
- Motivo: futuras conversas do Codex nao devem depender do historico antigo do chat.
- Impacto: `README.md`, `AGENTS.md`, `docs/`.
- Riscos/cuidados: toda mudanca estrutural precisa atualizar os docs relevantes.

### 2026-05-11 - Financeiro com meses fechados por snapshot

- Decisao: `FinancialPayment` passa a guardar snapshots mensais dos dados do aluno e `isActive`; editar aluno pode atualizar meses futuros, mas retirar aluno financeiro inativa apenas o mes atual.
- Motivo: meses anteriores do financeiro precisam funcionar como historico fechado, sem mudancas automaticas quando o admin edita ou retira aluno em meses seguintes.
- Impacto: `prisma/schema.prisma`, migration `20260511110000_finance_month_snapshots`, `src/app/ava/admin/actions.ts`, `src/components/ava/admin-finance-panel.tsx`, `src/app/ava/admin/page.tsx`, `docs/13-financeiro.md`.
- Riscos/cuidados: nao fazer hard delete de `FinancialStudent` pela UI; preservar snapshots dos meses anteriores e rodar migration no deploy antes de recriar o app.

### 2026-05-11 - Agenda administrativa 2026

- Decisao: criar modulo `Agenda` em `/ava/admin?task=agenda` com `AgendaStudent`, `AgendaLesson` e `AgendaLog`.
- Motivo: substituir controle em sheets por uma tela interna para dias/horarios dos alunos, presenca, faltas e reposicao.
- Impacto: `prisma/schema.prisma`, migration `20260511160000_admin_agenda_module`, `src/app/ava/admin/actions.ts`, `src/app/ava/admin/page.tsx`, `src/components/ava/admin-agenda-panel.tsx`, sidebar do AVA e docs.
- Riscos/cuidados: agenda e controle interno do admin; nao confundir com aulas/materiais da teacher nem com presenca automatica.

### 2026-05-11 - Agenda e financeiro com painel mais compacto

- Decisao: manter logs recolhidos por padrao, alinhar linhas do financeiro e adicionar acoes rapidas `Certo`/`X` no bloco `Hoje` da agenda.
- Motivo: reduzir espaco em branco, facilitar cobranca/controle diario e evitar que logs ocupem a tela principal.
- Impacto: `src/components/ava/admin-finance-panel.tsx`, `src/components/ava/admin-agenda-panel.tsx`, `docs/13-financeiro.md`, `docs/14-agenda.md`.
- Riscos/cuidados: manter botoes de presenca com validacao server-side em `updateAgendaAttendance`; nao esconder logs permanentemente, apenas recolher.

## Regras de negocio que precisam ser preservadas

- Decisoes antigas so devem ser substituidas com motivo tecnico claro.
- Se uma decisao mudar, registrar a substituicao neste arquivo em vez de apagar o passado.

## Riscos ao alterar esta parte

- Apagar historico reduz capacidade de futuras conversas entenderem o motivo das escolhas.
- Registrar decisao sem arquivos impactados dificulta manutencao futura.

## Pendencias

- Adicionar decisoes futuras sobre backup, reset de senha, testes e auditoria quando forem implementadas.

## Como pode evoluir

- Separar ADRs individuais se o historico ficar grande.
- Linkar cada decisao a commits ou PRs quando houver fluxo formal de PR.
