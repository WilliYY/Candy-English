# Arquitetura - Candy English

## FASE 1

A primeira fase cria uma base limpa e funcional para o site institucional da Candy English e para o AVA em `/ava`.

## Decisoes Registradas

### Produto

- O projeto sera uma aplicacao propria, nao WordPress.
- A aplicacao nao dependera da HostGator.
- O dominio `candyenglish.com.br` apontara para o servidor Oracle Ubuntu.
- O site institucional sera servido em `candyenglish.com.br`.
- O AVA sera servido em `candyenglish.com.br/ava`.

### Aplicacao

- Framework: Next.js 15 com App Router.
- Linguagem: TypeScript.
- CSS: Tailwind CSS 4.
- UI base: Shadcn/ui com componentes versionados no proprio repositorio.
- Estado assincrono no cliente: TanStack React Query configurado em `src/app/providers.tsx`.
- Validacao e formularios: Zod, React Hook Form e `@hookform/resolvers` instalados para fases futuras.
- Autenticacao: Auth.js / NextAuth v5 instalado para implementacao futura de login e roles.

### Rotas

Rotas institucionais:

- `/`
- `/sobre`
- `/metodologia`
- `/planos`
- `/contato`

Rotas do AVA:

- `/ava`
- `/ava/admin`
- `/ava/teacher`
- `/ava/student`

### Banco de Dados

- Banco: PostgreSQL 17.
- ORM: Prisma 7.
- O `docker-compose.yml` cria um servico `postgres` sem publicar a porta `5432` no host.
- As credenciais devem ser fornecidas por `.env`.
- `.env.example` contem apenas valores de exemplo.
- O schema inicial define `UserRole` e `User`, preparando a base para login e controle de roles nas proximas fases.

### Docker

- `Dockerfile` usa build multi-stage com Node 24 slim.
- `next.config.ts` usa `output: "standalone"` para imagem Docker menor.
- `docker-compose.yml` contem os servicos `app` e `postgres`.

## Fora do Escopo da FASE 1

- Jogos
- Recursos de IA
- Correcao completa de homework
- Upload de arquivos
- MinIO
- Pagamentos
- Dashboards complexos
