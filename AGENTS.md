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

FASE 21 implementada. O AVA ja possui login real, roles, admin inicial, cadastro de usuarios, status ativo/inativo, vinculo aluno-teacher, aulas, materiais, vocabulario, homework online, feedback inicial, sidebar por role com grupos expansíveis para admin/teacher e botoes sempre abertos para student, perfil completo com foto, contratos PDF, aula ao vivo embutida por Jitsi quando nao ha link externo, modo manutencao e chatbox teacher/aluno. O admin agrupa usuarios por role, permite minimizar historicos, envia contratos PDF e mostra uso aproximado de storage. O student edita dados pessoais e sexo, mas nivel e somente leitura; teacher/admin atualizam nivel pela area teacher. O site institucional tem direcao visual roxa, logo visivel, favicon com bala transparente, home com video fullscreen e navbar glass, Catty e WhatsApp no site/login. Admin, teacher e student usam `/ava/...?...task=` para abrir uma tarefa limpa por vez. A rota `/ava` redireciona visitante para `/ava/login` e usuario autenticado para a area correta por role.

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
- aula ao vivo por `LiveSession`, com sala Jitsi embutida quando nao houver link externo;
- Google login opcional somente para emails ja cadastrados.

### FASE 13

Experiencia visual:

- favicon usa a marca Candy English;
- Catty no canto inferior direito do site e do login;
- video global, balas e GIFs decorativos foram removidos por decisao de performance e clareza visual.

### FASE 14

Orcamento de RAM e refino visual operacional:

- `app` possui reserva e limite de memoria no Compose;
- `postgres` possui reserva, limite, `shm_size` e parametros conservadores de PostgreSQL;
- servicos utilitarios `migrate`, `seed` e `audit-server-smoke` possuem limite proprio porque rodam sob demanda.
- paineis logados do AVA nao exibem Catty para nao cobrir botoes e formularios;
- resumo de usuario no AVA usa card compacto, sem visual de cartao de credito;
- seletores de role devem evitar colunas estreitas que cortem texto.
- sidebar do AVA funciona como indice operacional por role, com grupos expansíveis e atalhos profundos para os blocos da pagina.

### FASE 15

Admin por tarefa:

- sidebar admin ordenada como usuarios, criar admin, criar teacher, criar aluno, vincular aluno e editar site;
- `/ava/admin?task=usuarios` mostra somente listagem, contadores e status de usuarios;
- `/ava/admin?task=criar-admin`, `criar-teacher` e `criar-aluno` mostram formularios separados por role;
- criar aluno usa nome completo, email/usuario de login, senha provisoria, data de nascimento e documento/responsavel;
- idade do aluno e calculada pela data de nascimento, nao salva como numero fixo;
- `/ava/admin?task=vincular-aluno` mostra vinculo e lista de vinculos atuais;
- `/ava/admin?task=editar-site` fica reservado para manutencao operacional.

### FASE 16

Manutencao, contatos e chatbox:

- cadastro de aluno com dois telefones do aluno, documento/responsavel, nome da mae e telefone da mae;
- modo manutencao salvo em `AppSetting`;
- alunos nao conseguem logar durante manutencao;
- student logado ve tela "Manutencao Candy";
- `ADMIN` e `TEACHER` continuam acessando durante manutencao;
- teacher e student tambem usam tarefas separadas por `?task=`;
- chatbox teacher/aluno usa `ChatThread` e `ChatMessage`, sempre validando o vinculo `StudentTeacherAssignment`;
- WhatsApp comercial aparece no site e no login, mas nao nos paineis logados do AVA.

### FASE 17

Refino visual e historico:

- `/ava/admin?task=usuarios` agrupa usuarios em admins, teachers e alunos;
- cada card de usuario mostra historico operacional com data de cadastro e contadores relevantes;
- resumo do usuario logado no AVA usa card compacto para evitar overflow;
- textos explicativos longos foram removidos dos paineis admin, teacher e student;
- home removeu a marca decorativa solta sobre os cards do hero;
- footer usa marca textual simples, sem card branco envolvendo logo;
- favicon usa a bala SVG transparente em `public/favicon.svg`.

### FASE 18

Hero cinematografico da home:

