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
- `src/lib/validations/admin-users.ts`
- `src/lib/validations/admin-credentials.ts`
- `src/lib/admin-credentials.ts`
- `src/app/ava/admin/actions.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/ava/login/page.tsx`
- `src/components/ava/admin-operations.tsx`
- `src/components/ava/admin-credentials-panel.tsx`
- `src/app/ava/homework-assets/[homeworkId]/route.ts`
- `src/components/ava/login-form.tsx`

Tabelas:

- `User`
- `LoginAttempt`
- `StudentProfile`
- `TeacherProfile`
- `StudentTeacherAssignment`
- `AdminCredential`

Rotas protegidas:

- `/ava/admin`
- `/ava/admin?task=apis-senhas`
- `/ava/teacher`
- `/ava/student`
- `/ava/avatar/[userId]`
- `/ava/contracts/[contractId]`
- `/ava/homework-assets/[homeworkId]`

## Regras de negocio que precisam ser preservadas

- `ADMIN` acessa admin e pode supervisionar teacher/student.
- `TEACHER` acessa teacher e student, mas dados editaveis dependem de vinculo.
- `STUDENT` acessa student e apenas os proprios dados.
- Usuario inativo nao entra.
- Muitas falhas de login bloqueiam novas tentativas na janela configurada.
- Modo manutencao bloqueia student, mas nao admin/teacher.
- Google login so aceita email ja cadastrado e ativo.
- Apenas `ADMIN` pode redefinir senha de usuarios pela interface admin.
- Redefinicao de senha deve validar dados com Zod, gravar somente hash `bcryptjs` e nunca registrar a senha em logs, docs ou resposta.
- Apenas `ADMIN` pode criar, editar, excluir ou revelar APIs/senhas em `AdminCredential`.
- Valores de `AdminCredential` devem ser criptografados no servidor e revelados somente por server action protegida; nunca retornar valores para teacher/student.
- Arquivos de homework interativo exigem `ADMIN`, `TEACHER` dona da aula ou `STUDENT` dono da homework.
- Contratos PDF podem ser embutidos apenas em paginas do proprio AVA (`SAMEORIGIN`); a rota continua exigindo sessao e permissao por aluno.

## Decisoes tecnicas tomadas

- Auth.js/NextAuth v5 usa JWT.
- Credentials Provider e o login principal.
- Google Provider e opcional.
- `auth()` e usado em server components/actions.
- `requireAvaRole` redireciona usuarios sem sessao ou sem permissao.
- O token/session recebe `id` e `role`.
- O token/session recebe `sessionVersion`; o callback JWT consulta o usuario ativo e invalida sessoes antigas quando a versao muda, o usuario fica inativo ou a role do banco diverge da role do token.
- A action admin de redefinicao de senha atualiza `User.passwordHash` e incrementa `User.sessionVersion`, forçando novo login em sessoes ja abertas daquele usuario.
- Actions do cofre admin chamam `auth()`, validam role `ADMIN`, validam payload com Zod e bloqueiam alteracao/exclusao direta de valores vindos do `.env`.

## Riscos ao alterar esta parte

- Remover validacao de `isActive` permite acesso de usuario bloqueado.
- Confiar apenas no menu do client vaza dados.
- Alterar callbacks JWT/session pode quebrar redirecionamento por role.
- Usar dados sem verificar vinculo teacher/aluno pode expor informacoes.
- Servir arquivo de homework direto de `storage/` sem checar role/vinculo vaza material privado.
- Logar ou serializar valores revelados de `AdminCredential` compromete APIs externas.

## Pendencias

- Politica mais forte de rate limit por IP.
- Registro/auditoria ampliada de acoes administrativas.
- Auditoria especifica para revelacao/copia de credenciais administrativas.

## Como pode evoluir

- Adicionar invalidacao de sessao por versao de usuario.
- Adicionar testes automatizados de permissoes por action.
- Documentar fluxo de OAuth Google quando credenciais finais estiverem ativas.
