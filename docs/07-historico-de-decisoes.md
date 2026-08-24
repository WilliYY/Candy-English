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

### 2026-08-24 - Fotos WebP recortadas no catalogo de Vendas

- Decisao: permitir foto opcional no cadastro e na edicao de `SaleProduct`, com previa 4:3, recorte central automatico para `1200x900` e armazenamento final somente em WebP.
- Motivo: tornar os produtos reconheciveis no PDV sem aumentar demais o peso das imagens ou expor caminhos privados do servidor.
- Impacto: `SaleProduct.imagePath`, migration, armazenamento, rota autenticada, actions, pagina, painel de Vendas, testes e documentacao.
- Riscos/cuidados: aceitar somente PNG/JPG/WebP de ate 8 MB, validar o conteudo real, limitar pixels no `sharp`, preservar produto sem foto e remover arquivos substituidos apenas depois da persistencia no banco.

### 2026-08-24 - Comprador unico e data combinada no PDV

- Decisao: substituir busca, select e nome avulso separados por um unico campo pesquisavel com `Venda livre` primeiro; aluno selecionado define o polo automaticamente. Compras na fatura passam a guardar `Sale.invoiceDueDate`, limitada ao mes financeiro atual e vinculada ao `FinancialPayment` ja existente.
- Motivo: reduzir campos duplicados no carrinho, mostrar todos os alunos autorizados em um so lugar e permitir combinar outro dia de cobranca sem misturar a venda com a mensalidade.
- Impacto: schema e migration de `Sale`, dominio/validacao/actions/pagina/componentes de Vendas, testes e documentacao do modulo.
- Riscos/cuidados: venda livre continua sem identidade financeira e nao pode entrar em fatura; Teacher continua vendo somente alunos vinculados; data fora da competencia atual deve ser recusada no servidor.

### 2026-08-24 - Financeiro cria novo aluno com acesso real ao AVA

- Decisao: manter a selecao de alunos existentes dos dois polos e transformar o antigo cadastro manual em `Criar novo aluno`, que exige login e senha inicial e cria `User STUDENT`, `StudentProfile`, `FinancialStudent` e snapshots mensais na mesma transaction. A planilha ganha largura ampliada, filtros de situacao com contadores e formulario recolhido por padrao.
- Motivo: permitir cadastrar um aluno uma unica vez pelo Financeiro e, ao mesmo tempo, facilitar a leitura diaria de quem pagou, esta pendente ou atrasado.
- Impacto: `src/lib/finance-student-access.ts`, `src/lib/validations/admin-users.ts`, `src/app/ava/admin/actions.ts`, `src/components/ava/admin-finance-panel.tsx`, `src/components/ava/admin-users-panel.tsx`, testes e docs oficiais.
- Riscos/cuidados: apenas Admin acessa o fluxo; login deve ser unico, a senha pura nao pode ser persistida nem retornada pelo servidor, e qualquer falha precisa reverter usuario, perfil e financeiro juntos.

### 2026-07-14 - Shell lateral somente depois da escolha de area

- Decisao: manter `/ava/layout.tsx` leve e mover a sidebar completa para `AvaWorkspaceShell`, usado apenas por `/ava/admin`, `/ava/teacher`, `/ava/student` e `/ava/secretaria` com modo `AVA`, `SECRETARIA` ou `STUDENT`.
- Motivo: `/ava/escolha` deve ser uma tela limpa com os cards AVA/Secretaria e nao deve buscar nem renderizar menus completos antes da escolha.
- Impacto: `src/app/ava/layout.tsx`, `src/components/ava/ava-workspace-shell.tsx`, paginas Admin/Teacher/Student/Secretaria, `src/components/ava/ava-responsive-sidebar.tsx`, `scripts/auth-smoke.ts` e docs oficiais.
- Riscos/cuidados: links antigos por `?task=` continuam protegidos no servidor; o modo da sidebar e visual e nao substitui `requireAvaRole` nem validacoes por dado.

### 2026-07-14 - Login obrigatorio na conversao de pre-cadastro

- Decisao: a conversao `Tornar aluno` passa a exigir sempre `emailForLogin` e `initialPassword` na UI e no servidor; o email existente preenche o campo, sem email a UI mostra sugestao baseada no nome, e a senha inicial visivel/editavel e gerada por nome simplificado + `candy`.
- Motivo: nenhum pre-cadastro deve virar `User.role=STUDENT` sem login revisado e senha inicial conhecida pela equipe no momento da conversao, mantendo a senha apenas como hash depois de enviada.
- Impacto: `src/components/ava/student-pre-registration-review-panel.tsx`, `src/lib/validations/pre-registration.ts`, `src/app/ava/pre-registrations/actions.ts`, `docs/03-fluxos-do-sistema.md`, `docs/08-autenticacao-e-permissoes.md` e `docs/99-contexto-rapido-codex.md`.
- Riscos/cuidados: nao persistir senha em texto puro, nao gerar login escondido sem revisao humana, manter `User.email` unico e bloquear tambem email ja usado por outro pre-cadastro.

### 2026-07-14 - Busca inteligente de pre-cadastros

