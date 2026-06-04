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
- `src/lib/validations/candy-xp-activities.ts`
- `src/lib/admin-credentials.ts`
- `src/app/ava/admin/actions.ts`
- `src/app/ava/candy-xp/actions.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/ava/login/page.tsx`
- `src/components/ava/admin-operations.tsx`
- `src/components/ava/admin-credentials-panel.tsx`
- `src/components/ava/admin-candy-xp-panel.tsx`
- `src/components/ava/student-candy-xp-activities-panel.tsx`
- `src/app/ava/homework-assets/[homeworkId]/route.ts`
- `src/app/ava/candy-xp-assets/[activityId]/route.ts`
- `src/components/ava/login-form.tsx`

Tabelas:

- `User`
- `LoginAttempt`
- `StudentProfile`
- `TeacherProfile`
- `StudentTeacherAssignment`
- `AdminCredential`
- `CandyXpProfile`
- `CandyXpEvent`
- `CandyUserBadge`
- `CandyMissionAttempt`
- `CandyXpActivity`
- `CandyXpActivityAssignment`
- `CandyXpActivitySubmission`

Rotas protegidas:

- `/ava/admin`
- `/ava/admin?task=apis-senhas`
- `/ava/teacher`
- `/ava/student`
- `/ava/avatar/[userId]`
- `/ava/contracts/[contractId]`
- `/ava/homework-assets/[homeworkId]`
- `/ava/candy-xp-assets/[activityId]`
- `/api/catty/chat`

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
- Candy XP e gravado apenas no servidor a partir de dados ja autorizados para a role atual; student nao pode gravar XP para outro usuario e teacher nao pode pontuar aluno fora do vinculo.
- Apenas `ADMIN` cria, edita, publica, arquiva e corrige atividades Candy XP.
- `STUDENT` salva/envia apenas a propria submissao Candy XP e apenas em atividade publicada/liberada para seu perfil.
- Arquivos Candy XP exigem sessao; `ADMIN` acessa qualquer atividade e `STUDENT` apenas atividade publicada/liberada para ele.
- `TEACHER` nao acessa arquivos nem respostas Candy XP nesta fase.
- Atividades Candy XP objetivas podem liberar XP automaticamente no servidor; respostas escritas exigem revisao admin.
- Futuros jogos ou missoes precisam validar sessao, role, dono dos dados e `sourceKey` antes de conceder XP.
- Catty pode receber do layout apenas o nome do usuario logado para baloes visuais locais; esse nome nao autoriza leitura de dados internos nem deve ser usado para enviar contratos, respostas, pagamentos ou credenciais para IA.
- `/api/catty/chat` deve responder apenas para sessao ativa com role `ADMIN`, `TEACHER` ou `STUDENT`; usuario sem sessao recebe 401 amigavel e nao aciona Gemini, OpenAI ou fallback.

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
- O ledger Candy XP usa `CandyXpEvent.userId + sourceKey` como defesa anti-replay/anti-duplicacao, alem das validacoes de role nas actions e paginas que sincronizam XP.
- As actions de Candy XP validam payload com Zod, checam role/dono da submissao e usam rota protegida para asset em vez de expor caminho do storage.
- O `RootLayout` pode chamar `auth()` para passar somente `session.user.name` ao widget da Catty, mantendo a deteccao de login no servidor e sem depender de descoberta client-side.
- A rota da Catty chama `auth()` no servidor antes de processar a mensagem; o callback JWT/session ja invalida usuario inativo, mudanca de role e `sessionVersion` antiga.

## Riscos ao alterar esta parte

- Remover validacao de `isActive` permite acesso de usuario bloqueado.
- Confiar apenas no menu do client vaza dados.
- Alterar callbacks JWT/session pode quebrar redirecionamento por role.
- Usar dados sem verificar vinculo teacher/aluno pode expor informacoes.
- Servir arquivo de homework direto de `storage/` sem checar role/vinculo vaza material privado.
- Servir arquivo Candy XP direto de `storage/` sem checar publicacao/assignment vaza atividade privada.
- Logar ou serializar valores revelados de `AdminCredential` compromete APIs externas.
- Remover a protecao server-side da Catty transforma a assistente em chat publico e pode gerar custo externo com Gemini/OpenAI.

## Pendencias

- Politica mais forte de rate limit por IP.
- Registro/auditoria ampliada de acoes administrativas.
- Auditoria especifica para revelacao/copia de credenciais administrativas.

## Como pode evoluir

- Adicionar invalidacao de sessao por versao de usuario.
- Adicionar testes automatizados de permissoes por action.
- Documentar fluxo de OAuth Google quando credenciais finais estiverem ativas.
