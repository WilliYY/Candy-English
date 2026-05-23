# AGENTS.md - Manual obrigatorio do Candy English

Este arquivo e a primeira leitura obrigatoria para qualquer conversa futura do Codex neste projeto.

## Objetivo do projeto

Candy English e um site institucional com AVA proprio em `/ava`. O AVA possui areas para `ADMIN`, `TEACHER` e `STUDENT`, com login real, controle de permissao, aulas, materiais, homework, feedback, contratos, aula ao vivo, chat interno, financeiro administrativo e agenda administrativa.

## Leitura obrigatoria antes de alterar arquivos

Antes de alterar qualquer arquivo, sempre ler:

1. `AGENTS.md`
2. `README.md`
3. os arquivos relevantes em `docs/`

Leitura minima recomendada:

- `docs/00-visao-geral.md`
- `docs/01-arquitetura.md`
- `docs/02-banco-de-dados.md` quando houver Prisma/migration
- `docs/03-fluxos-do-sistema.md` quando houver fluxo de usuario
- `docs/04-padroes-de-codigo.md` antes de criar ou alterar codigo
- `docs/05-comandos.md` antes de validar ou fazer deploy
- `docs/06-pendencias.md` para nao reabrir decisoes ja conhecidas
- `docs/07-historico-de-decisoes.md` antes de mudar decisao tecnica

## Regras permanentes

1. Antes de alterar qualquer arquivo, sempre ler `AGENTS.md`, `README.md` e os docs relevantes.

2. Nunca reescrever o projeto inteiro sem necessidade.

3. Fazer alteracoes pequenas, rastreaveis e reversiveis.

4. Preservar os padroes ja existentes no projeto, salvo quando houver motivo tecnico claro para alterar.

5. Preferir o caminho mais simples que resolva o pedido sem criar arquitetura desnecessaria.

6. Nunca apagar ou reverter mudancas que possam ser do usuario sem permissao explicita.

7. Atualizar a documentacao sempre que houver mudanca em arquitetura, banco de dados, APIs, autenticacao, permissoes, regras de negocio, seguranca, deploy, layout principal, fluxos de usuario, modulos internos, integracoes externas ou comportamento importante do sistema.

8. Ao finalizar qualquer tarefa, informar arquivos alterados, documentacao criada ou atualizada, comandos executados, testes/build/lint realizados, pendencias abertas e riscos ou cuidados encontrados.

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

## Rotas principais

- `/`: site institucional
- `/sobre`, `/metodologia`, `/planos`, `/contato`: paginas institucionais
- `/ava`: roteador do AVA
- `/ava/login`: login
- `/ava/admin`: exige `ADMIN`
- `/ava/teacher`: exige `ADMIN` ou `TEACHER`
- `/ava/student`: exige `ADMIN`, `TEACHER` ou `STUDENT`

## Roles

- `ADMIN`: administra usuarios, redefine senhas, vinculos, contratos, manutencao, financeiro e agenda; tambem pode supervisionar areas teacher/student.
- `TEACHER`: gerencia aulas, materiais, homework, feedback, mensagens, contratos e aula ao vivo para alunos vinculados.
- `STUDENT`: acessa aulas, homework, mensagens, contratos, perfil e aula ao vivo permitida.

## Regras criticas de seguranca

- O projeto nao deve ser feito em WordPress.
- O projeto deve rodar em Docker.
- PostgreSQL nao deve ficar exposto publicamente.
- `.env` real nunca deve ser versionado.
- `.env.example` deve conter apenas exemplos.
- Nunca imprimir `DATABASE_URL`, `AUTH_SECRET`, senhas ou segredos em respostas, logs ou docs.
- Server actions sensiveis precisam chamar `auth()` e validar role.
- Permissao deve ser validada por dado, nao apenas por UI protegida.
- `STUDENT` so deve acessar dados do proprio `StudentProfile`.
- `TEACHER` so deve editar/corrigir dados das proprias aulas ou dos alunos vinculados.
- Chat teacher/aluno deve validar `StudentTeacherAssignment` antes de gravar mensagem.
- Nivel do aluno deve ser alterado por `TEACHER` vinculada ou `ADMIN`, nunca pelo proprio `STUDENT`.
- Contratos devem continuar protegidos por rota server-side.
- Contratos gerais podem ser vistos por alunos logados; contratos com aluno definido exigem proprio aluno, teacher vinculada ou admin.
- Modo manutencao bloqueia `STUDENT`, mas nao `ADMIN` nem `TEACHER`.
- `User.isActive=false` deve bloquear login sem apagar historico.
- Redefinicao de senha pela interface admin deve validar role `ADMIN` no servidor e gravar apenas hash, nunca a senha em texto puro.
- O cofre admin de APIs e senhas em `/ava/admin?task=apis-senhas` deve validar role `ADMIN` no servidor, criptografar valores em `AdminCredential.secretCiphertext` e nunca registrar valores revelados em logs, docs ou respostas.
- O cofre admin pode sincronizar integracoes externas do `.env` como OpenAI, Google OAuth e dominio Jitsi; nunca importar `DATABASE_URL`, `AUTH_SECRET`, senhas do Postgres ou senha seed do admin para a UI.

## Padroes de implementacao

