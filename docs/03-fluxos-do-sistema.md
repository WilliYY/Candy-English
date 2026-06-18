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
- `src/components/ava/user-summary-panel.tsx`
- `src/components/ava/student-xp-card.tsx`
- `src/components/ava/candy-xp-ranking-card.tsx`
- `src/components/ava/admin-candy-xp-panel.tsx`
- `src/components/ava/catty-learning-center-panel.tsx`
- `src/components/ava/catty-memory-panel.tsx`
- `src/components/ava/catty-artifacts-panel.tsx`
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
- `src/app/ava/catty-learning/actions.ts`
- `src/app/ava/catty-memory/actions.ts`
- `src/app/ava/catty-artifacts/actions.ts`
- `src/app/ava/actions.ts`

Helpers:

- `src/lib/catty.ts`
- `src/lib/catty-learning.ts`
- `src/lib/catty-user-memory.ts`
- `src/lib/catty-artifacts.ts`
- `src/lib/catty-artifact-enrichment.ts`
- `src/lib/catty-user-artifacts.ts`
- `src/lib/catty-memory-management.ts`
- `src/lib/catty-personality.ts`
- `src/lib/catty-examples.ts`
- `src/lib/catty-history.ts`
- `src/lib/candy-xp.ts`
- `src/lib/candy-xp-ranking.ts`
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
6. No sucesso, a pessoa volta para a home (`/?cadastro=sucesso`) e ve a confirmacao: `Cadastro enviado com sucesso. A equipe Candy vai analisar seus dados e entrar em contato.`
7. Admin ou Teacher abre `/ava/admin?task=aceitar-alunos` ou `/ava/teacher?task=aceitar-alunos`, revisa os dados e pode marcar `em analise`, recusar ou aceitar.
8. Ao aceitar, a action protegida cria apenas `User.role=STUDENT`, cria `StudentProfile` com os dados preenchidos, exige senha inicial digitada por Admin/Teacher e muda a solicitacao para `APPROVED`, exibida na UI como `Convertido em aluno`. O campo minimizado `Contexto Catty`, quando preenchido, grava uma memoria pessoal inicial segura do aluno em `CattyUserMemory`.
9. Quando uma Teacher aceita o aluno, o sistema tambem cria o vinculo `StudentTeacherAssignment` com essa teacher; Admin aceita sem vinculo automatico e pode vincular depois.

### Admin

1. Admin abre `/ava/admin`.
2. A tarefa padrao e `usuarios`.
3. No painel de usuarios, ve o card Admin XP com nivel, fontes operacionais, trilha infinita e proximas metas de gestao.
4. Admin pode criar usuarios, editar nome/email/telefone principal de alunos, redefinir senhas, ativar/desativar, vincular aluno-teacher, enviar contratos, registrar APIs/senhas, controlar manutencao e gerenciar financeiro. Na criacao de aluno, o campo minimizado `Contexto Catty` permite salvar uma nota pedagogica leve para a memoria pessoal da Catty.
5. Admin revisa pre-cadastros em `Aceitar alunos`, com filtros por pendente, em analise, convertido e recusado.
6. Admin aprova, recusa ou arquiva memorias e feedbacks do Catty Learning Center em `Catty Learning`.
7. Admin usa `Catty dos alunos` para escolher aluno, cadastrar gostos, gerar emojis/sons/bordoes e ver um resumo simples das memorias ativas daquele aluno.
8. Admin ajusta temas, gosto principal, emojis, sons e bordoes por aluno em `Catty dos alunos`; temas ativos entram na Catty, pendentes aguardam revisao, desativados criam preferencia `avoid_*` e arquivados ficam fora do prompt.
9. Quando um tema ainda nao tem artefatos bons, Admin pode clicar em `Enriquecer tema`; o sistema usa cache/provedor configurado para criar uma sugestao revisavel, que so vira artefato ativo depois de aprovacao/edicao humana.
10. Admin tambem tem atalhos para tarefas da area teacher.

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
4. Cria aula interativa e homework interativo por arquivo do Canva, podendo selecionar um aluno, varios alunos ou todos os disponiveis no formulario.
5. Corrige respostas e envia feedback.
6. Ve a area de aula ao vivo em manutencao temporaria e usa mensagens enquanto a integracao de video e revisada.
7. Pode revisar pre-cadastros pendentes/em analise em `Aceitar alunos` e aceitar interessados como alunos `STUDENT` vinculados a sua teacher.
8. Pode sugerir aprendizados e revisar feedbacks visiveis no `Catty Learning`, mas nao aprova memoria global.
9. Pode usar `Catty dos alunos` somente para alunos vinculados, escolhendo aluno, gosto, emojis, sons e bordoes sem acessar alunos de outra teacher.
10. Pode ajustar `Catty dos alunos` somente dos alunos vinculados, aprovando tema seguro como artefato ativo, marcando gosto principal ou marcando como nao usar.
11. Pode pedir enriquecimento de tema para aluno vinculado e revisar a sugestao antes de ativar; nao consegue acessar alunos de outra teacher.

