# 02 - Banco de Dados

## O que esta parte do sistema faz

Este documento descreve o banco PostgreSQL e o schema Prisma atual. Deve ser atualizado sempre que `prisma/schema.prisma` ou `prisma/migrations/` mudar.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`
- `prisma.config.ts`
- `src/generated/prisma/`
- `src/lib/prisma.ts`
- `docker-compose.yml`

Servicos:

- `postgres`: banco PostgreSQL 17.
- `migrate`: aplica migrations com `prisma migrate deploy`.
- `seed`: cria ou atualiza o admin inicial.

## Modelos atuais

Perfis e auth:

- `User`
- `StudentProfile`
- `StudentPreRegistration`
- `TeacherProfile`
- `LoginAttempt`

Relacionamentos escolares:

- `StudentTeacherAssignment`
- `Lesson`
- `LessonMaterial`
- `VocabularyItem`
- `Homework`
- `HomeworkStudentAssignment`
- `HomeworkQuestion`
- `HomeworkInteractiveField`
- `HomeworkSubmission`

Operacao do AVA:

- `LiveSession`
- `ContractDocument`
- `CattyConversation`
- `CattyMessage`
- `CattyLearningItem`
- `CattyLearningFeedback`
- `CattyUserMemory`
- `CattyMemoryEvent`
- `CattyUserArtifact`
- `CattyArtifactEnrichmentCache`
- `CattyArtifactEnrichment`
- `ChatThread`
- `ChatMessage`
- `AppSetting`
- `SitePageContent`
- `AdminCredential`

Gamificacao Candy XP:

- `CandyXpProfile`
- `CandyXpEvent`
- `CandyBadgeDefinition`
- `CandyUserBadge`
- `CandyMission`
- `CandyMissionAttempt`
- `CandyXpActivity`
- `CandyXpActivityInteractiveField`
- `CandyXpActivityQuestion`
- `CandyXpActivityAssignment`
- `CandyXpActivitySubmission`

Financeiro:

- `FinancialStudent`
- `FinancialPayment`
- `FinancialLog`

Agenda:

- `AgendaStudent`
- `AgendaLesson`
- `AgendaLog`

Enums:

- `Role`
- `StudentPreRegistrationStatus`
- `LessonStatus`
- `MaterialType`
- `HomeworkStatus`
- `HomeworkKind`
- `HomeworkFieldType`
- `SubmissionStatus`
- `AgendaLessonStatus`
- `AdminCredentialKind`
- `AdminCredentialSource`
- `CattyMessageRole`
- `CattyReplySource`
- `CattyLearningCategory`
- `CattyLearningStatus`
- `CattyLearningFeedbackKind`
- `CattyUserMemoryCategory`
- `CattyUserMemorySource`
- `CattyUserMemoryStatus`
- `CattyUserArtifactStatus`
- `CattyArtifactEnrichmentStatus`
- `CandyXpEventKind`
- `CandyMissionKind`
- `CandyXpActivityStatus`
- `CandyXpQuestionType`
- `CandyXpSubmissionStatus`

## Regras de negocio que precisam ser preservadas

- `User.email` e unico.
- `StudentPreRegistration.email` e unico e guarda solicitacoes operacionais; nao cria acesso ao AVA ate uma action protegida converter em `User.role=STUDENT`.
- `StudentPreRegistration.reviewedByUserId`, `reviewedAt`, `convertedUserId` e `statusNote` registram revisao/conversao sem armazenar senha inicial.
- `User.sessionVersion` invalida sessoes JWT antigas quando o admin desativa/reativa usuario, redefine senha ou quando uma mudanca de role for detectada.
- `StudentProfile.userId` e `TeacherProfile.userId` sao 1:1 com `User`.
- `StudentTeacherAssignment` possui chave unica por teacher/aluno.
- `HomeworkSubmission` possui chave unica por homework/aluno.
- `Homework.kind=TEXT` preserva homework simples; `Homework.kind=INTERACTIVE` habilita arquivo e campos sobre o arquivo.
- `Homework.fieldDetectionSource=manual` identifica homework interativo criado pela aba de homework; `lesson-manual` identifica aula interativa criada pela aba de aula usando o mesmo motor.
- `Homework.replicatedFromHomeworkId` identifica copias criadas pelo fluxo `Replicar para outro aluno`. Cada replica cria `Lesson` e `Homework` proprios para o aluno alvo, copia perguntas e `HomeworkInteractiveField`, reutiliza o arquivo pedagogico otimizado quando possivel e mantem `HomeworkSubmission` isolada por aluno.
- `HomeworkStudentAssignment` permanece no schema por compatibilidade com a migration anterior, mas o fluxo atual de `Criar/Ver Homework` nao cria novo acesso compartilhado; a permissao do aluno deve vir de `Lesson.studentProfileId` da copia real.
- `HomeworkInteractiveField` guarda tipo, pagina e posicoes percentuais do campo no arquivo e deve ser substituido em lote apenas por teacher dona da aula ou admin.
- `HomeworkFieldType` aceita `TINY_TEXT`, `SHORT_TEXT`, `LONG_TEXT`, `CHECKBOX`, `DRAWING` e `LISTENING`; `TINY_TEXT` guarda respostas curtas normalizadas para letras/numeros, `DRAWING` salva tracos normalizados no JSON de `HomeworkSubmission.answers`, e `LISTENING` guarda o texto a ouvir no `placeholder` do campo sem exigir nem salvar resposta do aluno.
- `HomeworkSubmission.teacherAnnotations` guarda a camada visual de correcao da teacher/admin em JSONB, separada das respostas do aluno e do arquivo original. Ela pode conter tracos e textos por pagina, aparece para o aluno apenas em `RETURNED` ou `REVIEWED` e e limpa quando o aluno envia nova tentativa oficial.
- Excluir um `Homework` remove `HomeworkInteractiveField`, `HomeworkQuestion` e `HomeworkSubmission` por cascade; a UI deve validar role/dono antes da exclusao.
- `SubmissionStatus.DRAFT` e autosave do aluno e nao deve disparar evento novo para teacher/admin; `SUBMITTED` e entrega, `RETURNED` e refazer liberado, `REVIEWED` e correcao final.
- Contratos podem ser gerais ou vinculados a um aluno.
- Chat deve sempre estar preso ao vinculo teacher/aluno.
- Financeiro guarda cadastro/base em `FinancialStudent` e snapshots mensais ativos/inativos em `FinancialPayment`.
- `FinancialLog` deve manter historico simples mesmo se um aluno financeiro for excluido.
- Agenda guarda alunos em `AgendaStudent`, ocorrencias de aula em `AgendaLesson` e log operacional em `AgendaLog`.
- Reposicoes da agenda usam `AgendaLesson.isMakeup=true` e podem apontar para a aula original por `makeupForLessonId`.
- `AdminCredential` guarda registros admin de APIs/senhas com `secretCiphertext`, `secretDigest` e `secretPreview`; o valor em claro nunca deve ser gravado.
- `AdminCredential.source=ENV` identifica credenciais sincronizadas de integracoes externas do `.env`; a UI nao deve permitir excluir ou alterar o valor sensivel desses registros pelo banco.
- `AdminCredential.sourceKey` e unico para evitar duplicar a mesma variavel de ambiente.
- `CattyConversation` guarda historico da Catty apenas para `User` autenticado, separado por `contextKey` de area/tarefa.
- `CattyMessage` guarda mensagens do usuario e da Catty com origem opcional da resposta (`GEMINI`, `OPENAI` ou `FALLBACK`); o app pode reter ate 50.000 mensagens por conversa para acompanhar anos de estudo, mas carrega apenas uma janela recente na UI e envia somente 8 mensagens para IA.
- `CattyLearningItem` guarda memorias controladas da Catty, como regra de personalidade, resposta ideal/ruim, vocabulario, duvida comum, exemplo de homework, orientacao teacher/aluno, bordao, correcao aprovada ou contexto Candy English.
- `CattyLearningItem.status=APPROVED` e o unico status usado no prompt/fallback da Catty; `PENDING`, `REJECTED` e `ARCHIVED` ficam apenas para revisao operacional.
- `CattyLearningFeedback` registra feedback discreto do chat da Catty (`LIKED`, `DISLIKED`, `CONFUSING`, `SHOULD_ANSWER` ou `PATTERN_SUGGESTION`), com pergunta/resposta resumidas, sugestao ideal opcional, contexto leve e vinculo opcional ao `CattyMessage`.
- `PATTERN_SUGGESTION` tambem pode ser criado automaticamente como fila pendente quando a Catty usa fallback sem memoria relevante, recebe mensagem confusa/fora do trilho sem memoria aprovada ou acumula feedbacks negativos recentes; ele nao vira memoria global nem entra no prompt antes de revisao/aprovacao.
- Feedback aprovado por Admin pode virar `CattyLearningItem.APPROVED`; feedback sugerido por Teacher vira aprendizado pendente para aprovacao global.
- `CattyUserMemory` guarda memoria pessoal por `User.id`, como interesse, objetivo, dificuldade, estilo, tema favorito, preferencia de emoji ou nota pedagogica leve.
- `CattyUserMemory.status=ACTIVE` e o unico status usado no prompt da Catty; `PENDING`, `FLAGGED` e `ARCHIVED` nao entram nas respostas. Mensagens contraditorias, como o usuario negar uma preferencia antiga, devem marcar a memoria como `FLAGGED` para revisao, nunca apagar automaticamente.
- `CattyUserMemory.userId + category + key` e unico para evitar duplicar a mesma preferencia do mesmo usuario; memorias pessoais nunca sao compartilhadas entre alunos.
- `CattyUserMemory.NOTE` com key `contexto_catty` pode ser semeada no cadastro direto de aluno ou no aceite de pre-cadastro, criando uma memoria inicial curta para a Catty usar quando ainda nao houver contexto suficiente do aluno.
- `CattyMemoryEvent` registra criacao, atualizacao, mudanca de status, correcao, conflito marcado, remocao de dado sensivel e sugestao de limpeza da memoria pessoal sem salvar conversa inteira.
- Memoria pessoal da Catty deve ser resumo curto e nao pode conter senha, pagamento, contrato, documento, telefone, endereco, email, token, chave/API, pix, cartao ou dado privado.
- `CattyUserArtifact` guarda temas configuraveis por usuario para a Catty usar como artefato de personalidade: tema, label, emojis permitidos, bordoes, sons, exemplo curto, regra de tom, status, marcador `isPrimary`, uso recente e autores de criacao/alteracao.
- `CattyUserArtifact.status=ACTIVE` e o unico status que entra no prompt/fallback; `PENDING` fica aguardando aprovacao, `DISABLED` bloqueia o tema para aquele usuario e `ARCHIVED` preserva historico sem uso.
- `CattyUserArtifact.userId + themeId` e unico para evitar varios cadastros do mesmo tema no mesmo aluno. `isPrimary=true` marca o gosto principal daquele aluno e ganha prioridade leve no contexto; quando outro tema vira principal, os demais do mesmo usuario sao desmarcados. Admin pode gerenciar todos e Teacher apenas alunos vinculados. Student nao acessa a tela tecnica de artefatos.
- Artefatos da Catty nao podem conter senha, pagamento, contrato, documento, telefone, endereco, email, token, chave/API ou tema sensivel/inadequado. Quando um tema fica ativo, a helper tambem sincroniza memoria `FAVORITE_THEME/artifact_*`; quando fica desativado, sincroniza `STYLE/avoid_*`.
- `CattyArtifactEnrichmentCache` guarda sugestoes cacheadas por provedor/tema/label para evitar pesquisar o mesmo interesse repetidamente. O cache salva apenas resumo curto, arrays de emojis/sons/bordoes/exemplos, vocabulario curto, cautelas e fontes resumidas; nao deve guardar textos longos copiados da internet.
- `CattyArtifactEnrichment` guarda a fila de enriquecimento de temas para um usuario alvo. `READY_FOR_REVIEW`/`PENDING`/`FAILED` ficam aguardando revisao, `APPROVED` registra aprovacao e vinculo ao `CattyUserArtifact`, `REJECTED` e `ARCHIVED` ficam fora da Catty.
- Enriquecimento de artefato nunca e usado no chat normal antes de aprovacao humana. Admin/Teacher podem pedir sugestao no painel `Catty dos alunos`; Student nao aciona enriquecimento, aprovacao ou configuracao de artefato.
- Se o provedor externo falhar ou estiver desativado, a fila ainda pode receber uma sugestao generica segura com `failureReason`, para nao travar o fluxo operacional.
- `CandyXpEvent` e o ledger historico de XP; cada evento possui `sourceKey` e a chave unica `userId + sourceKey` impede duplicar XP pela mesma origem.
- `CandyXpProfile` e cache calculado do total, nivel, progresso e streak; a fonte de verdade continua sendo a soma de `CandyXpEvent`.
- `CandyBadgeDefinition` guarda criterios simples de badge por role, nivel, streak ou contagem de evento; `CandyUserBadge` possui chave unica por usuario/badge.
- `CandyMission` e o catalogo base para tarefas estilo Duolingo; `CandyMissionAttempt.attemptKey` evita repetir a mesma tentativa/evento de jogo no futuro.
- `CandyXpActivity` guarda historias/atividades com titulo, descricao, nivel, categoria, XP, status e metadados do PDF/imagem do Canva.
- `CandyXpActivityInteractiveField` guarda areas editaveis sobre o PDF/imagem Candy XP, com tipo, pagina, coordenadas percentuais, obrigatoriedade e ordenacao; ele reutiliza `HomeworkFieldType`, mas a UI/action de Candy XP aceita apenas `TINY_TEXT`, `SHORT_TEXT`, `LONG_TEXT`, `CHECKBOX` e `DRAWING` nesta fase.
- `CandyXpActivityQuestion` guarda perguntas ordenadas e configuracao em JSON para alternativas, respostas corretas e pares de matching.
- `CandyXpActivityAssignment` libera uma atividade para alunos especificos; quando uma atividade publicada nao possui assignments, ela fica liberada para todos os alunos ativos.
- `CandyXpActivitySubmission` guarda progresso individual por aluno, respostas em JSON, status, nota automatica/manual, feedback, revisor e XP concedido.
- `CandyXpActivitySubmission` possui chave unica por atividade/aluno; `DRAFT` e progresso salvo, `SUBMITTED` aguarda correcao manual, `RETURNED` libera refazer e `REVIEWED` conclui a atividade.
- Respostas de campos interativos Candy XP ficam em `CandyXpActivitySubmission.answers`, usando o ID do campo como `questionId`; isso preserva o fluxo unico de rascunho/envio da atividade.
- Atividades Candy XP concedem XP pelo ledger `CandyXpEvent` com origem `CANDY_XP_ACTIVITY_COMPLETED` e `sourceKey` por submissao, evitando pontos duplicados.
- Excluir `CandyXpActivity` remove `CandyXpActivityInteractiveField`, `CandyXpActivityQuestion`, `CandyXpActivityAssignment` e `CandyXpActivitySubmission` por cascade; a action administrativa tenta remover o arquivo fisico e nao apaga `CandyXpEvent`, preservando XP historico.

## Decisoes tecnicas tomadas

- PostgreSQL nao publica porta `5432`.
- Prisma Client e gerado em `src/generated/prisma`.
- Seed usa `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e respeita `ADMIN_RESET_PASSWORD`.
- Uploads nao ficam no banco; o banco guarda metadados e caminhos.
- Migration `20260510203000_recurring_finance_students` converteu `FinancialEntry` em estrutura recorrente.
- Migration `20260511110000_finance_month_snapshots` adicionou snapshots mensais em `FinancialPayment` para preservar meses fechados.
- Migration `20260511160000_admin_agenda_module` adiciona agenda administrativa de 2026.
- Migration `20260512120000_interactive_homework` adiciona homework interativo, campos editaveis, metadados do arquivo e novos status de submissao.
- Migration `20260519033000_interactive_homework_drawing_field` adiciona o tipo `DRAWING` ao enum `HomeworkFieldType`.
- Migration `20260606120000_interactive_homework_tiny_text_field` adiciona o tipo `TINY_TEXT` ao enum `HomeworkFieldType`.
- Migration `20260607173000_homework_listening_field` adiciona o tipo `LISTENING` ao enum `HomeworkFieldType`.
- Migration `20260609113000_homework_student_assignments` adicionou `HomeworkStudentAssignment` para o fluxo anterior de acesso compartilhado.
- Migration `20260610120000_homework_replication_source` adiciona `Homework.replicatedFromHomeworkId` para rastrear replicas reais de homework por aluno, substituindo o fluxo operacional de compartilhar o mesmo homework.
- Migration `20260617120000_homework_review_annotations` adiciona `HomeworkSubmission.teacherAnnotations` para salvar caneta/texto da correcao diretamente sobre a entrega interativa.
- Migration `20260523120000_admin_credentials` adiciona o cofre admin `AdminCredential` e os enums `AdminCredentialKind`/`AdminCredentialSource`.
- Migration `20260530183000_user_session_version` adiciona `User.sessionVersion` para revogacao de sessoes JWT.
- Migration `20260601170000_candy_xp_persistence` adiciona Candy XP persistente com perfil, eventos, badges, missoes e tentativas.
- Migration `20260601193000_candy_xp_activities` adiciona atividades Candy XP com PDF/imagem, perguntas, liberacao por aluno, progresso/submissao e evento de XP por atividade concluida.
- Migration `20260609110000_candy_xp_interactive_fields` adiciona `CandyXpActivityInteractiveField` para editar areas diretamente sobre o PDF/imagem da missao.
- Migration `20260604153000_student_pre_registration` adiciona `StudentPreRegistration` para interessados solicitarem cadastro pelo login sem criar `User`, senha ou sessao.
- Migration `20260604170000_student_pre_registration_review` adiciona metadados de revisao e conversao do pre-cadastro para o modulo `Aceitar alunos`.
- Migration `20260605120000_catty_conversation_history` adiciona historico recente da Catty por usuario/contexto.
- Migration `20260605210000_catty_learning_center` adiciona Catty Learning Center com itens aprovaveis e feedback/sugestoes.
- Migration `20260605223000_catty_learning_feedback` adiciona tipos e campos para feedback real do widget da Catty.
- Migration `20260605230000_catty_user_memory` adiciona memoria pessoal da Catty por usuario e eventos de auditoria/limpeza.
- Migration `20260605234500_catty_user_artifacts` adiciona artefatos configuraveis da Catty por usuario.
- Migration `20260605235500_catty_artifact_enrichment` adiciona cache e fila revisavel para enriquecimento de artefatos da Catty.
- Migration `20260606003000_catty_primary_artifacts` adiciona `CattyUserArtifact.isPrimary` e indice por usuario/principal para priorizar um gosto aprovado.

