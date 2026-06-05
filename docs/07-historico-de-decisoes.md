# 07 - Historico de Decisoes

## O que esta parte do sistema faz

Este documento registra decisoes tecnicas importantes. Sempre que uma decisao for tomada, alterada ou substituida, adicione uma nova entrada.

## Como registrar

Cada decisao deve conter:

- data aproximada;
- decisao tomada;
- motivo da decisao;
- arquivos ou modulos impactados;
- riscos ou cuidados futuros.

## Decisoes registradas

### 2026-05 - Aplicacao propria, nao WordPress

- Decisao: Candy English sera uma aplicacao Next.js propria.
- Motivo: AVA precisa de login, roles, dados escolares e permissoes finas.
- Impacto: projeto inteiro.
- Riscos/cuidados: nao migrar para WordPress sem decisao explicita.

### 2026-05 - AVA em `/ava`

- Decisao: manter AVA sob `/ava`.
- Motivo: separar site institucional e area logada sem outro dominio.
- Impacto: `src/app/ava/`, header do site, redirects.
- Riscos/cuidados: mudar rotas quebra links e deploy.

### 2026-05 - Auth.js com JWT e Credentials Provider

- Decisao: usar Auth.js/NextAuth v5 com credentials, senha bcrypt e JWT.
- Motivo: login proprio com roles e sem dependencia obrigatoria de provedor externo.
- Impacto: `src/lib/auth.ts`, `src/types/next-auth.d.ts`, `/api/auth`.
- Riscos/cuidados: proteger `AUTH_SECRET`; revisar revogacao de sessao no futuro.

### 2026-05-30 - Revogacao de sessao por versao de usuario

- Decisao: adicionar `User.sessionVersion` e guardar essa versao no JWT.
- Motivo: sessoes abertas devem perder validade quando o admin desativa/reativa usuario, redefine senha ou quando a role no banco diverge da role do token.
- Impacto: `prisma/schema.prisma`, migration `20260530183000_user_session_version`, `src/lib/auth.ts`, `src/types/next-auth.d.ts`, `src/app/ava/admin/actions.ts`, `prisma/seed.ts`.
- Riscos/cuidados: futuras actions que mudarem role ou outros dados de acesso devem incrementar `sessionVersion`; callbacks JWT agora consultam o banco para manter a sessao alinhada ao usuario ativo.

### 2026-05 - Google login opcional

- Decisao: Google so fica ativo quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existem.
- Motivo: permitir login social sem bloquear ambiente local/servidor.
- Impacto: `src/lib/auth.ts`, login do AVA.
- Riscos/cuidados: Google aceita apenas emails ja cadastrados e ativos.

### 2026-06-05 - Login Google desativado por enquanto

- Decisao: remover o provider Google do Auth.js e retirar o botao `Entrar com Google` da tela de login.
- Motivo: manter o acesso do AVA simples e controlado por email/senha enquanto a Candy amadurece o fluxo de contas.
- Impacto: `src/lib/auth.ts`, `src/app/ava/login/page.tsx`, `src/components/ava/login-form.tsx`, `.env.example`, `src/lib/admin-credentials.ts` e docs oficiais.
- Riscos/cuidados: reativar Google no futuro exige nova decisao, credenciais OAuth validas e manutencao da regra de aceitar apenas usuarios ativos ja cadastrados.

### 2026-05 - Autorizacao no servidor, nao no middleware Edge

- Decisao: paginas protegidas usam `requireAvaRole`; actions validam `auth()`.
- Motivo: evitar Prisma/pg no Edge e manter permissao perto da leitura/escrita.
- Impacto: `src/lib/authorization.ts`, paginas e actions do AVA.
- Riscos/cuidados: menus filtrados nao substituem validacao no servidor.

### 2026-05 - PostgreSQL interno no Docker

- Decisao: Postgres nao publica porta `5432`.
- Motivo: reduzir exposicao publica do banco.
- Impacto: `docker-compose.yml`, `.env.example`, deploy.
- Riscos/cuidados: acesso administrativo deve usar metodos seguros, nao abrir porta publica por conveniencia.

### 2026-05 - Uploads em storage/volume

- Decisao: fotos e contratos ficam em storage local/volume Docker; banco guarda metadados.
- Motivo: evitar arquivos grandes no banco e preservar dados entre recriacoes.
- Impacto: `src/lib/storage.ts`, rotas de avatar/contratos, `docker-compose.yml`.
- Riscos/cuidados: nao apagar `app-storage`; manter rotas protegidas.

### 2026-05 - Aula ao vivo com Jitsi

- Decisao: gerar sala Jitsi Meet quando teacher nao informa link externo.
- Motivo: entregar WebRTC embutido sem infraestrutura propria nesta fase.
- Impacto: `LiveSession`, `src/components/ava/live-class-room.tsx`, `next.config.ts`.
- Riscos/cuidados: revisar Permissions-Policy se trocar provedor.

### 2026-05-22 - Dominio Jitsi configuravel para aula ao vivo

- Decisao: parametrizar o dominio Jitsi por `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN`, mantendo `meet.jit.si` como fallback/local.
- Motivo: o `meet.jit.si` publico exige autenticacao para criacao de sala e nao deve ser embed de producao; a Candy precisa migrar para Jitsi dedicado/JaaS para teacher e aluno entrarem apenas pelo AVA.
- Impacto: `src/lib/live-class.ts`, `src/app/ava/actions.ts`, `src/components/ava/live-class-room.tsx`, `src/lib/validations/ava-operations.ts`, `next.config.ts`, `.env.example`.
- Riscos/cuidados: trocar o dominio exige DNS/HTTPS/Jitsi funcionando e rebuild do app; sem JWT ou secure domain, qualquer pessoa com o link direto da sala pode tentar entrar.

