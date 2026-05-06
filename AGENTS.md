# AGENTS.md - Candy English AVA

## Objetivo do projeto

Criar um AVA separado para Candy English, com area administrativa, area teacher e area do aluno.

O sistema deve permitir que a teacher crie aulas, materiais, vocabularios, homeworks e correcoes. O aluno deve conseguir acessar seus materiais, responder atividades online e visualizar feedback.

## Stack obrigatoria

- Next.js 15 com App Router
- TypeScript
- PostgreSQL 17
- Prisma 7
- Auth.js / NextAuth v5
- Zod
- Tailwind CSS 4
- Shadcn/ui
- TanStack React Query
- React Hook Form + Zod
- Docker + Docker Compose

## Rotas do AVA

- `/ava/admin`
- `/ava/teacher`
- `/ava/student`
- `/ava/login`

## Perfis de usuario

- `ADMIN`
- `TEACHER`
- `STUDENT`

## Regras principais

- O projeto nao deve ser feito em WordPress.
- O projeto deve rodar em Docker.
- O banco PostgreSQL nao deve ficar exposto publicamente.
- As credenciais devem ficar em `.env`.
- O arquivo `.env` nunca deve ser versionado no GitHub.
- O arquivo `.env.example` deve conter apenas exemplos.
- Toda mudanca estrutural precisa ser documentada no `README.md`.
- Toda decisao importante precisa ser registrada em `docs/arquitetura.md`.
- Fluxos de produto devem ser registrados em `docs/fluxos-ava.md`.
- Server actions precisam validar role e permissao por dado, nao apenas renderizar UI protegida.

## Fase atual

FASE 13 implementada. O AVA ja possui login real, roles, admin inicial, cadastro de usuarios, status ativo/inativo, vinculo aluno-teacher, aulas, materiais, vocabulario, homework online, feedback inicial, sidebar por role, perfil com foto, contratos PDF e aula ao vivo por Google Meet. O site institucional tem direcao visual roxa, nuvem em loop, Catty e sprites animados.

## Fases implementadas

### FASE 1

Base Next.js, site institucional e rotas iniciais do AVA.

### FASE 2

Login real com Auth.js/NextAuth v5, roles, JWT session, Prisma e seed de admin.

### FASE 3

Gestao inicial de usuarios em `/ava/admin`:

- listar usuarios;
- cadastrar `ADMIN`, `TEACHER` e `STUDENT`;
- criar `StudentProfile` e `TeacherProfile`;
- manter senha com hash `bcryptjs`.

### FASE 4

Aulas, materiais e vocabulario:

- `Lesson`;
- `LessonMaterial`;
- `VocabularyItem`;
- teacher/admin cria aula em `/ava/teacher`;
- teacher so ve alunos ja vinculados a sua area;
- admin pode criar o primeiro vinculo aluno-teacher ao criar aula;
- aluno ve aula vinculada em `/ava/student`.

### FASE 5

Homework online:

- `Homework`;
- `HomeworkQuestion`;
- aluno envia resposta online;
- resposta fica em `HomeworkSubmission`.

### FASE 6

Correcao e feedback:

- teacher/admin ve respostas enviadas;
- teacher/admin envia feedback;
- aluno ve feedback na propria area.
- homework corrigida nao pode ser reenviada pelo aluno nesta fase.

### FASE 7

Redesign institucional:

- hero visual com movimento leve;
- paleta roxa inspirada em produtos SaaS modernos;
- logos e favicon em `public/`;
- paginas `/`, `/sobre`, `/metodologia`, `/planos` e `/contato` com hierarquia visual mais clara.

### FASE 8

UX do AVA:

- layout `/ava` com navegacao por role;
- tela de login mais visual e responsiva;
- preserva protecao no servidor, nao apenas no menu.

### FASE 9

Operacao admin e seguranca basica:

- `User.isActive` para desativar acesso sem apagar historico;
- `LoginAttempt` para registrar tentativas de login e limitar abuso simples;
- admin pode reativar/desativar usuarios;
- admin pode vincular aluno a teacher em `/ava/admin`.

### FASE 10

Documentacao e fluxo de deploy:

- contexto atualizado em `README.md`, `AGENTS.md`, `docs/arquitetura.md`, `docs/fluxos-ava.md` e `docs/design-direcao.md`;
- comandos de producao devem rodar migration antes de recriar app quando `prisma/migrations/` mudar.

### FASE 11

Layout estruturado do AVA:

- sidebar por role em `/ava`;
- admin, teacher e student com navegacao separada;
- protecao continua no servidor.

### FASE 12

Operacao escolar:

- perfil do usuario com telefone, endereco e foto;
- contratos PDF protegidos por login e permissao;
- aula ao vivo via Google Meet em `LiveSession`;
- Google login opcional somente para emails ja cadastrados.

### FASE 13

Experiencia visual:

- bala sem fundo como favicon e sprite;
- hero com `nuvem-fundo.mp4` em loop;
- Catty no canto inferior direito;
- sprites animados fugindo do mouse.

## MVP inicial

1. Login com email e senha
2. Controle de roles
3. Dashboard admin
4. Dashboard teacher
5. Dashboard student
6. Cadastro de alunos
7. Cadastro de aulas
8. Materiais da aula
9. Homework online
10. Correcao com feedback

## Comandos importantes

### Desenvolvimento local

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run prisma:validate
```

### Deploy Oracle com migration

```bash
cd /home/ubuntu/candy-english
git pull
docker compose up -d postgres
docker compose build app migrate audit-server-smoke
docker compose --profile tools run --rm migrate
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
```

## Cuidados para agentes futuros

- Nao alterar `.env` real.
- Nao imprimir segredos em logs ou respostas.
- Nao expor porta `5432` do PostgreSQL.
- Nao criar MinIO, pagamento, IA real ou jogos sem pedido explicito.
- Manter o AVA em `/ava`.
- Preferir server components para leitura e server actions para escrita.
- Cada nova action sensivel precisa chamar `auth()` e validar role.
- `STUDENT` so deve acessar dados do proprio `StudentProfile`.
- `TEACHER` so deve editar/corrigir dados das proprias aulas.
- `User.isActive=false` deve bloquear login sem apagar dados historicos.
- Nao registrar nem imprimir `.env`, `DATABASE_URL`, `AUTH_SECRET` ou senhas.
- Mudancas visuais devem respeitar `docs/design-direcao.md`.
- Upload local deve ficar em `storage/`, que nao deve ser versionado.
- Contratos devem continuar protegidos por rota server-side.
