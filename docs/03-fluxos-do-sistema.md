# 03 - Fluxos do Sistema

## O que esta parte do sistema faz

Este documento registra os fluxos principais de uso do Candy English. Ele deve ser atualizado quando uma jornada de usuario, permissao, modulo interno ou comportamento importante mudar.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Rotas:

- `/ava/login`
- `/ava/admin?task=...`
- `/ava/teacher?task=...`
- `/ava/student?task=...`
- `/ava/avatar`
- `/ava/contracts/[contractId]`
- `/ava/candy-xp-assets/[activityId]`
- `/api/catty/chat`

Componentes:

- `src/components/ava/ava-dashboard.tsx`
- `src/components/ava/admin-users-panel.tsx`
- `src/components/ava/admin-credentials-panel.tsx`
- `src/components/ava/admin-finance-panel.tsx`
- `src/components/ava/admin-agenda-panel.tsx`
- `src/components/ava/interactive-homework-document.tsx`
- `src/components/ava/interactive-homework-editor.tsx`
- `src/components/ava/interactive-homework-review.tsx`
- `src/components/ava/interactive-homework-student.tsx`
- `src/components/ava/homework-correction-tabs.tsx`
- `src/components/ava/teacher-workspace.tsx`
- `src/components/ava/student-workspace.tsx`
- `src/components/ava/student-xp-card.tsx`
- `src/components/ava/admin-candy-xp-panel.tsx`
- `src/components/ava/student-candy-xp-activities-panel.tsx`
- `src/components/ava/student-pre-registration-review-panel.tsx`
- `src/components/ava/chat-thread-panel.tsx`
- `src/components/ava/live-session-forms.tsx`
- `src/components/ava/profile-forms.tsx`
- `src/components/ava/student-pre-registration-form.tsx`
- `src/components/site/catty-widget.tsx`

Actions:

- `src/app/ava/admin/actions.ts`
- `src/app/ava/login/actions.ts`
- `src/app/ava/pre-registrations/actions.ts`
- `src/app/ava/teacher/actions.ts`
- `src/app/ava/student/actions.ts`
- `src/app/ava/candy-xp/actions.ts`
- `src/app/ava/actions.ts`

Helpers:

- `src/lib/catty.ts`
- `src/lib/catty-history.ts`
- `src/lib/candy-xp.ts`
- `src/lib/candy-xp-activities.ts`

## Fluxos principais

### Login

1. Usuario entra em `/ava/login`.
2. Auth.js valida email, senha, usuario ativo e manutencao.
3. Sessao JWT recebe `id` e `role`.
4. Usuario vai para `/ava/admin`, `/ava/teacher` ou `/ava/student`.

### Pre-cadastro de interessado

1. Visitante abre `/ava/login` e clica em `Quero ser aluno Candy`.
2. O formulario coleta nome, email, telefone, cidade/endereco, data de nascimento, contatos, documento, responsavel, observacoes e objetivo com o ingles.
3. `requestStudentPreRegistration` valida os dados no servidor e grava `StudentPreRegistration` com status `PENDING`.
4. O fluxo nao cria `User`, nao cria senha, nao define role e nao gera sessao.
5. Se o email ja existir como usuario ou solicitacao, o sistema nao cria duplicidade e retorna a mesma mensagem amigavel para evitar exposicao de cadastro.
6. A pessoa ve a confirmacao: `Recebemos seu cadastro. A equipe Candy vai analisar e entrar em contato.`
7. Admin ou Teacher abre `/ava/admin?task=aceitar-alunos` ou `/ava/teacher?task=aceitar-alunos`, revisa os dados e pode marcar `em analise`, recusar ou aceitar.
8. Ao aceitar, a action protegida cria apenas `User.role=STUDENT`, cria `StudentProfile` com os dados preenchidos, exige senha inicial digitada por Admin/Teacher e muda a solicitacao para `APPROVED`, exibida na UI como `Convertido em aluno`.
9. Quando uma Teacher aceita o aluno, o sistema tambem cria o vinculo `StudentTeacherAssignment` com essa teacher; Admin aceita sem vinculo automatico e pode vincular depois.

### Admin