### Student

1. Student entra em `/ava/student`.
2. Se o aluno ainda nao tem foto de perfil, o AVA pode mostrar um popup visual diario com apenas o video em loop e botao de fechar; ao clicar no video, o aluno vai para `/ava/student?task=perfil`. Ele aparece no maximo 1x ao dia por navegador, nao aparece na propria tarefa `Meu perfil` e usa `localStorage` apenas para guardar o dia em que o popup apareceu.
3. No resumo, ve o card Candy XP com nivel, barra amarela de progresso, fontes de XP, proximas metas e roadmap de jogos.
4. Ve aulas, materiais, homework interativo, mensagens, contratos, perfil e o aviso de manutencao temporaria da aula ao vivo.
5. Responde homework online; no modo interativo digita, marca ou desenha sobre o arquivo e o rascunho e salvo automaticamente.
6. Visualiza feedback.
7. Edita dados pessoais permitidos, mas nao o nivel.
8. Pode abrir `Catty aprendendo` para entender que a Catty usa memoria leve com supervisao da equipe, sem ver a tela tecnica de memorias.
9. Nao configura diretamente o estilo da Catty; se quiser mudar um tema ou parar um meme, conversa com a teacher, que ajusta em `Catty dos alunos`.

### Candy XP e jogos

1. O card aparece em `/ava/student?task=resumo`, `/ava/teacher?task=resumo` e `/ava/admin?task=usuarios`.
2. A pontuacao e sincronizada no servidor a partir dos dados que cada role ja pode ver: student usa atividades do proprio aluno, teacher usa alunos/aulas/homeworks/correcoes da sua area, e admin usa indicadores operacionais permitidos.
3. Cada origem de XP vira um `CandyXpEvent` com `sourceKey` unica por usuario; se a mesma homework, feedback, aula, rotina ou missao aparecer de novo, o XP nao duplica.
4. `CandyXpProfile` guarda total, nivel, progresso e streak como cache recalculado pela soma dos eventos.
5. A primeira foto de perfil do student gera um evento `Foto do perfil` de 500 XP com `sourceKey` fixa por perfil; trocar ou reenviar foto depois nao duplica esse bonus.
6. O ranking interno do AVA aparece nos resumos de Student, Teacher e Admin, usando `CandyXpProfile` como resumo cacheado e mostrando apenas nome, foto/avatar, role, nivel, XP total e XP restante de alunos e profs.
7. A ordenacao do ranking e feita no servidor por XP total, nivel, XP mais recente e nome; se o usuario logado for aluno/prof e estiver fora do top exibido, a propria posicao aparece separada.
8. O card `Ranking Candy XP` mostra podium visual para os tres primeiros na primeira pagina e pagina os demais de 10 em 10; paginas seguintes continuam a lista por posicao.
9. O mini card de perfil/XP de Student e Teacher tambem mostra a colocacao pessoal na categoria da propria role: student entre alunos e teacher entre teachers. Usuarios com 0 XP veem incentivo para comecar uma missao em vez de colocacao.
10. A curva de nivel fica em `src/lib/candy-xp.ts`, inspirada no card XP do Wimifarma, mas adaptada para a Candy: requisito inicial menor, crescimento gradual e barra amarela.
11. Niveis sao infinitos por formula: o sistema calcula a meta do proximo nivel com base no numero do nivel, sem lista fixa nem teto artificial.
12. O roadmap mostra a fase atual do XP, missoes, conquistas e temporadas. O card de jogos/spotlight e slot visual preparado para minijogos futuros; ele nao abre jogo executavel nesta fase.
13. `CandyMission` e `CandyMissionAttempt` ja deixam a base pronta para tarefas estilo Duolingo; atividades com historia/PDF ja existem em `/ava/student?task=candy-xp`, mas minijogos executaveis ainda precisam de fase propria.

### Atividades Candy XP

