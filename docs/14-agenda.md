# 14 - Agenda

## Planilha compacta e edição de horário — 14/09/2026

- A visão diária e a `Planilha mensal` usam `AgendaCompactSheet`, com seções
  separadas para `Polo 1 · Ivaté` e `Polo 2 · Douradina`, nomes completos e
  observações expansíveis. A página aproveita a largura disponível da área admin.
- As colunas se ajustam à largura do conteúdo (container query), não apenas à
  janela: em celular, horário e nome ficam lado a lado, com presença logo abaixo;
  em desktop, aluno, horário/rotina, situação, presença/resumo e ficha ficam na linha.
  Não há tabela com largura mínima forçada nem cortes com reticências.
- Clique no horário para abrir o editor na própria linha. `Salvar horário` confirma
  explicitamente; `Cancelar` não grava. A visão diária abre em `Somente esta aula`;
  `Rotina futura` altera as ocorrências previstas a partir do dia selecionado e o
  horário padrão, sem mudar os dias da semana. Na visão mensal, aplica-se a partir
  do primeiro dia do mês selecionado ou de hoje, o que for posterior.
- Edição rápida só aceita ADMIN com conta atualmente ativa. O servidor valida
  horário `HH:mm`, data de 2026, aluno ativo e versões `updatedAt`. Aulas anteriores
  a hoje em `America/Sao_Paulo`, inativas ou com presença/falta registrada ficam
  intactas. Reposições só podem ser editadas individualmente, nunca junto da rotina.
- A nova operação muda somente horários, versão do cadastro e `AgendaLog`: não
  regenera ocorrências, não altera dias/status, identidade do AVA ou Financeiro.
  A ficha completa continua disponível para alteração de dias e demais dados;
  suas regras anteriores de regeneração mensal permanecem separadas.
- Lock transacional no aluno serializa edições; cada ocorrência usa comparação
  de versão/status. Conflito ou falha reverte a operação inteira. Colisões do
  mesmo aluno na mesma data/horário são recusadas. Auditoria registra autor,
  horários anterior/novo, alcance e quantidade de aulas alteradas.
- Rascunho fica preservado em erro ou refresh de presença. Enquanto o editor
  está aberto, troca de dia/mês/visão/polo pede salvar ou cancelar primeiro;
  busca fica desabilitada e saída da página usa aviso nativo. Foco retorna ao
  horário depois de salvar/cancelar. Balão da Catty é recolhido durante a edição.

Arquivos novos: `agenda-compact-sheet.tsx`, `agenda-time-editor.tsx`,
`src/lib/agenda-time-change.ts`, `src/lib/agenda-time-operations.ts` e
`src/app/ava/admin/agenda-time-actions.ts`. Sem migration, dependência nova ou
mudança de permissão para professores/alunos.

Validação local: 327 testes aprovados; `tsc --noEmit` aprovado; fixture com o
componente real em 320, 390, 768, 1024, 1280, 1440 e 1880 px sem overflow.
Edição individual/rotina, cancelar, erro, proteção de rascunho, presença, busca,
polos, teclado, retorno de foco e movimento reduzido verificados no navegador.
A fixture usa ações simuladas e não comprova escrita no banco nem tela autenticada
de produção. Script de integração real: `scripts/agenda-time-smoke.ts --isolated-schema`;
clona somente estrutura das três tabelas em schema temporário e remove ao terminar.
`npm run build` e lint de `src/`/scripts da tarefa aprovados.

Publicação Oracle concluída em 14/09/2026: implementação `eb5c8de` + `3cb4e36`,
smokes ajustados em `2365af3` e `4c61e97`. Imagem anterior preservada como
`candy-english-app:before-agenda-3cb4e36`. Build Docker aprovado; app recriado
com `--no-deps --wait`, preservando overlay/rede e serviços Catty/WhatsApp.
App, PostgreSQL e workers com healthcheck saudáveis.

- Integração PostgreSQL: 7 verificações em schema isolado, incluindo gravação,
  histórico intacto, auditoria, repetição desatualizada, edição individual,
  concorrência e rollback. Schema temporário removido. A primeira execução
  identificou enum ausente somente na fixture; o clone de enums foi corrigido
  e a execução completa passou, sem mudança no schema público.
- `audit:server-smoke`: 11 verificações aprovadas.
- `audit:auth-smoke`: 34 verificações aprovadas. Expectativa de rótulo atualizada
  de `Visao mensal` para `Planilha mensal`, com presença do componente compacto
  confirmada no HTML autenticado de ADMIN. Guards teacher/student preservados.
- `audit:avatar-smoke`: aprovado, inclusive limpeza das fixtures.
- Não houve edição de horários reais para teste. Inspeção visual foi na fixture
  com componente real, não em navegador autenticado de produção ou celular físico.

