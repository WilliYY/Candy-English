# Arquitetura - Candy English

## FASE 1

A primeira fase criou uma base limpa e funcional para o site institucional da Candy English e para o AVA em `/ava`.

## FASE 2

A segunda fase implementa login real do AVA, roles e protecao de rotas.

## Endurecimento Operacional

Foi feita uma leitura do repositorio SavePointFinance como referencia externa de robustez operacional: https://github.com/Marks013/SavePointFinance

Foram adaptados para o Candy English apenas os pontos que melhoram a solidez da base atual sem mudar o escopo do AVA:

- healthcheck HTTP em `/api/health`;
- healthcheck Docker do servico `app`;
- rotacao de logs Docker para `app` e `postgres`;
- bind local da porta do app com `APP_HOST_BIND=127.0.0.1`;
- smoke test de servidor em `scripts/server-smoke.ts`;
- servico `audit-server-smoke` no perfil `tools` do Docker Compose;
- checklist de producao em `docs/producao-checklist.md`;
- seed administrativo que preserva senha existente, redefinindo apenas com `ADMIN_RESET_PASSWORD=true`.

Nao foram trazidos elementos especificos do SavePointFinance que nao pertencem ao Candy English nesta fase, como pagamentos, integracoes financeiras, rotinas avancadas de backup criptografado ou automacoes de dominio financeiro.

## Decisoes Registradas

### Produto

- O projeto e uma aplicacao propria, nao WordPress.
- A aplicacao nao depende da HostGator.
- O dominio `candyenglish.com.br` aponta para o servidor Oracle Ubuntu.
- O site institucional e servido em `candyenglish.com.br`.
- O AVA e servido em `candyenglish.com.br/ava`.

### Aplicacao

- Framework: Next.js 15 com App Router.
- Linguagem: TypeScript.
- CSS: Tailwind CSS 4.
- UI base: Shadcn/ui com componentes versionados no proprio repositorio.
- Estado assincrono no cliente: TanStack React Query configurado em `src/app/providers.tsx`.
- Formularios: React Hook Form com validacao Zod.
- Autenticacao: Auth.js / NextAuth v5 com Credentials Provider.
- Sessao: JWT, com `id` e `role` adicionados no token e na session.
- Senhas: hash com `bcryptjs`, compativel com Windows e Linux.
- O Prisma Client e inicializado de forma lazy em `src/lib/prisma.ts`, evitando falhas de build por variaveis de ambiente ainda nao carregadas.

### Rotas

Rotas institucionais:

- `/`
- `/sobre`
- `/metodologia`
- `/planos`
- `/contato`

Rotas do AVA:

- `/ava`
- `/ava/login`
- `/ava/admin`
- `/ava/teacher`
- `/ava/student`

### Autorizacao

A protecao das areas do AVA acontece no servidor, diretamente nas paginas protegidas, usando `auth()` e redirects:

- `/ava/admin`: exige `ADMIN`
- `/ava/teacher`: exige `ADMIN` ou `TEACHER`
- `/ava/student`: exige `ADMIN`, `TEACHER` ou `STUDENT`
- Usuario nao logado e redirecionado para `/ava/login`
- Usuario logado sem permissao e redirecionado para sua area padrao

Essa decisao evita carregar Prisma/pg em middleware Edge e mantem a autorizacao junto da renderizacao server-side das paginas do AVA.

### Banco de Dados

- Banco: PostgreSQL 17.
- ORM: Prisma 7.
- O `docker-compose.yml` cria um servico `postgres` sem publicar a porta `5432` no host.
- As credenciais devem ser fornecidas por `.env`.
- `.env.example` contem apenas valores de exemplo.
- O schema define `Role`, `User`, `StudentProfile` e `TeacherProfile`.
- `StudentProfile.userId` e `TeacherProfile.userId` sao unicos para manter relacao 1:1 com `User`.
- O seed cria o primeiro `ADMIN` usando `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
- O seed nao redefine senha de admin existente por padrao. Para redefinir, e necessario definir `ADMIN_RESET_PASSWORD=true`.
- O comando de seed do Prisma 7 fica em `prisma.config.ts`, dentro de `migrations.seed`, e e executado por `npm run prisma:seed`.

### Docker

- `Dockerfile` usa build multi-stage com Node 24 slim.
- `next.config.ts` usa `output: "standalone"` para a imagem final do app.
- O target `tools` do Dockerfile permite executar Prisma CLI, seed e smoke test sem inflar o container principal em tempo de execucao.
- `docker-compose.yml` contem `app`, `postgres` e servicos utilitarios `migrate`, `seed` e `audit-server-smoke`.
- Os servicos utilitarios usam o perfil `tools` e devem ser executados sob demanda.
- O servico `seed` pode ser chamado diretamente com `docker compose run --rm seed`; o Compose ativa o servico solicitado mesmo ele estando no perfil `tools`.
- O app publica a porta `3000` apenas no host definido por `APP_HOST_BIND`, com padrao `127.0.0.1`.
- Logs de `app` e `postgres` usam driver `json-file` com `max-size=10m` e `max-file=3`.

### Operacao

- `/api/health` e usado pelo healthcheck do container e pode ser validado pelo proxy/operador.
- `scripts/server-smoke.ts` valida carregamento do site, tela de login e redirecionamento de area protegida sem sessao.
- `npm run verify:server-smoke` executa o smoke test via Docker Compose usando o perfil `tools`.
- `docs/producao-checklist.md` registra o fluxo recomendado de deploy com e sem migration.

## Pendencias Tecnicas Planejadas

Itens identificados como proximos endurecimentos, mas ainda fora desta entrega:

- limite de tentativas de login ou throttling;
- revogacao imediata de sessoes JWT apos mudanca de role;
- rotina formal de backup e restore do PostgreSQL;
- normalizacao case-insensitive mais forte para email;
- menus responsivos mais completos para areas do site e do AVA.

## Fora do Escopo da FASE 2

- Jogos
- Recursos de IA
- Correcao completa de homework
- Upload de arquivos
- MinIO
- Pagamentos
- Dashboards complexos
