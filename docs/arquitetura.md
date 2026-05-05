# Arquitetura - Candy English

## FASE 1

A primeira fase criou uma base limpa e funcional para o site institucional da Candy English e para o AVA em `/ava`.

## FASE 2

A segunda fase implementa login real do AVA, roles e protecao de rotas.

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

### Docker

- `Dockerfile` usa build multi-stage com Node 24 slim.
- `next.config.ts` usa `output: "standalone"` para a imagem final do app.
- O target `tools` do Dockerfile permite executar Prisma CLI e seed sem inflar o container principal em tempo de execucao.
- `docker-compose.yml` contem `app`, `postgres` e servicos utilitarios `migrate` e `seed`.
- Os servicos `migrate` e `seed` usam o perfil `tools` e devem ser executados sob demanda.

## Fora do Escopo da FASE 2

- Jogos
- Recursos de IA
- Correcao completa de homework
- Upload de arquivos
- MinIO
- Pagamentos
- Dashboards complexos