Pendência independente encontrada em `npm audit` (14/09/2026; revisar até
21/09/2026): alertas herdados em `deepmerge-ts@7.1.5` via Prisma config,
`mysql2@3.15.3` via ferramentas Prisma e `brace-expansion@2.1.3` no ESLint.
Prisma config recebe objeto fixo local, não grafos de usuários; o projeto usa
PostgreSQL (`@prisma/adapter-pg`), não MySQL; os globs do lint são locais.
Busca em `src/`/`scripts/` não encontrou uso direto desses parsers em entrada
pública. Isso não equivale a auditoria de segurança completa. Não foram alteradas
dependências nesta entrega. A correção deve ser isolada, sem o downgrade major
de Prisma sugerido por `audit fix --force`, com instalação/build/testes próprios.

Consulta complementar em `/ava/rotina` (13/09/2026): somente ADMIN ativo pode
escolher o dia e consultar aluno, polo, horário e status das ocorrências ativas.
Preserva `America/Sao_Paulo` e não registra presença nem envia lembretes.
Detalhes em `docs/24-catty-whatsapp.md`.

## O que esta parte do sistema faz

O modulo Agenda e um controle interno simples do administrador em `/ava/admin?task=agenda`. Ele substitui o uso de sheets para organizar quais alunos internos vem em quais dias e horarios, confirmar presenca, registrar falta, consultar historico, inativar rotinas sem apagar registros antigos e excluir cadastros criados por engano.