1. Admin abre `/ava/admin`.
2. A tarefa padrao e `usuarios`.
3. No painel de usuarios, ve o card Admin XP com nivel, fontes operacionais, trilha infinita e proximas metas de gestao.
4. Admin pode criar usuarios, redefinir senhas, ativar/desativar, vincular aluno-teacher, enviar contratos, registrar APIs/senhas, controlar manutencao e gerenciar financeiro.
5. Admin revisa pre-cadastros em `Aceitar alunos`, com filtros por pendente, em analise, convertido e recusado.
6. Admin tambem tem atalhos para tarefas da area teacher.

### APIs e senhas

1. Admin abre `/ava/admin?task=apis-senhas`.
2. A pagina sincroniza para `AdminCredential`, de forma criptografada, integracoes externas existentes no `.env` como Gemini, OpenAI e dominio Jitsi.
3. Admin pode registrar credenciais manuais com rotulo, servico, tipo, usuario, URL, notas e valor sensivel.
4. O valor sensivel fica oculto por padrao; para copiar ou conferir, admin precisa clicar em `Revelar`.
5. Credenciais manuais podem ser editadas ou excluidas; credenciais vindas do `.env` devem ser alteradas no servidor.

### Teacher

1. Teacher entra em `/ava/teacher`.
2. No resumo, ve o card Teacher XP com nivel, fontes pedagogicas, trilha infinita e proximas metas de rotina.
3. Ve alunos vinculados.
4. Cria aula interativa e homework interativo por arquivo do Canva.
5. Corrige respostas e envia feedback.
6. Pode abrir aula ao vivo e mensagens.
7. Pode revisar pre-cadastros pendentes/em analise em `Aceitar alunos` e aceitar interessados como alunos `STUDENT` vinculados a sua teacher.

### Student

1. Student entra em `/ava/student`.
2. No resumo, ve o card Candy XP com nivel, barra amarela de progresso, fontes de XP, proximas metas e roadmap de jogos.
3. Ve aulas, materiais, homework interativo, mensagens, contratos, perfil e aula ao vivo.
4. Responde homework online; no modo interativo digita, marca ou desenha sobre o arquivo e o rascunho e salvo automaticamente.
5. Visualiza feedback.
6. Edita dados pessoais permitidos, mas nao o nivel.

### Candy XP e jogos

1. O card aparece em `/ava/student?task=resumo`, `/ava/teacher?task=resumo` e `/ava/admin?task=usuarios`.
2. A pontuacao e sincronizada no servidor a partir dos dados que cada role ja pode ver: student usa atividades do proprio aluno, teacher usa alunos/aulas/homeworks/correcoes da sua area, e admin usa indicadores operacionais permitidos.
3. Cada origem de XP vira um `CandyXpEvent` com `sourceKey` unica por usuario; se a mesma homework, feedback, aula, rotina ou missao aparecer de novo, o XP nao duplica.
4. `CandyXpProfile` guarda total, nivel, progresso e streak como cache recalculado pela soma dos eventos.
5. A curva de nivel fica em `src/lib/candy-xp.ts`, inspirada no card XP do Wimifarma, mas adaptada para a Candy: requisito inicial menor, crescimento gradual e barra amarela.
6. Niveis sao infinitos por formula: o sistema calcula a meta do proximo nivel com base no numero do nivel, sem lista fixa nem teto artificial.
7. O roadmap mostra a fase atual do XP, missoes, conquistas e temporadas. O card de jogos/spotlight e slot visual preparado para minijogos futuros; ele nao abre jogo executavel nesta fase.
8. `CandyMission` e `CandyMissionAttempt` ja deixam a base pronta para tarefas estilo Duolingo; atividades com historia/PDF ja existem em `/ava/student?task=candy-xp`, mas minijogos executaveis ainda precisam de fase propria.

### Atividades Candy XP

