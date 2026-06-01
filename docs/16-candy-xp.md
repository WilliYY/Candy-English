# 16 - Candy XP

## O que esta parte do sistema faz

Candy XP e a fundacao de gamificacao da Candy English. Ele prepara uma evolucao estilo Duolingo para tarefas, homeworks, aulas, feedbacks, rotinas e futuros jogos, sem expor ranking publico nem dados de outras roles.

Nesta fase ja existe persistencia de XP, streaks, badges e catalogo inicial de missoes. Jogos executaveis ainda nao foram criados.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos principais:

- `src/lib/candy-xp.ts`: curva infinita, snapshot visual e builders por role.
- `src/lib/candy-xp-persistence.ts`: catalogo, ledger de eventos, streaks, badges e missoes.
- `src/components/ava/student-xp-card.tsx`: card reutilizavel para student, teacher e admin.
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

Rotas com card:

- `/ava/student?task=resumo`
- `/ava/teacher?task=resumo`
- `/ava/admin?task=usuarios`

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

## Fontes atuais de XP

Student:

- `Perfil preparado`: perfil/avatar/dados basicos.
- `Aulas finalizadas`: atividade interativa criada pelo fluxo de aula e entregue.
- `Homeworks enviadas`: homework entregue.
- `Feedbacks recebidos`: submissao revisada pela teacher.

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

## Riscos ao alterar esta parte

- Criar `sourceKey` instavel pode permitir XP duplicado ou impedir XP valido.
- Gravar XP em client-side quebraria a seguranca; XP deve ser concedido no servidor.
- Usar dados globais para teacher pode vazar informacao de aluno fora do vinculo.
- Tornar ranking publico sem regra nova pode expor dados e gerar competicao indesejada.
- Alterar a formula de nivel exige recalcular perfis ou aceitar que o cache sera atualizado no proximo sync.

## Pendencias

- Criar jogos executaveis.
- Criar tela completa de missoes.
- Criar tela/lista de badges.
- Criar historico detalhado de XP por usuario.
- Criar temporadas sem ranking publico sensivel.
- Adicionar testes especificos para permissao e anti-duplicacao do XP.

## Como pode evoluir

1. Criar uma tela `Jogos Candy` para alunos com tarefas pequenas de vocabulario, listening e revisao.
2. Usar `completeCandyMission` para cada partida concluida, sempre com `sourceKey` da tentativa.
3. Criar missoes diarias e semanais por role.
4. Mostrar badges conquistados em uma tela propria.
5. Adicionar relatorios admin sem expor ranking publico para alunos.