- Decisao: adicionar busca client-side no painel de pre-cadastros da Secretaria, usando todos os registros ja autorizados para a role logada e ordenando correspondencias exatas antes de parciais/proximas.
- Motivo: Admin e Teacher precisam localizar interessados rapidamente por nome, telefone, email, documento, responsavel, cidade, unidade ou status sem criar nova query ampla nem vazar dados entre teachers.
- Impacto: `src/app/ava/admin/page.tsx`, `src/app/ava/teacher/page.tsx`, `src/components/ava/student-pre-registration-review-panel.tsx`, `docs/03-fluxos-do-sistema.md`, `docs/08-autenticacao-e-permissoes.md` e `docs/99-contexto-rapido-codex.md`.
- Riscos/cuidados: Teacher deve receber do servidor apenas pre-cadastros criados por ela ou atribuidos a sua `TeacherProfile`; a busca no client nunca deve ser usada como substituto de permissao server-side.

### 2026-07-14 - Matriz de permissoes da Secretaria

- Decisao: centralizar o escopo de Secretaria em `SECRETARIA_PERMISSION_MATRIX`, usando a matriz para renderizar `/ava/secretaria` e validar por smoke que Admin tem atalhos completos, Teacher tem atalhos limitados e Student nao entra.
- Motivo: Admin e Teacher acessam a mesma area visual, mas com poderes diferentes; a separacao precisa ficar explicita no codigo e testada no servidor, nao apenas escondida por UI.
- Impacto: `src/lib/roles.ts`, `src/app/ava/secretaria/page.tsx`, `scripts/auth-smoke.ts`, `docs/03-fluxos-do-sistema.md`, `docs/08-autenticacao-e-permissoes.md` e `docs/99-contexto-rapido-codex.md`.
- Riscos/cuidados: `TEACHER` nao deve receber financeiro geral, gastos, agenda completa, credenciais ou registros de outras teachers; actions antigas continuam como fonte final de permissao por role/dado.

### 2026-07-14 - Conversao linkada de pre-cadastro

- Decisao: o botao `Tornar aluno` da Secretaria passa a converter o pre-cadastro em `User` STUDENT, `StudentProfile`, vinculo teacher quando aplicavel, `FinancialStudent`/`FinancialPayment`, `AgendaStudent`/`AgendaLesson` e ids linkados em `StudentPreRegistration` dentro de uma transaction.
- Motivo: evitar que a equipe precise recriar manualmente no AVA, financeiro e agenda os dados ja combinados pelo WhatsApp, sem deixar partes soltas se uma criacao falhar.
- Impacto: `prisma/schema.prisma`, migration `20260714170000_linked_pre_registration_conversion`, `src/app/ava/pre-registrations/actions.ts`, `src/app/ava/admin/page.tsx`, `src/app/ava/teacher/page.tsx`, `src/components/ava/student-pre-registration-review-panel.tsx`, `src/components/ava/admin-agenda-panel.tsx` e docs oficiais.
- Riscos/cuidados: `Teacher` so converte registros proprios/atribuidos; `ADMIN` pode escolher teacher; duplicidade por email/telefone deve ser bloqueada antes da criacao; status `APPROVED` continua sendo exibido como `Convertido` e nao deve permitir segunda conversao.

### 2026-07-14 - Pre-cadastros internos na Secretaria

- Decisao: mover a criacao operacional de `StudentPreRegistration` para a Secretaria, mantendo `/ava/admin?task=aceitar-alunos` e `/ava/teacher?task=aceitar-alunos` como rotas antigas compativeis, mas com formulario interno completo, filtros de status e conversao protegida por `Tornar aluno`.
- Motivo: o primeiro contato acontece pelo WhatsApp; depois Admin/Teacher registra manualmente unidade, teacher responsavel, agenda pretendida e combinado de pagamento sem criar aluno, financeiro ou agenda automaticamente.
- Impacto: `prisma/schema.prisma`, migration `20260714143000_secretaria_pre_registration`, `src/app/ava/pre-registrations/actions.ts`, `src/lib/validations/pre-registration.ts`, paginas Admin/Teacher, `student-pre-registration-review-panel.tsx`, alertas da sidebar, README e docs oficiais.
- Riscos/cuidados: Teacher so deve ver registros criados por ela ou atribuidos a sua `TeacherProfile`; email e opcional no pre-cadastro, mas a conversao para login exige email; financeiro e agenda so nascem no clique confirmado de `Tornar aluno`.

### 2026-07-14 - Botao Quero ser aluno Candy via WhatsApp

- Decisao: trocar o CTA publico `Quero ser aluno Candy` em `/ava/login` para abrir WhatsApp em nova aba com mensagem pronta, centralizando o numero em `src/lib/whatsapp.ts` e `NEXT_PUBLIC_CANDY_WHATSAPP_PHONE` com fallback seguro.
- Motivo: evitar que visitante crie pre-cadastro automaticamente pelo login e levar o primeiro contato para atendimento da Candy.
- Impacto: `src/components/ava/login-form.tsx`, `src/lib/whatsapp.ts`, links de WhatsApp do site, `.env.example`, smoke de servidor e docs oficiais.
- Riscos/cuidados: manter `StudentPreRegistration` e o modulo protegido `Aceitar alunos`; o CTA publico nao deve voltar a chamar action de pre-cadastro sem nova decisao.

### 2026-07-14 - Escolha AVA ou Secretaria apos login

- Decisao: adicionar `/ava/escolha` para Admin/Teacher escolherem entre `AVA` e `Secretaria`, criar `/ava/secretaria` como painel protegido de atalhos e reorganizar a sidebar por area sem remover os links antigos por `?task=`.
- Motivo: separar visualmente rotina pedagogica de controle interno, deixando financeiro, agenda e pre-cadastros agrupados na Secretaria.
- Impacto: `src/lib/roles.ts`, `src/app/ava/escolha/page.tsx`, `src/app/ava/secretaria/page.tsx`, `src/app/ava/layout.tsx`, `scripts/auth-smoke.ts`, README e docs oficiais.
- Riscos/cuidados: a Secretaria nao cria permissoes novas; Student continua fora dela e cada rota antiga segue validando role/dados no servidor.

