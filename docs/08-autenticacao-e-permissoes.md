# 08 - Autenticacao e Permissoes

## O que esta parte do sistema faz

Este documento descreve login, sessao, roles e regras de autorizacao do AVA.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `src/lib/auth.ts`
- `src/lib/authorization.ts`
- `src/lib/roles.ts`
- `src/types/next-auth.d.ts`
- `src/lib/validations/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/ava/login/page.tsx`
- `src/components/ava/login-form.tsx`

Tabelas:

- `User`
- `LoginAttempt`
- `StudentProfile`
- `TeacherProfile`
- `StudentTeacherAssignment`

Rotas protegidas:

- `/ava/admin`
- `/ava/teacher`
- `/ava/student`
- `/ava/avatar/[userId]`
- `/ava/contracts/[contractId]`

## Regras de negocio que precisam ser preservadas

- `ADMIN` acessa admin e pode supervisionar teacher/student.
- `TEACHER` acessa teacher e student, mas dados editaveis dependem de vinculo.
- `STUDENT` acessa student e apenas os proprios dados.
- Usuario inativo nao entra.
- Muitas falhas de login bloqueiam novas tentativas na janela configurada.
- Modo manutencao bloqueia student, mas nao admin/teacher.
- Google login so aceita email ja cadastrado e ativo.

## Decisoes tecnicas tomadas

- Auth.js/NextAuth v5 usa JWT.
- Credentials Provider e o login principal.
- Google Provider e opcional.
- `auth()` e usado em server components/actions.
- `requireAvaRole` redireciona usuarios sem sessao ou sem permissao.
- O token/session recebe `id` e `role`.

## Riscos ao alterar esta parte

- Remover validacao de `isActive` permite acesso de usuario bloqueado.
- Confiar apenas no menu do client vaza dados.
- Alterar callbacks JWT/session pode quebrar redirecionamento por role.
- Usar dados sem verificar vinculo teacher/aluno pode expor informacoes.

## Pendencias

- Revogacao imediata de sessoes JWT apos mudanca de role ou desativacao.
- Reset de senha pela interface.
- Politica mais forte de rate limit por IP.
- Registro/auditoria ampliada de acoes administrativas.

## Como pode evoluir

- Adicionar tela de reset de senha admin.
- Adicionar invalidacao de sessao por versao de usuario.
- Adicionar testes automatizados de permissoes por action.
- Documentar fluxo de OAuth Google quando credenciais finais estiverem ativas.
