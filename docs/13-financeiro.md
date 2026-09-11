# 13 - Financeiro

## O que esta parte do sistema faz

O modulo Financeiro possui duas superficies protegidas. O painel administrativo completo fica em `/ava/admin?task=financeiro`; a consulta limitada da Teacher fica em `/ava/teacher?task=financeiro`. A tela Admin usa uma planilha mensal separada por polo, com Ivaté primeiro e Douradina depois. Cada linha mostra aluno, mes, valor, vencimento, situacao e acao rapida para marcar como pago; ao clicar no aluno, o painel de detalhes abre com a data de pagamento ou a pendencia daquela competencia.

A Teacher ve todos os alunos ativos, nome, polo do snapshot, situacao mensal, dia de vencimento, data de confirmacao e nomes/quantidades dos doces. A projecao nao envia valor, forma de pagamento, contato, CPF, endereco, observacao, custo, total, log ou exportacao de outros compradores. Em um bloco isolado, a Teacher autenticada recebe somente as vendas de doces cuja `Sale.buyerUserId` corresponde ao proprio `User.id`, com itens, total, parte paga e parte pendente.

Ele organiza mensalidades e parcelas de 2026 por aluno financeiro, mantendo cada mes como um snapshot proprio para que meses anteriores funcionem como historico fechado. Cada aluno financeiro pertence a uma das unidades fixas: `Unidade 1 Ivaté` ou `Unidade 2 Douradina`.

Compras de produtos lancadas para pagamento mensal sao gerenciadas em `/ava/vendas` e ficam no ledger `Sale`; elas nao alteram `FinancialPayment.snapshotAmountCents` nem os snapshots historicos da mensalidade. A compra entra na mensalidade aberta atual; se a atual estiver paga/inativa, entra na aberta do mes seguinte. A proxima ausente/paga/inativa bloqueia o checkout com orientacao ao Admin, sem criar/reabrir mensalidades automaticamente. Aluno sem mensalidade atual mantem a cobranca separada somente de produtos. Detalhe e historico discriminam nome completo, unidades, preco unitario e subtotal de cada produto, junto de mensalidade, produtos e total.

O perfil da Teacher mostra `Fatura pendente` somente quando existem vendas pessoais `MONTHLY_INVOICE`, concluidas e sem `paidAt`. O link abre a competencia financeira. Admin e Teacher podem confirmar/cancelar recebimentos identificados conforme as regras abaixo.

### Confirmar e cancelar pagamento como professor (10/09/2026)

**Publicado no Oracle em 11/09/2026, codigo `4420c60`.** O smoke inicial identificou `Sale_settlement_check` (`P2039`/`23514`), que proibia faturas mensais pagas. Com autorizacao do responsavel, a migration `20260910150000_allow_monthly_invoice_settlement` foi aplicada: permite `paidAt` mensal, preserva as demais validacoes e nao altera registros. Mensalidades e doces passaram no teste autenticado da candidata e da versao publicada.