1. Admin abre `/ava/admin?task=candy-xp`.
2. Admin cadastra titulo, descricao, nivel, categoria, XP, status, liberacao para todos ou um aluno especifico e envia PDF/imagem exportado do Canva.
3. Quando o arquivo e PDF, o servidor tenta otimizar com Ghostscript antes de salvar; se a otimizacao falhar ou nao reduzir tamanho, o original e salvo para nao quebrar o fluxo.
4. Admin monta perguntas do tipo resposta curta, resposta longa, multipla escolha, checkbox ou matching.
5. Alternativas objetivas podem ter resposta correta cadastrada; matching usa pares `esquerda = direita`.
6. Aluno abre `/ava/student?task=candy-xp` e ve apenas atividades publicadas e liberadas para ele.
7. O PDF/imagem abre dentro da missao por `/ava/candy-xp-assets/[activityId]`, sempre com validacao server-side.
8. Aluno responde, pode salvar progresso como `DRAFT` e depois enviar.
9. Se a atividade for toda objetiva e estiver correta, o sistema marca `REVIEWED` e concede XP automaticamente.
10. Se a atividade objetiva tiver erro, o sistema devolve como `RETURNED` para o aluno revisar.
11. Se houver resposta escrita, a submissao fica `SUBMITTED` para o admin corrigir manualmente.
12. Ao aprovar manualmente, o admin libera o XP uma unica vez pela `sourceKey` da submissao.

### Contratos

1. Admin ou teacher autorizada envia PDF em `/ava/admin?task=contratos` ou `/ava/teacher?task=contratos`.
2. O arquivo fica em storage privado e e servido por `/ava/contracts/[contractId]` com validacao server-side de sessao e permissao por aluno.
3. Student abre `/ava/student?task=contratos` e visualiza o PDF embutido no proprio AVA; o header `X-Frame-Options=SAMEORIGIN` permite esse preview interno sem liberar embed por sites externos.
4. O aluno tambem pode abrir o contrato em nova aba pela mesma rota protegida.

### Catty

1. Usuario abre a Catty no canto inferior direito do site, login ou paineis do AVA.
2. Widget identifica apenas contexto leve da tela atual (`area` e `task`) para adaptar titulo, texto de apoio e atalhos de estudo.
3. O `RootLayout` chama `auth()` e passa para a Catty apenas o nome do usuario logado, quando existe; o widget usa o primeiro nome em baloes visuais locais no AVA.
4. Para usuarios logados no AVA, a Catty fechada alterna baloes fofos a cada 10 segundos, com saudacao por horario, sem chamar IA.
5. Para visitante sem login no site ou login, a Catty funciona apenas como mascote visual: alterna baloes publicos a cada 10 segundos e, no clique, mostra um aviso pequeno para entrar no AVA ou virar aluno Candy.
6. Fora do AVA logado, o widget nao abre conversa real, nao envia mensagem para a API e nao chama IA.
7. Quando o usuario logado abre o chat real, o widget chama `GET /api/catty/chat` para carregar historico recente daquele usuario e contexto de tela.
8. Widget envia para `/api/catty/chat` apenas quando o usuario logado no AVA manda uma mensagem real: mensagem atual, historico local recente e contexto leve.
9. A rota chama `auth()` antes de parsear a mensagem; sem sessao ativa e role `ADMIN`, `TEACHER` ou `STUDENT`, retorna 401 amigavel.
10. Para usuario autorizado, a rota valida o payload com Zod, aplica limite simples por IP, mescla o historico persistido com o historico local recente do widget, removendo a mensagem atual e limitando o contexto enviado.
11. Antes de chamar IA ou fallback, `src/lib/catty.ts` detecta uma intencao leve da mensagem, como corrigir frase, traduzir frase, explicar palavra, dica de homework, pratica de ingles, ajuda no AVA, mensagem para teacher, motivacao, pergunta grande ou pergunta confusa.
12. Essa intencao vira um pequeno plano de resposta usado tanto no prompt da IA quanto no fallback local; perguntas vagas devem pedir uma informacao especifica, correcoes ou traducoes sem frase pedem o texto, frases em ingles com erro comum podem virar correcao direta, aluno travado recebe um passo simples, homework sem enunciado pede a pergunta, e perguntas grandes devem ser resumidas em partes.
13. A rota deriva do servidor um contexto seguro do usuario com role, primeiro nome e nivel do aluno quando existir; esse contexto so ajusta tom e dificuldade do exemplo e nao inclui email, id, senha, contratos, pagamentos, documentos ou credenciais.
14. Somente as 8 mensagens recentes entram no prompt; a conversa armazenada e podada para no maximo 50 mensagens por contexto.
15. A rota usa Gemini quando `GEMINI_API_KEY` existe.
16. Se a mensagem chama Catty pelo nome, incluindo `Catty`, `catty` ou `/catty`, a rota tenta OpenAI Responses API antes de Gemini, desde que `OPENAI_API_KEY` exista.
17. Sem chave, erro de API, resposta vazia, resposta cortada, resposta generica demais ou resposta fora da personalidade, a Catty usa o fallback local autorizado com orientacoes de estudo, homework, aula ao vivo e pratica simples em ingles.
18. A troca final do usuario logado e gravada em `CattyConversation`/`CattyMessage`; visitante sem login nao grava historico.
19. A personalidade oficial fica em `CATTY_PERSONALITY_GUIDE`: Catty e uma gatinha mascote-professora da Candy, usa expressoes como `Miauw`, `Awnn`, `Uwau`, `Pss pss`, `Nya` e `Bora estudar`, e pode usar um emoji pequeno ocasional.
20. Quando o usuario escreve em ingles, a resposta deve vir em ingles simples; em portugues, a resposta deve ficar em portugues brasileiro.
21. Em homework e aula interativa, Catty ajuda a entender o enunciado, dar pistas e criar exemplos parecidos, mas nao entrega a resposta final.