### 2026-05 - AVA por tarefa com `?task=`

- Decisao: admin, teacher e student exibem uma tarefa principal por vez.
- Motivo: reduzir telas longas e tornar operacao mais clara.
- Impacto: `admin-users-panel`, `teacher-workspace`, `student-workspace`, sidebar.
- Riscos/cuidados: task ids viram links profundos; alterar com cuidado.

### 2026-05 - Catty nos paineis logados

- Decisao: Catty aparece tambem nos paineis logados do AVA.
- Motivo: pedido explicito de produto.
- Impacto: layout do AVA, `catty-widget`.
- Riscos/cuidados: garantir que nao cubra botoes criticos.

### 2026-05-23 - Catty com voz de estudo

- Decisao: Catty passa a ter respostas guiadas com tom fofo, incentivo para estudar ingles e resposta em ingles quando a mensagem do usuario esta em ingles.
- Motivo: a assistente precisa parecer parte da Candy English, nao um chatbot generico, enquanto a IA real ainda nao esta conectada.
- Impacto: `src/components/site/catty-widget.tsx`, `docs/design-direcao.md`, `README.md`, `docs/06-pendencias.md`.
- Riscos/cuidados: respostas continuam locais/scriptadas; nao apresentar Catty como IA real nem usar para dados sensiveis.

### 2026-05-23 - Catty com IA opcional via OpenAI

- Decisao: Catty passa a chamar `/api/catty/chat`, que usa OpenAI Responses API quando `OPENAI_API_KEY` esta configurada e fallback local quando a chave ou a chamada nao existem.
- Motivo: permitir conversa real, respostas em ingles quando o aluno escreve em ingles e manter a experiencia funcionando em ambientes sem segredo configurado.
- Impacto: `src/app/api/catty/chat/route.ts`, `src/lib/catty.ts`, `src/lib/validations/catty.ts`, `src/components/site/catty-widget.tsx`, `.env.example`, docs oficiais.
- Riscos/cuidados: nao enviar dados internos do AVA nem segredos para a Catty; monitorar custo/limites da OpenAI; futuro RAG/base de conhecimento exige nova decisao.

### 2026-06-04 - Catty com Gemini padrao e OpenAI por chamada nominal

- Decisao: Catty usa Gemini como provedor normal quando `GEMINI_API_KEY` existe; OpenAI so e tentada quando a mensagem chama Catty pelo nome.
- Motivo: reduzir custo de tokens OpenAI no uso comum dos alunos e reservar OpenAI para interacoes em que o usuario aciona a assistente de forma explicita.
- Impacto: `src/app/api/catty/chat/route.ts`, `src/lib/catty.ts`, `src/lib/admin-credentials.ts`, `.env.example`, `README.md` e docs oficiais.
- Riscos/cuidados: manter segredo fora do Git; nao enviar dados internos do AVA; se Gemini/OpenAI falharem, preservar fallback local.

### 2026-06-04 - Baloes locais da Catty para usuario logado

- Decisao: o `RootLayout` passa apenas o nome da sessao para `CattyWidget`, que mostra baloes locais aleatorios no AVA logado sem chamar IA.
- Motivo: deixar a Catty mais viva e pessoal para alunos, teachers e admins, sem aumentar custo de Gemini/OpenAI nem enviar dados internos.
- Impacto: `src/app/layout.tsx`, `src/components/site/catty-widget.tsx`, `README.md` e docs oficiais.
- Riscos/cuidados: usar so primeiro nome quando necessario; nao exibir dados sensiveis; manter baloes pequenos para nao cobrir WhatsApp ou botoes criticos.

### 2026-06-04 - Catty restrita a usuario logado no AVA

- Decisao: `/api/catty/chat` passa a exigir `auth()` com role `ADMIN`, `TEACHER` ou `STUDENT`; sem sessao valida, retorna 401 amigavel e nao chama IA nem fallback.
- Motivo: impedir que a Catty vire chat publico do site e reduzir risco de custo externo ou uso indevido.
- Impacto: `src/app/api/catty/chat/route.ts`, `src/components/site/catty-widget.tsx`, `README.md` e docs oficiais.
- Riscos/cuidados: manter a chamada visual publica sem permitir resposta fora do AVA logado; preservar admin, teacher e student.

### 2026-06-05 - Catty com historico recente persistente

- Decisao: gravar conversas da Catty em `CattyConversation`/`CattyMessage` apenas para usuarios autenticados do AVA, separando por `area/task`, carregando o historico ao abrir o widget e mantendo poda para 50 mensagens por contexto.
- Motivo: dar continuidade real a conversa da Catty sem criar memoria infinita, sem abrir chat publico e sem enviar dados internos do AVA para IA.
- Impacto: `prisma/schema.prisma`, migration `20260605120000_catty_conversation_history`, `src/lib/catty-history.ts`, `src/app/api/catty/chat/route.ts`, `src/components/site/catty-widget.tsx` e docs oficiais.
- Riscos/cuidados: somente 8 mensagens recentes entram no prompt; visitante nao grava historico; futuras expansoes para RAG/base de conhecimento exigem decisao separada de privacidade e custo.

