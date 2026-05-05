# Candy English

Site institucional e AVA da Candy English.

## Fase Atual

FASE 1 concluida: base inicial em Next.js 15 com App Router, TypeScript, Tailwind CSS 4, Shadcn/ui, Prisma 7 e Docker Compose com PostgreSQL 17.

## Decisao Arquitetural

- O projeto nao usa WordPress.
- O projeto nao depende da HostGator.
- O dominio `candyenglish.com.br` apontara para um servidor Oracle Ubuntu.
- O site institucional ficara em `candyenglish.com.br`.
- O AVA ficara em `candyenglish.com.br/ava`.
- O PostgreSQL roda apenas na rede interna do Docker Compose, sem publicacao da porta `5432`.
- Credenciais reais devem ficar em `.env`, que nao deve ser versionado.

## Rotas Iniciais

### Site institucional

- `/`
- `/sobre`
- `/metodologia`
- `/planos`
- `/contato`

### AVA

- `/ava`
- `/ava/admin`
- `/ava/teacher`
- `/ava/student`

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

## Estrutura Inicial

```txt
src/
  app/
    (site)/
      page.tsx
      sobre/page.tsx
      metodologia/page.tsx
      planos/page.tsx
      contato/page.tsx
    ava/
      page.tsx
      admin/page.tsx
      teacher/page.tsx
      student/page.tsx
    globals.css
    layout.tsx
    providers.tsx
  components/
    ava/
    site/
    ui/
  lib/
prisma/
  schema.prisma
docs/
  arquitetura.md
```

## Como Rodar Localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` a partir de `.env.example` e troque os exemplos por valores locais seguros.

3. Rode em modo desenvolvimento:

```bash
npm run dev
```

4. Acesse:

```txt
http://localhost:3000
http://localhost:3000/ava
```

## Como Rodar com Docker

1. Crie o arquivo `.env` a partir de `.env.example`.

2. Suba os containers:

```bash
docker compose up --build
```

O app ficara em `http://localhost:3000`. O PostgreSQL nao expoe porta publica; o app acessa o banco pela rede interna usando o host `postgres`.

## Prisma

O schema inicial fica em `prisma/schema.prisma` e define:

- datasource PostgreSQL
- Prisma Client gerado em `src/generated/prisma`
- enum `UserRole`
- model inicial `User`

Com `.env` configurado, use:

```bash
npm run prisma:validate
npm run prisma:generate
```

## O Que Ainda Nao Foi Criado

- Jogos
- IA
- Sistema completo de correcao
- Upload de arquivos
- MinIO
- Pagamentos
- Dashboard complexo