### Aula ao vivo

1. Teacher abre `/ava/teacher?task=aula-ao-vivo`.
2. Configura teacher, aluno ou turma geral, titulo, link externo opcional e datas opcionais no bloco superior.
3. Se o link externo ficar vazio, o AVA cria automaticamente uma sala Jitsi Meet embutida usando o dominio configurado em `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN`.
4. Se o link for Google Meet, a sala fica registrada e abre em nova aba; se for um dominio Jitsi aceito pelo AVA, o AVA tenta embutir a sala.
5. A sala ativa aparece abaixo das opcoes, com o video centralizado como superficie principal.
6. Student abre `/ava/student?task=aula-ao-vivo` e entra na mesma sala ativa liberada para ele.
7. Teacher encerra ou reabre a sala pelo botao no topo do card da propria aula ao vivo.

### Aula interativa

1. Teacher abre `/ava/teacher?task=criar-aula`.
2. Seleciona teacher e aluno, informa titulo/resumo/data e envia PDF/imagem exportado do Canva.
3. Quando o arquivo e PDF, o servidor tenta otimizar com Ghostscript antes de salvar; se a otimizacao falhar ou nao reduzir tamanho, o original e salvo.
4. O sistema cria uma `Lesson` real para o aluno e uma atividade `Homework.kind=INTERACTIVE` vinculada a essa aula, marcada com `fieldDetectionSource=lesson-manual`.
5. A aula aparece na lista de aulas, e a atividade interativa usa o mesmo editor manual de areas do homework.
6. Teacher pode mover, redimensionar, excluir uma area selecionada ou limpar todas as areas antes de salvar.
7. Student responde essa atividade dentro de `/ava/student?task=aulas`, no card da propria aula, com campos invisiveis sobre o arquivo e autosave.

### Homework interativo

1. Teacher abre `/ava/teacher?task=criar-homework`.
2. Seleciona teacher e aluno, informa titulo/instrucoes e envia PDF/imagem exportado do Canva.
3. Quando o arquivo e PDF, o servidor tenta otimizar com Ghostscript antes de salvar; se a otimizacao falhar ou nao reduzir tamanho, o original e salvo.
4. O sistema cria uma aula interna automaticamente para vincular a homework ao aluno e a teacher.
5. O arquivo e salvo em `storage/homework-assets` e servido por `/ava/homework-assets/[homeworkId]`.
6. A homework nasce sem campos automaticos: a teacher escolhe o tipo de area (`Texto curto`, `Texto longo`, `Marcar` ou `Desenho`) e desenha diretamente sobre o PDF/imagem.
7. Teacher pode mover, redimensionar, excluir uma area selecionada ou limpar todas as areas antes de salvar; o editor mostra uma previa do `x`, do texto exemplo ou da area de desenho para facilitar o posicionamento exato.
8. Teacher ou admin pode excluir uma homework interativa na lista de criacao; a exclusao remove campos, perguntas, respostas e a aula interna automatica quando ela ficou vazia.
9. Student abre `/ava/student?task=homeworks`, clica no bloco recolhido e responde sobre o arquivo renderizado na proporcao original; PDFs aparecem pagina a pagina e as areas de resposta ficam invisiveis ate receberem texto, marca ou desenho.
10. Em areas `DRAWING`, o aluno pode desenhar com mouse ou dedo e desfazer o ultimo traco sem limpar todo o desenho.
11. Enquanto edita, a submissao fica `DRAFT`; ao clicar em entregar, vira `SUBMITTED` e aparece para teacher/admin como evento novo.
12. Teacher ou admin corrige em uma tela com abas: `Aguardando correcao` para `SUBMITTED` e `Corrigidos` para `REVIEWED`/`RETURNED`.
13. Cada entrega da fila fica recolhida por padrao; ao abrir, o PDF/imagem aparece com texto, marcas e desenhos entregues pelo aluno sobrepostos ao arquivo.
14. No painel lateral da entrega aberta ficam aluno, professor responsavel, aula e nota/feedback para o aluno.
15. A avaliacao salva a entrega como `REVIEWED` e aparece para o aluno; a acao de refazer salva `RETURNED` e libera nova tentativa.

