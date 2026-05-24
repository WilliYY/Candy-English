# 01 - Arquitetura

## O que esta parte do sistema faz

Este documento descreve a arquitetura tecnica atual do Candy English. Ele deve ser atualizado quando houver mudanca em rotas, camadas, padroes de autorizacao, Docker, storage, APIs ou layout principal.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Camadas principais:

- `src/app/(site)/`: site institucional.
- `src/app/ava/`: areas logadas do AVA.
- `src/app/api/`: Auth.js e healthcheck.
- `src/app/api/catty/chat/route.ts`: endpoint server-side da Catty com OpenAI opcional e fallback local.
- `src/components/site/`: header, footer, home, paginas institucionais, Catty e WhatsApp.
- `src/components/ava/`: paineis e formularios do AVA.
- `src/components/ui/`: componentes base shadcn/ui.
- `src/lib/auth.ts`: Auth.js e callbacks.
- `src/lib/authorization.ts`: guard de roles para paginas.
- `src/lib/live-class.ts`: dominio Jitsi configuravel para aula ao vivo.
- `src/lib/catty.ts`: personalidade, fallback local, sanitizacao e montagem do contexto leve de tela da Catty.
- `src/lib/admin-credentials.ts`: criptografia e sincronizacao de credenciais administrativas vindas de integracoes externas do ambiente.
- `src/lib/roles.ts`: helpers de roles e destinos.
- `src/lib/prisma.ts`: instancia lazy do Prisma.
- `src/lib/storage.ts`: uploads e calculo de storage.
- `src/lib/homework-ocr.ts`: helper reservado para OCR opcional de campos de homework; o fluxo padrao atual e manual.
- `src/lib/validations/`: schemas Zod.
- `prisma/schema.prisma`: modelo relacional.
- `Dockerfile` e `docker-compose.yml`: runtime, banco e ferramentas.

Servicos Docker:

- `app`: Next.js standalone.
- `postgres`: PostgreSQL 17 interno.
- `migrate`: Prisma migrate deploy.
- `seed`: admin inicial.
- `audit-server-smoke`: smoke tests.

## Regras de negocio que precisam ser preservadas

- O site institucional e publico; o AVA e protegido.
- `/ava` redireciona visitante para `/ava/login` e usuario logado para a area correta.
- `ADMIN` pode supervisionar area teacher/student, mas dados sensiveis ainda exigem validacao.
- `TEACHER` nao deve receber acesso global irrestrito aos alunos.
- `STUDENT` nao edita o proprio nivel.
- Financeiro e agenda sao modulos internos do `ADMIN`.
- APIs e senhas ficam em modulo interno do `ADMIN`, com valor criptografado e revelacao explicita na UI.
- Homework e aula interativa usam arquivo protegido e permissao por dado entre admin, teacher dona da aula e aluno dono.
- Catty permanece nos paineis logados; WhatsApp nao aparece nos paineis logados.
- Catty so envia para OpenAI a conversa digitada no widget e contexto leve de rota/tarefa, sem dados de sessao, senha, banco ou informacoes internas do AVA.

## Decisoes tecnicas tomadas

- Next.js App Router e usado em todo o projeto.
- Autorizacao de paginas fica em server components com `requireAvaRole`.
- Escritas sensiveis ficam em server actions.
- Middleware Edge nao e usado para carregar Prisma.
- UI do AVA usa tarefas por query string `?task=`.
- Modulos internos grandes do admin usam uma task propria, como `financeiro` e `agenda`.
- O cofre administrativo usa a task `apis-senhas`, server actions em `src/app/ava/admin/actions.ts` e componente `src/components/ava/admin-credentials-panel.tsx`.
- Arquivos privados do AVA sao servidos por rotas server-side autenticadas, como contratos e homework assets.
- Docker final usa `output: "standalone"`.
- Server Actions aceitam upload ate 15 MB para suportar homework/aula interativa exportados do Canva.
- O app ajusta permissao de `/app/storage` no boot e depois executa o servidor como usuario `nextjs`.
- Headers basicos de seguranca ficam em `next.config.ts`.
- Jitsi Meet e usado para aula ao vivo embutida quando nao ha link externo.
- O dominio Jitsi e configuravel por `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN`; `meet.jit.si` fica como fallback/local, mas producao deve migrar para Jitsi dedicado/JaaS para evitar login externo e limite de embed publico.
- Catty usa a OpenAI Responses API quando `OPENAI_API_KEY` esta configurada, com `OPENAI_CATTY_MODEL` opcional; se a chave ou a chamada falhar, responde pelo fallback local.
- Catty usa o contexto de `area` e `task` apenas para ajustar atalhos e tom da resposta, por exemplo homework, aulas, mensagens, teacher ou admin; esse contexto nao autoriza leitura ou escrita de dados internos.
- `AdminCredential.secretCiphertext` e criptografado com AES-256-GCM usando `ADMIN_CREDENTIALS_SECRET` ou `AUTH_SECRET`; o painel sincroniza apenas OpenAI, Google OAuth e dominio Jitsi do `.env`, nunca `DATABASE_URL`, `AUTH_SECRET`, Postgres ou senha seed.

## Riscos ao alterar esta parte

- Mover rotas do AVA pode quebrar redirecionamentos por role.
- Colocar Prisma em middleware Edge pode quebrar runtime.
- Criar leitura global para teacher pode vazar dados de alunos.
- Mudar permissao do storage pode quebrar avatar e contratos.
- Expor assets de homework fora de rota protegida pode vazar atividades e respostas de alunos.
- Alterar `Permissions-Policy` pode quebrar camera/microfone do Jitsi.
- Remover fallback, limite de uso ou restricao de contexto da Catty pode quebrar ambientes sem chave OpenAI, aumentar custo em producao ou vazar dados desnecessarios.
- Trocar `ADMIN_CREDENTIALS_SECRET` depois de salvar credenciais pode impedir a descriptografia dos registros antigos.

## Pendencias

- Nao ha dashboard analitico complexo.
- Nao ha API publica versionada.
- Nao ha sistema de permissoes customizaveis alem das roles atuais.
- Nao ha rotina formal de backup/restore documentada dentro do app.

## Como pode evoluir

- Criar docs especificos para painel administrativo, seguranca e testes.
- Separar submodulos grandes do AVA se as telas crescerem.
- Adicionar observabilidade, logs estruturados e monitoramento externo.
- Configurar Jitsi dedicado ou JaaS para aula ao vivo sem conta externa de teacher/aluno e com maior controle de embed.