1. Admin abre `/ava/admin?task=candy-xp`.
2. Admin cadastra titulo, descricao, nivel, categoria, XP, status, liberacao para todos ou um aluno especifico e envia PDF/imagem exportado do Canva.
3. Quando o arquivo e PDF, o servidor tenta otimizar com Ghostscript antes de salvar; se a otimizacao falhar ou nao reduzir tamanho, o original e salvo para nao quebrar o fluxo.
4. A atividade principal fica no proprio PDF/imagem; a criacao nova nao exige perguntas manuais separadas.
5. Admin abre o editor dentro do card da atividade e desenha areas de texto, letra/numero, marcar ou desenho sobre o arquivo para todos os alunos liberados.
6. Admin pode excluir uma atividade criada por engano; arquivo, liberacoes, areas, perguntas e respostas saem, mas eventos historicos de XP ja conquistado permanecem no ledger.
7. Aluno abre `/ava/student?task=candy-xp` e ve apenas atividades publicadas e liberadas para ele, organizadas em quadrados de missao com previa curta, status, progresso e XP.
8. Ao escolher um quadrado, a missao selecionada abre abaixo como area de resposta; quando houver areas interativas, o painel reaproveita o mesmo motor de resposta do homework, mas ja aberto para responder.
9. O PDF/imagem abre dentro da missao por `/ava/candy-xp-assets/[activityId]`, sempre com validacao server-side.
10. Quando houver areas interativas, o aluno responde direto sobre o arquivo com autosave.
11. Atividades novas sem perguntas manuais viram `REVIEWED` e concedem XP automaticamente pelo envio preenchido.
12. Atividades antigas com perguntas seguem compativeis: objetivas podem virar `REVIEWED`/`RETURNED` automaticamente, e respostas escritas ficam `SUBMITTED` para correcao manual.
13. Ao aprovar manualmente uma atividade antiga, o admin libera o XP uma unica vez pela `sourceKey` da submissao.

### Contratos

1. Admin ou teacher autorizada envia PDF em `/ava/admin?task=contratos` ou `/ava/teacher?task=contratos`.
2. O arquivo fica em storage privado e e servido por `/ava/contracts/[contractId]` com validacao server-side de sessao e permissao por aluno.
3. Student abre `/ava/student?task=contratos` e visualiza o PDF embutido no proprio AVA; o header `X-Frame-Options=SAMEORIGIN` permite esse preview interno sem liberar embed por sites externos.
4. O aluno tambem pode abrir o contrato em nova aba pela mesma rota protegida.

### Catty