### Financeiro

1. Admin abre `/ava/admin?task=financeiro`.
2. Seleciona um mes de 2026.
3. Adiciona aluno financeiro; ele passa a existir do mes selecionado em diante.
4. Marca status pago/pendente e registra data paga/observacao mensal.
5. Edita dados do aluno do mes selecionado em diante, mantendo meses anteriores fechados.
6. Retira aluno apenas do mes atual; o proximo mes continua puxando as linhas ativas ja existentes.
7. Exporta PDF/Excel e acompanha log em card separado.

### Agenda

1. Admin abre `/ava/admin?task=agenda`.
2. Cadastra aluno, telefone opcional, dias da semana e horario.
3. O sistema cria ocorrencias de aula do mes selecionado ate dezembro de 2026.
4. Admin marca se o aluno foi, faltou ou reseta a presenca.
5. Quando o aluno falta, admin pode cadastrar uma reposicao com data e horario.
6. A tela mostra alunos do dia e proximas aulas com horario.
7. No bloco `Hoje`, admin pode confirmar presenca rapidamente pelo icone verde, registrar falta pelo icone vermelho ou abrir `Reagendar`.
8. Ao clicar no nome do aluno em `Hoje` ou `Proximas aulas`, a tela rola ate a linha mensal daquele aluno.
9. Aulas de hoje sem acao saem da fila visual depois de 2 horas do horario previsto, sem apagar o registro.

### Manutencao

1. Admin liga manutencao em `/ava/admin?task=editar-site`.
2. `AppSetting` salva o estado.
3. Students ficam bloqueados; admins e teachers continuam acessando.

## Regras de negocio que precisam ser preservadas

- Query `?task=` controla a tarefa principal em admin, teacher e student.
- Pre-cadastro publico nunca deve liberar login automaticamente; ele apenas cria solicitacao pendente para analise.
- O modulo `Aceitar alunos` deve converter pre-cadastro somente por action protegida com role `ADMIN` ou `TEACHER`, sempre criando `STUDENT` e nunca `ADMIN`/`TEACHER`.
- Sidebar deve ser indice operacional, sem caixa interna de rolagem.
- Student tem botoes sempre visiveis.
- Candy XP deve continuar sem ranking publico; XP, streaks, badges e missoes sao persistidos por usuario e nao podem vazar dados de outras roles.
- Toda nova tarefa que conceder XP deve gravar por server action/rota protegida e usar `sourceKey` estavel para evitar abuso ou pontuacao duplicada.
- Atividades Candy XP so podem ser criadas/corrigidas por `ADMIN`; `STUDENT` acessa apenas atividades publicadas e liberadas para o proprio perfil.
- Arquivos Candy XP devem ser servidos apenas por `/ava/candy-xp-assets/[activityId]`, nunca por caminho direto do storage.
- Otimizacao de PDF dos uploads pedagogicos protegidos deve acontecer apenas no servidor e nunca pode expor arquivo fora das rotas protegidas.
- Respostas escritas de Candy XP nao devem liberar XP automatico; precisam de revisao manual.
- Homework corrigida nao deve ser reenviada.
- A interface de criacao nova de homework deve usar o modo interativo; homework simples fica apenas como legado de dados antigos.
- A interface de criacao nova de aula usa o mesmo fluxo interativo de PDF/imagem por enquanto, criando uma aula real com atividade interativa vinculada que aparece em `Aulas e Materiais`, nao em `Responder homework`.
- Excluir homework interativa exige permissao server-side de admin ou teacher dona da homework.
- Draft de homework interativo nao deve aparecer como resposta entregue para teacher.
- Arquivo de homework interativo deve ser acessado apenas por admin, teacher dona da aula ou aluno dono da homework.
- Aula ao vivo usa Jitsi embutido se nao houver link externo; a configuracao fica acima e o video deve ficar centralizado abaixo.
- `meet.jit.si` publico exige conta para quem cria sala e nao deve ser tratado como embed de producao; para teacher/aluno sem conta Jitsi, usar dominio Jitsi dedicado/JaaS configurado no ambiente.
- Catty nao deve solicitar senhas, chaves, documentos sensiveis ou prometer alterar dados internos; problemas de acesso, contratos, pagamentos e cadastro devem ser encaminhados para Candy, teacher ou admin.
- Catty pode usar `area` e `task` da URL para orientar atalhos, historico recente e linguagem, e pode usar role, primeiro nome e nivel do aluno derivados no servidor apenas como contexto seguro; nao pode responder usuario sem sessao valida nem receber registros internos, respostas salvas, contratos, pagamentos ou credenciais.
- APIs e senhas so podem ser acessadas por `ADMIN`; o painel nunca deve importar `DATABASE_URL`, `AUTH_SECRET`, senhas do Postgres ou senha seed do admin.
- Mensagem teacher/aluno exige vinculo.
- Contratos e avatar exigem sessao.
- Agenda e financeiro sao internos do admin.

