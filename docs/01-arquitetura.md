# 01 - Arquitetura

## O que esta parte do sistema faz

Este documento descreve a arquitetura tecnica atual do Candy English. Ele deve ser atualizado quando houver mudanca em rotas, camadas, padroes de autorizacao, Docker, storage, APIs ou layout principal.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Camadas principais:

- `src/app/(site)/`: site institucional.
- `src/app/ava/`: areas logadas do AVA.
- `src/app/api/`: Auth.js e healthcheck.
- `src/components/site/`: header, footer, home, paginas institucionais, Catty e WhatsApp.
- `src/components/ava/`: paineis e formularios do AVA.
- `src/components/ui/`: componentes base shadcn/ui.
- `src/lib/auth.ts`: Auth.js e callbacks.
- `src/lib/authorization.ts`: guard de roles para paginas.
- `src/lib/roles.ts`: helpers de roles e destinos.
- `src/lib/prisma.ts`: instancia lazy do Prisma.
- `src/lib/storage.ts`: uploads e calculo de storage.
- `src/lib/homework-ocr.ts`: helper reservado para OCR opcional de campos de homework; o fluxo padrao atual e manual.
- `src/lib/validations/`: schemas Zod.
- `prisma/schema.prisma`: modelo relacional.
- `Dockerfile` e `docker-compose.yml`: runtime, banco e ferramentas.

Servicos Docker:

- `app`: Next.js standalone.
- `postgres`: PostgreSQL 17 interno.
- `migrate`: Prisma migrate deploy.
- `seed`: admin inicial.
- `audit-server-smoke`: smoke tests.

## Regras de negocio que precisam ser preservadas

- O site institucional e publico; o AVA e protegido.
- `/ava` redireciona visitante para `/ava/login` e usuario logado para a area correta.
- `ADMIN` pode supervisionar area teacher/student, mas dados sensiveis ainda exigem validacao.
- `TEACHER` nao deve receber acesso global irrestrito aos alunos.
- `STUDENT` nao edita o proprio nivel.
- Financeiro e agenda sao modulos internos do `ADMIN`.
- Homework e aula interativa usam arquivo protegido e permissao por dado entre admin, teacher dona da aula e aluno dono.
- Catty permanece nos paineis logados; WhatsApp nao aparece nos paineis logados.

## Decisoes tecnicas tomadas

- Next.js App Router e usado em todo o projeto.
- Autorizacao de paginas fica em server components com `requireAvaRole`.
- Escritas sensiveis ficam em server actions.
- Middleware Edge nao e usado para carregar Prisma.
- UI do AVA usa tarefas por query string `?task=`.
- Modulos internos grandes do admin usam uma task propria, como `financeiro` e `agenda`.
- Arquivos privados do AVA sao servidos por rotas server-side autenticadas, como contratos e homework assets.
- Docker final usa `output: "standalone"`.
- Server Actions aceitam upload ate 15 MB para suportar homework/aula interativa exportados do Canva.
- O app ajusta permissao de `/app/storage` no boot e depois executa o servidor como usuario `nextjs`.
- Headers basicos de seguranca ficam em `next.config.ts`.
- Jitsi Meet e usado para aula ao vivo embutida quando nao ha link externo.

## Riscos ao alterar esta parte

- Mover rotas do AVA pode quebrar redirecionamentos por role.
- Colocar Prisma em middleware Edge pode quebrar runtime.
- Criar leitura global para teacher pode vazar dados de alunos.
- Mudar permissao do storage pode quebrar avatar e contratos.
- Expor assets de homework fora de rota protegida pode vazar atividades e respostas de alunos.
- Alterar `Permissions-Policy` pode quebrar camera/microfone do Jitsi.

## Pendencias

- Nao ha dashboard analitico complexo.
- Nao ha API publica versionada.
- Nao ha sistema de permissoes customizaveis alem das roles atuais.
- Nao ha rotina formal de backup/restore documentada dentro do app.

## Como pode evoluir

- Criar docs especificos para painel administrativo, seguranca e testes.
- Separar submodulos grandes do AVA se as telas crescerem.
- Adicionar observabilidade, logs estruturados e monitoramento externo.
- Avaliar LiveKit/Jitsi dedicado se aula ao vivo precisar de maior controle.