1. Usuario abre a Catty no canto inferior direito do site, login ou paineis do AVA; o launcher fechado e um card quadrado compacto com video local otimizado em loop, sem audio, nome `Catty` pequeno acima do card, enquadramento sem cortar a animacao e poster estatico quando o navegador pede movimento reduzido.
2. Widget identifica apenas contexto leve da tela atual (`area` e `task`) para adaptar titulo, texto de apoio e atalhos de estudo.
3. O `RootLayout` chama `auth()` e passa para a Catty apenas o nome do usuario logado e os `CattyUserArtifact.ACTIVE` do proprio usuario, quando existem; o widget usa o primeiro nome em baloes visuais locais no AVA.
4. Para usuarios logados no AVA, a Catty fechada alterna baloes fofos a cada 10 segundos, com saudacao por horario e, quando houver artefato ativo, nome + gosto do aluno misturados com frases genericas Candy, sem chamar IA. Em mobile menor que tablet (`<768px`), ela mostra no maximo 3 baloes automaticos por rota, mantem o ultimo por poucos segundos e depois esconde o balao.
5. Para visitante sem login no site ou login, a Catty funciona apenas como mascote visual: alterna baloes publicos a cada 10 segundos e, no clique, mostra um aviso pequeno para entrar no AVA ou virar aluno Candy. Em mobile menor que tablet, o mesmo limite de 3 baloes automaticos evita ocupar a tela pequena.
6. Fora do AVA logado, o widget nao abre conversa real, nao envia mensagem para a API e nao chama IA.
7. Quando o usuario logado abre o chat real, o widget chama `GET /api/catty/chat` para carregar historico recente daquele usuario e contexto de tela.
8. Widget envia para `/api/catty/chat` apenas quando o usuario logado no AVA manda uma mensagem real: mensagem atual, historico local recente e contexto leve.
9. A rota chama `auth()` antes de parsear a mensagem; sem sessao ativa e role `ADMIN`, `TEACHER` ou `STUDENT`, retorna 401 amigavel.
10. Para usuario autorizado, a rota valida o payload com Zod, aplica limite simples por IP, mescla o historico persistido com o historico local recente do widget, removendo a mensagem atual e limitando o contexto enviado.
11. Antes de chamar IA ou fallback, `src/lib/catty.ts` detecta uma intencao leve da mensagem, como corrigir frase, pedir uma pergunta de pratica, traduzir frase, explicar palavra, pratica de conversacao, homework, Candy XP, aula/material, mensagem para teacher, criacao de atividade para teacher, feedback para aluno, motivacao, ajuda no AVA, pergunta fora do tema, pedido de codigo/API, pergunta grande, pergunta confusa ou pedido de resposta pronta.
12. Essa intencao vira um pequeno plano de resposta usado tanto no prompt da IA quanto no fallback local; pedidos de pergunta recebem uma pergunta direta pelo tema pedido ou por uma pratica curta, perguntas vagas oferecem uma acao concreta (`pergunta`, `correcao` ou `dica`), correcoes ou traducoes sem frase pedem o texto, frases em ingles com erro comum podem virar correcao direta no formato `Better: ...` + `English tip: ...` + `Em portugues: ...` + pergunta em ingles traduzida, frases simples usam historico curto para manter o tema, juntar gostos com `and` ou completar fragmentos seguros como `chocolate`, `red cars` e `blue cars`, a base `src/lib/catty-scenarios.ts` seleciona ate 4 cenarios por intencao/contexto/historico/memoria para orientar Gemini/OpenAI e tambem serve ao fallback com repertorio curado, preservando o fallback local quando ele corrige, pergunta ou completa fragmentos melhor, aluno travado recebe um passo simples, pedido de resposta pronta e negado com carinho com pista ou exemplo parecido, pergunta fora do tema e puxada para vocabulario/frase curta/conversacao em ingles, pedido de codigo/API nao gera codigo e vira frase/vocabulario, homework sem enunciado pede a pergunta, Candy XP e aula/material recebem orientacao contextual, teacher/admin recebem ajuda para montar atividade curta com frase-alvo, instrucao e forma de resposta, e perguntas grandes devem ser resumidas em partes.
13. A rota deriva do servidor um contexto seguro do usuario com role, primeiro nome e nivel do aluno quando existir; esse contexto so ajusta tom, saudacao, dificuldade do exemplo e uso natural do nome em respostas seguras, sem incluir email, id, senha, contratos, pagamentos, documentos ou credenciais.
14. Somente as 8 mensagens recentes entram no prompt; a UI carrega ate 120 mensagens recentes e o banco pode reter ate 50.000 mensagens por usuario/contexto para preservar anos de estudo sem aumentar custo de IA.
15. A rota usa Gemini quando `GEMINI_API_KEY` existe.
16. Se a mensagem chama Catty pelo nome, incluindo `Catty`, `catty` ou `/catty`, a rota tenta OpenAI Responses API antes de Gemini, desde que `OPENAI_API_KEY` exista.
17. Sem chave, erro de API, resposta vazia, resposta cortada, resposta generica demais, resposta fora da personalidade ou resposta especializada indevida fora do escopo Candy English, a Catty usa o fallback local autorizado com orientacoes de estudo, homework, aula ao vivo e pratica simples em ingles.
18. A troca final do usuario logado e gravada em `CattyConversation`/`CattyMessage`; visitante sem login nao grava historico.
19. A rota busca em `CattyLearningItem` somente itens `APPROVED`, pontua candidatos por intencao, categoria, tags e termos da mensagem, escolhe ate 3 aprendizados relevantes e adiciona esse resumo curto ao prompt como memoria aprovada, sem conversa inteira.
20. A rota busca candidatos `CattyUserMemory.ACTIVE` somente do proprio `session.user.id`, pontua por intencao, termos da mensagem, confianca, uso e recencia, e adiciona ao prompt ate 5 memorias pessoais seguras. Entre essas memorias pode existir `NOTE/contexto_catty`, criada no cadastro ou aceite do aluno por Admin/Teacher, para dar contexto pedagogico inicial quando a Catty ainda nao aprendeu muito sobre a pessoa.
21. O contexto pessoal limita o peso da memoria: ate 2 dificuldades de aprendizado e ate 2 interesses/temas favoritos entram no resumo, e a regra enviada para Gemini/OpenAI manda ignorar memoria que nao combine com a pergunta.
22. A partir dessas memorias e dos artefatos ativos em `CattyUserArtifact`, `src/lib/catty-artifacts.ts` pode sugerir um unico artefato de personalidade por resposta, como carros, capivara, Pokemon, princesa/contos de fadas, futebol, games ou tema customizado aprovado, com emoji, som, mini-bordao ou exemplo curto. Configuracoes ativas do painel `Catty dos alunos` tem prioridade sobre os temas padrao, e `isPrimary` adiciona prioridade leve quando o gosto combina naturalmente.
23. A sugestao entra no prompt, no retorno final da IA e no fallback somente quando combina com a intencao, usa o historico recente da Catty para evitar repetir o mesmo bordao/emoji em sequencia, registra `usageCount/lastUsedAt` do artefato customizado usado e uma memoria `STYLE/avoid_*` bloqueia o tema se o usuario pedir para parar.
24. Depois da resposta, a rota pode detectar declaracoes explicitas e seguras do proprio usuario, como `gosto de capivara`, `tenho dificuldade com do/does` ou `prefiro exemplos com jogos`, e salvar resumo curto em `CattyUserMemory` com evento em `CattyMemoryEvent`; se a mensagem contradiz memoria ativa, como `nao gosto mais de capivara`, a memoria e marcada como `FLAGGED`, nao apagada automaticamente. Se a mensagem pede para parar de usar um tema, a Catty salva uma preferencia de estilo para evitar aquele artefato.
25. Gemini e OpenAI recebem o mesmo contexto curto de memoria aprovada global, memoria pessoal relevante do proprio usuario, artefato sugerido quando houver, variacao recomendada e elementos recentes a evitar; se falharem, o fallback local pode usar uma resposta ideal aprovada do Learning Center, um toque leve da memoria pessoal e um artefato discreto quando a intencao combina e a resposta passa pelos filtros de seguranca.
26. Admin/Teacher acessam `Catty dos alunos` conforme permissao: Admin ve todos os alunos e Teacher ve alunos vinculados. Student ve apenas uma tela informativa `Catty aprendendo`; memorias `FLAGGED` e `ARCHIVED` nao entram no prompt.
27. Em `Catty dos alunos`, a equipe pode ativar, editar, marcar gosto principal, marcar como nao usar, arquivar temas por aluno e ver o resumo simples de memoria ativa do aluno selecionado.
28. Admin/Teacher podem pedir `Enriquecer tema` quando um interesse ainda nao tem emojis, sons, bordoes ou exemplos bons. `src/lib/catty-artifact-enrichment.ts` valida permissao, bloqueia tema sensivel, consulta cache por provedor/tema/label e, se necessario, usa o provedor configurado para buscar contexto curto fora do chat normal.
29. O enriquecimento cria `CattyArtifactEnrichment.READY_FOR_REVIEW` com resumo seguro, fontes resumidas, vocabulario, emojis, sons, bordoes, exemplos, baloes e cautelas. Nada disso entra no prompt/fallback enquanto nao for aprovado.
30. Admin/Teacher podem editar a sugestao antes de aprovar; a aprovacao cria ou atualiza `CattyUserArtifact.ACTIVE`. Sugestoes recusadas ou arquivadas ficam registradas e fora da Catty.
31. A tela mostra alertas quando ha sugestao pendente, possivel dado sensivel, repeticao recente de um elemento do artefato ou historico da Catty ficando pesado; Admin/Teacher podem corrigir o tema sem mexer no codigo e limpar historico pesado pela area de memoria.
32. A tela de memoria mostra alertas quando um usuario tem contexto pesado, memorias contraditorias, possivel dado sensivel ou muitos itens antigos sem uso; Admin/Teacher podem limpar historico de conversa manualmente.
33. Cada resposta persistida da Catty pode receber microfeedback no widget: gostei, nao gostei, resposta confusa ou deveria responder assim.
34. O feedback chama server action protegida, valida que a mensagem pertence ao usuario logado, copia apenas pergunta/resposta resumidas, bloqueia termos sensiveis e cria `CattyLearningFeedback.PENDING`.
35. Admin/Teacher veem a fila em `Catty Learning`; Admin pode editar e aprovar como memoria global, Teacher pode editar e sugerir aprendizado pendente, e feedback recusado/arquivado nao entra no prompt.
36. A rota tambem pode criar `CattyLearningFeedback.PATTERN_SUGGESTION` pendente quando usa fallback sem memoria relevante, quando uma mensagem confusa/fora do trilho nao tem memoria aprovada relacionada ou quando ha muitos feedbacks negativos recentes na mesma intencao; essa sugestao e apenas fila de revisao e nao muda o comportamento oficial ate aprovacao.
37. A identidade viva fica em `src/lib/catty-personality.ts`: `CATTY_PERSONALITY_GUIDE`, `CATTY_PERSONALITY_USAGE_RULES` e `CATTY_SCOPE_GUIDE` formam `CATTY_BRAIN_RULES`; Catty e uma gatinha mascote-professora da Candy, usa expressoes como `Miauw`, `Awnn`, `Uwau`, `Pss pss`, `Nya`, `Catty mode on` e `Bora estudar`, pode usar humor/meme leve e ate dois emojis permitidos quando combinar, mas nao responde como especialista generica fora do estudo de ingles/AVA.
38. Quando o usuario escreve em ingles, a resposta deve vir em ingles simples com apoio em portugues quando houver pratica: toda pergunta em ingles recebe traducao curta no formato `Question? = traducao`, e toda correcao explica em ingles e portugues. Em portugues, a resposta deve ficar em portugues brasileiro, exceto quando a pratica pedir pergunta/frase em ingles com traducao.
39. Em homework e aula interativa, Catty ajuda a entender o enunciado, dar pistas e criar exemplos parecidos, mas nao entrega a resposta final.
40. Os baloes publicos, respostas de bloqueio, abertura inicial e frases por situacao tambem saem de `src/lib/catty-personality.ts`; os baloes logados podem ser compostos em `src/lib/catty-artifact-balloons.ts` com artefatos ativos do proprio usuario, mantendo anti-repeticao local e sem chamar IA.
41. O banco de exemplos em `src/lib/catty-examples.ts`, o repertorio em `src/lib/catty-scenarios.ts` e a documentacao `docs/catty-comportamento.md` registram respostas ruins e ideais para casos como receita, codigo/API, homework, teacher, admin, motivacao, vocabulario e situacoes de estudo; o smoke `npm run audit:catty-behavior` valida que a classificacao, o fallback, os 52 cenarios, a checklist de 20 fallbacks por cenario, 20 interacoes de pergunta/correcao/fragmento, os 10 casos obrigatorios de Catty bilingue, pelo menos 40 correcoes comuns, as 6 sequencias de conversa continua, o uso de no maximo um bordao, o limite de emojis, a personalizacao por primeiro nome seguro, memoria aprovada, memoria pessoal segura, artefato padrao/customizado, schemas de enriquecimento e o gatilho OpenAI/Gemini continuam alinhados.