### 2026-06-05 - Personalidade oficial da Catty

- Decisao: centralizar a voz da Catty em `CATTY_PERSONALITY_GUIDE`, tornando-a uma gatinha mascote-professora da Candy com energia positiva, expressoes proprias e emoji ocasional controlado.
- Motivo: evitar que Gemini/OpenAI ou fallback local soem como chatbot generico e manter uma identidade unica em respostas, baloes e mensagens de bloqueio.
- Impacto: `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, `src/components/site/catty-widget.tsx`, `README.md`, `docs/03-fluxos-do-sistema.md` e `docs/design-direcao.md`.
- Riscos/cuidados: manter respostas curtas, sem entregar respostas de homework, sem inventar dados do AVA e sem exagerar em emoji/expressoes.

### 2026-06-05 - Identidade viva reutilizavel da Catty

- Decisao: mover a identidade da Catty para `src/lib/catty-personality.ts`, centralizando bordoes, baloes publicos/logados, abertura inicial, mensagens de bloqueio, frases por situacao, regras de emoji e limite de bordoes.
- Motivo: evitar voz duplicada entre prompt, fallback e widget, e deixar mais facil ajustar a personagem sem mexer na logica de auth/IA.
- Impacto: `src/lib/catty-personality.ts`, `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, `src/components/site/catty-widget.tsx`, `scripts/catty-behavior-smoke.ts` e docs oficiais.
- Riscos/cuidados: IA com mais de um bordao deve cair para fallback; visitante continua sem chat real; respostas seguem curtas e pedagogicas.

### 2026-06-05 - Catty com roteamento por intencao ampliado

- Decisao: manter Gemini como provedor padrao, OpenAI apenas quando a mensagem chama Catty, e ampliar o plano local com a intencao `teacher_activity_creation`, contexto seguro de role/nome/nivel e regras explicitas de personalidade, escopo e fallback.
- Motivo: deixar a Catty mais logica para alunos, teachers e admins sem aumentar custo de OpenAI nem transformar a mascote em assistente generica de receita, codigo ou API.
- Impacto: `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, `src/lib/catty-examples.ts`, `scripts/catty-behavior-smoke.ts`, `docs/catty-comportamento.md` e docs oficiais.
- Riscos/cuidados: manter historico curto, nao enviar dados sensiveis ao prompt, preservar fallback local quando Gemini/OpenAI falharem e revisar novos exemplos sempre que a Catty responder fora do papel de mascote-professora.

### 2026-06-05 - Catty com nome seguro e emoji controlado

- Decisao: a Catty passa a usar o primeiro nome seguro do usuario logado em respostas onde isso ajuda o tom, como motivacao, correcao, homework e Candy XP, e passa a aceitar ate dois emojis permitidos por resposta.
- Motivo: deixar a mascote-professora mais proxima e viva sem transformar a conversa em bagunca, sem expor email/nome completo e sem aumentar chamadas de IA.
- Impacto: `src/lib/catty-personality.ts`, `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, `src/components/site/catty-widget.tsx`, `src/lib/catty-examples.ts`, `scripts/catty-behavior-smoke.ts`, `README.md`, `docs/01-arquitetura.md`, `docs/03-fluxos-do-sistema.md`, `docs/catty-comportamento.md` e `docs/99-contexto-rapido-codex.md`.
- Riscos/cuidados: nao usar nome em tema sensivel como senha, contrato, pagamento, documento, chave, token ou credencial; manter OpenAI somente quando a mensagem chama Catty; manter baloes automaticos locais sem IA.

### 2026-06-05 - Catty Learning Center com aprovacao humana