### 2026-07-14 - Financeiro com pagamentos internos mais escaneaveis

- Decisao: refinar a aba `Pagamentos` do financeiro com resumo mensal proprio, totais por unidade, formulario compacto e lista em tabela no desktop; corrigir a edicao de alunos para remontar o formulario selecionado e reativar meses que continuam dentro do plano novo.
- Motivo: melhorar leitura operacional dos gastos internos sem misturar com mensalidades e evitar estados antigos ao alternar aluno ou alterar parcelas.
- Impacto: `src/components/ava/admin-finance-panel.tsx`, `src/app/ava/admin/actions.ts`, `docs/13-financeiro.md`, `docs/design-direcao.md`.
- Riscos/cuidados: `FinancialExpense` continua separado de `FinancialPayment`; meses anteriores seguem historico fechado e a reativacao vale apenas para meses incluidos na edicao a partir do mes selecionado.

### 2026-07-13 - Financeiro por unidade

- Decisao: adicionar unidades fixas `Unidade 1 Ivaté` e `Unidade 2 Douradina` ao financeiro, gravando `FinancialStudent.unit`, `FinancialPayment.snapshotUnit` e `FinancialExpense.unit`.
- Motivo: permitir visualizar alunos financeiros e gastos internos por unidade sem misturar historico mensal nem compras da loja.
- Impacto: `prisma/schema.prisma`, migration `20260713133000_financial_units`, `src/app/ava/admin/page.tsx`, `src/app/ava/admin/actions.ts`, `src/components/ava/admin-finance-panel.tsx`, `src/lib/validations/admin-users.ts`, `docs/02-banco-de-dados.md`, `docs/13-financeiro.md`, `docs/03-fluxos-do-sistema.md`, `docs/design-direcao.md`.
- Riscos/cuidados: registros antigos entram como `IVATE`; historico de meses deve ler `snapshotUnit`, enquanto gastos internos usam unidade propria em `FinancialExpense`.

### 2026-07-13 - Financeiro com abas de alunos e pagamentos internos

- Decisao: dividir o financeiro admin em `Alunos` e `Pagamentos`, mantendo mensalidades/parcelas em `FinancialPayment` e registrando gastos/insumos da loja em `FinancialExpense`.
- Motivo: facilitar a leitura dos cards de alunos e permitir controle mensal de compras internas sem misturar entrada de alunos com saida da loja.
- Impacto: `prisma/schema.prisma`, migration `20260713120000_financial_expenses`, `src/app/ava/admin/page.tsx`, `src/app/ava/admin/actions.ts`, `src/components/ava/admin-finance-panel.tsx`, `src/components/ava/admin-users-panel.tsx`, `src/lib/validations/admin-users.ts`, `docs/02-banco-de-dados.md`, `docs/13-financeiro.md`, `docs/design-direcao.md`.
- Riscos/cuidados: em deploy, aplicar a migration antes de recriar o app; manter `FinancialExpense` separado de `FinancialPayment` para nao confundir pagamentos de alunos com gastos internos.

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

### 2026-06-05 - Catty com historico persistente controlado

- Decisao: gravar conversas da Catty em `CattyConversation`/`CattyMessage` apenas para usuarios autenticados do AVA, separando por `area/task`, carregando uma janela recente ao abrir o widget, retendo ate 50.000 mensagens por contexto no banco e mantendo somente 8 mensagens no prompt da IA.
- Motivo: dar continuidade real por anos de estudo sem criar custo de IA proporcional ao historico e sem abrir chat publico.
- Impacto: `prisma/schema.prisma`, migration `20260605120000_catty_conversation_history`, `src/lib/catty-history.ts`, `src/app/api/catty/chat/route.ts`, `src/components/site/catty-widget.tsx` e docs oficiais.
- Riscos/cuidados: somente 8 mensagens recentes entram no prompt; visitante nao grava historico; historico pesado precisa de alerta e limpeza manual; futuras expansoes para RAG/base de conhecimento exigem decisao separada de privacidade e custo.

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

### 2026-06-25 - Financeiro simples em cards com parcelas opcionais

- Decisao: simplificar o painel financeiro para cards por aluno, contadores no topo, busca/filtro, acao rapida de pagamento e painel de historico por aluno; adicionar `installmentsTotal` em `FinancialStudent` e snapshots opcionais de parcela em `FinancialPayment`.
- Motivo: o uso diario precisava ser mais visual e manual, como agenda mensal de pagamentos, sem tabela grande nem informacao espalhada.
- Impacto: `prisma/schema.prisma`, migration `20260625120000_simple_finance_installments`, `src/components/ava/admin-finance-panel.tsx`, `src/app/ava/admin/actions.ts`, `src/app/ava/admin/page.tsx`, `src/lib/validations/admin-users.ts`, docs oficiais.
- Riscos/cuidados: continuar lendo cards e historico pelos snapshots mensais, nao pelos dados fixos atuais; parcelas sao opcionais e dados antigos seguem como recorrentes; inativacao continua por `FinancialPayment.isActive=false`, nunca por hard delete.

### 2026-06-26 - Agenda interna simples com calendario mensal