## Decisoes tecnicas tomadas

- O fluxo `/ava` nao exibe cards publicos; ele redireciona.
- Login Google esta desativado nesta fase; o AVA usa email/senha pelo Credentials Provider.
- Alertas visuais da sidebar usam assinaturas por modulo e localStorage no navegador.
- Financeiro usa estrutura recorrente por aluno com snapshots mensais para preservar historico fechado.
- Agenda usa ocorrencias por data para facilitar presenca e reposicao.
- Homework e aula interativa usam arquivo protegido, renderizacao fiel do PDF/imagem e campos percentuais desenhados manualmente por pagina.
- Catty usa IA opcional via rota server-side protegida por `auth()`, mantendo fallback local apenas para usuario autorizado em ambientes sem `GEMINI_API_KEY`/`OPENAI_API_KEY`, com atalhos de estudo, resposta contextual por tela e historico recente limitado por usuario.
- O cofre admin criptografa valores sensiveis no servidor e usa `ADMIN_CREDENTIALS_SECRET` ou `AUTH_SECRET` como chave de protecao.
- Candy XP fica nos paineis admin, teacher e student como gamificacao persistente e prepara a base de jogos/missoes sem alterar o fluxo de aula/homework.
- Atividades Candy XP usam modelos proprios para historia/PDF/perguntas/progresso e reaproveitam o ledger Candy XP para pontuar conclusoes.
- Pre-cadastros usam a mesma tabela `StudentPreRegistration`; os status existentes sao traduzidos na UI como pendente, em analise, convertido em aluno e recusado.

## Riscos ao alterar esta parte

- Mudar task ids quebra links profundos.
- Mostrar mais de uma tarefa grande por tela pode poluir o AVA.
- Remover validacao server-side pode vazar dados.
- Alterar bloqueio de manutencao pode impedir admins/teachers de operar.
- Enviar dados do AVA para a Catty sem necessidade pode criar risco de privacidade; manter a rota limitada ao texto digitado no widget, historico recente da propria Catty, contexto leve de `area`/`task` e contexto seguro minimo de role, primeiro nome e nivel do aluno.
- Revelar credenciais na tela deve ser uma acao consciente do admin; nao adicionar exibicao automatica nem logs do valor em claro.
- Alterar resposta correta de atividade Candy XP publicada pode mudar o criterio de novas tentativas; manter cuidado com atividades ja respondidas.

## Pendencias

- Edicao/delecao completa de aulas e materiais ainda nao existe; aula/homework interativa ja podem ser excluidas nas telas de criacao.
- Upload livre de materiais fora dos fluxos interativos e editor Word embutido ainda nao existem.
- Notificacoes por email/WhatsApp ainda nao existem.
- Editor completo para alterar perguntas Candy XP apos a criacao ainda nao existe.

## Como pode evoluir

- Adicionar importacao em massa de alunos.
- Expandir homework para multiplas perguntas e anexos.
- Criar auditoria administrativa mais ampla.
