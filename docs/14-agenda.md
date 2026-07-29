# 14 - Agenda

## O que esta parte do sistema faz

O modulo Agenda e um controle interno simples do administrador em `/ava/admin?task=agenda`. Ele substitui o uso de sheets para organizar quais alunos internos vem em quais dias e horarios, confirmar presenca, registrar falta, consultar historico, inativar rotinas sem apagar registros antigos e excluir cadastros criados por engano.

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
- `prisma/migrations/20260714170000_linked_pre_registration_conversion/migration.sql`

Tabelas:

- `AgendaStudent`
- `AgendaLesson`
- `AgendaLog`

Enum:

- `AgendaLessonStatus`

Rota:

- `/ava/admin?task=agenda`

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` visualiza e escreve na tela da agenda.
- Excecao controlada: ao converter pre-cadastro proprio/atribuido, `TEACHER` pode disparar a criacao linkada de um `AgendaStudent` e suas `AgendaLesson` futuras dentro da transaction de `Tornar aluno`, sem acessar a agenda completa. Se dias ou horario ainda nao foram definidos, a conversao continua, cria `AgendaStudent` linkado sem ocorrencias e registra a pendencia no log.
- Agenda e separada dos alunos do AVA; cadastro manual da agenda nao cria login, usuario ou perfil de aluno.
- A tela abre no mes atual de 2026 e seleciona automaticamente o dia de hoje quando o navegador esta em 2026.
- O dia atual e as comparacoes de ocorrencias usam uma referencia unica em `America/Sao_Paulo`, passada pelo servidor para evitar mudanca de dia durante a hidratacao.
- Alteracoes ainda nao salvas da rotina permanecem ao atualizar presenca ou trocar o dia selecionado; trocar aluno ou mes pede confirmacao antes de descartar o formulario.
- O admin ve calendario mensal, botao `Hoje`, navegacao de mes, dia atual destacado, dia selecionado destacado e contagem visual de aulas por dia.
- Ao cadastrar um aluno interno, o admin informa nome, telefone opcional, unidade, dias da semana, horario e observacao opcional; registros vindos de pre-cadastro tambem guardam a unidade em `AgendaStudent.unit` e podem guardar uma observacao de agenda pendente quando foram convertidos sem dias/horario. A lista mostra `Completar` em amarelo enquanto faltarem dias ou horario e muda para `Completo` em verde depois que a rotina valida for salva.
- Quando a Secretaria abre a agenda com `unit=IVATE` ou `unit=DOURADINA`, a leitura server-side carrega somente `AgendaStudent` daquela unidade e ocorrencias de `AgendaLesson` ligadas a alunos daquele polo. Sem `unit`, ou com `unit=all`, mostra todos os polos.
- O sistema cria ocorrencias do mes escolhido ate dezembro de 2026.
- `AgendaStudent.isActive`, `AgendaStudent.defaultTime` e `AgendaStudent.weekdayMask` guardam o estado atual da rotina para edicao rapida; `AgendaLesson` continua guardando as ocorrencias reais e o historico.
- A action de cadastro recusa duplicidade quando o mesmo nome ja tem agenda ativa no mesmo dia/horario. A verificacao roda dentro da mesma transaction e usa lock por aluno/unidade/ano/horario para impedir cadastros duplicados por cliques ou usuarios simultaneos.
- Ao editar a rotina, o sistema desativa ocorrencias recorrentes futuras do mes selecionado em diante e cria/reativa as novas ocorrencias, preservando historico antigo.
- Inativar aluno marca `AgendaStudent.isActive=false`, limpa horario/dias padrao e inativa ocorrencias recorrentes do mes selecionado em diante; registros antigos permanecem no historico.
- Excluir aluno da agenda e uma acao definitiva de `ADMIN`: remove o `AgendaStudent` e suas ocorrencias por cascade, mantendo um log textual da exclusao. Para preservar historico, usar `Inativar`.
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
- Clicar em um aluno da lista interna destaca o card e abre abaixo da lista o detalhe com dados, edicao de rotina, presencas, faltas, historico de ocorrencias ativas/inativas e acoes `Inativar`/`Excluir`.
- O log da agenda fica recolhido por padrao em um card abaixo da agenda.
- `AgendaLog` registra criacao, edicao, presenca, falta, reposicao e inativacao.

## Decisoes tecnicas tomadas

- A agenda usa ocorrencias reais por data em `AgendaLesson`, em vez de calcular tudo dinamicamente no cliente.
- A rotina atual tambem fica resumida em `AgendaStudent` por `isActive`, `defaultTime` e `weekdayMask` para permitir edicao e reativacao sem depender apenas da derivacao das ocorrencias.
- As datas de agenda usam ano 2026 e horario separado em string `HH:mm`.
- `AgendaStudent.unit` usa as unidades fixas `IVATE` e `DOURADINA`; registros antigos recebem `IVATE` por padrao.
- O filtro geral da Secretaria preserva o parametro `unit` ao abrir `Agenda`; o formulario de cadastro rapido e a edicao de rotina tambem salvam a unidade explicitamente.
- Reposicoes sao ocorrencias independentes, ligadas opcionalmente a aula original por `makeupForLessonId`.
- O modulo fica dentro da area admin e segue o padrao de `?task=`.
- Alertas da sidebar usam a ultima entrada de `AgendaLog`.
- A tela da Agenda usa hierarquia operacional simples: cabecalho do mes, metricas, calendario mensal, lista do dia selecionado, cadastro rapido, detalhe/historico do aluno e log recolhido.
- A tela da Agenda prioriza leitura rapida: fila de hoje/proximos 7 dias no topo, calendario mensal com primeiro horario/aluno por dia, totais do dia selecionado, cards de aula com status/horario/telefone/observacao e cards de alunos internos com rotina, proxima aula e contadores de presenca/falta.
- O cabecalho mensal inclui seletor direto de mes, navegacao anterior/proximo e metricas com icones, cores semanticas e descricao curta; a fila operacional identifica status e unidade antes de abrir o detalhe.
- No mobile, o calendario preserva sete colunas com largura estavel e rolagem horizontal, evitando comprimir nomes, horarios e contadores. A legenda explica presenca, falta e dias com maior movimento.
- Os cards de alunos internos usam tonalidades discretas por unidade, nomes em ate duas linhas e contadores separados por cor; formularios de cadastro/edicao usam campos mais altos, borda visivel e foco reforcado.
- O painel evita tabela grande e usa cards empilhados no mobile para facilitar toque em `Veio` e `Nao veio`.
- A busca e o detalhe trabalham apenas com `AgendaStudent`, sem consultar `User`/`StudentProfile`.
- A migration `20260714170000_linked_pre_registration_conversion` adiciona `AgendaStudent.unit` e o vinculo de conversao entre `StudentPreRegistration` e `AgendaStudent`.

## Riscos ao alterar esta parte

- Apagar fisicamente `AgendaStudent` remove ocorrencias por cascade.
- O botao `Excluir` deve continuar com confirmacao clara, pois remove o historico de ocorrencias daquele cadastro.
- Misturar agenda com aulas pedagogicas pode confundir presenca administrativa com conteudo de aula.
- Gerar ocorrencias duplicadas pode poluir meses futuros.
- Converter pre-cadastro sem transaction pode deixar agenda criada sem aluno real ou sem financeiro correspondente.
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
