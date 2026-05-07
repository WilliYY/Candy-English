# Candy English

Site institucional e AVA da Candy English.

## Fase Atual

FASE 16 implementada: alem do login real, roles, gestao inicial de usuarios, aulas, materiais, homeworks e feedback, o site institucional recebeu direcao visual roxa com logo mais visivel, favicon com marca, Catty e botao de WhatsApp no site/login. O AVA possui sidebar por role com grupos expansíveis para as tarefas, perfil com foto, contratos PDF, aula ao vivo via Google Meet, status ativo/inativo, protecao contra muitas tentativas de login e vinculo direto aluno-teacher. Admin, teacher e student agora abrem uma tarefa principal por vez. O admin tambem controla modo manutencao para bloquear alunos durante ajustes, e teacher/aluno possuem chatbox registrada no banco.

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
- Dentro do container, o Next.js usa `HOSTNAME=0.0.0.0` para responder ao healthcheck e aos demais servicos da rede Docker.
- Credenciais reais ficam em `.env`, que nao deve ser versionado.
- A autenticacao do AVA usa Credentials Provider com email e senha.
- As senhas sao armazenadas somente como hash `bcryptjs`.
- A sessao do Auth.js usa estrategia JWT e inclui `id` e `role` do usuario.
- A autorizacao das areas do AVA e validada no servidor nas paginas protegidas.
- O cadastro inicial de usuarios do AVA acontece no `/ava/admin` e exige role `ADMIN`.
- O painel admin usa `?task=` para trocar entre usuarios, criar admin, criar teacher, criar aluno, vincular aluno e editar site sem criar novas rotas.
- As actions de aulas/homeworks/feedback validam role e vinculo de dados no servidor.
- Usuarios inativos nao conseguem fazer login.
- Tentativas de login com falha ficam registradas em `LoginAttempt` para limitar abuso basico.
- A direcao visual usa assets em `public/brand/` e `public/favicon.svg`.
- Headers basicos de seguranca sao definidos em `next.config.ts`.
- A aula ao vivo usa link protegido do Google Meet dentro do AVA; camera e compartilhamento de tela acontecem no Meet.
- Login com Google esta preparado de forma opcional e so aceita emails ja cadastrados no AVA.
- Uploads locais ficam em `storage/` no desenvolvimento e em volume Docker `app-storage` em producao.
- O modo manutencao fica em `AppSetting` no banco: alunos nao conseguem entrar durante manutencao, mas `ADMIN` e `TEACHER` continuam acessando.
- A chatbox do AVA usa `ChatThread` e `ChatMessage`, sempre presa ao vinculo `StudentTeacherAssignment`.
- O cadastro de aluno guarda dois telefones do aluno, nome da mae e telefone da mae quando houver necessidade.

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
      admin/actions.ts
      teacher/actions.ts
      student/actions.ts
      login/page.tsx
      admin/page.tsx
      teacher/page.tsx
      student/page.tsx
  components/
    ava/
      admin-create-user-form.tsx
      admin-maintenance-panel.tsx
      admin-operations.tsx
      admin-users-panel.tsx
      chat-thread-panel.tsx
      contract-upload-form.tsx
      live-session-forms.tsx
      profile-forms.tsx
      teacher-forms.tsx
      teacher-workspace.tsx
      student-homework-form.tsx
      student-workspace.tsx
    site/
      catty-widget.tsx
      whatsapp-widget.tsx
    ui/
  lib/
    auth.ts
    authorization.ts
    prisma.ts
    roles.ts
    validations/
      admin-users.ts
      learning.ts
  types/
    next-auth.d.ts
docs/
  arquitetura.md
  design-direcao.md
  producao-checklist.md
  fluxos-ava.md
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
AVA_STORAGE_DIR="/app/storage"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
ADMIN_NAME="Candy Admin"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="troque-esta-senha"
ADMIN_RESET_PASSWORD="false"
AUDIT_BASE_URL="http://localhost:3000"
```

Nunca versione `.env`. Em producao, use `AUTH_URL` e `NEXTAUTH_URL` com `https://candyenglish.com.br`.

### Orcamento de RAM no Docker

O `docker-compose.yml` define reservas e limites de memoria para manter o uso coerente com a meta de cerca de 10% de 24 GB em runtime:

- `app`: reserva `512m`, limite `1536m`, com `NODE_OPTIONS=--max_old_space_size=1024`;
- `postgres`: reserva `512m`, limite `768m`, `shm_size=128mb` e parametros conservadores de PostgreSQL;
- `migrate`, `seed` e `audit-server-smoke`: reserva `256m`, limite `768m`, pois rodam apenas sob demanda.