- Pedido do responsavel substitui a restricao anterior de escrita exclusivamente administrativa **somente para status de pagamento**. Edicao de valores/cadastro, gastos, relatorios e exportacoes nao mudam.
- `Marcar como pago` e `Cancelar pagamento` exigem confirmacao explicita com pessoa, competencia e aviso de auditoria. O segundo desfaz uma confirmacao incorreta: nao devolve dinheiro, nao cancela venda nem repoe estoque.
- Mensalidade: somente `FinancialPayment` existente, ativo, com cadastro completo e vinculo a conta `STUDENT` ativa/nao excluida. Nao cria mensalidade, altera snapshot, reativa linha ou depende de vinculo teacher/aluno. Doces vinculados herdam `FinancialPayment.isPaid` e aparecem com nome/quantidade junto da mensalidade; nao podem ser pagos separadamente.
- Doces separados: fatura por comprador/competencia, para contas `STUDENT`/`TEACHER` ativas, `Sale.status=COMPLETED`, `MONTHLY_INVOICE`, sem `financialPaymentId`. Confirma todas as compras pendentes exibidas ou cancela todas as confirmacoes pagas exibidas. O filtro de polo seleciona pessoas, mas preserva a fatura completa de cada pessoa em todos os polos, explicitamente indicada na tela/confirmacao. Mostra nome, polos, role, produtos, quantidades e status; nunca valores de terceiros.
- `setTeacherPaymentStatus` recebe `kind`, `id`, `isPaid`, `confirm=true` e, para mensalidade, `expectedUpdatedAt`; para doces, `month`, `year`, `sales` com IDs/versoes unicos (maximo 500). Zod rejeita campos adicionais. Identidade vem da sessao e role/estado da conta sao relidos no banco. Lock `FOR UPDATE`, estado/versao esperados e log na mesma transacao impedem duplicar confirmacoes ou aceitar tela desatualizada. Doces usam lock no comprador e vendas e exigem que o conjunto esperado corresponda a todas as compras daquele status/mes, sem liquidacao parcial acidental.
- Auditoria: `TEACHER_TUITION_PAID`, `TEACHER_TUITION_REOPENED`, `TEACHER_PRODUCT_PAID`, `TEACHER_PRODUCT_REOPENED` em `FinancialLog`, com `createdByUserId`, data e descricao contendo nome do operador, comprador, competencia e ID. Nenhum valor novo e escrito no log da Teacher. Erros nao retornam detalhes internos.
- Notificacao significa o aviso existente no atalho `Financeiro` do Admin, atualizado ao carregar/revalidar o AVA, e historico recente do painel com autor e horario. Nao e push em tempo real, WhatsApp ou email.
- Implementacao: `src/app/ava/teacher/finance-actions.ts`, `src/lib/teacher-finance-payment-operations.ts`, `src/lib/teacher-finance-payment.ts`, `src/lib/validations/teacher-finance.ts`, `TeacherPaymentButton` e `TeacherProductPayments`. Migration de compatibilidade da constraint de vendas descrita em `02-banco-de-dados.md`; nenhuma dependencia nova.
- Validacao dedicada: `tsx --test src/lib/__tests__/teacher-finance*.test.ts` e `docker compose --profile tools run --rm audit-server-smoke npm run audit:teacher-finance`. O smoke usa contas e compras temporarias proprias, login e Server Action reais, testa confirmacao/cancelamento, permissao, versao, duplo clique, HTML/RSC sem valores de terceiros e historico Admin; remove fixtures em `finally`.

### Evidencias da publicacao em 11/09/2026

- `npm run test:mobile-homework`: 266/266; suite Teacher focada: 8/8; `prisma:validate`, `tsc --noEmit` e lint do novo smoke aprovados. GitHub Actions `Security and quality` do commit `4420c60` aprovado, incluindo verificacoes completas. `docker compose build app migrate audit-server-smoke` concluido.
- Backup `candy-20260911T110812Z.tar.gz.enc` verificado e restaurado em PostgreSQL isolado: 63 tabelas. A comparacao de hashes/contagens antes e depois da migration confirmou `Sale`, `SaleItem`, `SaleProduct`, `FinancialPayment` e `FinancialLog` inalterados. Nenhuma cobranca real criada, quitada ou reaberta pelos testes.
- Apenas a migration esperada estava pendente; `docker compose --profile tools run --rm migrate` aplicou-a com sucesso. `audit:sales-settlement` passou em 40 verificacoes PostgreSQL, incluindo constraint instalada, up/down e rollback recusado sem apagar a data paga. Nao existem migrations incompletas.
- Na candidata interna e na imagem publicada, `audit:teacher-finance` confirmou/cancelou mensalidades, faturas separadas de alunos e professores, validou autor/historico Admin, rejeitou acessos/payloads indevidos e duplo clique, preservou estoque/snapshot e nao revelou valores de terceiros no HTML/RSC.
- Na imagem publicada tambem passaram `audit:sales-invoice`, `audit:server-smoke`, `audit:auth-smoke`, `audit:avatar-smoke` e `audit:mobile-auth`, executados via `docker compose --profile tools run --rm --no-deps audit-server-smoke npm run <script>`. Google OAuth foi ignorado porque nao esta configurado; login por senha validado nas tres roles.
- App `healthy`, zero reinicios inesperados, `/api/health` publico HTTP 200. Imagem executada conferida com a imagem compilada: `sha256:6aac9e150d9fcbe687b420e8fb7adc41ac68170da3011688f779d23f3cb1323d`.
- Fixtures removidas (zero contas do smoke Teacher restantes); candidata, container de restauracao e arquivos temporarios do servidor removidos. Backup e imagem anterior `candy-english-app:pre-settlement-migration-20260911` preservados para recuperacao.
- Pendencias: conferencia visual automatizada nao concluida por timeout de controle do Chrome; duas abas vazias `Financeiro QA` da tentativa anterior podem permanecer. Auditoria npm em 11/09/2026: zero criticas, 12 altas preexistentes; esta entrega nao altera dependencias. Nao interpretar esses limites como validacao visual ou ausencia total de vulnerabilidades.

