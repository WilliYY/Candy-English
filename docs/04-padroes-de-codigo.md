# 04 - Padroes de Codigo

## O que esta parte do sistema faz

Este documento orienta como alterar codigo no Candy English sem quebrar os padroes existentes.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Pontos de referencia:

- `src/app/`: rotas, server components e server actions.
- `src/components/ava/`: componentes operacionais.
- `src/components/site/`: componentes institucionais.
- `src/components/ui/`: componentes shadcn/ui.
- `src/lib/validations/`: schemas Zod.
- `src/lib/auth.ts`: autenticacao.
- `src/lib/authorization.ts`: autorizacao de paginas.
- `src/lib/storage.ts`: uploads.
- `prisma/schema.prisma`: contratos de dados.

## Regras de negocio que precisam ser preservadas

- Toda action sensivel valida sessao e role.
- Validar permissao por dado quando houver vinculo de aluno, teacher, contrato, chat ou homework.
- Formularios com escrita relevante devem usar Zod.
- Nao mover regra sensivel apenas para o client.
- Nao versionar uploads, `.env`, backups ou segredos.
- Homeworks interativos devem validar acesso ao arquivo e ignorar `DRAFT` em alertas/fila de correcao.

## Decisoes tecnicas tomadas

- React Hook Form + Zod para formularios client-side.
- Server Components para leitura sempre que possivel.
- Server actions para escrita do AVA.
- Prisma acessado por `getPrisma()`.
- Componentes visuais devem reaproveitar shadcn/ui e padroes locais.
- Tailwind CSS 4 e tokens globais em `src/app/globals.css`.
- Rotas protegidas usam `requireAvaRole`.
- Uploads pedagogicos protegidos devem seguir o padrao de `src/lib/storage.ts` + rota server-side autenticada.

## Padroes praticos

- Manter alteracoes pequenas e focadas.
- Usar nomes claros e alinhados ao dominio.
- Evitar abstracoes antes de haver repeticao real.
- Colocar validacoes novas em `src/lib/validations/`.
- Evitar comentarios obvios; comentar apenas regra nao evidente.
- Preferir `rg` para buscar referencias.
- Atualizar docs quando mudar comportamento importante.

## Riscos ao alterar esta parte

- Misturar muita regra em componente client pode vazar permissao.
- Duplicar schemas Zod gera divergencia entre UI e servidor.
- Criar componentes fora dos padroes pode quebrar consistencia visual.
- Refatorar sem teste em rotas protegidas pode quebrar login ou redirecionamento.

## Pendencias

- Ainda nao ha suite automatizada ampla por modulo.
- Testes atuais sao smoke tests operacionais.
- Nao ha padrao formal de factories/mocks para testes unitarios.

## Como pode evoluir

- Criar `docs/16-testes.md` quando houver suite de testes maior.
- Criar padrao de componentes para modulos grandes do AVA.
- Adicionar testes de permissao por role para actions sensiveis.
