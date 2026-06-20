# Candy English

Site institucional e AVA da Candy English.

## Objetivo

O projeto entrega uma aplicacao propria, fora de WordPress, para a Candy English. Ele combina site institucional e AVA com areas separadas para `ADMIN`, `TEACHER` e `STUDENT`.

O AVA permite administrar usuarios, vincular alunos a teachers, criar aulas, materiais, vocabulario, homework online, feedback, contratos PDF protegidos, aula ao vivo em manutencao temporaria, financeiro interno e agenda administrativa.

## Status atual

Fase atual documentada: FASE 32.

Ja existe:

- login real com Auth.js/NextAuth v5, JWT, Credentials Provider, senha com `bcryptjs` e revogacao de sessao por versao de usuario;
- roles `ADMIN`, `TEACHER` e `STUDENT`;
- protecao de rotas em servidor para `/ava/admin`, `/ava/teacher` e `/ava/student`;
- admin com cadastro de usuarios, aceite/recusa de pre-cadastros, redefinicao de senha, status ativo/inativo, vinculo aluno-teacher, contratos, manutencao, financeiro, agenda, cofre de APIs/senhas, card Admin XP persistente e modulo Candy XP para criar historias/atividades com PDF do Canva e areas interativas sobre o arquivo;
- teacher com aceite de pre-cadastros como alunos STUDENT, aulas interativas por upload do Canva, materiais, vocabulario, homework interativo, feedback, area de aula ao vivo em manutencao temporaria, contratos, mensagens e card Teacher XP persistente;
- student com aulas, homework interativo com autosave, feedback, mensagens, contratos, perfil, avatar, area de aula ao vivo em manutencao temporaria, card Student XP persistente no resumo e area Candy XP com missoes de historia, resposta no PDF/imagem, progresso e envio;
- chat interno teacher/aluno validado por vinculo;
- pre-cadastro publico no login do AVA para interessados solicitarem contato, salvo como pendente sem criar usuario, senha ou sessao ate Admin/Teacher aceitar no modulo protegido `Aceitar alunos`;
- contador discreto de visitas no footer do site publico, salvo como total agregado em `SiteVisitCounter`, com registro client-side leve e sem armazenar IP, user-agent ou dados pessoais;
- contratos e avatar servidos por rotas protegidas;
- financeiro admin recorrente para 2026 com `FinancialStudent`, snapshots mensais em `FinancialPayment` e `FinancialLog`;
- agenda admin para 2026 com alunos recorrentes, presenca, falta e reposicao por `AgendaStudent`, `AgendaLesson` e `AgendaLog`;
- homework e aula interativa com arquivo PDF/imagem protegido, campos editaveis desenhados por arrastar sobre o arquivo, autosave, selecao direta de aluno e replicacao de homework ja editada para outro aluno sem novo upload;
- campos Listening no homework/aula interativa, com leitura Gemini do texto dentro da area desenhada pela teacher, botao de volume posicionado no fim da area, audio OpenAI text-to-speech em ingles e botao unico que alterna ouvir/pausar, retomando a proxima reproducao em velocidade normal/devagar;
- Catty como gatinha mascote-professora publica com baloes aleatorios no site e assistente interna do AVA para usuarios logados, com personalidade Candy oficial, primeiro nome seguro em respostas quando fizer sentido, emojis controlados, artefatos meme por interesse do aluno tambem nos baloes locais do AVA logado, painel unificado `Catty dos alunos` apenas para Admin/Teacher escolherem aluno, gosto, emojis, sons e bordoes com memoria leve sincronizada, enriquecimento controlado de temas por cache/provedor de busca apenas em fluxo de preparacao com aprovacao humana, feedback discreto nas respostas, Learning Center com fila de treino, ate 3 memorias globais aprovadas por Admin no contexto, memoria pessoal ativa e ranqueada por usuario para gostos/preferencias/dificuldades leves, campo minimizado `Contexto Catty` na criacao/aceite de alunos para gravar memoria inicial segura, gestao tecnica de memorias sem exposicao para Student e tela informativa `Catty aprendendo` para Student, auto-sugestoes pendentes quando houver lacuna de resposta, Gemini padrao, OpenAI apenas quando a mensagem chama Catty pelo nome, fallback local autorizado, historico persistente por usuario/contexto com prompt curto e limpeza manual quando ficar pesado, atalhos de estudo, baloes personalizados, incentivo e pratica simples em ingles com perguntas traduzidas para portugues, correcoes curtas no formato `Better`/`English tip`/`Em portugues` e comando avancado `Catty, [word or short expression] meaning` com definicao, exemplo e convite em ingles, incluindo phrasal verbs e alvos de ate 15 palavras;
- Candy XP com eventos persistidos, `sourceKey` anti-duplicacao, nivel infinito, streak, badges, catalogo inicial de missoes, ranking interno do AVA para alunos/profs e atividades de historias com editor de areas no PDF/imagem e XP automatico/manual;
- otimizacao server-side de PDFs pedagogicos protegidos, incluindo Candy XP, homework interativo e aulas interativas, com Ghostscript quando disponivel e fallback para salvar o original se a compressao falhar;
- Docker Compose com PostgreSQL interno, healthcheck, migrations, seed e smoke tests.

