# Candy English

Site institucional e AVA da Candy English.

## Fase Atual

FASE 2 concluida: login real do AVA com Auth.js / NextAuth v5, sessao JWT, roles, protecao das areas `/ava/admin`, `/ava/teacher` e `/ava/student`, Prisma 7 com perfis iniciais e seed do primeiro ADMIN.

Depois da FASE 2, a base recebeu uma camada operacional inspirada no repositorio SavePointFinance: healthcheck HTTP, smoke test de servidor, logs Docker rotacionados, bind local da porta do app e checklist de producao. A adaptacao ficou limitada ao que faz sentido para o Candy English agora, sem trazer regras financeiras, pagamentos, backups complexos ou integracoes externas.

Referencia usada: https://github.com/Marks013/SavePointFinance

## Decisoes Arquiteturais

- O projeto nao usa WordPress.
- O projeto nao depende da HostGator.
- O dominio `candyenglish.com.br` aponta para um servidor Oracle Ubuntu.
- O site institucional fica em `candyenglish.com.br`.
- O AVA fica em `candyenglish.com.br/ava`.
- O PostgreSQL roda apenas na rede interna do Docker Compose, sem publicacao da porta `5432`.
- O app publica a porta `3000` em `127.0.0.1` por padrao, para ser acessado pelo proxy reverso local.
- Credenciais reais ficam em `.env`, que nao deve ser versionado.
- A autenticacao do AVA usa Credentials Provider com email e senha.
- As senhas sao armazenadas somente como hash `bcryptjs`.
- A sessao do Auth.js usa estrategia JWT e inclui `id` e `role` do usuario.
- A autorizacao das areas do AVA e validada no servidor nas paginas protegidas.

## Rotas

### Site institucional

- `/`
- `/sobre`
- `/metodologia`
- `/planos`
- `/contato`

### AVA

- `/ava`
- `/ava/login`
- `/ava/admin` exige `ADMIN`
- `/ava/teacher` exige `ADMIN` ou `TEACHER`
- `/ava/student` exige `ADMIN`, `TEACHER` ou `STUDENT`

## Stack

- Next.js 15 App Router
- TypeScript
- PostgreSQL 17
- Prisma 7
- Auth.js / NextAuth v5
- Zod
- Tailwind CSS 4
- Shadcn/ui
- TanStack React Query
- React Hook Form + Zod
- Docker
- Docker Compose

## Estrutura Principal

```txt
src/
  app/
    (site)/
    api/
      auth/[...nextauth]/route.ts
      health/route.ts
    ava/
      login/page.tsx
      admin/page.tsx
      teacher/page.tsx
      student/page.tsx
  components/
    ava/
    site/
    ui/
  lib/
    auth.ts
    authorization.ts
    prisma.ts
    roles.ts
    validations/
  types/
    next-auth.d.ts
docs/
  arquitetura.md
  producao-checklist.md
prisma/
  migrations/
  schema.prisma
  seed.ts
scripts/
  server-smoke.ts
```

## Variaveis de Ambiente

Crie `.env` a partir de `.env.example` e ajuste os valores:

```env
APP_HOST_BIND="127.0.0.1"
APP_PORT="3000"
DATABASE_URL="postgresql://candy_user:senha@postgres:5432/candy_english?schema=public"
AUTH_SECRET="use-um-valor-seguro"
NEXTAUTH_URL="http://localhost:3000"
AUTH_URL="http://localhost:3000"
ADMIN_NAME="Candy Admin"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="troque-esta-senha"
ADMIN_RESET_PASSWORD="false"
AUDIT_BASE_URL="http://localhost:3000"
```

Nunca versione `.env`. Em producao, use `AUTH_URL` e `NEXTAUTH_URL` com `https://candyenglish.com.br`.

## Como Rodar Localmente

1. Instale as dependencias:

```bash
npm install
```

2. Configure `.env`.

3. Valide e gere o Prisma Client:

```bash
npm run prisma:validate
npm run prisma:generate
```

4. Rode migrations e seed quando o PostgreSQL local estiver disponivel:

```bash
npm run prisma:migrate
npm run prisma:seed
```

5. Rode o app:

```bash
npm run dev
```

6. Acesse:

```txt
http://localhost:3000
http://localhost:3000/ava/login
http://localhost:3000/api/health
```

7. Rode o smoke test contra o servidor local:

```bash
npm run audit:server-smoke
```

## Como Rodar com Docker

1. Configure `.env`.

2. Suba o PostgreSQL:

```bash
docker compose up -d postgres
```

3. Rode migrations e seed:

```bash
docker compose --profile tools run --rm migrate
docker compose run --rm seed
```

4. Suba o app:

```bash
docker compose up -d --build app
```

5. Valide a stack:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose --profile tools run --rm audit-server-smoke
```

O app fica em `http://localhost:3000`. O PostgreSQL nao expoe porta publica; o app acessa o banco pela rede interna usando o host `postgres`.

## Deploy no Servidor Oracle Ubuntu

Rotina curta apos atualizar o repositorio, sem mudanca de banco:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose build app audit-server-smoke
docker compose up -d --force-recreate app
docker compose logs --tail=100 app
docker compose --profile tools run --rm audit-server-smoke
```

Com alteracao em `prisma/schema.prisma` ou `prisma/migrations/`:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose up -d postgres
docker compose build app migrate audit-server-smoke
docker compose --profile tools run --rm migrate
docker compose up -d --force-recreate app
docker compose logs --tail=100 app
docker compose --profile tools run --rm audit-server-smoke
```

Se for a primeira execucao, revise o `.env` antes de rodar `seed`, principalmente `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

Por padrao, o seed nao redefine a senha de um admin ja existente. Para redefinir explicitamente:

```bash
ADMIN_RESET_PASSWORD=true docker compose run --rm seed
```

Mais detalhes: `docs/producao-checklist.md`.

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
npm run audit:server-smoke
npm run verify:server-smoke
```

## Banco / Prisma

O schema atual define:

- enum `Role`: `ADMIN`, `TEACHER`, `STUDENT`
- `User`
- `StudentProfile`
- `TeacherProfile`

## O Que Ainda Nao Foi Criado

- Jogos
- IA
- Sistema completo de correcao
- Upload de arquivos
- MinIO
- Pagamentos
- Dashboard complexo
