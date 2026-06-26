# 14 - Agenda

## O que esta parte do sistema faz

O modulo Agenda e um controle interno simples do administrador em `/ava/admin?task=agenda`. Ele substitui o uso de sheets para organizar quais alunos internos vem em quais dias e horarios, confirmar presenca, registrar falta, consultar historico e inativar rotinas sem apagar registros antigos.

O modulo e administrativo. Ele nao usa alunos do AVA, nao cria `User`, nao cria `StudentProfile` e nao substitui o fluxo pedagogico de aulas, materiais e homework da area teacher/student.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `src/components/ava/admin-agenda-panel.tsx`
- `src/components/ava/admin-users-panel.tsx`
- `src/app/ava/admin/actions.ts`
- `src/app/ava/admin/page.tsx`
- `src/app/ava/layout.tsx`
- `src/lib/validations/admin-users.ts`
- `src/lib/ava-nav-alerts.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260511160000_admin_agenda_module/migration.sql`
- `prisma/migrations/20260626120000_simple_internal_agenda/migration.sql`

Tabelas:

- `AgendaStudent`
- `AgendaLesson`
- `AgendaLog`

Enum:

- `AgendaLessonStatus`

Rota:

- `/ava/admin?task=agenda`

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` visualiza e escreve na agenda.
- Agenda e separada dos alunos do AVA; cadastro da agenda nao cria login, usuario ou perfil de aluno.
- A tela abre no mes atual de 2026 e seleciona automaticamente o dia de hoje quando o navegador esta em 2026.
- O admin ve calendario mensal, botao `Hoje`, navegacao de mes, dia atual destacado, dia selecionado destacado e contagem visual de aulas por dia.
- Ao cadastrar um aluno interno, o admin informa nome, telefone opcional, dias da semana, horario e observacao opcional.
- O sistema cria ocorrencias do mes escolhido ate dezembro de 2026.
- `AgendaStudent.isActive`, `AgendaStudent.defaultTime` e `AgendaStudent.weekdayMask` guardam o estado atual da rotina para edicao rapida; `AgendaLesson` continua guardando as ocorrencias reais e o historico.
- A action de cadastro recusa duplicidade quando o mesmo nome ja tem agenda ativa no mesmo dia/horario.
- Ao editar a rotina, o sistema desativa ocorrencias recorrentes futuras do mes selecionado em diante e cria/reativa as novas ocorrencias, preservando historico antigo.
- Inativar aluno marca `AgendaStudent.isActive=false`, limpa horario/dias padrao e inativa ocorrencias recorrentes do mes selecionado em diante; registros antigos permanecem no historico.
- As ocorrencias aparecem por calendario mensal e por lista do dia selecionado, ordenadas por horario.
- Status padrao e `SCHEDULED`.
- Presenca confirmada vira `ATTENDED`.
- Falta vira `MISSED`.
- Reposicao cria uma nova `AgendaLesson` com `isMakeup=true` e status `MAKEUP_SCHEDULED`.
- Reposicao confirmada vira `MAKEUP_ATTENDED`.
- Cada card do dia mostra nome, horario, telefone, observacao curta, status e botoes `Veio`, `Nao veio` e `Resetar`.
- Cores de status: verde para veio, vermelho para nao veio, roxo para previsto e ambar para reposicao.
- A lista do dia possui busca por nome/telefone.
- O botao `Adicionar neste dia` preseleciona o dia da semana do dia selecionado no formulario.
- Clicar em um aluno abre detalhe com dados, edicao de rotina, presencas, faltas e historico de ocorrencias ativas/inativas.
- O log da agenda fica recolhido por padrao em um card abaixo da agenda.
- `AgendaLog` registra criacao, edicao, presenca, falta, reposicao e inativacao.

## Decisoes tecnicas tomadas

- A agenda usa ocorrencias reais por data em `AgendaLesson`, em vez de calcular tudo dinamicamente no cliente.
- A rotina atual tambem fica resumida em `AgendaStudent` por `isActive`, `defaultTime` e `weekdayMask` para permitir edicao e reativacao sem depender apenas da derivacao das ocorrencias.
- As datas de agenda usam ano 2026 e horario separado em string `HH:mm`.
- Reposicoes sao ocorrencias independentes, ligadas opcionalmente a aula original por `makeupForLessonId`.
- O modulo fica dentro da area admin e segue o padrao de `?task=`.
- Alertas da sidebar usam a ultima entrada de `AgendaLog`.
- A tela da Agenda usa hierarquia operacional simples: cabecalho do mes, metricas, calendario mensal, lista do dia selecionado, cadastro rapido, detalhe/historico do aluno e log recolhido.
- O painel evita tabela grande e usa cards empilhados no mobile para facilitar toque em `Veio` e `Nao veio`.
- A busca e o detalhe trabalham apenas com `AgendaStudent`, sem consultar `User`/`StudentProfile`.

## Riscos ao alterar esta parte

- Apagar fisicamente `AgendaStudent` remove ocorrencias por cascade.
- Misturar agenda com aulas pedagogicas pode confundir presenca administrativa com conteudo de aula.
- Gerar ocorrencias duplicadas pode poluir meses futuros.
- Alterar timezone sem cuidado pode deslocar datas.
- Transformar agenda em acesso de teacher/student exige nova revisao de permissao.
- Ao editar recorrencia, cuidar para inativar apenas ocorrencias futuras/operacionais e manter historico consultavel.

## Pendencias

- Nao ha importacao em massa de sheets.
- Nao ha exportacao PDF/Excel da agenda.
- Nao ha visualizacao semanal dedicada.
- Nao ha notificacao automatica para aluno/teacher.

## Como pode evoluir

- Adicionar busca por aluno.
- Criar visao semanal e impressao da agenda.
- Permitir importacao CSV/Excel.
- Criar relatorio de presenca e faltas por aluno.
- Integrar com calendario externo apenas se houver decisao explicita.