- Decisao: criar `CattyLearningItem` e `CattyLearningFeedback` para memoria controlada da Catty; teachers e admins podem sugerir, mas apenas admin aprova memoria global usada no prompt/fallback.
- Motivo: permitir que a Catty melhore com exemplos, vocabulario, respostas ideais e regras da Candy sem aprender automaticamente qualquer coisa enviada por usuarios.
- Impacto: `prisma/schema.prisma`, migration `20260605210000_catty_learning_center`, `src/app/ava/catty-learning/actions.ts`, `src/components/ava/catty-learning-center-panel.tsx`, paginas admin/teacher, `src/lib/catty-learning.ts`, `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, menu do AVA, smoke da Catty e docs oficiais.
- Riscos/cuidados: nao aprovar memoria com senha, pagamento, contrato, telefone, documento, email, token, chave ou dados privados; manter poucos itens no prompt; nao transformar isso em RAG automatico sem nova decisao.

### 2026-06-05 - Feedback discreto para treinar a Catty

- Decisao: respostas persistidas da Catty no widget podem receber feedback pequeno (`gostei`, `nao gostei`, `resposta confusa` e `deveria responder assim`), sempre por usuario logado.
- Motivo: alimentar a fila de treino sem liberar aprendizado automatico nem poluir o chat com controles grandes.
- Impacto: `prisma/schema.prisma`, migration `20260605223000_catty_learning_feedback`, `src/components/site/catty-widget.tsx`, `src/app/ava/catty-learning/actions.ts`, paginas admin/teacher, `src/components/ava/catty-learning-center-panel.tsx` e docs oficiais.
- Riscos/cuidados: feedback pode conter dado privado digitado pelo usuario; a action bloqueia termos sensiveis e o painel mostra apenas trechos resumidos.

### 2026-05 - Financeiro recorrente

- Decisao: substituir linha financeira solta por `FinancialStudent`, `FinancialPayment` e `FinancialLog`.
- Motivo: alunos e dados fixos precisam permanecer mes a mes; observacao e pagamento sao mensais.
- Impacto: `prisma/schema.prisma`, migration `20260510203000_recurring_finance_students`, `admin-finance-panel`, actions admin.
- Riscos/cuidados: financeiro continua interno, sem gateway ou cobranca automatica.

### 2026-05 - Permissao de `/app/storage` no boot

- Decisao: container `app` ajusta permissao do volume e depois executa Next como `nextjs`.
- Motivo: smokes/ferramentas podem escrever no mesmo volume e causar `EACCES` para uploads.
- Impacto: `Dockerfile`, `docs/09-deploy-e-ambiente.md`.
- Riscos/cuidados: manter execucao do app sem privilegios depois do ajuste.

### 2026-05-11 - Serie oficial de documentacao

- Decisao: criar docs numerados `00` a `09` e `13` como memoria longa oficial.
- Motivo: futuras conversas do Codex nao devem depender do historico antigo do chat.
- Impacto: `README.md`, `AGENTS.md`, `docs/`.
- Riscos/cuidados: toda mudanca estrutural precisa atualizar os docs relevantes.

### 2026-05-11 - Financeiro com meses fechados por snapshot

- Decisao: `FinancialPayment` passa a guardar snapshots mensais dos dados do aluno e `isActive`; editar aluno pode atualizar meses futuros, mas retirar aluno financeiro inativa apenas o mes atual.
- Motivo: meses anteriores do financeiro precisam funcionar como historico fechado, sem mudancas automaticas quando o admin edita ou retira aluno em meses seguintes.
- Impacto: `prisma/schema.prisma`, migration `20260511110000_finance_month_snapshots`, `src/app/ava/admin/actions.ts`, `src/components/ava/admin-finance-panel.tsx`, `src/app/ava/admin/page.tsx`, `docs/13-financeiro.md`.
- Riscos/cuidados: nao fazer hard delete de `FinancialStudent` pela UI; preservar snapshots dos meses anteriores e rodar migration no deploy antes de recriar o app.

### 2026-05-11 - Agenda administrativa 2026

- Decisao: criar modulo `Agenda` em `/ava/admin?task=agenda` com `AgendaStudent`, `AgendaLesson` e `AgendaLog`.
- Motivo: substituir controle em sheets por uma tela interna para dias/horarios dos alunos, presenca, faltas e reposicao.
- Impacto: `prisma/schema.prisma`, migration `20260511160000_admin_agenda_module`, `src/app/ava/admin/actions.ts`, `src/app/ava/admin/page.tsx`, `src/components/ava/admin-agenda-panel.tsx`, sidebar do AVA e docs.
- Riscos/cuidados: agenda e controle interno do admin; nao confundir com aulas/materiais da teacher nem com presenca automatica.

### 2026-05-11 - Agenda e financeiro com painel mais compacto

- Decisao: manter logs recolhidos por padrao, alinhar linhas do financeiro e adicionar acoes rapidas `Certo`/`X` no bloco `Hoje` da agenda.
- Motivo: reduzir espaco em branco, facilitar cobranca/controle diario e evitar que logs ocupem a tela principal.
- Impacto: `src/components/ava/admin-finance-panel.tsx`, `src/components/ava/admin-agenda-panel.tsx`, `docs/13-financeiro.md`, `docs/14-agenda.md`.
- Riscos/cuidados: manter botoes de presenca com validacao server-side em `updateAgendaAttendance`; nao esconder logs permanentemente, apenas recolher.

### 2026-05-11 - Fila diaria da agenda

- Decisao: tornar nomes de alunos clicaveis, adicionar atalho `Reagendar`, usar acoes por icone em `Hoje` e ocultar da fila diaria aulas sem acao depois de 2 horas do horario previsto.
- Motivo: a fila `Hoje` precisa priorizar quem ainda exige atencao e permitir chegar rapidamente ao detalhe mensal do aluno.
- Impacto: `src/components/ava/admin-agenda-panel.tsx`, `docs/03-fluxos-do-sistema.md`, `docs/14-agenda.md`.
- Riscos/cuidados: a ocultacao em 2 horas e apenas visual; nao deve apagar `AgendaLesson` nem marcar falta automaticamente.

### 2026-05-12 - Homework interativo com arquivo do Canva

- Decisao: adicionar modo `INTERACTIVE` ao homework, com upload protegido de PDF/imagem, campos percentuais editaveis, autosave como `DRAFT`, entrega como `SUBMITTED`, refazer como `RETURNED` e correcao como `REVIEWED`.
- Motivo: permitir que a teacher suba atividades feitas no Canva e que o aluno responda online dentro do AVA, escrevendo sobre o arquivo.
- Impacto: `prisma/schema.prisma`, migration `20260512120000_interactive_homework`, `src/app/ava/teacher/actions.ts`, `src/app/ava/student/actions.ts`, `src/app/ava/homework-assets/[homeworkId]/route.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `src/components/ava/teacher-workspace.tsx`, `src/components/ava/student-workspace.tsx`, `.env.example`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: drafts nao devem gerar alerta de correcao; arquivos precisam continuar protegidos por role e vinculo; PDFs longos podem exigir ajuste manual de campos ate existir renderizacao multipagina dedicada.

### 2026-05-12 - IA/OCR opcional para sugerir campos de homework