Nao existe ainda: pagamento online, minijogos executaveis de vocabulario/listening/speaking, listening proprio em Candy XP, tela completa de badges/temporadas, upload livre de materiais fora dos fluxos interativos, editor Word embutido, relatorios avancados, dashboard complexo e RAG/base de conhecimento automatica ampla para a Catty.

## Stack

- Next.js 15 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Shadcn/ui com componentes locais
- Auth.js / NextAuth v5
- Prisma 7
- PostgreSQL 17
- Zod
- React Hook Form
- TanStack React Query
- Docker e Docker Compose

## Documentacao oficial

Use estes documentos como memoria longa do projeto:

- `AGENTS.md`: manual obrigatorio para agentes de IA.
- `docs/00-visao-geral.md`: contexto de produto e mapa da documentacao.
- `docs/01-arquitetura.md`: arquitetura tecnica e pontos de extensao.
- `docs/02-banco-de-dados.md`: schema Prisma, migrations e persistencia.
- `docs/03-fluxos-do-sistema.md`: fluxos principais do AVA.
- `docs/04-padroes-de-codigo.md`: padroes de implementacao.
- `docs/05-comandos.md`: comandos locais, Docker e deploy.
- `docs/06-pendencias.md`: pendencias reais e ideias futuras.
- `docs/07-historico-de-decisoes.md`: decisoes tecnicas relevantes.
- `docs/08-autenticacao-e-permissoes.md`: autenticacao, roles e autorizacao.
- `docs/09-deploy-e-ambiente.md`: ambientes, Docker e Oracle.
- `docs/13-financeiro.md`: modulo financeiro admin.
- `docs/14-agenda.md`: modulo agenda admin.
- `docs/15-homework-interativo.md`: homework/aula interativa com upload do Canva, editor manual de areas, autosave e arquivo protegido.
- `docs/16-candy-xp.md`: gamificacao persistente, XP, streaks, badges, missoes e anti-abuso.
- `docs/17-candy-xp-atividades.md`: historias Candy XP com PDF do Canva, perguntas, progresso, correcao e XP.
- `docs/catty-comportamento.md`: exemplos bons/ruins e smoke de comportamento da Catty.
- `docs/99-contexto-rapido-codex.md`: prompt minimo e memoria curta para continuar o projeto em outro chat.

Arquivos historicos como `docs/arquitetura.md`, `docs/fluxos-ava.md`, `docs/design-direcao.md` e `docs/producao-checklist.md` continuam uteis, mas a serie numerada e a referencia principal.

## Estrutura de pastas

```txt
src/
  app/
    (site)/                 Site institucional
    api/                    Rotas API e Auth.js
    ava/                    Rotas do AVA
      admin/                Area e actions de ADMIN
      teacher/              Area e actions de TEACHER
      student/              Area e actions de STUDENT
  components/
    ava/                    Componentes do AVA
    site/                   Componentes do site institucional
    ui/                     Componentes shadcn/ui locais
  generated/prisma/         Prisma Client gerado
  lib/                      Auth, Prisma, storage, roles e helpers
  types/                    Tipos globais
docs/                       Memoria longa do projeto
prisma/
  migrations/               Historico de migrations
  schema.prisma             Schema do banco
  seed.ts                   Seed do admin inicial
public/
  brand/                    Logos, videos e assets da Candy
scripts/                    Smoke tests e verificacoes operacionais
```

## Variaveis de ambiente

Crie `.env` a partir de `.env.example`. Nunca versione `.env`.

Variaveis principais:

