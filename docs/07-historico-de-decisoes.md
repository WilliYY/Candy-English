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

### 2026-05-11 - Fila diaria da agenda

- Decisao: tornar nomes de alunos clicaveis, adicionar atalho `Reagendar`, usar acoes por icone em `Hoje` e ocultar da fila diaria aulas sem acao depois de 2 horas do horario previsto.
- Motivo: a fila `Hoje` precisa priorizar quem ainda exige atencao e permitir chegar rapidamente ao detalhe mensal do aluno.
- Impacto: `src/components/ava/admin-agenda-panel.tsx`, `docs/03-fluxos-do-sistema.md`, `docs/14-agenda.md`.
- Riscos/cuidados: a ocultacao em 2 horas e apenas visual; nao deve apagar `AgendaLesson` nem marcar falta automaticamente.

### 2026-05-12 - Homework interativo com arquivo do Canva

- Decisao: adicionar modo `INTERACTIVE` ao homework, com upload protegido de PDF/imagem, campos percentuais editaveis, autosave como `DRAFT`, entrega como `SUBMITTED`, refazer como `RETURNED` e correcao como `REVIEWED`.
- Motivo: permitir que a teacher suba atividades feitas no Canva e que o aluno responda online dentro do AVA, escrevendo sobre o arquivo.
- Impacto: `prisma/schema.prisma`, migration `20260512120000_interactive_homework`, `src/app/ava/teacher/actions.ts`, `src/app/ava/student/actions.ts`, `src/app/ava/homework-assets/[homeworkId]/route.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `src/components/ava/teacher-workspace.tsx`, `src/components/ava/student-workspace.tsx`, `.env.example`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: drafts nao devem gerar alerta de correcao; arquivos precisam continuar protegidos por role e vinculo; PDFs longos podem exigir ajuste manual de campos ate existir renderizacao multipagina dedicada.

### 2026-05-12 - IA/OCR opcional para sugerir campos de homework

- Decisao: usar OpenAI Responses API apenas quando `OPENAI_API_KEY` estiver configurada; sem chave, criar campos iniciais de fallback para ajuste manual.
- Motivo: entregar fluidez com deteccao automatica sem tornar a IA obrigatoria nem quebrar ambientes locais/Oracle sem segredo configurado.
- Impacto: `src/lib/homework-ocr.ts`, `.env.example`, `src/app/ava/teacher/actions.ts`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: nao versionar chave; revisar custo/limites antes de uso em volume; manter controle manual porque OCR pode errar campos em PDFs ou layouts complexos.

### 2026-05-12 - Criacao de homework por aluno no modo interativo

- Decisao: remover o formulario de criacao de homework simples da tela e criar homework interativo selecionando teacher e aluno diretamente.
- Motivo: a operacao real passa a ser upload de arquivo do Canva; exigir uma aula criada antes bloqueava o fluxo e confundia a teacher/admin.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/teacher-forms.tsx`, `src/components/ava/teacher-workspace.tsx`, `src/lib/validations/learning.ts`, `README.md`, `AGENTS.md`, `docs/00-visao-geral.md`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: homeworks `TEXT` antigas continuam como legado; nao apagar dados antigos nem remover exibicao/correcao sem migration e decisao especifica.

### 2026-05-19 - Homework interativo preserva o arquivo original