- Decisao: usar OpenAI Responses API apenas quando `OPENAI_API_KEY` estiver configurada; sem chave, criar campos iniciais de fallback para ajuste manual.
- Motivo: entregar fluidez com deteccao automatica sem tornar a IA obrigatoria nem quebrar ambientes locais/Oracle sem segredo configurado.
- Impacto: `src/lib/homework-ocr.ts`, `.env.example`, `src/app/ava/teacher/actions.ts`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: nao versionar chave; revisar custo/limites antes de uso em volume; manter controle manual porque OCR pode errar campos em PDFs ou layouts complexos.

### 2026-05-12 - Criacao de homework por aluno no modo interativo

- Decisao: remover o formulario de criacao de homework simples da tela e criar homework interativo selecionando teacher e aluno diretamente.
- Motivo: a operacao real passa a ser upload de arquivo do Canva; exigir uma aula criada antes bloqueava o fluxo e confundia a teacher/admin.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/teacher-forms.tsx`, `src/components/ava/teacher-workspace.tsx`, `src/lib/validations/learning.ts`, `README.md`, `AGENTS.md`, `docs/00-visao-geral.md`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: homeworks `TEXT` antigas continuam como legado; nao apagar dados antigos nem remover exibicao/correcao sem migration e decisao especifica.

### 2026-05-19 - Homework interativo preserva o arquivo original

- Decisao: manter PDF/imagem como fundo visivel e tratar IA apenas como sugestora de campos transparentes sobre lacunas, linhas de resposta, caixas vazias ou checkboxes.
- Motivo: o aluno deve responder no arquivo original, sem que o sistema cubra enunciados ou redesenhe a atividade enviada pela teacher.
- Impacto: `src/lib/homework-ocr.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: a deteccao automatica ainda pode errar em PDFs complexos; manter ajuste manual e revisar atividades antigas que ja tenham campos largos salvos.

### 2026-05-19 - PDF de homework renderizado por pagina com overlay

- Decisao: renderizar PDFs interativos no client com `pdfjs-dist`, pagina a pagina, e aplicar campos HTML/SVG transparentes usando coordenadas percentuais relativas a pagina real; adicionar `DRAWING` ao enum de campos.
- Motivo: o PDF precisa aparecer inteiro e sem distorcao, enquanto a IA/manual criam apenas areas invisiveis para digitar, marcar ou desenhar.
- Impacto: `package.json`, `package-lock.json`, `prisma/schema.prisma`, migration `20260519033000_interactive_homework_drawing_field`, `src/components/ava/interactive-homework-document.tsx`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `src/components/ava/interactive-homework-review.tsx`, `src/lib/homework-ocr.ts`, `src/lib/validations/learning.ts`, docs de banco e fluxos.
- Riscos/cuidados: PDF.js roda no navegador e depende da rota protegida continuar retornando o arquivo inline; desenhos ficam serializados no JSON da submissao e devem ser considerados em futuras exportacoes para PDF final.

### 2026-05-19 - Exclusao de homework interativa pela teacher/admin

- Decisao: permitir excluir homeworks interativas na tela `/ava/teacher?task=criar-homework`, com confirmacao no client e server action validando admin ou teacher dona da homework.
- Motivo: teachers precisam remover atividades criadas por engano sem depender de acesso direto ao banco.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/lib/validations/learning.ts`, `docs/03-fluxos-do-sistema.md`, `docs/06-pendencias.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: excluir homework remove campos, perguntas e respostas por cascade; revisar antes de confirmar quando ja houver entrega de aluno.

### 2026-05-21 - Editor manual de areas no PDF

- Decisao: criar homeworks interativas sem campos automaticos e fazer a teacher desenhar, mover, redimensionar, excluir ou limpar areas diretamente sobre o PDF/imagem.
- Motivo: a deteccao automatica gerava caixas em lugares errados; o fluxo manual preserva o arquivo original e da controle visual imediato para a teacher.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/interactive-homework-document.tsx`, `src/components/ava/interactive-homework-editor.tsx`, `.env.example`, `AGENTS.md`, `README.md`, `docs/00-visao-geral.md`, `docs/01-arquitetura.md`, `docs/03-fluxos-do-sistema.md`, `docs/06-pendencias.md`, `docs/09-deploy-e-ambiente.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: homeworks antigas podem manter campos ja detectados por IA; a teacher pode usar `Limpar` e salvar novas areas manuais antes de liberar ao aluno.

### 2026-05-21 - Resposta interativa com areas invisiveis