Tambem possui a aba `Pagamentos`, que registra gastos internos da loja por mes e por unidade, como insumos comprados, data, valor e pessoa que fez a acao.

Nao e gateway de pagamento, nao emite boleto, nao cobra automaticamente e nao integra com banco.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `src/components/ava/admin-finance-panel.tsx`
- `src/components/ava/admin-staff-invoices-section.tsx`
- `src/components/ava/ava-workspace-shell.tsx`
- `src/components/ava/teacher-finance-status-panel.tsx`
- `src/app/ava/admin/actions.ts`
- `src/app/ava/admin/page.tsx`
- `src/lib/validations/admin-users.ts`
- `src/lib/ava-nav-alerts.ts`
- `src/lib/staff-invoices.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260510203000_recurring_finance_students/migration.sql`
- `prisma/migrations/20260511110000_finance_month_snapshots/migration.sql`
- `prisma/migrations/20260625120000_simple_finance_installments/migration.sql`
- `prisma/migrations/20260713120000_financial_expenses/migration.sql`
- `prisma/migrations/20260713133000_financial_units/migration.sql`
- `prisma/migrations/20260714170000_linked_pre_registration_conversion/migration.sql`
- `prisma/migrations/20260831120000_add_teacher_personal_invoices/migration.sql`

Tabelas:

- `FinancialStudent`
- `FinancialPayment`
- `FinancialExpense`
- `FinancialLog`
- `Sale` e `SaleItem` para compras de produtos de alunos e da equipe

Rota:

