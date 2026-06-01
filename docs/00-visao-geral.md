# 00 - Visao Geral

## O que esta parte do sistema faz

Este documento e a porta de entrada da memoria longa do Candy English. Ele resume o estado real do projeto e aponta para os documentos especializados.

Candy English combina site institucional e AVA proprio em `/ava`. O sistema atende administradores, teachers e alunos, com foco em rotina escolar online: aulas interativas, materiais, homework interativo, feedback, contratos, aula ao vivo, mensagens, financeiro interno, agenda administrativa, cofre administrativo de APIs/senhas, Candy XP persistente por role e controle de acessos.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos centrais:

- `README.md`: entrada rapida para humanos.
- `AGENTS.md`: manual obrigatorio para agentes de IA.
- `docs/`: memoria longa do projeto.
- `src/app/(site)/`: site institucional.
- `src/app/ava/`: AVA.
- `src/components/ava/`: componentes operacionais do AVA.
- `src/lib/`: Auth, Prisma, storage, roles e configuracoes.
- `prisma/schema.prisma`: schema do banco.
- `docker-compose.yml`: ambiente Docker.

Rotas principais:

- `/`, `/sobre`, `/metodologia`, `/planos`, `/contato`
- `/ava`, `/ava/login`, `/ava/admin`, `/ava/teacher`, `/ava/student`
- `/ava/avatar`, `/ava/avatar/[userId]`
- `/ava/contracts/[contractId]`
- `/ava/homework-assets/[homeworkId]`
- `/api/auth/[...nextauth]`, `/api/health`, `/api/catty/chat`

## Regras de negocio que precisam ser preservadas

- O AVA deve permanecer em `/ava`.
- `ADMIN`, `TEACHER` e `STUDENT` sao os perfis atuais.
- Areas protegidas devem validar permissao no servidor.
- Admins podem criar usuarios, ativar/desativar acessos e redefinir senhas pela interface protegida.
- Admins podem registrar APIs/senhas em `/ava/admin?task=apis-senhas`; os valores ficam criptografados e so devem ser revelados pela UI protegida.
- O aluno so acessa dados do proprio perfil.
- Teacher trabalha com alunos vinculados por `StudentTeacherAssignment`.
- Contratos e avatares sao protegidos por rotas server-side.
- Financeiro e modulo interno do admin, sem pagamento online.
- Agenda e modulo interno do admin para controle operacional de presenca e reposicao.
- Homework e aula interativa devem manter arquivo e campos protegidos por permissao de aluno/teacher/admin.
- Candy XP e persistido por eventos server-side e continua respeitando role: student usa apenas dados do proprio aluno, teacher usa apenas dados da area permitida e admin usa indicadores operacionais globais permitidos; nao deve expor ranking publico nem dados indevidos.

## Decisoes tecnicas tomadas

- Aplicacao propria em Next.js, nao WordPress.
- PostgreSQL roda no Docker sem porta publica.
- Auth.js usa JWT e Credentials Provider; Google e opcional.
- Senhas ficam com hash `bcryptjs`, inclusive quando redefinidas por admin.
- Prisma 7 usa client gerado em `src/generated/prisma`.
- Docker usa container `app`, `postgres` e ferramentas no perfil `tools`.
- Uploads persistem em `storage/` local ou volume Docker `app-storage`.
- Homework e aula interativa usam editor manual por arrastar: o arquivo original fica como fundo protegido e a teacher desenha areas editaveis em porcentagem sobre cada pagina.
- Candy XP usa `src/lib/candy-xp.ts` para calcular nivel infinito/progresso e `src/lib/candy-xp-persistence.ts` para gravar eventos, streaks, badges e missoes com `sourceKey` anti-duplicacao.
- Catty usa OpenAI pelo servidor quando `OPENAI_API_KEY` existe e fallback local quando nao existe.
- O cofre admin importa apenas integracoes externas do `.env` quando existem; segredos internos de banco, Auth e seed nao entram na tela.

## Mapa da documentacao oficial

- `01-arquitetura.md`: camadas, rotas e organizacao tecnica.
- `02-banco-de-dados.md`: schema, migrations e persistencia.
- `03-fluxos-do-sistema.md`: fluxos de produto.
- `04-padroes-de-codigo.md`: padroes para alterar codigo.
- `05-comandos.md`: comandos locais, Docker e deploy.
- `06-pendencias.md`: pendencias reais.
- `07-historico-de-decisoes.md`: decisoes importantes.
- `08-autenticacao-e-permissoes.md`: Auth.js, roles e autorizacao.
- `09-deploy-e-ambiente.md`: ambientes e operacao.
- `13-financeiro.md`: modulo financeiro.
- `14-agenda.md`: modulo agenda.
- `15-homework-interativo.md`: upload do Canva, editor manual de areas sobre o arquivo e autosave para homework/aula interativa.
- `16-candy-xp.md`: fundacao de gamificacao persistente no estilo Duolingo.
- `99-contexto-rapido-codex.md`: prompt minimo e contexto curto para retomar o projeto em outro chat.

## Riscos ao alterar esta parte

- Documentacao desatualizada pode induzir futuras conversas a alterar arquivos errados.
- Repetir historico antigo sem verificar codigo real pode documentar funcionalidades inexistentes.
- Apagar docs antigos pode remover contexto de decisoes visuais e operacionais.

## Pendencias

- Consolidar no futuro docs especificos para testes, seguranca, painel administrativo, logs e performance se esses temas crescerem.
- Manter documentos historicos sincronizados ou marcar claramente como historicos quando forem substituidos.

## Como pode evoluir

Esta pasta pode receber novos documentos numerados por tema. Use nomes claros, por exemplo:

- `10-integracoes.md`
- `11-seguranca.md`
- `14-painel-administrativo.md`
- `16-testes.md`
- `18-modulos-futuros.md`