- Preferir Server Components para leitura e server actions para escrita.
- Formularios devem usar React Hook Form + Zod quando forem client-side.
- Validacoes ficam em `src/lib/validations/`.
- Auth e permissao ficam em `src/lib/auth.ts`, `src/lib/authorization.ts` e nos guards das actions.
- Prisma Client e acessado por `getPrisma()` em `src/lib/prisma.ts`.
- Upload local fica em `storage/` ou volume Docker `app-storage`; nunca versionar uploads.
- Componentes do AVA ficam em `src/components/ava/`.
- Componentes do site ficam em `src/components/site/`.
- Componentes base shadcn ficam em `src/components/ui/`.
- Cada nova area importante do AVA deve ter tarefa/atalho claro quando fizer sentido.
- Nao criar caixa interna com barra de rolagem para atalhos; agrupar por Admin, Teacher e Student.

## Padroes visuais

- Respeitar `docs/design-direcao.md`.
- Site institucional pode ser mais visual; AVA deve ser operacional, legivel e direto.
- Catty aparece no site, login e paineis logados do AVA por pedido explicito.
- WhatsApp aparece no site e login, mas nao nos paineis logados do AVA.
- Cuidar para Catty nao cobrir botoes criticos.
- Evitar elementos decorativos pesados que prejudiquem performance ou clareza.

## Financeiro

O financeiro e controle interno do admin em `/ava/admin?task=financeiro`.

- Nao tratar como pagamento online sem pedido explicito.
- `FinancialStudent` guarda dados recorrentes.
- `FinancialPayment` guarda o snapshot mensal do aluno, status, data paga, observacao e se a linha segue ativa naquele mes.
- `FinancialLog` registra acoes simples.
- Meses anteriores sao historico fechado: editar aluno pode valer do mes selecionado em diante, mas retirar aluno financeiro remove apenas o mes atual.
- Mudancas neste modulo devem atualizar `docs/13-financeiro.md`.

## Agenda

A agenda e controle interno do admin em `/ava/admin?task=agenda`.

- Nao substituir o modulo de aulas teacher/student sem pedido explicito.
- `AgendaStudent` guarda aluno cadastrado na agenda.
- `AgendaLesson` guarda ocorrencias de 2026, status de presenca, reposicoes e retirada futura.
- `AgendaLog` registra acoes simples.
- Mudancas neste modulo devem atualizar `docs/14-agenda.md`.

## Homework interativo

O homework interativo usa upload de PDF/imagem exportado do Canva na area teacher em `/ava/teacher?task=criar-homework`. A criacao de aula em `/ava/teacher?task=criar-aula` reutiliza o mesmo motor interativo por enquanto.

- A criacao nova de homework usa o fluxo interativo do Canva; homework simples fica apenas como legado para atividades antigas.
- A criacao nova de aula tambem pode usar PDF/imagem do Canva, criando uma aula real com uma atividade interativa vinculada para reaproveitar as mesmas ferramentas.
- A criacao interativa seleciona teacher e aluno; o sistema cria uma aula interna automaticamente para vincular permissao, arquivo e entrega.
- Atividades criadas por `Criar aula` aparecem para o aluno em `Aulas e materiais`; somente atividades criadas por `Criar homework` aparecem em `Responder homework`.
- Arquivos ficam em `storage/homework-assets` e sao servidos apenas por rota protegida.
- `Homework.kind=INTERACTIVE` diferencia arquivos interativos de perguntas simples.
- `Homework.fieldDetectionSource=lesson-manual` identifica atividades interativas criadas pelo fluxo de aula; `manual` segue sendo o fluxo de homework.
- `HomeworkInteractiveField` guarda os campos editaveis sobre o arquivo.
- `HomeworkSubmission.status=DRAFT` e usado para autosave do aluno; apenas `SUBMITTED` deve gerar evento novo para teacher/admin.
- `RETURNED` libera o aluno para refazer; `REVIEWED` bloqueia reenvio.
- O editor manual por arrastar e o fluxo padrao: a teacher desenha, move, redimensiona e exclui areas diretamente sobre o PDF/imagem.
- No editor da teacher, areas manuais devem mostrar uma previa do resultado final (`x`, texto exemplo ou area de desenho) para posicionamento preciso antes de salvar.
- Na tela do aluno, areas de resposta devem ser invisiveis; somente texto digitado, marca selecionada ou tracos desenhados aparecem.
- Campos de desenho precisam funcionar com mouse e dedo e permitir desfazer o ultimo traco sem limpar tudo.
- IA/OCR para sugerir campos e opcional/futuro e nao deve criar campos automaticamente sem pedido explicito.
- Mudancas neste modulo devem atualizar `docs/15-homework-interativo.md`.

## Banco e migrations

- Toda alteracao em `prisma/schema.prisma` precisa de migration.
- Depois de migration, atualizar `docs/02-banco-de-dados.md` e, se for decisao relevante, `docs/07-historico-de-decisoes.md`.
- Em deploy, rodar `docker compose --profile tools run --rm migrate` antes de recriar o app quando houver migration nova.

## Validacao esperada

Escolha a validacao proporcional ao risco. Para mudancas estruturais, rode:

```bash
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Para mudancas de servidor/Docker/fluxos AVA, validar tambem:

```bash
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

## Git e entrega

Preferencia operacional atual do projeto: quando uma tarefa de implementacao for concluida, fazer commit no Git e enviar para o GitHub quando possivel. Ao final, informar tambem o prompt/comandos para PuTTY quando a mudanca precisar ir ao servidor Oracle.

Projeto oficial:

- Windows/Codex: `C:\Projetos\candy-english`
- Oracle: `/home/ubuntu/projetos/candy-english`

## Como responder ao finalizar

Sempre informar:

- arquivos alterados;
- documentacao criada ou atualizada;
- comandos executados;
- testes, build ou lint realizados;
- pendencias abertas;
- riscos ou cuidados encontrados;
- commit/push, quando feitos;
- comandos PuTTY de deploy, quando aplicavel.
