# 16 - Candy XP

## O que esta parte do sistema faz

Candy XP e a fundacao de gamificacao da Candy English. Ele prepara uma evolucao estilo Duolingo para tarefas, homeworks, aulas, feedbacks, rotinas, atividades de historia e futuros jogos, sem expor ranking publico nem dados de outras roles.

Nesta fase ja existe persistencia de XP, streaks, badges, catalogo inicial de missoes e atividades Candy XP com PDF/imagem do Canva, perguntas, progresso do aluno e correcao automatica/manual. Minijogos executaveis ainda nao foram criados.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos principais:

- `src/lib/candy-xp.ts`: curva infinita, snapshot visual e builders por role.
- `src/lib/candy-xp-persistence.ts`: catalogo, ledger de eventos, streaks, badges e missoes.
- `src/lib/candy-xp-activities.ts`: avaliacao automatica de perguntas objetivas e metadados do arquivo.
- `src/lib/validations/candy-xp-activities.ts`: schemas Zod das atividades, perguntas, respostas e revisao.
- `src/app/ava/candy-xp/actions.ts`: criacao, edicao simples, progresso, envio e correcao.
- `src/app/ava/candy-xp-assets/[activityId]/route.ts`: rota protegida para PDF/imagem das atividades.
- `src/components/ava/student-xp-card.tsx`: card reutilizavel para student, teacher e admin.
- `src/components/ava/admin-candy-xp-panel.tsx`: painel admin para montar atividades e corrigir envios.
- `src/components/ava/student-candy-xp-activities-panel.tsx`: experiencia do aluno com missoes, PDF, perguntas e progresso.
- `src/app/ava/student/page.tsx`: sincroniza eventos XP do aluno.
- `src/app/ava/teacher/page.tsx`: sincroniza eventos XP da teacher logada.
- `src/app/ava/admin/page.tsx`: sincroniza eventos XP do admin logado.

Tabelas:

- `CandyXpProfile`
- `CandyXpEvent`
- `CandyBadgeDefinition`
- `CandyUserBadge`
- `CandyMission`
- `CandyMissionAttempt`
- `CandyXpActivity`
- `CandyXpActivityQuestion`
- `CandyXpActivityAssignment`
- `CandyXpActivitySubmission`

Rotas com card:

- `/ava/student?task=resumo`
- `/ava/teacher?task=resumo`
- `/ava/admin?task=usuarios`

Rotas das atividades:

- `/ava/admin?task=candy-xp`
- `/ava/student?task=candy-xp`
- `/ava/candy-xp-assets/[activityId]`

## Regras de negocio que precisam ser preservadas

- XP pertence a um `User`, nao a um perfil solto.
- `CandyXpEvent` e a fonte de verdade; `CandyXpProfile` e cache recalculado.
- Cada evento precisa de `sourceKey` estavel e unica por usuario.
- A chave unica `userId + sourceKey` impede duplicar XP pela mesma homework, aula, feedback, rotina ou missao.
- Student so recebe XP por dados do proprio aluno.
- Teacher so recebe XP por dados da propria area quando esta logada como `TEACHER`.
- Admin recebe XP por indicadores operacionais globais permitidos no painel admin.
- Nao existe ranking publico.
- Streak usa dias de atividade com XP e e calculado por data em `America/Sao_Paulo`.
- Badges sao concedidos automaticamente por criterios simples: nivel, streak ou contagem de eventos.
- Missoes futuras devem usar `CandyMission` + `CandyMissionAttempt` e gravar XP via server action/rota protegida.
- Atividades Candy XP sao criadas e corrigidas apenas por `ADMIN`.
- Student acessa apenas atividades publicadas e liberadas para o proprio perfil; atividade publicada sem assignment fica liberada para todos os students.
- Respostas objetivas podem ser corrigidas automaticamente; respostas escritas sempre ficam pendentes para revisao manual.
- XP de atividade concluida usa `CANDY_XP_ACTIVITY_COMPLETED` e `sourceKey` da submissao para impedir pontuacao duplicada.
- PDF/imagem da atividade deve ser servido apenas pela rota protegida de asset.

## Fontes atuais de XP

Student:

- `Perfil preparado`: perfil/avatar/dados basicos.
- `Aulas finalizadas`: atividade interativa criada pelo fluxo de aula e entregue.
- `Homeworks enviadas`: homework entregue.
- `Feedbacks recebidos`: submissao revisada pela teacher.
- `Candy XP`: historias e missoes Candy XP concluidas.

Teacher:

- `Perfil preparado`: avatar ou telefone.
- `Alunos vinculados`: alunos da propria area teacher.
- `Aulas criadas`: aulas da propria area.
- `Homeworks criadas`: homeworks da propria area.
- `Feedbacks dados`: respostas revisadas.
- `Aulas ao vivo`: salas criadas/registradas.

Admin:

- `Perfil preparado`: avatar admin.
- `Usuarios ativos`: usuarios ativos no AVA.
- `Comunidade`: teachers e students cadastrados.
- `Vinculos`: aluno-teacher.
- `Operacao`: contratos e alunos financeiros.
- `Pagamentos`: pagamentos marcados como pagos.
- `Agenda cuidada`: presencas, faltas e reposicoes registradas.
- `Cofre admin`: credenciais organizadas no cofre.

## Decisoes tecnicas tomadas

- A curva de nivel continua infinita por `requiredForCandyLevel`.
- O card aplica dados persistidos com `applyCandyXpPersistence`, mantendo fallback visual se a persistencia ainda nao existir.
- O catalogo inicial de badges e missoes e criado por upsert server-side em `ensureCandyXpCatalog`.
- `completeCandyMission` fica como ponto de entrada futuro para jogos/tarefas executaveis.
- Eventos historicos nao sao removidos quando uma entidade deixa de existir; XP representa historico conquistado.
- Atividades Candy XP usam models proprios para historia/PDF/perguntas/progresso, mas a premiacao continua centralizada no ledger `CandyXpEvent`.
- A primeira versao permite editar dados principais da atividade; edicao completa de perguntas apos publicacao fica para fase posterior por risco de invalidar respostas ja enviadas.

## Riscos ao alterar esta parte

- Criar `sourceKey` instavel pode permitir XP duplicado ou impedir XP valido.
- Gravar XP em client-side quebraria a seguranca; XP deve ser concedido no servidor.
- Usar dados globais para teacher pode vazar informacao de aluno fora do vinculo.
- Tornar ranking publico sem regra nova pode expor dados e gerar competicao indesejada.
- Alterar a formula de nivel exige recalcular perfis ou aceitar que o cache sera atualizado no proximo sync.

## Pendencias

- Criar minijogos executaveis.
- Criar tela completa de missoes.
- Criar tela/lista de badges.
- Criar historico detalhado de XP por usuario.
- Criar temporadas sem ranking publico sensivel.
- Adicionar testes especificos para permissao e anti-duplicacao do XP.
- Criar editor completo para alterar perguntas Candy XP depois da criacao.
- Criar relatorios/exportacao de respostas Candy XP.

## Como pode evoluir

1. Criar uma tela `Jogos Candy` para alunos com tarefas pequenas de vocabulario, listening e revisao.
2. Usar `completeCandyMission` para cada partida concluida, sempre com `sourceKey` da tentativa.
3. Criar missoes diarias e semanais por role.
4. Mostrar badges conquistados em uma tela propria.
5. Adicionar relatorios admin sem expor ranking publico para alunos.