Esses valores podem ser ajustados pelo `.env` usando `APP_MEM_LIMIT`, `POSTGRES_MEM_LIMIT`, `TOOLS_MEM_LIMIT` e variaveis relacionadas. Nao publique a porta `5432` para usar DBeaver; o PostgreSQL permanece interno por seguranca.

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
cd /home/ubuntu/candy-english
git pull
docker compose build app audit-server-smoke
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
```

Com alteracao em `prisma/schema.prisma` ou `prisma/migrations/`:

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
- enum `LessonStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
- enum `MaterialType`: `TEXT`, `LINK`
- enum `HomeworkStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
- enum `SubmissionStatus`: `SUBMITTED`, `REVIEWED`
- `User`
- `StudentProfile`
- `TeacherProfile`
- `StudentTeacherAssignment`
- `Lesson`
- `LessonMaterial`
- `VocabularyItem`
- `Homework`
- `HomeworkQuestion`
- `HomeworkSubmission`
- `LoginAttempt`
- `LiveSession`
- `ContractDocument`
- `SitePageContent`
- `AppSetting`
- `ChatThread`
- `ChatMessage`

`User` tambem possui `isActive`, usado para desativar acesso sem apagar historico.

## FASE 3 - Admin

Implementado:

- listagem de usuarios no `/ava/admin`;
- contadores de usuarios, teachers e alunos;
- cadastro de usuario com nome, email, senha temporaria e role;
- criacao automatica de `StudentProfile` para alunos;
- criacao automatica de `TeacherProfile` para teachers;
- validacao com Zod e React Hook Form;
- hash de senha com `bcryptjs`;
- revalidacao da pagina admin apos cadastro.

Ainda nao implementado nesta fase:

- edicao de usuario existente;
- reset de senha pela interface;
- importacao em massa.

## FASES 4, 5 e 6 - Aulas, Homework e Feedback

Implementado:

- teacher/admin cria aulas em `/ava/teacher`;
- aula pode ser vinculada a um aluno;
- teacher ve e vincula apenas alunos ja ligados a sua area;
- admin pode criar o primeiro vinculo aluno-teacher ao criar aula;
- aula pode receber primeiro material e primeiro vocabulario;
- teacher/admin cria homework ligada a uma aula;
- aluno STUDENT ve aulas vinculadas em `/ava/student`;
- aluno STUDENT envia resposta online;
- homework ja corrigida fica bloqueada para reenvio;
- teacher/admin ve respostas enviadas;
- teacher/admin envia feedback;
- aluno ve feedback corrigido.

Fluxogramas e explicacao detalhada: `docs/fluxos-ava.md`.

## FASES 7, 8, 9 e 10 - Design, UX e Operacao

Implementado:

- site institucional redesenhado com hero em movimento, blocos visuais e paleta roxa;
- favicon e logos em SVG adicionados em `public/`;
- identidade visual documentada em `docs/design-direcao.md`;
- layout do AVA com navegacao por role;
- login do AVA com tela mais visual e responsiva;
- admin pode desativar e reativar usuarios;
- usuario inativo nao consegue autenticar;
- protecao simples contra muitas tentativas de login em janela curta;
- admin pode vincular aluno a teacher diretamente em `/ava/admin`;
- migrations para `User.isActive` e `LoginAttempt`.

Ainda nao implementado:

- reset de senha pela interface;
- edicao completa de usuarios;
- relatorios avancados;
- dashboard complexo;
- notificacoes.

## FASES 11, 12, 13 e 14 - AVA Estruturado, Aula Ao Vivo, Visual e RAM

Implementado:

- layout do AVA com sidebar por role;
- sidebar do AVA com grupos expansíveis para admin, teacher e student, sem caixa interna de rolagem para atalhos;
- perfil com nome, telefone, endereco e foto;
- upload seguro de foto PNG/JPG/WebP ate 2 MB;
- upload seguro de contratos PDF ate 8 MB;
- visualizacao protegida de contratos em `/ava/contracts/[contractId]`;
- aula ao vivo via link Google Meet em `LiveSession`;
- teacher/admin pode abrir e encerrar aula ao vivo;
- student ve botao "Aula ao vivo" quando ha sessao ativa para ele ou geral;
- Google login opcional com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`;
- modo manutencao operacional no admin;
- favicon com marca Candy English;
- Catty no canto inferior direito do site e do login, sem aparecer nos paineis logados do AVA;
- animacoes decorativas com video, balas e GIFs removidas por performance e clareza;
- Docker Compose com reservas e limites de memoria para app, PostgreSQL e ferramentas.

Ainda nao implementado:

- videoconferencia propria WebRTC dentro do site;
- assinatura digital de contrato;
- upload de materiais de aula para cada homework;
- permissoes finas customizaveis por teacher;
- IA real conectada ao Catty.

## FASE 15 - Admin por tarefa

Implementado:

- sidebar admin ordenada como: usuarios, criar admin, criar teacher, criar aluno, vincular aluno e editar site;
- `/ava/admin?task=usuarios` mostra somente listagem, contadores e status de usuarios;
- `/ava/admin?task=criar-admin` mostra somente o formulario de admin;
- `/ava/admin?task=criar-teacher` mostra somente o formulario de teacher;
- `/ava/admin?task=criar-aluno` mostra somente o formulario de aluno;
- cadastro de aluno usa nome completo, email/usuario de login, senha provisoria, data de nascimento e campo de documento/responsavel;
- idade do aluno nao fica fixa no banco: ela e calculada pela data de nascimento conforme o ano passa;
- `/ava/admin?task=vincular-aluno` mostra o formulario de vinculo e os vinculos atuais;
- `/ava/admin?task=editar-site` passa a ser reservado para manutencao operacional.