O modulo e administrativo e nao substitui o fluxo pedagogico de aulas, materiais e homework. A identidade, porem, vem do aluno real do AVA: cada `AgendaStudent` novo fica ligado por `studentProfileId` ao mesmo `StudentProfile` usado no Financeiro.

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
- `prisma/migrations/20260826160000_link_agenda_to_student_profile/migration.sql`
- `src/lib/student-administrative-linkage.ts`

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
- Agenda e pedagogico continuam modulos separados, mas nao usam identidades duplicadas. Todo `AgendaStudent` novo referencia um `StudentProfile`; a tela da Agenda seleciona um aluno real do AVA e apenas completa sua rotina.
- A tela abre no mes atual de 2026 e seleciona automaticamente o dia de hoje quando o navegador esta em 2026.
- O dia atual e as comparacoes de ocorrencias usam uma referencia unica em `America/Sao_Paulo`, passada pelo servidor para evitar mudanca de dia durante a hidratacao.
- Alteracoes ainda nao salvas da rotina permanecem ao atualizar presenca ou trocar o dia selecionado; trocar aluno ou mes pede confirmacao antes de descartar o formulario.
- O admin alterna entre `Agenda do dia` e `Visao mensal`, usa uma faixa interativa com todos os dias do mes, botao `Hoje`, navegacao de mes, busca por nome/telefone, filtros rapidos de situacao e agrupamento visual por polo.
- Ao completar a agenda, o admin seleciona o aluno do AVA e informa dias da semana, horario e observacao opcional. Nome, telefone e unidade partem do perfil vinculado; a lista mostra `Completar` em amarelo enquanto faltarem dias ou horario e muda para `Completo` em verde depois que a rotina valida for salva.
- Quando a Secretaria abre a agenda com `unit=IVATE` ou `unit=DOURADINA`, a leitura server-side carrega somente `AgendaStudent` daquela unidade e ocorrencias de `AgendaLesson` ligadas a alunos daquele polo. Sem `unit`, ou com `unit=all`, mostra todos os polos.
- O sistema cria ocorrencias do mes escolhido ate dezembro de 2026.
- `AgendaStudent.isActive`, `AgendaStudent.defaultTime` e `AgendaStudent.weekdayMask` guardam o estado atual da rotina para edicao rapida; `AgendaLesson` continua guardando as ocorrencias reais e o historico.
- A action usa lock por `StudentProfile.id` e a restricao unica de `AgendaStudent.studentProfileId` para impedir duplicidade por clique ou por usuarios simultaneos.
- Ao editar a rotina, o sistema desativa ocorrencias recorrentes futuras do mes selecionado em diante e cria/reativa as novas ocorrencias, preservando historico antigo.
- Inativar aluno marca `AgendaStudent.isActive=false`, limpa horario/dias padrao e inativa ocorrencias recorrentes do mes selecionado em diante; registros antigos permanecem no historico.
- Excluir aluno da agenda e uma acao definitiva de `ADMIN`: remove o `AgendaStudent` e suas ocorrencias por cascade, mantendo um log textual da exclusao. Para preservar historico, usar `Inativar`.
- A planilha mensal mostra uma linha por aluno, reorganizada no mobile sem tabela larga, com rotina, polo, totais de aulas, presencas, faltas, pendencias e proxima aula. A `Agenda do dia` separa as ocorrencias por polo e ordena cada grupo por horario.
- Status padrao e `SCHEDULED`.
- Presenca confirmada vira `ATTENDED`.
- Falta vira `MISSED`.
- Reposicao cria uma nova `AgendaLesson` com `isMakeup=true` e status `MAKEUP_SCHEDULED`.
- Reposicao confirmada vira `MAKEUP_ATTENDED`.
- Cada linha do dia mostra nome completo, horario editavel quando permitido, telefone, observacao expansivel, status e botoes `Veio`, `Faltou` e `Resetar`.
- Cores de status: verde para veio, vermelho para nao veio, roxo para previsto e ambar para reposicao.
- A busca por nome/telefone e os filtros `Todos`, `Aulas de hoje`, `A confirmar`, `Com faltas` e `Inativos` atuam sobre a planilha mensal.
- O botao `Adicionar neste dia` preseleciona o dia da semana do dia selecionado no formulario.
- Clicar em `Ficha` na linha do aluno abre dados, edicao completa de rotina, presencas, faltas, historico de ocorrencias ativas/inativas e acoes `Inativar`/`Excluir`.
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
- A tela da Agenda usa hierarquia operacional simples: cabecalho do mes, metricas, busca/filtros, seletor de visualizacao, faixa de dias, conteudo do dia ou do mes, cadastro rapido, ficha/historico do aluno e log recolhido.
- A `Agenda do dia` e a abertura padrao para o trabalho operacional. A `Visao mensal` separa Ivaté e Douradina por faixas de cor e concentra rotina, totais mensais e proxima ocorrencia sem competir com a fila diaria na mesma tela.
- O cabecalho mensal inclui seletor direto de mes, navegacao anterior/proximo e metricas com icones, cores semanticas e descricao curta; o filtro de polo reaproveita `unit=all|IVATE|DOURADINA` e continua protegido no servidor.
- No mobile, busca, polos e filtros ficam rolaveis em linha; a faixa de dias centraliza automaticamente a data selecionada e usa alvos de toque amplos. A visao mensal troca a tabela larga por cards compactos, sem rolagem horizontal da planilha.
- A faixa de dias informa quantidade de aulas e usa marcadores verde, vermelho e amarelo para presencas, faltas e pendencias; o texto explicativo e os totais evitam depender apenas de cor.
- As colunas de presenca, falta e pendencia usam verde, vermelho e ambar; as faixas de polo usam ciano para Ivaté e rosa para Douradina sem transformar a tela em um conjunto de cards.
- As linhas do dia selecionado mantem alvos de toque de 44 px em `Veio`, `Faltou` e `Resetar`; formularios de cadastro/edicao usam campos altos, borda visivel e foco reforcado.
- A busca operacional continua baseada em `AgendaStudent`, mas o cadastro e as edicoes resolvem a identidade pelo `StudentProfile` vinculado e sincronizam nome, telefone e polo com `User` e `FinancialStudent`.
- A migration `20260714170000_linked_pre_registration_conversion` adiciona `AgendaStudent.unit` e o vinculo de conversao entre `StudentPreRegistration` e `AgendaStudent`.
- A migration `20260826160000_link_agenda_to_student_profile` adiciona o vinculo 1:1 com `StudentProfile`; o backfill liga somente correspondencias legadas exatas e nao ambiguas.

## Operacoes no aplicativo ADMIN

- `GET /api/mobile/v1/admin/agenda` entrega o calendario mensal e a fila diaria.
- `GET /api/mobile/v1/admin/agenda/[lessonId]` entrega a ocorrencia e ate 100 logs recentes do aluno, sem expor IDs de autor ou campos de autenticacao.
- `PATCH /api/mobile/v1/admin/agenda/[lessonId]` registra presenca, falta ou reset. Exige `confirmChange=true`, `expectedUpdatedAt` e `operationId` UUID.
- `POST /api/mobile/v1/admin/agenda/[lessonId]/makeups` cria reposicao e marca a aula original como falta. Exige `confirmCreate=true`, versao atual e operacao UUID.
- `AgendaLesson.lastMobileOperationId` e `AgendaLesson.createdByMobileOperationId` impedem repeticao de efeito; locks transacionais e `updatedAt` impedem concorrencia silenciosa.
- Uma aula original pode ter somente uma reposicao ativa. Reposicao nao pode ser usada como origem de outra reposicao.
- Toda escrita cria `AgendaLog` com o ADMIN responsavel; o app recebe somente o nome seguro do autor no historico.

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

- Criar visao semanal e impressao da agenda.
- Permitir importacao CSV/Excel.
- Criar relatorio de presenca e faltas por aluno.
- Integrar com calendario externo apenas se houver decisao explicita.