- Decisao: refazer `/ava/admin?task=agenda` como agenda interna simples, separada dos alunos do AVA, com calendario mensal, dia selecionado, cadastro recorrente, busca, cards por aluno, historico e edicao/inativacao de rotina.
- Motivo: o uso diario precisava ser mais parecido com uma agenda operacional, sem fila confusa, tabela grande ou dependencia de `User`/`StudentProfile`.
- Impacto: `prisma/schema.prisma`, migration `20260626120000_simple_internal_agenda`, `src/components/ava/admin-agenda-panel.tsx`, `src/app/ava/admin/actions.ts`, `src/app/ava/admin/page.tsx`, `src/lib/validations/admin-users.ts`, docs oficiais.
- Riscos/cuidados: agenda continua admin-only; editar/inativar deve preservar `AgendaLesson` antigo como historico e nunca transformar aluno interno em aluno do AVA.

### 2026-06-27 - Agenda com exclusao definitiva e detalhe abaixo da lista

- Decisao: adicionar botao `Excluir` para remover definitivamente cadastros internos da agenda criados por engano e mover o detalhe/historico do aluno para baixo da lista interna.
- Motivo: o admin precisa limpar cadastros de teste/erro e a leitura fica mais natural quando o detalhe aparece depois da lista clicada.
- Impacto: `src/app/ava/admin/actions.ts`, `src/components/ava/admin-agenda-panel.tsx`, `src/lib/validations/admin-users.ts`, `docs/03-fluxos-do-sistema.md`, `docs/14-agenda.md`.
- Riscos/cuidados: `Excluir` remove `AgendaStudent` e ocorrencias por cascade; para preservar historico, usar `Inativar`.

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

### 2026-06-06 - Campo pequeno Letra/Num no homework interativo