## FASE 16 - Manutencao, contatos e chatbox

Implementado:

- cadastro de aluno com dois telefones do aluno, documento/responsavel, nome da mae e telefone da mae;
- campos de formulario refinados para ficarem mais legiveis;
- `/ava/admin?task=editar-site` agora mostra um card de modo manutencao, nao um editor interno de texto;
- modo manutencao bloqueia login de alunos e mostra tela "Manutencao Candy" para student logado;
- `ADMIN` e `TEACHER` continuam podendo entrar durante manutencao;
- `/ava/teacher?task=...` e `/ava/student?task=...` exibem uma tarefa por vez, seguindo a mesma logica do admin;
- chatbox teacher/aluno com mensagens salvas em `ChatThread` e `ChatMessage`;
- botao flutuante de WhatsApp para contato comercial no site e no login;
- navegacao institucional com fonte maior para Sobre, Metodologia, Planos, Contato e AVA.

## FASE 17 - Refinos visuais e historico de usuarios

Implementado:

- `/ava/admin?task=usuarios` agora separa usuarios em tres colunas: admins, teachers e alunos;
- cada usuario mostra historico operacional simples com data de cadastro e contadores de aulas, homeworks, respostas, feedbacks, contratos, chats e aulas ao vivo quando aplicavel;
- resumo do usuario logado no AVA virou card compacto para evitar conteudo fora da caixa em desktop;
- textos explicativos longos foram removidos dos headers de admin, teacher e student para deixar a leitura mais objetiva;
- home removeu a marca decorativa solta que ficava sobre os cards do hero;
- footer passou a usar marca textual simples, sem card branco envolvendo logo;
- favicon voltou a usar a bala SVG transparente enviada para `public/favicon.svg`.

## Ferramentas Locais Recomendadas

Instalado neste Windows:

- Visual Studio Code;
- extensoes VS Code: Docker, Prisma, ESLint, Tailwind CSS IntelliSense, GitLens;
- DBeaver Community;
- Docker Desktop;
- GitHub Desktop e GitHub CLI (`gh`);
- PowerToys;
- ShareX e ScreenToGif;
- Figma;
- Inkscape e GIMP;
- Bruno e Postman;
- Google Chrome;
- Everything.

Comando base para repetir a instalacao em outro Windows:

```powershell
winget install --id Docker.DockerDesktop --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id GitHub.GitHubDesktop --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id GitHub.cli --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id Microsoft.PowerToys --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id ShareX.ShareX --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id NickeManarin.ScreenToGif --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id Figma.Figma --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id Inkscape.Inkscape --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id GIMP.GIMP --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id Bruno.Bruno --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id Postman.Postman --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id Google.Chrome --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id voidtools.Everything --exact --source winget --accept-source-agreements --accept-package-agreements
```

O React Developer Tools e uma extensao do navegador e deve ser instalado pela Chrome Web Store.

Se `docker version` nao responder logo apos a instalacao, abra o Docker Desktop pelo menu Iniciar e reinicie o Windows. O Docker usa WSL2 no Windows; quando `wsl --status` pedir `Plataforma da Maquina Virtual` ou virtualizacao, a sessao atual ainda precisa do reboot ou da virtualizacao habilitada na BIOS/UEFI.

Limite WSL2/Docker criado em `C:\Users\casas bahia\.wslconfig`:

```ini
[wsl2]
memory=3GB
processors=2
swap=1GB
localhostForwarding=true
```

Depois de alterar `.wslconfig`, reinicie o Windows ou rode `wsl --shutdown`.

## Figma

Figma e uma ferramenta de design/prototipo. Ela serve para desenhar telas antes de programar, revisar visual com cliente/professora e manter um design system. Nao e obrigatoria para rodar o Candy English, mas ajuda quando voce quiser aprovar o visual das paginas antes de implementar.

## Usando Em Outro Computador

Instale Git, Node.js LTS, VS Code, Docker Desktop, DBeaver e PuTTY. Depois:

```bash
git clone https://github.com/WilliYY/Candy-English.git candy-english
cd candy-english
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Nunca copie `.env` para o GitHub. Em outro computador, crie um `.env` novo com os valores corretos.

Ainda nao implementado:

- edicao/delecao de aulas e homeworks;
- varios materiais ou varias perguntas por tela;
- upload de arquivos;
- IA;
- notas numericas;
- notificacoes por email/WhatsApp;
- jogos.

## O Que Ainda Nao Foi Criado

- Jogos
- IA
- Sistema avancado de correcao, notas e relatorios
- Upload de arquivos
- MinIO
- Pagamentos
- Dashboard complexo