- Decisao: na tela do aluno, campos de texto, checkbox e desenho ficam invisiveis como zonas clicaveis; aparecem apenas texto digitado, marca selecionada ou tracos do aluno.
- Motivo: o PDF/imagem ja possui linhas, parenteses e espacos visuais; caixas HTML visiveis duplicavam o layout e deixavam a atividade poluida.
- Impacto: `src/components/ava/interactive-homework-student.tsx`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`, `AGENTS.md`.
- Riscos/cuidados: a teacher precisa posicionar areas pequenas e precisas no editor; em desenho, manter a acao de desfazer ultimo traco para evitar apagar tudo por engano.

### 2026-05-21 - Redefinicao de senha pelo admin

- Decisao: admins podem redefinir a senha de qualquer usuario pela lista de usuarios em `/ava/admin?task=usuarios`.
- Motivo: suporte interno precisa recuperar acesso de alunos, teachers e admins sem mexer direto no banco ou seed.
- Impacto: `src/app/ava/admin/actions.ts`, `src/components/ava/admin-operations.tsx`, `src/components/ava/admin-users-panel.tsx`, `src/lib/validations/admin-users.ts`, docs de fluxo e autenticacao.
- Riscos/cuidados: a nova senha deve ser enviada ao usuario por canal seguro; sessoes JWT ja abertas nao sao revogadas imediatamente nesta fase.

### 2026-05-21 - Previa de resposta no editor de homework

- Decisao: o editor manual de homework passa a mostrar dentro da area uma previa discreta do resultado do aluno: `x` centralizado para marcar, texto exemplo alinhado como input/textarea e indicacao de area de desenho.
- Motivo: a teacher precisa saber exatamente onde o `x` e a escrita vao aparecer antes de salvar, sem depender de tentativa na tela do aluno.
- Impacto: `src/components/ava/interactive-homework-editor.tsx`, `src/app/ava/teacher/actions.ts`, `src/lib/validations/learning.ts`, `AGENTS.md`, `docs/03-fluxos-do-sistema.md`, `docs/15-homework-interativo.md`.
- Riscos/cuidados: na tela do aluno as areas continuam invisiveis; campos `CHECKBOX` agora podem ser menores e quadrados, entao manter validacao server-side coerente com o editor.

### 2026-05-21 - Criar aula com o mesmo motor interativo

- Decisao: a aba `/ava/teacher?task=criar-aula` passa a criar aula por PDF/imagem do Canva usando o mesmo editor manual de campos do homework interativo.
- Motivo: a operacao real de aula precisa das mesmas ferramentas de selecionar area, escrever, marcar e desenhar antes de existir um modulo separado de materiais interativos.
- Impacto: `src/app/ava/teacher/actions.ts`, `src/components/ava/teacher-forms.tsx`, `src/components/ava/teacher-workspace.tsx`, `src/components/ava/interactive-homework-editor.tsx`, `src/lib/validations/learning.ts`, docs oficiais.
- Riscos/cuidados: aula interativa reutiliza `Homework.kind=INTERACTIVE` e usa `fieldDetectionSource=lesson-manual` para separacao visual; futuramente pode virar modelo proprio se aulas interativas precisarem de regras diferentes de entrega/correcao.

### 2026-05-21 - Aula interativa fica na area de aulas do aluno

- Decisao: atividades marcadas com `fieldDetectionSource=lesson-manual` aparecem para o aluno em `/ava/student?task=aulas`, dentro do card da propria aula, e deixam de aparecer em `/ava/student?task=homeworks`.
- Motivo: a criacao por `Criar aula` nao deve parecer homework para o aluno, mesmo reutilizando o motor tecnico de resposta interativa.
- Impacto: `src/app/ava/student/page.tsx`, `src/components/ava/student-workspace.tsx`, `src/components/ava/interactive-homework-student.tsx`, docs oficiais.
- Riscos/cuidados: a camada tecnica ainda usa `HomeworkSubmission` para autosave/correcao; futuras separacoes de modelo devem preservar permissao por aluno/teacher.

### 2026-05-23 - Cofre admin de APIs e senhas

- Decisao: criar `/ava/admin?task=apis-senhas` com `AdminCredential` para registrar APIs, tokens, senhas e configuracoes sensiveis de uso administrativo.
- Motivo: a Candy precisa consultar e organizar chaves de integracoes sem depender de arquivos soltos ou acesso direto ao servidor.
- Impacto: `prisma/schema.prisma`, migration `20260523120000_admin_credentials`, `src/lib/admin-credentials.ts`, `src/lib/validations/admin-credentials.ts`, `src/app/ava/admin/actions.ts`, `src/app/ava/admin/page.tsx`, `src/components/ava/admin-credentials-panel.tsx`, sidebar do AVA, `.env.example` e docs oficiais.
- Riscos/cuidados: os valores ficam criptografados com `ADMIN_CREDENTIALS_SECRET` ou `AUTH_SECRET`; nao importar segredos internos como `DATABASE_URL`, `AUTH_SECRET`, Postgres ou senha seed; revelar valores apenas por acao consciente do `ADMIN`.

### 2026-05-23 - Catty contextual com atalhos de estudo

- Decisao: a Catty passa a detectar contexto leve de tela (`area` e `task`), exibir cabecalho/atalhos de estudo por contexto e enviar esse contexto para `/api/catty/chat`.
- Motivo: a assistente precisa orientar homework, aulas, mensagens, teacher e admin de forma mais util, mantendo tom fofo e sem parecer chatbot generico.
- Impacto: `src/components/site/catty-widget.tsx`, `src/app/api/catty/chat/route.ts`, `src/lib/catty.ts`, `src/lib/validations/catty.ts`, `src/app/globals.css`, `AGENTS.md`, `README.md` e docs oficiais.
- Riscos/cuidados: o contexto deve continuar limitado a rota/tarefa; Catty nao deve receber dados internos do AVA nem entregar respostas prontas de homework.

### 2026-06-01 - Candy XP no resumo student

- Decisao: adicionar um card Candy XP em `/ava/student?task=resumo`, com nivel, barra amarela de progresso, fontes de XP, proximas metas, roadmap e slot visual para `Jogos Candy`.
- Motivo: iniciar a gamificacao da Candy inspirada no card XP do projeto Wimifarma, mas adaptada para estudo de ingles e sem mudar banco nesta fase.
- Impacto: `src/lib/candy-xp.ts`, `src/components/ava/student-xp-card.tsx`, `src/components/ava/student-workspace.tsx`, `src/app/globals.css`, `README.md`, `docs/00-visao-geral.md`, `docs/03-fluxos-do-sistema.md`, `docs/06-pendencias.md`, `docs/design-direcao.md`.
- Riscos/cuidados: XP e read-only/derivado dos dados do proprio aluno; persistencia, streaks, badges reais, ranking ou jogos executaveis exigem nova decisao, schema e validacao de permissoes.

### 2026-06-01 - Candy XP por role com niveis infinitos

- Decisao: generalizar o motor Candy XP para admin, teacher e student, mantendo a curva `requiredForCandyLevel` sem teto fixo e mostrando trilha visual ao redor do nivel atual.
- Motivo: estruturar a gamificacao antes de jogos executaveis, permitindo evolucao por role sem criar persistencia prematura nem ranking publico.
- Impacto: `src/lib/candy-xp.ts`, `src/components/ava/student-xp-card.tsx`, `src/components/ava/admin-users-panel.tsx`, `src/components/ava/teacher-workspace.tsx`, docs oficiais.
- Riscos/cuidados: XP continua derivado/read-only; persistencia historica, badges, streaks, temporada competitiva ou jogos reais exigem schema, permissoes e estrategia anti-abuso.

### 2026-06-01 - Candy XP persistente com ledger anti-duplicacao

- Decisao: criar persistencia para Candy XP com `CandyXpProfile`, `CandyXpEvent`, badges, missoes e tentativas, mantendo niveis infinitos e sem ranking publico.
- Motivo: preparar uma evolucao estilo Duolingo, onde homeworks, aulas, feedbacks, rotinas e futuros jogos/tarefas concedem XP real sem duplicar pontos pela mesma origem.
- Impacto: `prisma/schema.prisma`, migration `20260601170000_candy_xp_persistence`, `src/lib/candy-xp.ts`, `src/lib/candy-xp-persistence.ts`, paginas admin/teacher/student e docs oficiais.
- Riscos/cuidados: toda nova fonte de XP precisa de `sourceKey` estavel por usuario, validacao server-side de role/permissao e criterio claro de conclusao; jogos executaveis ainda exigem fase propria.

### 2026-06-01 - Atividades Candy XP com PDF e perguntas

- Decisao: criar o modulo `/ava/admin?task=candy-xp` e `/ava/student?task=candy-xp` para atividades gamificadas de historia com PDF/imagem do Canva, perguntas, progresso por aluno, correcao automatica de questoes objetivas e correcao manual de respostas escritas.
- Motivo: transformar a base Candy XP em uma primeira experiencia jogavel/operacional, permitindo que o admin cadastre respostas corretas e o aluno ganhe XP ao concluir sem criar ainda minijogos em tempo real.
- Impacto: `prisma/schema.prisma`, migration `20260601193000_candy_xp_activities`, `src/app/ava/candy-xp/actions.ts`, `src/app/ava/candy-xp-assets/[activityId]/route.ts`, `src/components/ava/admin-candy-xp-panel.tsx`, `src/components/ava/student-candy-xp-activities-panel.tsx`, `src/lib/candy-xp-activities.ts`, `src/lib/validations/candy-xp-activities.ts`, `src/lib/storage.ts`, paginas admin/student e docs oficiais.
- Riscos/cuidados: editar perguntas ja respondidas pode invalidar historico; arquivos devem continuar protegidos pela rota server-side; XP deve ser concedido apenas pelo servidor com `sourceKey` unica por submissao.

### 2026-06-04 - Otimizacao de PDF no upload Candy XP

- Decisao: adicionar uma camada central `src/lib/file-optimization.ts` para tentar otimizar PDFs do Candy XP com Ghostscript antes de salvar no storage, mantendo fallback para salvar o original se a otimizacao falhar, nao reduzir tamanho ou parecer perder paginas.
- Motivo: materiais do Canva podem ficar grandes e o AVA tera muitos uploads; reduzir tamanho no servidor economiza storage e melhora carregamento sem expor arquivos.
- Impacto: `src/lib/file-optimization.ts`, `src/lib/storage.ts`, `src/app/ava/candy-xp/actions.ts`, `Dockerfile`, `.env.example` e docs oficiais.
- Riscos/cuidados: presets agressivos podem reduzir legibilidade; a otimizacao deve continuar server-side, configuravel por ambiente e sem quebrar as rotas protegidas.

### 2026-06-04 - Otimizacao de PDF reaproveitada em homework e aula interativa

- Decisao: reaproveitar a mesma camada `src/lib/file-optimization.ts` em `saveHomeworkAsset`, cobrindo uploads de `/ava/teacher?task=criar-homework` e `/ava/teacher?task=criar-aula`.
- Motivo: homework interativo e aulas interativas tambem recebem PDFs do Canva e salvam em `storage/homework-assets`; usar um helper unico evita duplicacao e reduz acumulacao de arquivos pesados.
- Impacto: `src/lib/storage.ts`, `src/app/ava/teacher/actions.ts`, `docs/15-homework-interativo.md` e docs oficiais.
- Riscos/cuidados: imagens continuam sem compressao nesta fase para nao alterar visual; PDFs devem manter fallback para original, page count estimado e mensagem amigavel para a teacher.

### 2026-06-04 - Pre-cadastro publico sem liberar login

- Decisao: adicionar `StudentPreRegistration` e um formulario `Quero ser aluno Candy` em `/ava/login` para interessados enviarem dados sem criar acesso automatico.
- Motivo: captar interessados direto no AVA mantendo o login protegido; a equipe Candy analisa a solicitacao antes de criar usuario, senha e vinculos.
- Impacto: `prisma/schema.prisma`, migration `20260604153000_student_pre_registration`, `src/app/ava/login/actions.ts`, `src/components/ava/login-form.tsx`, `src/components/ava/student-pre-registration-form.tsx`, `src/lib/validations/pre-registration.ts` e docs oficiais.
- Riscos/cuidados: o email da solicitacao e unico e tambem e comparado com `User.email`; a action publica retorna mensagem generica em duplicidade para evitar exposicao de cadastro e nunca chama Auth.js para iniciar sessao.

### 2026-06-04 - Aceite protegido de pre-cadastros

- Decisao: criar o modulo `Aceitar alunos` em Admin e Teacher para revisar `StudentPreRegistration`, marcar em analise, recusar ou converter em conta `STUDENT`.
- Motivo: o pre-cadastro publico precisa virar acesso real somente depois de revisao humana, sem permitir auto-login nem escolha de roles avancadas pelo fluxo.
- Impacto: `prisma/schema.prisma`, migration `20260604170000_student_pre_registration_review`, `src/app/ava/pre-registrations/actions.ts`, `src/components/ava/student-pre-registration-review-panel.tsx`, paginas Admin/Teacher, sidebar do AVA e docs oficiais.
- Riscos/cuidados: o aceite fixa `User.role=STUDENT` no servidor; a senha inicial e digitada por Admin/Teacher e nunca retornada em logs; Teacher que aceita o aluno cria vinculo automatico com a propria teacher.

### 2026-06-05 - Memoria aprovada limitada e auto-sugestao pendente da Catty

- Decisao: limitar o contexto da Catty a ate 3 memorias aprovadas por resposta, priorizadas por intencao, categoria, tags e termos da mensagem, e criar auto-sugestoes apenas como `CattyLearningFeedback.PATTERN_SUGGESTION` pendente.
- Motivo: melhorar qualidade sem aumentar custo nem permitir que a Catty aprenda automaticamente conteudo inseguro ou privado.
- Impacto: `src/lib/catty-learning.ts`, `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, `src/app/ava/catty-learning/actions.ts`, `scripts/catty-behavior-smoke.ts` e docs oficiais.
- Riscos/cuidados: sugestoes automaticas nunca entram no prompt antes de aprovacao; termos sensiveis continuam bloqueados; Admin aprova memoria global e Teacher apenas sugere/revisa dentro das permissoes existentes.

