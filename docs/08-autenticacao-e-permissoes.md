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
- `src/lib/validations/pre-registration.ts`
- `src/app/ava/pre-registrations/actions.ts`
- `src/lib/validations/admin-users.ts`
- `src/lib/validations/admin-credentials.ts`
- `src/lib/validations/candy-xp-activities.ts`
- `src/lib/admin-credentials.ts`
- `src/app/ava/admin/actions.ts`
- `src/app/ava/login/actions.ts`
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
- `src/components/ava/student-pre-registration-form.tsx`
- `src/components/ava/student-pre-registration-review-panel.tsx`

Tabelas:

- `User`
- `LoginAttempt`
- `StudentProfile`
- `StudentPreRegistration`
- `TeacherProfile`
- `StudentTeacherAssignment`
- `AdminCredential`
- `CattyConversation`
- `CattyMessage`
- `CattyLearningItem`
- `CattyLearningFeedback`
- `CattyUserMemory`
- `CattyMemoryEvent`
- `CattyUserArtifact`
- `CattyArtifactEnrichmentCache`
- `CattyArtifactEnrichment`
- `CandyXpProfile`
- `CandyXpEvent`
- `CandyUserBadge`
- `CandyMissionAttempt`
- `CandyXpActivity`
- `CandyXpActivityInteractiveField`
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
- `/ava/avatar/[userId]` exige sessao; student le apenas o proprio avatar, admin le todos e teacher le avatar de aluno vinculado.
- Usuario inativo nao entra.
- Muitas falhas de login bloqueiam novas tentativas na janela configurada.
- Modo manutencao bloqueia student, mas nao admin/teacher.
- Login Google esta desativado nesta fase; o login ativo e por email/senha com Credentials Provider.
- Pre-cadastro publico no login apenas cria `StudentPreRegistration.PENDING`; nao cria senha, `User`, role ou sessao.
- Pre-cadastro publico no login apenas cria `StudentPreRegistration.PENDING`; nao cria senha, `User`, role ou sessao.
- `ADMIN` e `TEACHER` podem revisar pre-cadastros no modulo `Aceitar alunos`; ao aceitar, o servidor cria somente `User.role=STUDENT` e `StudentProfile`.
- Quando `TEACHER` aceita um aluno, o servidor tambem cria o vinculo `StudentTeacherAssignment` com a propria teacher.
- O fluxo de aceite nunca cria `ADMIN` ou `TEACHER` e nunca retorna/loga a senha inicial em texto puro.
- Apenas `ADMIN` pode redefinir senha de usuarios pela interface admin.
- Redefinicao de senha deve validar dados com Zod, gravar somente hash `bcryptjs` e nunca registrar a senha em logs, docs ou resposta.
- Apenas `ADMIN` pode criar, editar, excluir ou revelar APIs/senhas em `AdminCredential`.
- Valores de `AdminCredential` devem ser criptografados no servidor e revelados somente por server action protegida; nunca retornar valores para teacher/student.
- Arquivos de homework interativo exigem `ADMIN`, `TEACHER` dona da aula ou `STUDENT` dono da homework.
- Contratos PDF podem ser embutidos apenas em paginas do proprio AVA (`SAMEORIGIN`); a rota continua exigindo sessao e permissao por aluno.
- Candy XP e gravado apenas no servidor a partir de dados ja autorizados para a role atual; student nao pode gravar XP para outro usuario e teacher nao pode pontuar aluno fora do vinculo.
- Apenas `ADMIN` cria, edita, publica, arquiva, exclui e corrige atividades Candy XP.
- Apenas `ADMIN` salva ou remove areas interativas de `CandyXpActivityInteractiveField` no editor do PDF Candy XP.
- `STUDENT` salva/envia apenas a propria submissao Candy XP e apenas em atividade publicada/liberada para seu perfil.
- Arquivos Candy XP exigem sessao; `ADMIN` acessa qualquer atividade e `STUDENT` apenas atividade publicada/liberada para ele.
- `TEACHER` nao acessa arquivos nem respostas Candy XP nesta fase.
- Atividades Candy XP objetivas podem liberar XP automaticamente no servidor; respostas escritas exigem revisao admin.
- Areas interativas Candy XP tambem sao validadas no servidor antes de concluir; campos obrigatorios vazios bloqueiam envio e `LISTENING` nao e aceito neste modulo por enquanto.
- Futuros jogos ou missoes precisam validar sessao, role, dono dos dados e `sourceKey` antes de conceder XP.
- Catty pode receber do layout apenas o nome do usuario logado para baloes visuais locais; esse nome nao autoriza leitura de dados internos nem deve ser usado para enviar contratos, respostas, pagamentos ou credenciais para IA.
- `/api/catty/chat` deve responder apenas para sessao ativa com role `ADMIN`, `TEACHER` ou `STUDENT`; usuario sem sessao recebe 401 amigavel e nao aciona Gemini, OpenAI ou fallback.
- Historico da Catty deve ser carregado e gravado apenas para o `User.id` autenticado; visitante sem login nao grava historico e nao pode acessar mensagens por chamada direta de API.
- `TEACHER` pode sugerir aprendizados para o Catty Learning Center, mas apenas `ADMIN` aprova, rejeita, arquiva ou reativa aprendizado global.
- `STUDENT` pode enviar feedback discreto sobre respostas da propria Catty, mas nao cria nem aprova memoria global da Catty.
- `TEACHER` pode revisar feedback proprio ou de alunos vinculados e transformar em sugestao pendente; nao pode aprovar globalmente.
- `ADMIN` pode editar feedback e aprovar como aprendizado global usado pela Catty.
- Itens aprovados do Catty Learning Center entram como guia de estilo/exemplo/vocabulario na Catty, nunca como dado interno do aluno; a rota envia no maximo 3 memorias relevantes por resposta, priorizadas por intencao, tags e termos da mensagem.
- Auto-sugestoes da Catty entram apenas como `CattyLearningFeedback.PATTERN_SUGGESTION` pendente; Admin/Teacher revisam pela fila protegida, e somente Admin pode transformar isso em memoria aprovada global.
- `CattyUserMemory` e memoria pessoal por usuario: a rota de chat usa somente itens `ACTIVE` do proprio `session.user.id`; `STUDENT` nao recebe a lista tecnica de memorias na UI e ve apenas `Catty aprendendo`, `TEACHER` so acessa aluno vinculado por `StudentTeacherAssignment` e `ADMIN` pode supervisionar.
- Memoria pessoal da Catty deve ser curta e segura; actions e helper bloqueiam senha, pagamento, contrato, documento, telefone, endereco, email, token, chave/API, pix, cartao e dados privados antes de gravar ou corrigir.
- Admin e Teacher podem preencher `Contexto Catty` somente ao criar/aceitar aluno `STUDENT`; o valor vira `CattyUserMemory.NOTE/contexto_catty` ativa, respeitando a mesma validacao de dados sensiveis e as mesmas permissoes da memoria pessoal.
- `CattyUserArtifact` e estilo configuravel por usuario: `ADMIN` gerencia todos os alunos e `TEACHER` somente alunos vinculados. `STUDENT` nao acessa a tela tecnica nem altera artefatos por action. Admin/Teacher podem marcar um tema ativo como principal. Somente `ACTIVE` entra na rota da Catty; `PENDING`, `DISABLED` e `ARCHIVED` ficam fora do prompt/fallback.
- Actions de `Catty dos alunos` chamam `auth()`, validam role, dono/vinculo e Zod no servidor; elas bloqueiam senha, pagamento, contrato, documento, telefone, endereco, email, token, chave/API e temas sensiveis antes de gravar.
- Quando um artefato fica `ACTIVE`, a action pode sincronizar uma memoria segura `FAVORITE_THEME/artifact_*`; quando fica `DISABLED`, sincroniza `STYLE/avoid_*` para a Catty respeitar o pedido de parar de usar aquele tema.
- Enriquecimento de artefato em `Catty dos alunos` e permitido apenas para `ADMIN` ou `TEACHER`; `STUDENT` nao aciona busca/crawler/cache nem aprova sugestao.
- `ADMIN` pode enriquecer/aprovar/recusar/arquivar sugestoes de qualquer aluno; `TEACHER` so pode fazer isso para alunos vinculados por `StudentTeacherAssignment`; a validacao acontece em server action e helper, nao apenas na UI.
- Sugestoes de `CattyArtifactEnrichment` com status pendente, falho, recusado ou arquivado nunca entram no prompt/fallback da Catty; somente uma aprovacao humana cria/atualiza `CattyUserArtifact.ACTIVE`.
- Senha, pagamento, contrato, API key, telefone e dados privados devem ser bloqueados pela validacao de feedback, aprendizado manual e auto-sugestao.

