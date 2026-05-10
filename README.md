# Candy English

Site institucional e AVA da Candy English.

## Fase Atual

FASE 25 implementada: o admin possui o modulo interno `Financeiro` em `/ava/admin?task=financeiro`, com meses de 2026, linhas financeiras por nome, valor, dia de pagamento, status pago/pendente, data real de pagamento e observacao.

Base anterior: alem do login real, roles, gestao inicial de usuarios, aulas, materiais, homeworks e feedback, o site institucional recebeu direcao visual roxa com logo mais visivel, favicon com marca, Catty, botao de WhatsApp no site/login e hero com contraste translucido. O AVA possui sidebar por role com grupos expansíveis para admin/teacher e botoes sempre abertos para student, perfil completo do aluno com foto, contratos PDF embutidos, aula ao vivo embutida por Jitsi quando a teacher nao informa link externo, status ativo/inativo, protecao contra muitas tentativas de login e vinculo direto aluno-teacher. Admin, teacher e student abrem uma tarefa principal por vez. A rota `/ava` nao mostra mais pagina intermediaria: visitante vai direto para `/ava/login`, e usuario logado vai para sua area por role. O admin tambem controla modo manutencao, envia contratos PDF, acompanha uso de arquivos em MB e tem atalhos para operacoes da area teacher.

Depois da FASE 2, a base recebeu uma camada operacional inspirada no repositorio SavePointFinance: healthcheck HTTP, smoke test de servidor, logs Docker rotacionados, bind local da porta do app e checklist de producao. A adaptacao ficou limitada ao que faz sentido para o Candy English agora, sem trazer integracoes de pagamento, backups complexos ou integracoes externas.

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
- O painel admin usa `?task=` para trocar entre usuarios, criar admin, criar teacher, criar aluno, vincular aluno, contratos PDF, financeiro e manutencao; tambem mostra atalhos para aula ao vivo, criar aula, criar homework, corrigir homework e mensagens na area teacher.
- As actions de aulas/homeworks/feedback validam role e vinculo de dados no servidor.
- Usuarios inativos nao conseguem fazer login.
- Tentativas de login com falha ficam registradas em `LoginAttempt` para limitar abuso basico.
- A direcao visual usa assets em `public/brand/` e `public/favicon.svg`.
- Headers basicos de seguranca sao definidos em `next.config.ts`, com permissao especifica para camera, microfone e compartilhamento de tela em `meet.jit.si`.
- A aula ao vivo gera uma sala Jitsi Meet embutida no AVA quando a teacher deixa o link vazio; links Google Meet continuam permitidos, mas abrem como sala externa.
- Login com Google esta preparado de forma opcional e so aceita emails ja cadastrados no AVA.
- `/ava` funciona como roteador do AVA: visitante vai para `/ava/login`; usuario logado vai para `/ava/admin`, `/ava/teacher` ou `/ava/student`.
- Uploads locais ficam em `storage/` no desenvolvimento e em volume Docker `app-storage` em producao.
- O admin ve o uso aproximado de arquivos em MB calculado a partir da pasta de storage.
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
      admin-finance-panel.tsx
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
  auth-smoke.ts
  avatar-smoke.ts
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
npm run audit:auth-smoke
npm run audit:avatar-smoke
npm run verify:auth-smoke
npm run verify:avatar-smoke
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
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

O app fica em `http://localhost:3000`. O PostgreSQL nao expoe porta publica; o app acessa o banco pela rede interna usando o host `postgres`.

## Deploy no Servidor Oracle Ubuntu

Rotina curta apos atualizar o repositorio, sem mudanca de banco:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose build app audit-server-smoke
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