### 2026-06-05 - Catty com memoria pessoal por usuario

- Decisao: criar `CattyUserMemory` e `CattyMemoryEvent` para memorias pessoais curtas por usuario logado, separadas da memoria global do Learning Center.
- Motivo: permitir que a Catty personalize exemplos, incentivo e estilo com gostos, temas, dificuldades e objetivos leves do proprio aluno/teacher/admin sem misturar dados entre usuarios.
- Impacto: `prisma/schema.prisma`, migration `20260605230000_catty_user_memory`, `src/lib/catty-user-memory.ts`, `src/lib/validations/catty-user-memory.ts`, `src/app/ava/catty-memory/actions.ts`, `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, smoke da Catty e docs oficiais.
- Riscos/cuidados: rota de resposta deve usar apenas `CattyUserMemory.ACTIVE` do proprio `session.user.id`; Teacher so acessa aluno vinculado; nao salvar senha, pagamento, contrato, documento, telefone, endereco, email, token, chave/API ou dado privado como memoria.

### 2026-06-05 - Memoria pessoal relevante no contexto da Catty

- Decisao: a rota da Catty passa a buscar memorias pessoais ativas do usuario logado, ranquear por intencao, termos da mensagem, confianca, uso e recencia, enviar ao prompt no maximo 5 itens, limitar dificuldades e interesses/temas a 2 cada, e marcar memorias contraditas como `FLAGGED`.
- Motivo: personalizar respostas sem aumentar custo, sem repetir gostos em toda frase e sem deixar preferencias antigas incorretas contaminarem Gemini, OpenAI ou fallback.
- Impacto: `src/lib/catty-user-memory.ts`, `src/lib/catty.ts`, `src/app/api/catty/chat/route.ts`, `scripts/catty-behavior-smoke.ts` e docs oficiais.
- Riscos/cuidados: memoria pessoal continua sendo tempero leve; Gemini/OpenAI devem ignorar itens que nao combinam com a pergunta; conflito nao apaga memoria automaticamente e precisa de revisao futura por Admin/Teacher.

## Regras de negocio que precisam ser preservadas

- Decisoes antigas so devem ser substituidas com motivo tecnico claro.
- Se uma decisao mudar, registrar a substituicao neste arquivo em vez de apagar o passado.

## Riscos ao alterar esta parte

- Apagar historico reduz capacidade de futuras conversas entenderem o motivo das escolhas.
- Registrar decisao sem arquivos impactados dificulta manutencao futura.

## Pendencias

- Adicionar decisoes futuras sobre backup, testes e auditoria quando forem implementadas.

## Como pode evoluir

- Separar ADRs individuais se o historico ficar grande.
- Linkar cada decisao a commits ou PRs quando houver fluxo formal de PR.