## Decisoes tecnicas tomadas

- Auth.js/NextAuth v5 usa JWT.
- Credentials Provider e o login principal.
- Google Provider foi removido temporariamente; o provider ativo e Credentials.
- `StudentPreRegistration` guarda interessados como solicitacao pendente fora do fluxo de Auth.js.
- `StudentPreRegistration` tambem guarda metadados de revisao/conversao; `APPROVED` e usado como status tecnico para `Convertido em aluno` na UI.
- `auth()` e usado em server components/actions.
- `requireAvaRole` redireciona usuarios sem sessao ou sem permissao.
- O token/session recebe `id` e `role`.
- O token/session recebe `sessionVersion`; o callback JWT consulta o usuario ativo e invalida sessoes antigas quando a versao muda, o usuario fica inativo ou a role do banco diverge da role do token.
- A action admin de redefinicao de senha atualiza `User.passwordHash` e incrementa `User.sessionVersion`, forçando novo login em sessoes ja abertas daquele usuario.
- O botao `Sair` do AVA usa logout client-side do Auth.js com clique unico e redirecionamento final para `/ava/login`, evitando que a tela protegida tente renderizar depois que a sessao foi encerrada.
- Actions do cofre admin chamam `auth()`, validam role `ADMIN`, validam payload com Zod e bloqueiam alteracao/exclusao direta de valores vindos do `.env`.
- O ledger Candy XP usa `CandyXpEvent.userId + sourceKey` como defesa anti-replay/anti-duplicacao, alem das validacoes de role nas actions e paginas que sincronizam XP.
- As actions de Candy XP validam payload com Zod, checam role/dono da submissao, restringem o editor de areas a `ADMIN` e usam rota protegida para asset em vez de expor caminho do storage. A exclusao de atividade tambem exige `ADMIN`, remove dependentes por cascade e preserva eventos historicos de XP.
- O `RootLayout` pode chamar `auth()` para passar somente `session.user.name` ao widget da Catty, mantendo a deteccao de login no servidor e sem depender de descoberta client-side.
- A rota da Catty chama `auth()` no servidor antes de processar a mensagem; o callback JWT/session ja invalida usuario inativo, mudanca de role e `sessionVersion` antiga.
- A rota da Catty usa `CattyConversation`/`CattyMessage` somente depois de validar a sessao; o banco pode reter ate 50.000 mensagens por usuario/contexto, a UI carrega ate 120 recentes e somente 8 mensagens entram no contexto da IA.
- A rota da Catty usa `CattyUserMemory` somente depois de validar a sessao e sempre filtra pelo `session.user.id`, para que gosto/dificuldade de um aluno nao apareca para outro.
- Actions do Catty Learning Center chamam `auth()`, validam role e usam Zod para impedir feedback/aprendizados com termos sensiveis antes de gravar ou aprovar memoria.
- Actions de memoria pessoal da Catty chamam `auth()`, validam role, dono do dado e vinculo teacher/aluno antes de salvar, corrigir, aprovar, arquivar, remover dado sensivel, limpar historico ou marcar memoria como flagged.
- Actions de artefatos da Catty chamam `auth()`, validam role, dono do dado e vinculo teacher/aluno antes de salvar, ativar, desativar ou arquivar tema; `STUDENT` nao consegue aprovar tema como `ACTIVE`.
- Actions de enriquecimento de artefatos da Catty chamam `auth()`, bloqueiam `STUDENT`, validam dono/vinculo, usam Zod e bloqueiam tema sensivel antes de consultar cache ou provedor externo.
- A criacao direta de aluno pelo Admin e o aceite de pre-cadastro por Admin/Teacher podem semear a memoria pessoal inicial `NOTE/contexto_catty` usando `upsertCattyUserMemory`, sem criar novo campo sensivel em `User` ou `StudentProfile`.
- O envio de feedback da Catty valida que o `CattyMessage` avaliado pertence ao proprio usuario logado; Teacher/Admin revisam pela fila protegida, com filtro de vinculo para Teacher.