### Aula ao vivo

1. A area esta em manutencao temporaria por `LIVE_CLASS_MAINTENANCE_ENABLED` em `src/lib/live-class.ts`.
2. Teacher abre `/ava/teacher?task=aula-ao-vivo` e ve apenas o card objetivo `Em manutencao.`, sem formulario, status extra ou textos auxiliares.
3. Student abre `/ava/student?task=aula-ao-vivo` e ve o mesmo card objetivo de manutencao, sem tentativa de carregar Jitsi.
4. `createLiveSession` e `toggleLiveSession` continuam validando login/role no servidor e depois retornam a mensagem de manutencao, sem gravar alteracoes.
5. Ao reativar, o fluxo previsto volta a permitir teacher, aluno ou turma geral, titulo, link externo opcional e datas opcionais no bloco superior.
6. Se o link externo ficar vazio, o AVA cria automaticamente uma sala Jitsi Meet embutida usando o dominio configurado em `NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN`.
7. Se o link for Google Meet, a sala fica registrada e abre em nova aba; se for um dominio Jitsi aceito pelo AVA, o AVA tenta embutir a sala.
8. A sala ativa aparece abaixo das opcoes, com o video centralizado como superficie principal.

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
6. A homework nasce sem campos automaticos: a teacher escolhe o tipo de area (`Texto`, `Letra/Num`, `Marcar` ou `Desenho`) e desenha diretamente sobre o PDF/imagem.
7. Teacher pode mover, redimensionar, excluir uma area selecionada ou limpar todas as areas antes de salvar; o editor mostra uma previa do `x`, da letra pequena, do texto exemplo ou da area de desenho para facilitar o posicionamento exato.
8. Teacher ou admin pode excluir uma homework interativa na lista de criacao; a exclusao remove campos, perguntas, respostas e a aula interna automatica quando ela ficou vazia.
9. Student abre `/ava/student?task=homeworks`, clica no bloco recolhido e responde sobre o arquivo renderizado na proporcao original; PDFs aparecem pagina a pagina, campos `Letra/Num` aparecem como caixinha pequena centralizada, campos de texto mostram guias discretas e checkbox/desenho aparecem apenas quando recebem marca ou traco.
10. Em areas `DRAWING`, o aluno pode desenhar com mouse ou dedo e desfazer o ultimo traco sem limpar todo o desenho.
11. Enquanto edita, a submissao fica `DRAFT`; o autosave grava em segundo plano sem recarregar a pagina inteira e o navegador mantem uma copia local temporaria para proteger contra refresh ou falha de rede. Ao clicar em entregar, a tela cancela o autosave pendente, envia os valores atuais, vira `SUBMITTED` e aparece para teacher/admin como evento novo.
12. Teacher ou admin corrige em uma tela com abas: `Aguardando correcao` para `SUBMITTED` e `Corrigidos` para `REVIEWED`/`RETURNED`.
13. Cada entrega da fila fica recolhida por padrao; ao abrir, o PDF/imagem aparece com texto, marcas e desenhos entregues pelo aluno sobrepostos ao arquivo.
14. Teacher/admin pode usar caneta ou texto diretamente sobre o arquivo entregue, com autosave e botao manual de salvar. Essa camada fica em `HomeworkSubmission.teacherAnnotations`, separada das respostas e invisivel para student enquanto a entrega ainda esta `SUBMITTED`.
15. No painel lateral da entrega aberta ficam aluno, professor responsavel, aula e nota/feedback para o aluno; `Liberar refazer` tambem aceita feedback opcional para explicar o ajuste.
16. A avaliacao salva a entrega como `REVIEWED` e aparece para o aluno; a acao de refazer salva `RETURNED`, mostra feedback/anotacoes para o aluno e libera nova tentativa. Quando o aluno entrega novamente, feedback e anotacoes antigas sao limpos.

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
- Candy XP deve continuar sem ranking publico; o ranking interno do AVA so aparece para usuario logado, nao mostra email, telefone, documento, pagamento ou contrato, e usa apenas alunos/profs com XP persistido.
- Toda nova tarefa que conceder XP deve gravar por server action/rota protegida e usar `sourceKey` estavel para evitar abuso ou pontuacao duplicada.
- Atividades Candy XP so podem ser criadas/editadas/excluidas/corrigidas por `ADMIN`; `STUDENT` acessa apenas atividades publicadas e liberadas para o proprio perfil.
- Arquivos Candy XP devem ser servidos apenas por `/ava/candy-xp-assets/[activityId]`, nunca por caminho direto do storage.
- Otimizacao de PDF dos uploads pedagogicos protegidos deve acontecer apenas no servidor e nunca pode expor arquivo fora das rotas protegidas.
- Respostas escritas de Candy XP nao devem liberar XP automatico; precisam de revisao manual.
- Areas interativas Candy XP podem liberar XP automaticamente quando obrigatorias estiverem preenchidas e nao houver pergunta antiga manual pendente; `LISTENING` ainda nao faz parte do Candy XP.
- Homework corrigida nao deve ser reenviada.
- A interface de criacao nova de homework deve usar o modo interativo; homework simples fica apenas como legado de dados antigos.
- A interface de criacao nova de aula usa o mesmo fluxo interativo de PDF/imagem por enquanto, criando uma aula real com atividade interativa vinculada que aparece em `Aulas e Materiais`, nao em `Responder homework`.
- Excluir homework interativa exige permissao server-side de admin ou teacher dona da homework.
- Draft de homework interativo nao deve aparecer como resposta entregue para teacher.
- Arquivo de homework interativo deve ser acessado apenas por admin, teacher dona da aula ou aluno dono da homework.
- Aula ao vivo esta temporariamente pausada por manutencao. Quando reativada, usa Jitsi embutido se nao houver link externo; a configuracao fica acima e o video deve ficar centralizado abaixo.
- `meet.jit.si` publico exige conta para quem cria sala e nao deve ser tratado como embed de producao; para teacher/aluno sem conta Jitsi, usar dominio Jitsi dedicado/JaaS configurado no ambiente.
- Catty nao deve solicitar senhas, chaves, documentos sensiveis ou prometer alterar dados internos; problemas de acesso, contratos, pagamentos e cadastro devem ser encaminhados para Candy, teacher ou admin.
- Catty nao deve responder como especialista generica em receita, codigo, API tecnica, financas, saude, direito ou temas aleatorios; quando o assunto foge do ingles/AVA, ela deve transformar em vocabulario, frase curta ou conversacao em ingles.
- Catty pode usar `area` e `task` da URL para orientar atalhos, historico recente e linguagem, e pode usar role, primeiro nome e nivel do aluno derivados no servidor apenas como contexto seguro; o nome nao deve aparecer em assunto sensivel e a Catty nao pode responder usuario sem sessao valida nem receber registros internos, respostas salvas, contratos, pagamentos ou credenciais.
- Catty pode usar `CattyUserMemory.ACTIVE` apenas do proprio usuario como personalizacao leve; `TEACHER` so acessa memoria de aluno vinculado e `ADMIN` supervisiona, mas a rota de resposta sempre filtra pelo `session.user.id`. `FLAGGED`, `ARCHIVED` e `PENDING` nao entram no prompt da resposta.
- Catty Learning Center nunca deve aprender automaticamente com qualquer usuario; feedback do widget vira fila pendente, Teacher/Admin sugerem, apenas Admin aprova memoria global, e itens com dados sensiveis devem ser recusados.
- Enriquecimento de artefato da Catty nunca deve rodar durante o chat normal; ele acontece apenas no fluxo Admin/Teacher de preparacao/revisao, usa cache e so ativa um tema apos aprovacao/edicao humana.
- APIs e senhas so podem ser acessadas por `ADMIN`; o painel nunca deve importar `DATABASE_URL`, `AUTH_SECRET`, senhas do Postgres ou senha seed do admin.
- Mensagem teacher/aluno exige vinculo.
- Contratos e avatar exigem sessao.
- Edicao rapida de nome/email/telefone de aluno na tela `Usuarios` exige `ADMIN` no servidor e so aceita usuarios `STUDENT`.
- Agenda e financeiro sao internos do admin.

