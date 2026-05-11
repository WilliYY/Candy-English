# Banco de Dados

Este documento foi mantido por compatibilidade com referencias antigas. A documentacao oficial e atual do banco fica em:

- `docs/02-banco-de-dados.md`

## O que esta parte do sistema faz

O banco PostgreSQL guarda usuarios, perfis, vinculos, aulas, materiais, vocabulario, homework, feedback, contratos, aula ao vivo, chat, configuracoes operacionais e financeiro interno.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`
- `src/lib/prisma.ts`
- `docker-compose.yml`

## Regras de negocio que precisam ser preservadas

- PostgreSQL nao deve ficar publico.
- Alteracao de schema exige migration.
- Dados sensiveis nao devem ser expostos em logs ou documentacao.
- Vinculos, contratos, chat e financeiro dependem das constraints atuais.

## Decisoes tecnicas ja tomadas

- Prisma 7 com client gerado em `src/generated/prisma`.
- PostgreSQL 17 no Docker.
- Uploads ficam em storage/volume; o banco guarda metadados.
- Financeiro usa snapshots mensais em `FinancialPayment` para preservar meses fechados.
- Agenda usa `AgendaStudent`, `AgendaLesson` e `AgendaLog` para presenca e reposicao.

## Riscos ao alterar esta parte

- Pular migration quebra deploy.
- Apagar migration antiga quebra instalacao nova.
- Remover constraints pode gerar duplicidade ou vazamento de dados.

## Pendencias

Veja `docs/06-pendencias.md`.

## Como pode evoluir

Este arquivo pode virar um resumo executivo, enquanto `docs/02-banco-de-dados.md` segue como fonte tecnica principal.