Com alteracao em `prisma/schema.prisma` ou `prisma/migrations/`:

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose up -d postgres
docker compose build app migrate audit-server-smoke
docker compose --profile tools run --rm migrate
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
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
npm run audit:auth-smoke
npm run audit:avatar-smoke
npm run verify:server-smoke
npm run verify:auth-smoke
npm run verify:avatar-smoke
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
- `FinancialEntry`
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
- aula ao vivo por `LiveSession`, com sala Jitsi embutida quando o link externo fica vazio;
- teacher/admin pode abrir e encerrar aula ao vivo;
- student ve a sala embutida quando ha sessao ativa para ele ou geral;
- Google login opcional com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`;
- modo manutencao operacional no admin;
- favicon com marca Candy English;
- Catty no canto inferior direito do site, do login e dos paineis logados do AVA; WhatsApp continua fora dos paineis logados;
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
- navegacao institucional com fonte maior para Sobre, Metodologia, Contato e AVA.

## FASE 17 - Refinos visuais e historico de usuarios

Implementado:

- `/ava/admin?task=usuarios` agora separa usuarios em tres colunas: admins, teachers e alunos;
- cada usuario mostra historico operacional simples com data de cadastro e contadores de aulas, homeworks, respostas, feedbacks, contratos, chats e aulas ao vivo quando aplicavel;
- resumo do usuario logado no AVA virou card compacto para evitar conteudo fora da caixa em desktop;
- textos explicativos longos foram removidos dos headers de admin, teacher e student para deixar a leitura mais objetiva;
- home removeu a marca decorativa solta que ficava sobre os cards do hero;
- footer passou a usar marca textual simples, sem card branco envolvendo logo;
- favicon voltou a usar a bala SVG transparente enviada para `public/favicon.svg`.

## FASE 18 - Hero cinematografico da home

Implementado:

- home usa video de fundo fullscreen em loop, com `autoPlay`, `loop`, `muted` e `playsInline`;
- navbar institucional ganha efeito glass apenas na rota `/`, mantendo logo, links e botao AVA;
- tipografia da home usa Inter no corpo e Instrument Serif no headline principal;
- botoes principais do hero usam efeito `liquid-glass`;
- conteudo textual continua sendo da Candy English e pode seguir vindo do cadastro de conteudo do site;
- paginas institucionais e rotas do AVA nao tiveram a logica alterada.

## FASE 19 - Entrada Direta no Login do AVA

Implementado:

- `/ava` redireciona visitante diretamente para `/ava/login`, removendo a tela intermediaria com cards de admin/teacher/student;
- quando ja existe sessao, `/ava` redireciona automaticamente para a area correta pelo role;
- o botao "Entrar com Google" permanece na tela de login e fica ativo quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estao configurados;
- `scripts/auth-smoke.ts` testa login real temporario para `ADMIN`, `TEACHER` e `STUDENT`, valida o redirecionamento por role e apaga os usuarios de teste ao final.

## FASE 20 - Perfil, Contratos e UX Student

Implementado:

- `/ava/admin?task=usuarios` permite minimizar grupos Admins, Teachers e Alunos, e cada historico de usuario abre sob demanda;
- `/ava/admin?task=contratos` permite ao admin selecionar aluno e enviar PDF protegido;
- admin ve card de uso de arquivos em `storage/`, exibido em KB/MB;
- perfil student edita nome, telefone geral, endereco, sexo, nascimento, documento/responsavel, dois contatos do aluno, nome/telefone da mae e observacoes; o nivel e somente leitura para o aluno e editado pela teacher;
- upload de foto do perfil mostra preview atual e continua aceitando PNG/JPG/WebP ate 2 MB;
- `scripts/avatar-smoke.ts` valida o fluxo tecnico de avatar criando aluno temporario, salvando imagem no volume `storage` e lendo pela rota protegida;
- student ve contratos PDF embutidos na tela; se nao houver contrato, aparece "Contrato ainda nao adicionado";
- student tem sidebar sempre aberta com botoes roxos para Aula ao vivo, Aulas, Homework, Mensagens, Contratos e Perfil;
- materiais com link, como Canva compartilhado, aparecem com tentativa de previa embutida e link para abrir em nova aba;
- home ganhou link Home na navbar, botao AVA com formato mais proximo de bala e secao de contatos com WhatsApp, Instagram, Facebook e email;
- login do AVA ganhou logo reposicionada e movimento suave na marca.
- login do AVA usa `public/brand/ava-login.mp4` em loop no fundo com overlay roxo para preservar leitura.

Observacao sobre Word/Canva:

- homework online ja permite responder dentro do site por texto;
- materiais do Canva podem ser compartilhados por link e visualizados no AVA quando o Canva permitir iframe;
- upload/edicao de Word dentro do navegador exige uma fase propria para converter o documento em perguntas online ou integrar um visualizador/editor de documentos.

## FASE 21 - Student Visual, Nivel Teacher e Aula Embutida

Implementado:

- `StudentProfile.gender` guarda a identificacao de sexo informada no perfil do aluno;
- o aluno nao edita mais o campo `level`; ele aparece como leitura no perfil student;
- teacher/admin podem atualizar o nivel do aluno no resumo da area teacher, sempre validando vinculo quando o ator e `TEACHER`;
- `/ava/student` usa `public/brand/ava-student.mp4` como video de fundo fixo em loop, com cards translucidos para manter leitura;
- chat teacher/aluno foi redesenhado como conversa por bolhas, sem repetir role, email e metadados em cada mensagem;
- aula ao vivo cria uma sala Jitsi Meet embutida quando a teacher deixa o link externo vazio;
- links Google Meet continuam aceitos, mas abrem como sala externa porque o Google Meet nao foi projetado para ser controlado dentro de iframe do AVA;
- `next.config.ts` libera camera, microfone e display capture para `meet.jit.si`.

Observacao sobre aula ao vivo:

- a implementacao atual entrega uma sala WebRTC embutida de baixo atrito;
- para escala maior e controle profissional de gravacao, TURN, moderacao avancada e qualidade equivalente a plataforma dedicada, a proxima etapa recomendada e avaliar LiveKit/Jitsi self-host/JaaS.

## FASE 22 - Videos Institucionais e Contato Oficial

Implementado:

- `public/brand/home.mp4` passou a ser o video principal do hero da home;
- o video cinematografico remoto anterior foi movido para a segunda secao da home, com cards translucidos sobre a animacao;
- `/sobre`, `/metodologia`, `/contato` e demais paginas que usam `InstitutionalPage` recebem `public/brand/informacoes.mp4` como fundo em loop;
- o header do site mostra um indicador de sessao quando `ADMIN`, `TEACHER` ou `STUDENT` estiver logado;
- `Planos` saiu da navegacao principal e do rodape, mantendo a rota existente para compatibilidade;
- os contatos passam a usar o email oficial `candyenglishbr@gmail.com`;
- o card e o botao flutuante de WhatsApp usam simbolo proprio do WhatsApp e mantem a mensagem padrao "Ola! Tenho interesse em mais informacoes".

## FASE 23 - Refinos Home e Entrada AVA

Implementado:

- a segunda secao em video da home ganhou altura baseada na proporcao do video para o enquadramento nao parecer cortado;
- o bloco "O AVA ja acompanha o essencial" virou uma area mais moderna, com particulas discretas, cards com hover e texto mais claro;
- o selo "Logado: Role" no header institucional virou informativo, sem link;
- quando ha sessao, o botao AVA do header aponta diretamente para a area correta do usuario;
- `/ava` agora valida o role com `isRole()` antes de redirecionar, reduzindo risco de erro de servidor em sessao inconsistente.
- se `/ava/student` mostrar erro de servidor apos deploy, confirmar se `docker compose --profile tools run --rm migrate` foi executado, pois a area student depende da migration `20260508090000_student_gender`.

## FASE 24 - Contraste Visual e Atalhos Operacionais

- hero da home ganhou card roxo translucido atras da chamada para leitura sobre video claro;
- Catty aparece tambem nos paineis logados do AVA por pedido explicito;
- menu teacher usa "Corrigir homework" abaixo de "Criar homework", com mensagens antes de contratos;
- menu admin ganhou atalhos para aula ao vivo, criar aula, criar homework, corrigir homework e mensagens;
- cards admin/teacher usam tons roxos suaves, bordas com mais contraste e hover discreto;
- foto de perfil usa `POST /ava/avatar`, aparece no card lateral, no resumo superior e no card de upload apos atualizar;
- atalhos do AVA possuem indicador visual local para novidades em aulas, homeworks, mensagens, contratos e aula ao vivo; ao abrir o modulo, o indicador e marcado como visto no navegador.

## FASE 25 - Financeiro Admin

- `/ava/admin?task=financeiro` adiciona um modulo financeiro visivel apenas para `ADMIN`;
- `FinancialEntry` guarda linhas financeiras de 2026 com mes, nome, valor em centavos, dia de pagamento, status pago/pendente, data real de pagamento e observacao;
- o status nasce como pendente quando nao ha data paga e pode ser alternado por botao vermelho/verde;
- a listagem fica separada por meses de 2026, ordenada pelo dia de pagamento em ordem crescente;
- a visualizacao usa layout tipo planilha em desktop e cards completos em telas menores para nao cortar informacoes;
- as server actions de financeiro chamam `auth()` e recusam escrita fora da role `ADMIN`.

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
- upload livre de materiais de aula e editor Word embutido;
- IA;
- notas numericas;
- notificacoes por email/WhatsApp;
- jogos.

## O Que Ainda Nao Foi Criado

- Jogos
- IA
- Sistema avancado de correcao, notas e relatorios
- Upload livre de arquivos/material Word
- MinIO
- Pagamentos online ou integracoes externas de cobranca
- Dashboard complexo