## Decisoes tecnicas tomadas

- O fluxo `/ava` nao exibe cards publicos; ele redireciona.
- Login Google esta desativado nesta fase; o AVA usa email/senha pelo Credentials Provider.
- Alertas visuais da sidebar usam assinaturas por modulo e localStorage no navegador.
- Financeiro usa estrutura recorrente por aluno com snapshots mensais para preservar historico fechado.
- Agenda usa ocorrencias por data para facilitar presenca e reposicao.
- Homework e aula interativa usam arquivo protegido, renderizacao fiel do PDF/imagem e campos percentuais desenhados manualmente por pagina.
- Catty usa IA opcional via rota server-side protegida por `auth()`, mantendo fallback local apenas para usuario autorizado em ambientes sem `GEMINI_API_KEY`/`OPENAI_API_KEY`, com atalhos de estudo, resposta contextual por tela, historico persistente por usuario/contexto e prompt curto.
- Catty Learning Center adiciona memoria aprovada e curta ao prompt/fallback sem virar RAG automatico nem coletar conversa inteira.
- Catty User Memory adiciona memoria pessoal curta por usuario, com status ativo/pendente/flagged/arquivado, eventos de auditoria e bloqueio conservador de termos sensiveis.
- Catty Memory Management adiciona uma tarefa simples em Admin/Teacher para listar, filtrar, corrigir, arquivar, aprovar, marcar erro, remover dado sensivel e limpar historico pesado da Catty conforme permissao. Student ve apenas a explicacao leve `Catty aprendendo`.
- Catty User Artifacts adiciona a tarefa `Catty dos alunos` em Admin/Teacher para configurar temas, gosto principal, emojis, sons e bordoes por aluno sem alterar codigo; somente status `ACTIVE` entra no prompt/fallback.
- Catty Artifact Enrichment adiciona cache e fila revisavel para gerar sugestoes de artefatos por interesse; busca web e opcional, configuravel e nunca entra direto na resposta do aluno.
- O cofre admin criptografa valores sensiveis no servidor e usa `ADMIN_CREDENTIALS_SECRET` ou `AUTH_SECRET` como chave de protecao.
- Candy XP fica nos paineis admin, teacher e student como gamificacao persistente e prepara a base de jogos/missoes sem alterar o fluxo de aula/homework.
- Atividades Candy XP usam modelos proprios para historia/PDF/envio/progresso, preservam perguntas antigas quando existirem e reaproveitam o ledger Candy XP para pontuar conclusoes.
- Areas Candy XP usam `CandyXpActivityInteractiveField` e respostas em `CandyXpActivitySubmission.answers` para manter a mesma submissao por aluno/atividade.
- Pre-cadastros usam a mesma tabela `StudentPreRegistration`; os status existentes sao traduzidos na UI como pendente, em analise, convertido em aluno e recusado.

