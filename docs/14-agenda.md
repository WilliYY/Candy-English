# 14 - Agenda

## O que esta parte do sistema faz

O modulo Agenda e um controle interno do administrador em `/ava/admin?task=agenda`. Ele substitui o uso de sheets para organizar quais alunos vem em quais dias e horarios, confirmar presenca, registrar falta e criar reposicao.

O modulo e administrativo. Ele nao substitui o fluxo pedagogico de aulas, materiais e homework da area teacher/student.

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
- Ao cadastrar um aluno, o admin escolhe mes inicial, dias da semana e horario.
- O sistema cria ocorrencias do mes escolhido ate dezembro de 2026.
- As ocorrencias aparecem por mes, agrupadas por dia e ordenadas por horario.
- Status padrao e `SCHEDULED`.
- Presenca confirmada vira `ATTENDED`.
- Falta vira `MISSED`.
- Reposicao cria uma nova `AgendaLesson` com `isMakeup=true` e status `MAKEUP_SCHEDULED`.
- Reposicao confirmada vira `MAKEUP_ATTENDED`.
- Retirar aluno da agenda inativa ocorrencias recorrentes do mes selecionado em diante.
- O painel mostra aviso de alunos de hoje e proximas aulas com horario.
- O bloco `Hoje` permite acao rapida: `Certo` para presenca e `X` para falta, com cores verde/vermelha.
- A agenda usa o mes atual de 2026 automaticamente enquanto o admin nao escolher um mes manualmente.
- O calculo de `Hoje` deve usar a data local do navegador para nao adiantar o dia no periodo da noite.
- A observacao do cadastro fica recolhida por padrao e sem rotulo duplicado ao abrir.
- O log da agenda fica recolhido por padrao em um card abaixo da agenda.
- `AgendaLog` registra criacao, presenca, falta, reposicao e retirada.

## Decisoes tecnicas tomadas

- A agenda usa ocorrencias reais por data em `AgendaLesson`, em vez de calcular tudo dinamicamente no cliente.
- As datas de agenda usam ano 2026 e horario separado em string `HH:mm`.
- Reposicoes sao ocorrencias independentes, ligadas opcionalmente a aula original por `makeupForLessonId`.
- O modulo fica dentro da area admin e segue o padrao de `?task=`.
- Alertas da sidebar usam a ultima entrada de `AgendaLog`.
- Os cards de hoje, proximas aulas e aulas mensais foram compactados para funcionar como painel operacional de cobranca/agenda, com status visiveis e acoes sempre proximas do aluno.

## Riscos ao alterar esta parte

- Apagar fisicamente `AgendaStudent` remove ocorrencias por cascade.
- Misturar agenda com aulas pedagogicas pode confundir presenca administrativa com conteudo de aula.
- Gerar ocorrencias duplicadas pode poluir meses futuros.
- Alterar timezone sem cuidado pode deslocar datas.
- Transformar agenda em acesso de teacher/student exige nova revisao de permissao.

## Pendencias

- Nao ha importacao em massa de sheets.
- Nao ha exportacao PDF/Excel da agenda.
- Nao ha filtro por aluno.
- Nao ha visualizacao semanal dedicada.
- Nao ha notificacao automatica para aluno/teacher.

## Como pode evoluir

- Adicionar busca por aluno.
- Criar visao semanal e impressao da agenda.
- Permitir importacao CSV/Excel.
- Criar relatorio de presenca e faltas por aluno.
- Integrar com calendario externo apenas se houver decisao explicita.
