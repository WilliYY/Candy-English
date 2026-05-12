# 02 - Banco de Dados

## O que esta parte do sistema faz

Este documento descreve o banco PostgreSQL e o schema Prisma atual. Deve ser atualizado sempre que `prisma/schema.prisma` ou `prisma/migrations/` mudar.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`
- `prisma.config.ts`
- `src/generated/prisma/`
- `src/lib/prisma.ts`
- `docker-compose.yml`

Servicos:

- `postgres`: banco PostgreSQL 17.
- `migrate`: aplica migrations com `prisma migrate deploy`.
- `seed`: cria ou atualiza o admin inicial.

## Modelos atuais

Perfis e auth:

- `User`
- `StudentProfile`
- `TeacherProfile`
- `LoginAttempt`

Relacionamentos escolares:

- `StudentTeacherAssignment`
- `Lesson`
- `LessonMaterial`
- `VocabularyItem`
- `Homework`
- `HomeworkQuestion`
- `HomeworkInteractiveField`
- `HomeworkSubmission`

Operacao do AVA:

- `LiveSession`
- `ContractDocument`
- `ChatThread`
- `ChatMessage`
- `AppSetting`
- `SitePageContent`

Financeiro:

- `FinancialStudent`
- `FinancialPayment`
- `FinancialLog`

Agenda:

- `AgendaStudent`
- `AgendaLesson`
- `AgendaLog`

Enums:

- `Role`
- `LessonStatus`
- `MaterialType`
- `HomeworkStatus`
- `HomeworkKind`
- `HomeworkFieldType`
- `SubmissionStatus`
- `AgendaLessonStatus`

## Regras de negocio que precisam ser preservadas

- `User.email` e unico.
- `StudentProfile.userId` e `TeacherProfile.userId` sao 1:1 com `User`.
- `StudentTeacherAssignment` possui chave unica por teacher/aluno.
- `HomeworkSubmission` possui chave unica por homework/aluno.
- `Homework.kind=TEXT` preserva homework simples; `Homework.kind=INTERACTIVE` habilita arquivo e campos sobre o arquivo.
- `HomeworkInteractiveField` guarda posicoes percentuais do campo no arquivo e deve ser substituido em lote apenas por teacher dona da aula ou admin.
- `SubmissionStatus.DRAFT` e autosave do aluno e nao deve disparar evento novo para teacher/admin; `SUBMITTED` e entrega, `RETURNED` e refazer liberado, `REVIEWED` e correcao final.
- Contratos podem ser gerais ou vinculados a um aluno.
- Chat deve sempre estar preso ao vinculo teacher/aluno.
- Financeiro guarda cadastro/base em `FinancialStudent` e snapshots mensais ativos/inativos em `FinancialPayment`.
- `FinancialLog` deve manter historico simples mesmo se um aluno financeiro for excluido.
- Agenda guarda alunos em `AgendaStudent`, ocorrencias de aula em `AgendaLesson` e log operacional em `AgendaLog`.
- Reposicoes da agenda usam `AgendaLesson.isMakeup=true` e podem apontar para a aula original por `makeupForLessonId`.

## Decisoes tecnicas tomadas

- PostgreSQL nao publica porta `5432`.
- Prisma Client e gerado em `src/generated/prisma`.
- Seed usa `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e respeita `ADMIN_RESET_PASSWORD`.
- Uploads nao ficam no banco; o banco guarda metadados e caminhos.
- Migration `20260510203000_recurring_finance_students` converteu `FinancialEntry` em estrutura recorrente.
- Migration `20260511110000_finance_month_snapshots` adicionou snapshots mensais em `FinancialPayment` para preservar meses fechados.
- Migration `20260511160000_admin_agenda_module` adiciona agenda administrativa de 2026.
- Migration `20260512120000_interactive_homework` adiciona homework interativo, campos editaveis, metadados do arquivo e novos status de submissao.

## Riscos ao alterar esta parte

- Alterar campos sem migration quebra deploy.
- Apagar migrations antigas quebra bancos novos.
- Remover constraints unicas pode criar duplicidade em vinculos, respostas ou pagamentos mensais.
- Expor `DATABASE_URL` ou senha em docs/logs compromete o ambiente.
- Alterar cascade/set null sem revisar contratos, chat e financeiro pode apagar historico indevidamente.
- Fazer hard delete de `FinancialStudent` no financeiro apaga pagamentos mensais por cascade; a regra atual e inativar apenas a linha mensal escolhida pela UI.
- Fazer hard delete de `AgendaStudent` apaga ocorrencias da agenda por cascade; a UI deve retirar agenda por `isActive=false`.
- Alterar `HomeworkInteractiveField` sem manter coordenadas percentuais pode desalinha respostas sobre o PDF/imagem.
- Incluir drafts em consultas de alerta/correcao pode gerar notificacao para homework ainda nao entregue.

## Pendencias

- Falta rotina formal de backup/restore.
- Falta revogacao imediata de JWT quando role muda.
- Falta normalizacao case-insensitive mais robusta para email.
- Falta auditoria geral fora do financeiro.
- Falta renderizacao multipagina avancada para PDF interativo; a primeira versao usa campos percentuais e ajuste manual.

## Como pode evoluir

- Documentar diagrama ER quando o schema crescer.
- Criar politica de backup e restore.
- Adicionar logs/auditoria para areas administrativas sensiveis.
- Avaliar indices novos conforme volume real de aulas, mensagens e financeiro.