- Decisao: adicionar `HomeworkFieldType.TINY_TEXT` e uma ferramenta `Letra/Num` para respostas de 1 ou 2 caracteres, como V/F, A/B/C/D ou numeros curtos.
- Motivo: o `SHORT_TEXT` ficava largo demais para verdadeiro/falso, alternativas e corresponda as colunas; o novo campo e uma caixinha centralizada diferente de `CHECKBOX`, que segue servindo apenas para marcar `x`.
- Impacto: `prisma/schema.prisma`, migration `20260606120000_interactive_homework_tiny_text_field`, `src/lib/validations/learning.ts`, `src/lib/interactive-homework-fields.ts`, `src/app/ava/teacher/actions.ts`, `src/app/ava/student/actions.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `src/components/ava/interactive-homework-review.tsx`, workspaces teacher/student e docs oficiais.
- Riscos/cuidados: a resposta pequena deve continuar normalizada no servidor para maiusculas e no maximo 2 caracteres; `CHECKBOX` nao deve virar campo de letra, e PDFs antigos com `SHORT_TEXT`, `LONG_TEXT`, `CHECKBOX` ou `DRAWING` seguem compativeis.

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

### 2026-06-09 - Candy XP com areas interativas no PDF

- Decisao: adicionar `CandyXpActivityInteractiveField` e reaproveitar o motor visual do homework para o admin desenhar areas no PDF/imagem Candy XP, com action propria de `ADMIN` e respostas salvas na submissao Candy XP do aluno.
- Motivo: Candy XP precisa funcionar como uma atividade no proprio arquivo do Canva para todos os alunos liberados, sem depender de perguntas manuais separadas.
- Impacto: `prisma/schema.prisma`, migration `20260609110000_candy_xp_interactive_fields`, `src/app/ava/candy-xp/actions.ts`, `src/components/ava/interactive-homework-editor.tsx`, `src/components/ava/interactive-homework-student.tsx`, `src/components/ava/admin-candy-xp-panel.tsx`, `src/components/ava/student-candy-xp-activities-panel.tsx`, paginas admin/student e docs oficiais.
- Riscos/cuidados: `LISTENING` continua fora do Candy XP ate existir rota propria de audio/OCR; campos obrigatorios devem ser validados no servidor e os assets precisam continuar servidos apenas por `/ava/candy-xp-assets/[activityId]`.

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

### 2026-06-05 - Gestao humana da memoria pessoal da Catty

- Decisao: criar `Memoria da Catty` para Admin e Teacher, mantendo Student apenas com a tela informativa `Catty aprendendo`. Admin gerencia tudo; Teacher ve a propria memoria e alunos vinculados.
- Motivo: permitir que a Catty aprenda preferencias leves sem virar bagunca automatica, com revisao humana para corrigir erro, arquivar memoria, aprovar pendentes, remover dado sensivel e limpar historico pesado.
- Impacto: `src/components/ava/catty-memory-panel.tsx`, `src/lib/catty-memory-management.ts`, `src/app/ava/catty-memory/actions.ts`, `src/lib/catty-history.ts`, `src/lib/catty-user-memory.ts`, paineis Admin/Teacher, tela informativa Student, layout do AVA e docs oficiais.
- Riscos/cuidados: memorias `FLAGGED`, `ARCHIVED` e `PENDING` nao entram no prompt; limpar historico apaga mensagens da Catty daquele contexto; remover dado sensivel nao deve registrar o valor anterior em evento.

### 2026-06-05 - Contexto Catty inicial no cadastro de aluno

- Decisao: adicionar um campo minimizado `Contexto Catty` na criacao direta de aluno e no aceite de pre-cadastro, salvando o valor como `CattyUserMemory.NOTE/contexto_catty` ativa do aluno.
- Motivo: permitir que Admin/Teacher deem contexto pedagogico leve para a Catty desde o primeiro acesso do aluno, sem criar campo novo sensivel em `User` ou `StudentProfile`.
- Impacto: `src/components/ava/admin-create-user-form.tsx`, `src/components/ava/student-pre-registration-review-panel.tsx`, `src/app/ava/admin/actions.ts`, `src/app/ava/pre-registrations/actions.ts`, validacoes de usuario/pre-cadastro e docs oficiais.
- Riscos/cuidados: manter o campo curto, opcional e fechado por padrao; bloquear senha, telefone, documento, pagamento, contrato, endereco, email, token, chave/API ou dados privados antes de gravar.

### 2026-06-05 - Catty com artefatos de personalidade por interesse

- Decisao: criar `src/lib/catty-artifacts.ts` para mapear interesses seguros do usuario em pequenos artefatos de fala da Catty, como sons, emojis, mini-bordoes e exemplos por tema, com variacao por historico recente.
- Motivo: deixar a Catty mais viva e personalizada sem inventar gostos, sem aumentar contexto de IA em excesso e sem transformar toda resposta em meme.
- Impacto: `src/lib/catty-artifacts.ts`, `src/lib/catty.ts`, `src/lib/catty-user-memory.ts`, `src/app/api/catty/chat/route.ts`, `src/lib/catty-personality.ts`, smoke da Catty e docs oficiais.
- Riscos/cuidados: usar no maximo um artefato por resposta, ignorar quando a intencao nao combinar, respeitar memorias de estilo `avoid_*`, nao usar dados sensiveis, nao repetir sempre o mesmo tema e priorizar clareza em correcao/explicacao seria.

### 2026-06-05 - Catty Learning: gostos configuravel por aluno

- Decisao: criar `CattyUserArtifact` e a tarefa `Catty Learning: gostos` para Admin/Teacher configurarem temas, emojis, sons e bordoes por aluno sem alterar codigo.
- Motivo: permitir que Admin/Teacher corrijam temas errados e ajustem memes seguros da Catty ao longo dos anos de estudo, mantendo controle humano.
- Impacto: `prisma/schema.prisma`, migration `20260605234500_catty_user_artifacts`, `src/lib/catty-user-artifacts.ts`, `src/lib/validations/catty-artifacts.ts`, `src/components/ava/catty-artifacts-panel.tsx`, `src/app/ava/catty-artifacts/actions.ts`, `src/lib/catty-artifacts.ts`, `src/app/api/catty/chat/route.ts`, paineis Admin/Teacher, layout do AVA, smoke da Catty e docs oficiais.
- Riscos/cuidados: somente `ACTIVE` entra no prompt/fallback; Student nao configura artefatos por UI/action; Teacher so acessa aluno vinculado; validar e bloquear dados sensiveis ou temas inadequados; registrar uso recente para detectar repeticao.

### 2026-06-05 - Enriquecimento revisavel de artefatos da Catty

- Decisao: criar `CattyArtifactEnrichmentCache` e `CattyArtifactEnrichment` para gerar sugestoes de tema, emoji, som, bordao, exemplo, vocabulario e cautela quando Admin/Teacher cadastram um interesse que a Catty ainda nao conhece bem.
- Motivo: permitir que interesses como carros, capivara, Minecraft, Barbie, Pokemon, futebol ou dinossauros virem artefatos de fala personalizados sem buscar internet em toda conversa e sem ativar conteudo externo sem revisao.
- Impacto: `prisma/schema.prisma`, migration `20260605235500_catty_artifact_enrichment`, `src/lib/catty-artifact-enrichment.ts`, `src/lib/catty-user-artifacts.ts`, `src/lib/validations/catty-artifacts.ts`, `src/app/ava/catty-artifacts/actions.ts`, `src/components/ava/catty-artifacts-panel.tsx`, `.env.example`, `src/lib/admin-credentials.ts`, smoke da Catty e docs oficiais.
- Riscos/cuidados: busca web e opcional e so roda no fluxo Admin/Teacher; resultado vira sugestao curta/cacheada, nunca resposta direta; Student nao aciona nem aprova; tema sensivel e bloqueado; marcas/personagens devem ser usados so como inspiracao educativa, sem fingir conteudo oficial nem copiar textos longos.

### 2026-06-05 - Artefatos da Catty em respostas e baloes logados

- Decisao: aplicar `CattyUserArtifact.ACTIVE` tambem no retorno final da IA e nos baloes locais da Catty para usuarios logados, usando nome + gosto aprovado quando combinar.
- Motivo: deixar a Catty mais viva para cada aluno sem chamar IA para baloes, sem vazar gosto entre usuarios e sem depender so do prompt para que Gemini/OpenAI usem o artefato.
- Impacto: `src/app/layout.tsx`, `src/components/site/catty-widget.tsx`, `src/app/api/catty/chat/route.ts`, `src/lib/catty-artifact-balloons.ts`, smoke da Catty e docs oficiais.
- Riscos/cuidados: carregar somente artefatos `ACTIVE` do proprio usuario, alternar com frases genericas, evitar repetir a frase atual no widget, respeitar `avoid_*`/status desativado e manter clareza em correcao ou explicacao seria.

### 2026-06-06 - Catty Learning com gosto principal

- Decisao: adicionar `CattyUserArtifact.isPrimary` e melhorar o painel `Catty Learning: gostos` para Admin/Teacher cadastrar gosto, marcar principal, pedir enriquecimento, revisar sugestoes, aprovar/recusar/arquivar e acompanhar uso/alertas.
- Motivo: permitir que a equipe defina um gosto mais importante do aluno, como Betina/capivara ou Lucas/carros, sem aplicar automaticamente conteudo de busca e sem perder controle humano.
- Impacto: `prisma/schema.prisma`, migration `20260606003000_catty_primary_artifacts`, `src/lib/catty-user-artifacts.ts`, `src/lib/catty-artifacts.ts`, `src/lib/validations/catty-artifacts.ts`, `src/components/ava/catty-artifacts-panel.tsx`, menus Admin/Teacher e docs oficiais.
- Riscos/cuidados: `isPrimary` so prioriza artefato `ACTIVE`, Student nao marca principal sozinho, cada usuario deve ter no maximo um principal ativo por vez, contexto pesado vira alerta operacional e busca continua revisavel antes de ativar.

### 2026-06-06 - Catty dos alunos unifica memoria e gostos

- Decisao: simplificar o painel Admin/Teacher de personalizacao da Catty em uma entrada `Catty dos alunos`, unindo o cadastro de gosto, artefatos e resumo simples da memoria do aluno. A rota antiga `catty-memory` continua funcionando como painel tecnico oculto para auditoria/limpeza, mas nao aparece como item separado no menu principal Admin/Teacher.
- Motivo: reduzir confusao entre `Memoria da Catty` e `Catty Learning: gostos`, deixando o fluxo operacional como aluno -> gosto -> emojis/sons/bordoes gerados -> salvar memoria leve.
- Impacto: `src/app/ava/layout.tsx`, `src/components/ava/catty-artifacts-panel.tsx`, `src/components/ava/admin-users-panel.tsx`, `src/components/ava/teacher-workspace.tsx`, README e docs oficiais.
- Riscos/cuidados: Student continua sem tela tecnica; permissoes e actions do servidor seguem as mesmas; URL antiga deve continuar renderizando tela compativel para nao quebrar links.

### 2026-06-07 - Campo Listening no homework interativo

- Decisao: adicionar `HomeworkFieldType.LISTENING` para a teacher desenhar uma area sobre sentencas do PDF/imagem, guardar o texto falado no `placeholder` do campo e tocar audio por `/ava/homework-listening/[fieldId]`.
- Motivo: permitir atividades de listening sem transformar o campo em resposta do aluno, mantendo coordenadas percentuais, editor manual e permissao por homework.
- Impacto: `prisma/schema.prisma`, migration `20260607173000_homework_listening_field`, `src/lib/interactive-homework-fields.ts`, `src/app/ava/homework-listening/[fieldId]/route.ts`, editor/aluno/revisao do homework, `.env.example`, cofre admin e docs oficiais.
- Riscos/cuidados: a rota deve validar role e acesso por dado antes de chamar OpenAI; `LISTENING` nao deve entrar como resposta obrigatoria nem salvar valor em `HomeworkSubmission.answers`; o audio tem custo por clique e precisa manter disclosure de voz gerada por IA.

### 2026-06-07 - Leitura automatica do texto do Listening

- Decisao: ao criar ou reler um campo `LISTENING`, o editor chama `/ava/homework-listening-detect` com `homeworkId`, pagina, coordenadas percentuais e, quando possivel, um recorte leve do box para o Gemini ler apenas o texto marcado no PDF/imagem e preencher o `placeholder` conferivel pela teacher.
- Motivo: reduzir digitacao manual e posicionar naturalmente o volume no fim do proprio texto desenhado, sem tentar gerar campos automaticos no arquivo inteiro.
- Impacto: rota server-side protegida para Admin/Teacher, validacao Zod em `src/lib/validations/learning.ts`, editor com estado de deteccao/releitura, documentacao de ambiente, `GEMINI_HOMEWORK_OCR_MODEL` opcional e fallback de voz `coral` para um tom feminino/animado no TTS.
- Riscos/cuidados: a deteccao envia o recorte pedagogico protegido para Gemini quando `GEMINI_API_KEY` existe; Student nao pode acessar a rota; a teacher deve conferir o texto detectado antes de salvar, principalmente em areas pequenas ou com texto vizinho.

### 2026-06-08 - Aula ao vivo em manutencao temporaria

- Decisao: pausar a aula ao vivo com `LIVE_CLASS_MAINTENANCE_ENABLED=true` em `src/lib/live-class.ts`, mostrando aviso para Teacher/Student e bloqueando criacao ou reabertura por server action.
- Motivo: evitar instabilidade da integracao de video enquanto a sala Jitsi/dominio dedicado e revisada, sem remover historico de `LiveSession` nem mexer nos outros modulos do AVA.
- Impacto: `src/lib/live-class.ts`, `src/app/ava/actions.ts`, `src/components/ava/live-class-maintenance-panel.tsx`, workspaces Teacher/Student, README e docs oficiais.
- Riscos/cuidados: as actions ainda precisam validar sessao e role antes de retornar manutencao; reativar exige novo build/deploy e validacao da rota de video, headers e dominio Jitsi.

### 2026-06-09 - Homework compartilhavel por aluno extra

- Decisao: adicionar `HomeworkStudentAssignment` para permitir que uma mesma homework interativa real seja liberada para alunos extras sem duplicar PDF, campos nem aula interna.
- Motivo: materiais iguais podem ser usados por mais de um aluno, reduzindo retrabalho da teacher e peso de storage, mas mantendo rascunho, entrega e correcao separados por `HomeworkSubmission`.
- Impacto: `prisma/schema.prisma`, migration `20260609113000_homework_student_assignments`, actions teacher/student, rotas protegidas de asset/audio, editor de homework e docs oficiais.
- Riscos/cuidados: Teacher so compartilha com aluno vinculado, Admin com aluno ativo; `lesson-manual` segue fora do compartilhamento para nao misturar aula interativa com homework.
- Status: substituida em 2026-06-10 por replicacao real de homework por aluno, para evitar confusao visual e permissao compartilhada no mesmo item.

### 2026-06-10 - Homework replicavel por aluno

- Decisao: substituir o fluxo operacional de "aluno extra ve o mesmo homework" por `Replicar para outro aluno`, criando nova `Lesson` e novo `Homework` com `replicatedFromHomeworkId`, perguntas e campos interativos copiados.
- Motivo: a teacher pode reutilizar um material ja editado sem subir o PDF novamente e sem o aluno acessar o mesmo registro de outro aluno.
- Impacto: `prisma/schema.prisma`, migration `20260610120000_homework_replication_source`, actions teacher/student, rotas protegidas de asset/audio, editor de homework e docs oficiais.
- Riscos/cuidados: o arquivo otimizado pode ser reaproveitado por caminho de storage, entao a exclusao so remove o arquivo fisico quando nao existe outra homework usando o mesmo caminho; `HomeworkStudentAssignment` fica legado e nao deve definir acesso novo do aluno.

### 2026-06-11 - Catty bilingue em pratica e correcao

- Decisao: padronizar a Catty para responder de forma bilingue quando o aluno estiver praticando ingles, com perguntas em ingles acompanhadas de traducao curta e correcoes no formato `Better`, `English tip` e `Em portugues`.
- Motivo: alunos iniciantes precisam conseguir praticar sem ficar perdidos, especialmente em conversa, perguntas e microcorrecoes.
- Impacto: prompt server-side da Catty, personalidade oficial, fallback local, cenarios curados, smoke `audit:catty-behavior`, README e docs oficiais.
- Riscos/cuidados: manter respostas curtas, nao transformar em aula longa, nao entregar resposta pronta de homework e preservar a diferenca de contexto para teacher/admin.

### 2026-06-19 - Contador publico de visitas agregado

- Decisao: criar `SiteVisitCounter`, `/api/site-visits` e um componente discreto no footer publico para mostrar o total de visitas do site institucional.
- Motivo: exibir prova social simples no rodape sem usar Google Analytics, sem bloquear o carregamento e sem coletar dados pessoais.
- Impacto: `prisma/schema.prisma`, migration `20260619120000_site_visit_counter`, `src/lib/site-visits.ts`, `src/app/api/site-visits/route.ts`, `src/components/site/site-visit-counter.tsx` e `src/components/site/site-footer.tsx`.
- Riscos/cuidados: manter apenas total agregado; nao salvar IP, user-agent, email, telefone ou identificador pessoal; o cooldown local reduz inflacao por refresh, mas nao substitui analytics completo.

### 2026-06-19 - Sidebar responsiva do AVA como drawer

- Decisao: manter a sidebar operacional permanente apenas a partir de `1280px` e usar um drawer com barra compacta de abertura em mobile/tablet.
- Motivo: no layout empilhado, o link mudava a tarefa, mas a navegacao longa continuava antes do conteudo e parecia nao responder ao toque; em tablets de 1024px, a coluna lateral tambem comprimida demais a area de trabalho.
- Impacto: `src/app/ava/layout.tsx`, novo `src/components/ava/ava-responsive-sidebar.tsx`, fluxo visual e direcao de design do AVA.
- Riscos/cuidados: o drawer deve fechar por link, backdrop, `Esc` ou mudanca de rota, bloquear apenas a rolagem de fundo enquanto aberto e preservar os mesmos links e permissoes server-side.

### 2026-06-20 - Comando avancado de significado da Catty

- Decisao: manter a intencao `advanced_word_meaning` para comandos explicitos com `Catty`, aceitando `[target] meaning`, `what does [target] mean?`, `meaning of [target]` e `explain the meaning of [target]`, com definicao simples, exemplo e convite em ingles.
- Motivo: alunos mais avancados precisam aprender o conceito em ingles sem receber apenas equivalencia direta em portugues.
- Impacto: detector/plano/fallback e tabela local com 33 significados em `src/lib/catty.ts`, regra compartilhada dos provedores em `/api/catty/chat`, personalidade, 13 cenarios de meaning, smoke dos 13 comandos obrigatorios e docs oficiais.
- Riscos/cuidados: manter prioridade antes da traducao, limitar o alvo a ate 15 palavras, pedir alvo menor acima do limite, nao ativar por palavra solta ou `translation`, usar apenas o sentido mais comum e deixar portugues como ajuda opcional para iniciante.

### 2026-06-20 - Leitura mobile do homework e atividade interativa

- Decisao: manter o arquivo interativo do Student em largura minima de `560px` abaixo de `640px`, dentro de rolagem horizontal local, com acao de abrir sempre visivel, homework/aula mais recentes abertas automaticamente no mobile, paginas PDF renderizadas progressivamente e fallback para o arquivo original protegido.
- Motivo: reduzir uma folha A4 para a largura interna de um card mobile deixava o material praticamente ilegivel; alem disso, alunos com varias homeworks continuavam vendo todos os cards recolhidos porque a primeira correcao so abria item unico. Em PDFs maiores, o custo de varios canvases tambem podia resultar em uma area visual vazia.
- Impacto: `interactive-homework-document.tsx`, `interactive-homework-student.tsx`, novo `responsive-details.tsx`, `student-workspace.tsx`, fluxo visual Student e documentacao do homework.
- Riscos/cuidados: preservar coordenadas percentuais dos campos, restringir a largura minima somente a celular, manter tablet/desktop fluidos, nao alterar upload/autosave/permissoes e continuar servindo o original apenas pela rota protegida.

### 2026-06-23 - Selecao em lote estavel e contingencia interna do homework

- Decisao: quando todos os alunos forem marcados na criacao de aula/homework, mostrar um resumo curto pelo total e uma acao separada para limpar, sem usar a lista completa de nomes como coluna, mantendo rotulos distintos para o grupo e para o checkbox. No Student, manter o PDF no canvas interno, transformar o original em download protegido, usar `no-store` nos assets e capturar falhas de Server Action/conexao dentro do card com rascunho local preservado.
- Motivo: a lista completa comprimida quebrava a leitura do seletor; alem disso, uma aba aberta antes de deploy pode chamar uma Server Action antiga e expor uma mensagem tecnica, enquanto abrir o original em nova aba mostra a interface do navegador em vez do AVA.
- Impacto: `teacher-forms.tsx`, `interactive-homework-student.tsx`, `interactive-homework-document.tsx`, rotas protegidas de assets de homework/Candy XP e documentacao do fluxo.
- Riscos/cuidados: manter a selecao enviada inalterada, continuar validando aluno/teacher no servidor, nao apagar o rascunho em falha, preservar a leitura inline usada pelo PDF.js e aplicar download apenas quando a query explicita estiver presente.

### 2026-07-30 - Aplicativo nativo com sessao movel propria

- Decisao: manter o Next.js e o PostgreSQL atuais como fonte unica para site e app, criando `/api/mobile/v1` com access token curto, refresh rotativo vinculado a instalacao e autorizacao server-side por role/dado.
- Motivo: permitir Android/iOS nativos com o mesmo login e atualizacao de dados do site, sem WebView, sem cookie Auth.js no celular e sem duplicar banco ou regra de senha.
- Impacto: `prisma/schema.prisma`, migration `20260730121000_mobile_sessions`, `src/lib/password-auth.ts`, `src/lib/mobile-auth/`, `src/lib/mobile-overview.ts`, `src/lib/mobile-modules.ts`, `src/app/api/mobile/`, `scripts/mobile-auth-smoke.ts` e `docs/18-mobile-api.md`.
- Riscos/cuidados: aplicar migration antes do deploy, executar smoke integrado com PostgreSQL, nunca registrar tokens/senha, manter o cofre administrativo fora do app e extrair escritas para servicos de dominio compartilhados.

## Regras de negocio que precisam ser preservadas

### 2026-08-23 - PDV separado do Financeiro de mensalidades

- Decisao: criar `/ava/vendas` para Admin e Teacher com catalogo, estoque, venda paga na hora ou lancada na fatura mensal do aluno, mantendo as compras em `Sale`/`SaleItem` e sem alterar `FinancialPayment`.
- Motivo: estoque e venda precisam de auditoria e concorrencia proprias; somar compras diretamente ao snapshot da mensalidade apagaria a separacao entre valor escolar e consumo.
- Impacto: novos modelos `SaleProduct`, `Sale` e `SaleItem`, migration `20260823233000_add_sales_pos`, server actions transacionais, painel de Vendas, escolha de area e smoke de permissoes.
- Riscos/cuidados: fatura mensal exige aluno cadastrado; Teacher so usa alunos vinculados e suas vendas; preco e estoque sempre sao revalidados no servidor; cancelamento preserva o registro e devolve estoque.

### 2026-08-24 - Ponto separado com permissao individual e revisao imutavel

- Decisao: criar `/ava/ponto` como area propria para Admin e usuarios Teacher habilitados, com batidas ilimitadas, `operationId`, horario do servidor, correcao administrativa e PDF mensal protegido.
- Motivo: a jornada precisa aceitar varios intervalos sem depender da Agenda e sem permitir que uma correcao apague o valor originalmente registrado.
- Impacto: `TimeClockProfile`, `TimeClockEntry`, `TimeClockEntryRevision`, migration `20260824013000_add_time_clock`, actions, painel, area `PONTO`, PDF server-side e smoke de permissoes.
- Riscos/cuidados: nao liberar Teacher apenas pela UI, nao apagar perfil/batida, manter `America/Sao_Paulo`, exigir motivo de correcao e aplicar migration antes do app novo.

### 2026-08-24 - Cadastro unico da Secretaria libera o AVA imediatamente

- Decisao: substituir a criacao de novos pre-cadastros pelo fluxo `Cadastro`, que exige login e senha confirmada e cria aluno, perfil, vinculo, financeiro e agenda na mesma transaction.
- Motivo: eliminar a segunda etapa obrigatoria `Tornar aluno` para novos registros e manter uma entrada unica, simples e imediatamente utilizavel no AVA.
- Impacto: nova validacao de cadastro, action transacional, formulario com acesso do AVA, rotulos da Secretaria e preservacao dos registros antigos em `Cadastros anteriores`.
- Riscos/cuidados: nunca persistir senha em texto puro, bloquear duplicidade concorrente por email/telefone, permitir financeiro/agenda como `Completar` e manter o fluxo legado para nao perder historico.

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