## Riscos ao alterar esta parte

- Mudar task ids quebra links profundos.
- Mostrar mais de uma tarefa grande por tela pode poluir o AVA.
- Remover validacao server-side pode vazar dados.
- Alterar bloqueio de manutencao pode impedir admins/teachers de operar.
- Enviar dados do AVA para a Catty sem necessidade pode criar risco de privacidade; manter a rota limitada ao texto digitado no widget, historico recente da propria Catty, contexto leve de `area`/`task`, memoria aprovada sem dados sensiveis, memoria pessoal ativa do proprio usuario e contexto seguro minimo de role, primeiro nome e nivel do aluno, sem usar nome em senha, contrato, pagamento, documento, chave, token ou credencial.
- Salvar memoria pessoal ampla demais ou sem filtro pode vazar preferencia/dificuldade de aluno; manter resumo curto, status `ACTIVE` somente para itens seguros e bloqueio de telefone, endereco, documento, pagamento, contrato, email, token e chaves.
- Usar busca web para tema da Catty sem revisao pode trazer contexto errado ou inadequado; manter o resultado como sugestao curta, cacheada e revisavel, sem copiar texto longo e sem ativar antes de Admin/Teacher aprovar.
- Revelar credenciais na tela deve ser uma acao consciente do admin; nao adicionar exibicao automatica nem logs do valor em claro.
- Alterar resposta correta de atividade Candy XP publicada pode mudar o criterio de novas tentativas; manter cuidado com atividades ja respondidas.
- Misturar `LISTENING` de homework em Candy XP antes de criar actions/rotas proprias pode quebrar audio/OCR e assets protegidos.

## Pendencias

- Edicao/delecao completa de aulas e materiais ainda nao existe; aula/homework interativa ja podem ser excluidas nas telas de criacao.
- Upload livre de materiais fora dos fluxos interativos e editor Word embutido ainda nao existem.
- Notificacoes por email/WhatsApp ainda nao existem.
- Exportacao de respostas Candy XP e liberacao em lote para multiplos alunos especificos ainda nao existem.
- Listening interativo proprio do Candy XP ainda nao existe.

## Como pode evoluir

- Adicionar importacao em massa de alunos.
- Expandir homework para multiplas perguntas e anexos.
- Criar auditoria administrativa mais ampla.