## Riscos ao alterar esta parte

- Alterar campos sem migration quebra deploy.
- Apagar migrations antigas quebra bancos novos.
- Remover constraints unicas pode criar duplicidade em vinculos, respostas ou pagamentos mensais.
- Expor `DATABASE_URL` ou senha em docs/logs compromete o ambiente.
- Expor `AdminCredential.secretCiphertext` ou valores revelados do cofre em logs/respostas compromete integracoes externas.
- Trocar a chave `ADMIN_CREDENTIALS_SECRET`/`AUTH_SECRET` sem plano de rotacao pode tornar credenciais antigas ilegíveis.
- Alterar cascade/set null sem revisar contratos, chat e financeiro pode apagar historico indevidamente.
- Fazer hard delete de `FinancialStudent` no financeiro apaga pagamentos mensais por cascade; a regra atual e inativar apenas a linha mensal escolhida pela UI.
- Fazer hard delete de `AgendaStudent` apaga ocorrencias da agenda por cascade; a UI deve retirar agenda por `isActive=false`.
- Alterar `HomeworkInteractiveField` sem manter coordenadas percentuais por pagina pode desalinhar respostas sobre o PDF/imagem.
- Exibir `HomeworkSubmission.teacherAnnotations` enquanto a entrega ainda esta `SUBMITTED` pode revelar marcacoes de correcao antes da devolucao/avaliacao; a UI do aluno deve filtrar por `RETURNED`/`REVIEWED`.
- Incluir drafts em consultas de alerta/correcao pode gerar notificacao para homework ainda nao entregue.
- Criar XP sem `sourceKey` estavel pode duplicar pontos; toda missao/tarefa deve definir uma origem unica por usuario.
- Alterar a formula de nivel sem recalcular `CandyXpProfile` pode deixar cache diferente do ledger.
- Enviar mais `CattyMessage` para IA pode aumentar custo sem ganho claro; manter o prompt limitado a 8 mensagens, mesmo com retencao longa no banco.
- Aprovar memoria da Catty com dados sensiveis, telefone, documento, pagamento, contrato, token, chave ou email pode vazar informacao para Gemini/OpenAI; manter validacao e revisao humana.
- Feedback da Catty copia apenas trechos resumidos da propria conversa do usuario; se houver termo sensivel, a action ou auto-sugestao deve bloquear o registro para evitar que entre na fila de treino.
- Permitir que memoria pessoal de um usuario seja consultada sem filtrar `userId` pode vazar gostos, dificuldades ou notas pedagogicas entre alunos; manter sempre filtro por dono, admin ou teacher vinculada.
- Criar memorias pessoais demais aumenta custo/contexto; a rota limita o prompt, a tela `Catty dos alunos` mostra alertas e a equipe pode arquivar itens, remover dado sensivel ou limpar historico manualmente.
- Permitir `CattyUserArtifact.ACTIVE` sem revisao pode fazer a Catty repetir tema errado, ofensivo ou sensivel; manter validacao conservadora e deixar a configuracao de artefatos apenas para Admin/Teacher.
- Usar artefato configuravel sem anti-repeticao pode deixar a Catty cansativa; manter contagem/uso recente, historico curto e limite de no maximo um artefato por resposta.
- Usar busca web de enriquecimento sem cache/aprovacao humana pode trazer tema inadequado, texto copiado ou contexto errado para alunos; manter busca apenas em fluxo Admin/Teacher, resumo curto, bloqueio de tema sensivel e aprovacao antes de ativar.
- Expor `CandyXpActivity.assetPath` diretamente fora da rota protegida vaza historias/atividades privadas.
- Alterar perguntas ou respostas corretas depois de alunos responderem exige cuidado para nao invalidar historico de nota e XP ja concedido.
- Habilitar `LISTENING` em `CandyXpActivityInteractiveField` sem rotas proprias de audio/OCR pode quebrar envio ou revisao, pois o suporte atual de listening e especifico de homework/aula interativa.
- Transformar `StudentPreRegistration` diretamente em login sem revisao admin/teacher quebraria a regra de acesso controlado ao AVA.

## Pendencias

- Falta rotina formal de backup/restore.
- Falta normalizacao case-insensitive mais robusta para email.
- Falta auditoria geral fora do financeiro.
- Falta trilha de auditoria detalhada para revelar/copiar credenciais do cofre admin.
- Falta exportacao do PDF final preenchido com respostas e desenhos do aluno.
- Falta tela completa para aluno/teacher/admin explorarem badges, missoes, streaks e temporadas fora do card XP.
- Falta exportacao/relatorio detalhado das respostas Candy XP.
- Falta listening interativo proprio para Candy XP.

## Como pode evoluir

- Documentar diagrama ER quando o schema crescer.
- Criar politica de backup e restore.
- Adicionar logs/auditoria para areas administrativas sensiveis.
- Avaliar indices novos conforme volume real de aulas, mensagens e financeiro.