- `HomeHero` usa video remoto fullscreen em loop;
- navbar fica glass apenas na home, mantendo logo, links e AVA;
- Inter e Instrument Serif sao carregadas via Google Fonts no CSS global;
- CTA do hero usa efeito `liquid-glass`;
- conteudo textual continua sendo da Candy English;
- logica do AVA nao foi alterada.

### FASE 19

Entrada direta no login do AVA:

- `/ava` nao renderiza mais cards publicos de admin, teacher e student;
- visitante em `/ava` vai para `/ava/login`;
- usuario logado em `/ava` vai para `/ava/admin`, `/ava/teacher` ou `/ava/student`;
- botao Google permanece no login, ativo apenas quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estao configurados;
- `scripts/auth-smoke.ts` testa login temporario de admin, teacher e student e limpa os usuarios criados.
- `scripts/avatar-smoke.ts` testa armazenamento de avatar com imagem temporaria, login student e rota protegida `/ava/avatar/[userId]`.

### FASE 20

Perfil, contratos e UX student:

- admin usuarios usa grupos e historicos minimizaveis;
- admin possui `/ava/admin?task=contratos` para enviar PDF a aluno;
- admin mostra card de arquivos com uso aproximado de `storage/`;
- student tem sidebar fixa em botoes roxos;
- student edita perfil completo com telefones, sexo, nascimento, responsavel, mae e observacoes;
- nivel do aluno e somente leitura para student e editavel por teacher/admin;
- foto de perfil mostra preview e usa upload protegido existente;
- student ve contratos PDF embutidos e mensagem "Contrato ainda nao adicionado" quando nao houver contrato;
- links de material, inclusive Canva compartilhado, tentam abrir uma previa embutida e mantem link de nova aba;
- home ganhou link Home na navbar, secao de contatos e botao AVA em formato mais proximo de bala.
- login do AVA usa `public/brand/ava-login.mp4` em loop no fundo, mantendo overlay roxo e o formulario por cima.

### FASE 21

Student visual, nivel teacher e aula embutida:

- `StudentProfile.gender` registra identificacao de sexo;
- `STUDENT` nao edita mais `level`;
- teacher/admin atualizam `level` pela area teacher com server action protegida;
- student usa `public/brand/ava-student.mp4` como video de fundo fixo em loop;
- cards do student usam camadas translucidas para leitura sobre o video;
- chatbox teacher/aluno exibe mensagens como bolhas, com menos metadados visuais;
- aula ao vivo gera sala Jitsi Meet quando o campo de link externo fica vazio;
- link Google Meet continua aceito como sala externa;
- `next.config.ts` permite camera, microfone e display capture para `meet.jit.si`.

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
npm run audit:auth-smoke
npm run audit:avatar-smoke
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
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
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
- Chat teacher/aluno deve validar o vinculo `StudentTeacherAssignment` antes de gravar mensagem.
- Nivel do aluno deve ser alterado por `TEACHER` vinculada ou `ADMIN`, nao pelo proprio `STUDENT`.
- Aula ao vivo embutida usa Jitsi Meet; se trocar provedor, revisar `Permissions-Policy`, iframe/API e documentacao.
- Modo manutencao deve bloquear `STUDENT`, mas nao `ADMIN` nem `TEACHER`.
- `User.isActive=false` deve bloquear login sem apagar dados historicos.
- Nao registrar nem imprimir `.env`, `DATABASE_URL`, `AUTH_SECRET` ou senhas.
- Mudancas visuais devem respeitar `docs/design-direcao.md`.
- Catty deve ficar fora dos paineis logados do AVA, salvo pedido explicito para reavaliar isso.
- Toda nova area importante do AVA deve ganhar `id` de ancora e, quando fizer sentido, atalho na sidebar por role.
- Nao criar caixa interna com barra de rolagem para atalhos; agrupar opcoes em Admin, Teacher e Student.
- Upload local deve ficar em `storage/`, que nao deve ser versionado.
- Contratos devem continuar protegidos por rota server-side.
- Contratos gerais podem ser vistos por alunos logados, mas contrato com aluno definido so pode ser visto pelo proprio aluno, teacher vinculada ou admin.
- Manter o orcamento de RAM do Docker documentado em `docker-compose.yml`, `.env.example`, README e arquitetura.