- Decisao: manter PDF/imagem como fundo visivel e tratar IA apenas como sugestora de campos transparentes sobre lacunas, linhas de resposta, caixas vazias ou checkboxes.
- Motivo: o aluno deve responder no arquivo original, sem que o sistema cubra enunciados ou redesenhe a atividade enviada pela teacher.
- Impacto: `src/lib/homework-ocr.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: a deteccao automatica ainda pode errar em PDFs complexos; manter ajuste manual e revisar atividades antigas que ja tenham campos largos salvos.

### 2026-05-19 - PDF de homework renderizado por pagina com overlay

- Decisao: renderizar PDFs interativos no client com `pdfjs-dist`, pagina a pagina, e aplicar campos HTML/SVG transparentes usando coordenadas percentuais relativas a pagina real; adicionar `DRAWING` ao enum de campos.
- Motivo: o PDF precisa aparecer inteiro e sem distorcao, enquanto a IA/manual criam apenas areas invisiveis para digitar, marcar ou desenhar.
- Impacto: `package.json`, `package-lock.json`, `prisma/schema.prisma`, migration `20260519033000_interactive_homework_drawing_field`, `src/components/ava/interactive-homework-document.tsx`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `src/components/ava/interactive-homework-review.tsx`, `src/lib/homework-ocr.ts`, `src/lib/validations/learning.ts`, docs de banco e fluxos.
- Riscos/cuidados: PDF.js roda no navegador e depende da rota protegida continuar retornando o arquivo inline; desenhos ficam serializados no JSON da submissao e devem ser considerados em futuras exportacoes para PDF final.

### 2026-05-19 - Exclusao de homework interativa pela teacher/admin

- Decisao: permitir excluir homeworks interativas na tela `/ava/teacher?task=criar-homework`, com confirmacao no client e server action validando admin ou teacher dona da homework.
- Motivo: teachers precisam remover atividades criadas por engano sem depender de acesso direto ao banco.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/lib/validations/learning.ts`, `docs/03-fluxos-do-sistema.md`, `docs/06-pendencias.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: excluir homework remove campos, perguntas e respostas por cascade; revisar antes de confirmar quando ja houver entrega de aluno.

### 2026-05-21 - Editor manual de areas no PDF

- Decisao: criar homeworks interativas sem campos automaticos e fazer a teacher desenhar, mover, redimensionar, excluir ou limpar areas diretamente sobre o PDF/imagem.
- Motivo: a deteccao automatica gerava caixas em lugares errados; o fluxo manual preserva o arquivo original e da controle visual imediato para a teacher.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/interactive-homework-document.tsx`, `src/components/ava/interactive-homework-editor.tsx`, `.env.example`, `AGENTS.md`, `README.md`, `docs/00-visao-geral.md`, `docs/01-arquitetura.md`, `docs/03-fluxos-do-sistema.md`, `docs/06-pendencias.md`, `docs/09-deploy-e-ambiente.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: homeworks antigas podem manter campos ja detectados por IA; a teacher pode usar `Limpar` e salvar novas areas manuais antes de liberar ao aluno.

### 2026-05-21 - Resposta interativa com areas invisiveis

- Decisao: na tela do aluno, campos de texto, checkbox e desenho ficam invisiveis como zonas clicaveis; aparecem apenas texto digitado, marca selecionada ou tracos do aluno.
- Motivo: o PDF/imagem ja possui linhas, parenteses e espacos visuais; caixas HTML visiveis duplicavam o layout e deixavam a atividade poluida.
- Impacto: `src/components/ava/interactive-homework-student.tsx`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`, `AGENTS.md`.
- Riscos/cuidados: a teacher precisa posicionar areas pequenas e precisas no editor; em desenho, manter a acao de desfazer ultimo traco para evitar apagar tudo por engano.

### 2026-05-21 - Redefinicao de senha pelo admin

- Decisao: admins podem redefinir a senha de qualquer usuario pela lista de usuarios em `/ava/admin?task=usuarios`.
- Motivo: suporte interno precisa recuperar acesso de alunos, teachers e admins sem mexer direto no banco ou seed.
- Impacto: `src/app/ava/admin/actions.ts`, `src/components/ava/admin-operations.tsx`, `src/components/ava/admin-users-panel.tsx`, `src/lib/validations/admin-users.ts`, docs de fluxo e autenticacao.
- Riscos/cuidados: a nova senha deve ser enviada ao usuario por canal seguro; sessoes JWT ja abertas nao sao revogadas imediatamente nesta fase.

### 2026-05-21 - Previa de resposta no editor de homework

- Decisao: o editor manual de homework passa a mostrar dentro da area uma previa discreta do resultado do aluno: `x` centralizado para marcar, texto exemplo alinhado como input/textarea e indicacao de area de desenho.
- Motivo: a teacher precisa saber exatamente onde o `x` e a escrita vao aparecer antes de salvar, sem depender de tentativa na tela do aluno.
- Impacto: `src/components/ava/interactive-homework-editor.tsx`, `src/app/ava/teacher/actions.ts`, `src/lib/validations/learning.ts`, `AGENTS.md`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: na tela do aluno as areas continuam invisiveis; campos `CHECKBOX` agora podem ser menores e quadrados, entao manter validacao server-side coerente com o editor.

### 2026-05-21 - Criar aula com o mesmo motor interativo

- Decisao: a aba `/ava/teacher?task=criar-aula` passa a criar aula por PDF/imagem do Canva usando o mesmo editor manual de campos do homework interativo.
- Motivo: a operacao real de aula precisa das mesmas ferramentas de selecionar area, escrever, marcar e desenhar antes de existir um modulo separado de materiais interativos.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/teacher-forms.tsx`, `src/components/ava/teacher-workspace.tsx`, `src/components/ava/interactive-homework-editor.tsx`, `src/lib/validations/learning.ts`, docs oficiais.
- Riscos/cuidados: aula interativa reutiliza `Homework.kind=INTERACTIVE` e usa `fieldDetectionSource=lesson-manual` para separacao visual; futuramente pode virar modelo proprio se aulas interativas precisarem de regras diferentes de entrega/correcao.

## Regras de negocio que precisam ser preservadas

- Decisoes antigas so devem ser substituidas com motivo tecnico claro.
- Se uma decisao mudar, registrar a substituicao neste arquivo em vez de apagar o passado.

## Riscos ao alterar esta parte

- Apagar historico reduz capacidade de futuras conversas entenderem o motivo das escolhas.
- Registrar decisao sem arquivos impactados dificulta manutencao futura.

## Pendencias

- Adicionar decisoes futuras sobre backup, testes e auditoria quando forem implementadas.

## Como pode evoluir

- Separar ADRs individuais se o historico ficar grande.
- Linkar cada decisao a commits ou PRs quando houver fluxo formal de PR.