- `/ava/admin?task=financeiro`
- `/ava/teacher?task=financeiro`

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` visualiza o financeiro completo e executa qualquer escrita, exportacao ou consulta de valores/gastos.
- `TEACHER` recebe somente leitura minimizada de todos os alunos ativos. O filtro de conta ativa e o `select` de dados acontecem no servidor; esconder campos no cliente nao e usado como barreira de seguranca.
- A excecao de valor para `TEACHER` e estritamente pessoal: somente `Sale.buyerUserId=session.user.id`, `settlementType=MONTHLY_INVOICE` e `status=COMPLETED`; faturas de outros professores e vendas dos alunos nao entram nessa leitura.
- Fatura pessoal de professor nao cria nem reutiliza `FinancialStudent`/`FinancialPayment`. `Mensalidade` aparece como `Nao se aplica`; itens do PDV aparecem como `Doces`.
- Apenas `ADMIN` confirma ou reabre faturas separadas de produtos. A action aceita somente comprador registrado `STUDENT` ou `TEACHER`, valida role e pertencimento de cada `Sale`, atualiza apenas os IDs esperados e registra eventos distintos de aluno ou equipe no `FinancialLog`.
- Compra de aluno usa a mensalidade atual somente quando o `FinancialPayment` esta ativo e nao pago. Se estiver pago, fechado ou ausente, a venda permanece separada por `buyerStudentProfileId`, `buyerUserId`, ano e mes; assim, uma compra nova nunca faz uma mensalidade quitada voltar a parecer pendente.
- A competencia da Teacher usa `FinancialPayment.snapshotName`, `snapshotUnit`, `snapshotPaymentDay`, `isPaid`, `paidAt` e `isActive`. Campos monetarios podem ser lidos apenas no servidor para calcular `Completar`, mas sao removidos pela projecao antes de chegar ao componente.
- `STUDENT` nao acessa nenhuma superficie financeira.
- O formulario de entrada carrega todos os `StudentProfile` dos polos Ivaté e Douradina para o Admin, mesmo quando o filtro principal da planilha esta em um polo especifico. A busca e o filtro do seletor acontecem somente sobre esses dados ja autorizados.
- Ao selecionar um aluno do AVA, a criacao envia `studentProfileId` e grava o vinculo explicito em `FinancialStudent.studentProfileId`; nome, email, telefone e unidade sao apenas o preenchimento inicial revisavel do cadastro financeiro.
- A mesma transaction garante um `AgendaStudent.studentProfileId` para esse aluno. Se a rotina ainda nao foi definida, o registro fica vinculado e incompleto, sem criar ocorrencias artificiais.
- Um `StudentProfile` ja vinculado, inativo ou sem role `STUDENT` nao pode ser adicionado pelo seletor. A action valida novamente no servidor, usa lock transacional e a restricao unica do banco para bloquear cliques concorrentes e duplicidade.
- `Criar novo aluno` substitui o antigo cadastro financeiro sem login. Sem `studentProfileId`, email/login e senha inicial sao obrigatorios; a action cria `User role=STUDENT`, `StudentProfile`, `FinancialStudent`, `FinancialPayment` e `AgendaStudent` na mesma transaction. O login sugerido usa `nome.sobrenome@candy.local`, pode ser editado e nao pode duplicar outro `User` ou cadastro financeiro.
- A senha inicial sugerida usa o primeiro nome simplificado + `candy`, sempre com pelo menos 8 caracteres. Ela fica visivel/editavel somente no cliente durante a criacao, e o servidor persiste apenas `passwordHash` com bcrypt. Depois do sucesso, a tela mostra as credenciais uma unica vez para entrega ao aluno.
- Excecao controlada: ao converter pre-cadastro proprio/atribuido, `TEACHER` pode disparar a criacao linkada de um `FinancialStudent` e seus `FinancialPayment` dentro da transaction de `Tornar aluno`, sem acessar a tela financeira nem consultar outros alunos/unidades.
- `FinancialStudent` guarda o cadastro recorrente/base do aluno financeiro, incluindo a unidade atual do aluno.
- `FinancialStudent.studentProfileId` identifica o mesmo aluno do AVA e da Agenda. Edicoes de nome, telefone ou polo sincronizam os cadastros atuais, enquanto snapshots de meses anteriores continuam congelados.
- `FinancialStudent.installmentsTotal` e opcional; quando vazio, o aluno segue como mensalidade recorrente normal.
- `FinancialPayment` guarda a linha mensal: mes, ano, status, data paga, observacao, `isActive` e snapshot de nome, valor, unidade, dia de pagamento, forma, telefone, CPF, email, endereco e dados de parcela quando houver.
- `FinancialPayment.snapshotUnit` preserva a unidade daquele mes; meses antigos nao mudam se o cadastro do aluno trocar de unidade depois.
- Valores de `Sale` nunca devem ser incorporados automaticamente ao snapshot de mensalidade. Um relatorio pode somar os dois totais visualmente, mas as origens permanecem separadas e auditaveis.
- `FinancialPayment.snapshotInstallmentNumber` e `snapshotInstallmentsTotal` registram a parcela daquele mes, como `1/12`, sem alterar pagamentos antigos.
- Observacao e pagamento sao por mes; ao trocar mes, esses campos nao devem carregar automaticamente de outro mes.
- Ao criar aluno recorrente em um mes, o sistema cria linhas daquele mes ate dezembro de 2026; meses anteriores nao recebem o novo aluno automaticamente.
- Ao criar aluno com quantidade de parcelas, o sistema cria apenas as parcelas possiveis daquele mes ate dezembro de 2026.
- Ao converter pre-cadastro em aluno, o financeiro usa a mesma regra de meses/snapshots: cria `FinancialStudent` e `FinancialPayment` do mes atual ate dezembro de 2026 ou ate o fim das parcelas. Se mensalidade, dia ou forma estiverem ausentes, a conversao continua dentro da mesma transaction com valor `0` quando necessario, dia tecnico seguro e forma `A_DEFINIR`; a UI mostra `Completar`, exclui a linha provisoria dos totais e bloqueia a confirmacao de pagamento ate o Admin salvar dados fixos validos. Depois da edicao, os snapshots atualizados passam a mostrar `Completo` em verde e retomam o status mensal normal.
- Ao editar dados fixos em um mes, a edicao vale do mes selecionado em diante; meses anteriores ficam preservados.
- Ao editar dados fixos/parcelas, meses existentes que continuam dentro do novo plano voltam a `isActive=true`; meses fora do plano ficam inativos quando houver total de parcelas.
- Ao retirar aluno em um mes, a UI permite inativar apenas o mes selecionado ou encerrar a partir daquele mes, sempre por soft remove em `FinancialPayment.isActive=false`.
- Alunos ativos no mes aparecem ordenados por dia de pagamento crescente.
- Status padrao e pendente; linhas ainda nao pagas usam fundo amarelo para leitura rapida e o badge continua distinguindo pendente de atrasado. Ao marcar como pago, a linha fica verde e recebe data paga.
- A decisao de vencido, o mes inicial, a data padrao de gasto e os horarios do log usam uma referencia unica em `America/Sao_Paulo`, passada pelo servidor para evitar divergencia entre SSR e navegador perto da meia-noite.
- Indicador de devedores conta alunos pendentes cujo dia previsto ja passou no mes selecionado.
- `FinancialLog` registra criacao, edicao, status, exclusao e exportacao.
- O log financeiro fica recolhido por padrao em um card separado abaixo da lista para nao alongar a tela de cobranca.
- Valor, data paga e observacao podem ser ajustados por mes no historico do aluno, sem alterar automaticamente os outros meses.
- `FinancialExpense` guarda gastos internos por ano/mes/unidade, com insumo, data da compra, valor, pessoa responsavel e observacao opcional.
- A data do gasto precisa pertencer ao mes selecionado, para o relatorio mensal nao misturar compras de outro mes.
- Quando a Secretaria abre o financeiro com `unit=IVATE` ou `unit=DOURADINA`, a leitura server-side carrega alunos que possuem pagamentos ativos em 2026 com aquele `FinancialPayment.snapshotUnit`, e nao apenas pela unidade atual do cadastro. Isso preserva meses antigos se o aluno trocar de unidade depois.
- O filtro `unit=IVATE` ou `unit=DOURADINA` tambem limita os pagamentos mensais pelo `snapshotUnit` e os gastos internos por `FinancialExpense.unit`. Sem `unit`, ou com `unit=all`, o painel mostra todos os polos.

## Decisoes tecnicas tomadas

- A estrutura recorrente substituiu `FinancialEntry`.
- `FinancialPayment` passou a guardar snapshots mensais para impedir que alteracoes futuras reescrevam meses ja fechados.
- Remocao de aluno financeiro e soft remove da linha mensal atual com `isActive=false`, nao hard delete.
- Exportacao PDF/Excel acontece no cliente com os dados ja carregados na pagina autorizada.
- Exportacoes registram log via server action.
- Dados extras e observacao ficam recolhidos para reduzir poluicao visual.
- `Adicionar ou criar aluno` fica recolhido por padrao para a planilha mensal ocupar o foco da tela. Ao abrir, a lista pesquisavel sempre traz os dois polos e informa se o aluno esta disponivel, inativo ou ja incluido; selecionar um disponivel preenche os dados antes de completar a mensalidade, enquanto `Criar novo aluno` prepara login e senha.
- A tela do financeiro foi simplificada para uso diario: topo com totais previstos/recebidos/pendentes/atrasados, formulario curto, seletor de mes com setas anterior/proximo, busca por nome/telefone e filtros por status e polo.
- A tela do financeiro prioriza leitura mensal em largura ampliada: cards de resumo com progresso, filtros de situacao com contadores e linhas compactas tipo planilha com aluno, mes, mensalidade, vencimento, status e acao; o detalhe so divide a tela em monitores muito largos e, no mobile, cada linha reorganiza os mesmos dados sem rolagem horizontal da pagina.
- A planilha mensal e agrupada pelo `snapshotUnit`, com cabecalho verde para `Polo 1 - Ivaté` e azul para `Polo 2 - Douradina`. Cada grupo mostra quantidade, pagos e total exibido. O painel de historico fica fechado ate o Admin selecionar uma linha, preservando a largura total da planilha na leitura inicial.
- O mes inicial vem da data atual em `America/Sao_Paulo`; setas e seletor no topo trocam a competencia sem alterar os snapshots dos outros meses.
- O resumo mensal usa quatro metricas semanticas de largura estavel (`Total previsto`, `Recebido`, `A receber` e `Atrasados`) e uma unica faixa de progresso para evitar numeros comprimidos ou informacao repetida. A navegacao anual permite rolagem horizontal em telas menores, e os cards de aluno usam tonalidade leve por status com nome, valor, vencimento e unidade em hierarquia clara.
- O financeiro abre com dois blocos internos grandes: `Alunos`, para mensalidades/parcelas e historico de cada aluno, e `Pagamentos`, para gastos/insumos da loja no mes selecionado.
- A area `Pagamentos` e controle interno separado: nao mostra totais de alunos, recebidos, pendentes, atrasados nem saldo baseado em mensalidades.
- A area `Pagamentos` usa resumo mensal proprio, totais por Polo 1/Polo 2, filtro de polo sincronizado com a aba de alunos, formulario compacto com observacao recolhida e lista em tabela no desktop para facilitar leitura de insumo, data, responsavel, polo e valor.
- As unidades fixas do financeiro sao `IVATE` (`Unidade 1 Ivaté`) e `DOURADINA` (`Unidade 2 Douradina`); registros antigos entram por padrao como `IVATE`.
- A UI mostra chips de polo no topo do financeiro, perto do filtro de mes. Os cards/listas exibem badge `Polo 1 - Ivaté` ou `Polo 2 - Douradina`; em `Todos`, os gastos exibem totais separados por polo e total geral.
- O Financeiro possui modo proprio na tela de escolha e na sidebar de Admin/Teacher. O parametro `unit=all|IVATE|DOURADINA` continua inicializando o filtro sem alterar snapshots antigos; para Teacher, ele alterna entre todos os alunos ativos ou o polo selecionado.
- Clicar em um card abre o painel de historico com dados fixos, meses/parcelas, observacoes, edicao do pagamento mensal e acoes de inativacao.
- Exportacao PDF/Excel continua no cliente com dados autorizados ja carregados, mas deixou de ser o centro do fluxo.
- A migration de recorrencia preserva linhas antigas convertendo-as para aluno financeiro e pagamento mensal.
- A migration `20260511110000_finance_month_snapshots` preenche snapshots e cria linhas mensais ausentes de 2026 para alunos ja existentes.
- A migration `20260625120000_simple_finance_installments` adiciona apenas metadados opcionais de parcelas; dados antigos continuam com `NULL` e sao tratados como mensalidade recorrente.
- A migration `20260713120000_financial_expenses` adiciona `FinancialExpense` para registrar gastos mensais internos sem misturar com `FinancialPayment`.
- A migration `20260713133000_financial_units` adiciona `FinancialUnit`, `FinancialStudent.unit`, `FinancialPayment.snapshotUnit` e `FinancialExpense.unit`.
- A migration `20260714170000_linked_pre_registration_conversion` adiciona o vinculo de conversao entre `StudentPreRegistration` e `FinancialStudent`.

## Riscos ao alterar esta parte

- Misturar dados recorrentes e mensais pode fazer observacoes ou alteracoes de aluno vazarem para meses errados.
- Remover ordenacao por `paymentDay` prejudica uso tipo planilha.
- Apagar fisicamente `FinancialStudent` remove pagamentos mensais por cascade; a UI deve retirar apenas a linha mensal atual por `isActive=false`.
- Encerrar aluno financeiro deve continuar inativando snapshots mensais, nunca apagando o cadastro nem pagamentos antigos.
- Alterar parcelas precisa manter meses anteriores fechados e nao recalcular historico ja pago.
- Transformar exportacao em endpoint publico pode vazar dados financeiros.
- Alterar calculo de devedores sem considerar ano/mes pode gerar alerta errado.
- Editar snapshots de meses anteriores por engano quebra o conceito de mes fechado.
- Misturar `FinancialExpense` com `FinancialPayment` pode confundir entradas de alunos com saidas da loja; manter as abas e tabelas separadas.
- Ler a unidade do cadastro atual em vez de `FinancialPayment.snapshotUnit` pode reescrever visualmente meses antigos; historico deve usar snapshot.

## Pendencias

- Nao ha importacao em massa de planilha.
- Nao ha relatorio anual consolidado.
- Nao ha pagamento online nem conciliacao.
- Nao ha auditoria financeira avancada alem do log simples.
- Nao ha edicao/exclusao de gastos da aba `Pagamentos`; por enquanto o fluxo e apenas registrar e consultar por mes.

## Como pode evoluir

- Adicionar busca e filtros.
- Adicionar importacao CSV/Excel com validacao.
- Criar relatorio anual por aluno.
- Manter testes de regressao para impedir que valores ou atalhos Admin aparecam na consulta Teacher.
- Integrar pagamento online apenas se houver decisao explicita e revisao de seguranca.
