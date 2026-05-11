# 00 - Visao Geral

## O que esta parte do sistema faz

Este documento e a porta de entrada da memoria longa do Candy English. Ele resume o estado real do projeto e aponta para os documentos especializados.

Candy English combina site institucional e AVA proprio em `/ava`. O sistema atende administradores, teachers e alunos, com foco em rotina escolar online: aulas, materiais, homework, feedback, contratos, aula ao vivo, mensagens e financeiro interno.

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
- `/api/auth/[...nextauth]`, `/api/health`

## Regras de negocio que precisam ser preservadas

- O AVA deve permanecer em `/ava`.
- `ADMIN`, `TEACHER` e `STUDENT` sao os perfis atuais.
- Areas protegidas devem validar permissao no servidor.
- O aluno so acessa dados do proprio perfil.
- Teacher trabalha com alunos vinculados por `StudentTeacherAssignment`.
- Contratos e avatares sao protegidos por rotas server-side.
- Financeiro e modulo interno do admin, sem pagamento online.

## Decisoes tecnicas tomadas

- Aplicacao propria em Next.js, nao WordPress.
- PostgreSQL roda no Docker sem porta publica.
- Auth.js usa JWT e Credentials Provider; Google e opcional.
- Senhas ficam com hash `bcryptjs`.
- Prisma 7 usa client gerado em `src/generated/prisma`.
- Docker usa container `app`, `postgres` e ferramentas no perfil `tools`.
- Uploads persistem em `storage/` local ou volume Docker `app-storage`.

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