- `APP_HOST_BIND`: bind da porta do app, normalmente `127.0.0.1`.
- `APP_PORT`: porta local do app, normalmente `3000`.
- `DATABASE_URL`: URL interna do PostgreSQL no Docker.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: banco do container.
- `AUTH_SECRET`: segredo do Auth.js.
- `ADMIN_CREDENTIALS_SECRET`: segredo opcional para criptografar APIs/senhas salvas no admin; se ficar vazio, `AUTH_SECRET` e usado.
- `AUTH_URL` e `NEXTAUTH_URL`: URL publica do app.
- `AVA_STORAGE_DIR`: diretorio de uploads, em producao `/app/storage`.
- `PDF_OPTIMIZATION_ENABLED`: ativa/desativa a tentativa de otimizacao de PDFs pedagogicos protegidos, como Candy XP, homework interativo e aulas interativas.
- `PDF_OPTIMIZATION_PRESET`: preset do Ghostscript para PDF, por padrao `ebook`.
- `PDF_MAX_UPLOAD_MB`: limite de upload para esses PDFs pedagogicos, por padrao `14`.
- `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN`: dominio Jitsi usado pela aula ao vivo embutida; use `meet.jit.si` localmente e um dominio dedicado, como `meet.candyenglish.com.br`, quando a infra estiver configurada.
- `LIVE_CLASS_MAINTENANCE_ENABLED` em `src/lib/live-class.ts`: pausa temporariamente a aula ao vivo; teacher/student veem manutencao e as actions bloqueiam criacao/reativacao apos validar role.
- `GEMINI_API_KEY`: chave opcional usada pela Catty como provedor padrao; sem chave, a Catty usa fallback local nas mensagens comuns.
- `GEMINI_CATTY_MODEL`: modelo Gemini usado pela Catty, exemplo `gemini-3.5-flash`.
- `GEMINI_HOMEWORK_OCR_MODEL`: modelo Gemini usado para ler o texto dentro do box Listening, exemplo `gemini-3.5-flash`.
- `OPENAI_API_KEY`: chave opcional usada pela Catty somente quando a mensagem chama Catty pelo nome, pelo OCR opcional de homework e pelo audio OpenAI dos campos Listening; sem chave, Catty cai para Gemini/fallback e o audio do Listening fica indisponivel.
- `OPENAI_CATTY_MODEL`: modelo OpenAI usado pela Catty no modo acionado por chamada nominal, exemplo `gpt-5.4-nano`.
- `OPENAI_HOMEWORK_OCR_MODEL`: modelo para OCR opcional de homework legado, exemplo `gpt-4.1-mini`.
- `OPENAI_LISTENING_TTS_MODEL`: modelo OpenAI de text-to-speech usado pelos campos Listening, exemplo `gpt-4o-mini-tts`.
- `OPENAI_LISTENING_TTS_VOICE`: voz OpenAI usada pelos campos Listening, exemplo `coral`.
- `CATTY_ARTIFACT_ENRICHMENT_ENABLED`: ativa/desativa enriquecimento de temas no painel Admin/Teacher `Catty dos alunos`; nao afeta o chat normal.
- `CATTY_ARTIFACT_SEARCH_PROVIDER`: provedor usado no enriquecimento, por padrao `offline`; `brave` usa Brave Search quando houver chave.
- `CATTY_ARTIFACT_SEARCH_CACHE_DAYS`: validade do cache de sugestoes de temas, por padrao `90`.
- `BRAVE_SEARCH_API_KEY`: chave opcional para busca web no fluxo de enriquecimento de artefatos da Catty.
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: admin inicial do seed.
- `ADMIN_RESET_PASSWORD`: redefine senha do admin apenas quando `true`.
- `AUDIT_BASE_URL`: base URL usada pelos smoke tests.

O arquivo `.env.example` contem apenas exemplos e placeholders.
O painel `/ava/admin?task=apis-senhas` sincroniza para o banco, de forma criptografada, apenas integracoes externas configuradas no `.env` como Gemini, OpenAI e dominio Jitsi. Segredos internos como `DATABASE_URL`, `AUTH_SECRET`, senhas do Postgres e senha seed do admin nao sao importados para a tela.

## Instalacao local

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

Depois ajuste o `.env` com valores locais.

## Rodar localmente sem Docker

Use quando houver um PostgreSQL acessivel via `DATABASE_URL`:

```bash
npm run prisma:validate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Acesse:

```txt
http://localhost:3000
http://localhost:3000/ava/login
http://localhost:3000/api/health
```

## Rodar com Docker

```bash
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose run --rm seed
docker compose up -d --build app
docker compose ps
```

O PostgreSQL nao publica a porta `5432`; ele fica acessivel apenas na rede interna do Compose.

## Comandos principais

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
npm run audit:candy-xp-visibility
npm run audit:catty-behavior
npm run verify:server-smoke
npm run verify:auth-smoke
npm run verify:avatar-smoke
npm run verify:candy-xp-visibility
npm run verify:catty-behavior
```

## Deploy Oracle

Projeto oficial no servidor:

```bash
/home/ubuntu/projetos/candy-english
```

Deploy sem migration:

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

Deploy com migration:

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
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

## Regras de cuidado

- Nunca expor segredos em commits, logs ou respostas.
- Nunca publicar a porta `5432` do PostgreSQL.
- Sempre rodar migration antes de recriar o app quando `prisma/migrations/` mudar.
- Server actions sensiveis devem validar sessao, role e permissao por dado.
- Mudancas estruturais devem atualizar a documentacao oficial em `docs/`.