## Riscos ao alterar esta parte

- Remover validacao de `isActive` permite acesso de usuario bloqueado.
- Criar usuario automaticamente a partir de `StudentPreRegistration` liberaria acesso sem revisao admin.
- Criar usuario automaticamente a partir de `StudentPreRegistration` liberaria acesso sem revisao admin/teacher.
- Permitir que Teacher escolha role no aceite abriria escalacao de privilegio; o fluxo deve fixar `STUDENT` no servidor.
- Confiar apenas no menu do client vaza dados.
- Alterar callbacks JWT/session pode quebrar redirecionamento por role.
- Usar dados sem verificar vinculo teacher/aluno pode expor informacoes.
- Servir arquivo de homework direto de `storage/` sem checar role/vinculo vaza material privado.
- Servir arquivo Candy XP direto de `storage/` sem checar publicacao/assignment vaza atividade privada.
- Logar ou serializar valores revelados de `AdminCredential` compromete APIs externas.
- Remover a protecao server-side da Catty transforma a assistente em chat publico e pode gerar custo externo com Gemini/OpenAI.
- Expor historico da Catty por `contextKey` sem filtrar `userId` vazaria conversas entre usuarios.
- Aprovar aprendizado com dados sensiveis pode fazer a Catty repetir informacao privada em respostas futuras; revisar conteudo antes de aprovar e manter a validacao conservadora.
- Expor todos os feedbacks da Catty para Teacher sem validar vinculo pode vazar conversa de aluno; manter o filtro por `StudentTeacherAssignment`.
- Expor memoria pessoal da Catty sem filtro por `userId` ou sem validar vinculo teacher/aluno pode vazar interesses, dificuldades e observacoes pedagogicas leves entre usuarios.
- Expor `CattyUserArtifact` sem filtro de dono/vinculo pode revelar gostos e preferencias de aluno; manter sempre filtro por Admin ou Teacher vinculada.
- Permitir enriquecimento externo por Student ou sem validar vinculo teacher/aluno pode gerar custo, vazar preferencias e ativar temas sem revisao; manter busca e alteracao apenas em fluxo Admin/Teacher protegido.

## Pendencias

- Politica mais forte de rate limit por IP.
- Registro/auditoria ampliada de acoes administrativas.
- Auditoria especifica para revelacao/copia de credenciais administrativas.

## Como pode evoluir

- Adicionar invalidacao de sessao por versao de usuario.
- Adicionar testes automatizados de permissoes por action.
- Reavaliar login Google apenas quando houver decisao de produto e credenciais OAuth finais.
