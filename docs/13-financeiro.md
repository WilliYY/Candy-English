# 13 - Financeiro

## O que esta parte do sistema faz

O modulo Financeiro e um controle interno do administrador em `/ava/admin?task=financeiro`. Ele funciona como uma lista simples de alunos pagantes, com cards por aluno no mes selecionado, acao rapida para marcar como pago, filtros por status e um painel de historico ao clicar no aluno.

Ele organiza mensalidades e parcelas de 2026 por aluno financeiro, mantendo cada mes como um snapshot proprio para que meses anteriores funcionem como historico fechado.

Nao e gateway de pagamento, nao emite boleto, nao cobra automaticamente e nao integra com banco.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `src/components/ava/admin-finance-panel.tsx`
- `src/app/ava/admin/actions.ts`
- `src/app/ava/admin/page.tsx`
- `src/lib/validations/admin-users.ts`
- `src/lib/ava-nav-alerts.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260510203000_recurring_finance_students/migration.sql`
- `prisma/migrations/20260511110000_finance_month_snapshots/migration.sql`
- `prisma/migrations/20260625120000_simple_finance_installments/migration.sql`

Tabelas:

- `FinancialStudent`
- `FinancialPayment`
- `FinancialLog`

Rota:

- `/ava/admin?task=financeiro`

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` visualiza e escreve no financeiro.
- `FinancialStudent` guarda o cadastro recorrente/base do aluno financeiro.
- `FinancialStudent.installmentsTotal` e opcional; quando vazio, o aluno segue como mensalidade recorrente normal.
- `FinancialPayment` guarda a linha mensal: mes, ano, status, data paga, observacao, `isActive` e snapshot de nome, valor, dia de pagamento, forma, telefone, CPF, email, endereco e dados de parcela quando houver.
- `FinancialPayment.snapshotInstallmentNumber` e `snapshotInstallmentsTotal` registram a parcela daquele mes, como `1/12`, sem alterar pagamentos antigos.
- Observacao e pagamento sao por mes; ao trocar mes, esses campos nao devem carregar automaticamente de outro mes.
- Ao criar aluno recorrente em um mes, o sistema cria linhas daquele mes ate dezembro de 2026; meses anteriores nao recebem o novo aluno automaticamente.
- Ao criar aluno com quantidade de parcelas, o sistema cria apenas as parcelas possiveis daquele mes ate dezembro de 2026.
- Ao editar dados fixos em um mes, a edicao vale do mes selecionado em diante; meses anteriores ficam preservados.
- Ao retirar aluno em um mes, a UI permite inativar apenas o mes selecionado ou encerrar a partir daquele mes, sempre por soft remove em `FinancialPayment.isActive=false`.
- Alunos ativos no mes aparecem ordenados por dia de pagamento crescente.
- Status padrao e pendente; se o dia previsto passou, o card fica atrasado. Ao marcar como pago, o card fica verde e recebe data paga.
- Indicador de devedores conta alunos pendentes cujo dia previsto ja passou no mes selecionado.
- `FinancialLog` registra criacao, edicao, status, exclusao e exportacao.
- O log financeiro fica recolhido por padrao em um card separado abaixo da lista para nao alongar a tela de cobranca.
- Valor, data paga e observacao podem ser ajustados por mes no historico do aluno, sem alterar automaticamente os outros meses.

## Decisoes tecnicas tomadas

- A estrutura recorrente substituiu `FinancialEntry`.
- `FinancialPayment` passou a guardar snapshots mensais para impedir que alteracoes futuras reescrevam meses ja fechados.
- Remocao de aluno financeiro e soft remove da linha mensal atual com `isActive=false`, nao hard delete.
- Exportacao PDF/Excel acontece no cliente com os dados ja carregados na pagina autorizada.
- Exportacoes registram log via server action.
- Dados extras e observacao ficam recolhidos para reduzir poluicao visual.
- A tela do financeiro foi simplificada para uso diario: topo com totais previstos/recebidos/pendentes/atrasados, formulario curto, filtro de mes, busca por nome/telefone, filtro por status e cards coloridos por aluno.
- Clicar em um card abre o painel de historico com dados fixos, meses/parcelas, observacoes, edicao do pagamento mensal e acoes de inativacao.
- Exportacao PDF/Excel continua no cliente com dados autorizados ja carregados, mas deixou de ser o centro do fluxo.
- A migration de recorrencia preserva linhas antigas convertendo-as para aluno financeiro e pagamento mensal.
- A migration `20260511110000_finance_month_snapshots` preenche snapshots e cria linhas mensais ausentes de 2026 para alunos ja existentes.
- A migration `20260625120000_simple_finance_installments` adiciona apenas metadados opcionais de parcelas; dados antigos continuam com `NULL` e sao tratados como mensalidade recorrente.

## Riscos ao alterar esta parte

- Misturar dados recorrentes e mensais pode fazer observacoes ou alteracoes de aluno vazarem para meses errados.
- Remover ordenacao por `paymentDay` prejudica uso tipo planilha.
- Apagar fisicamente `FinancialStudent` remove pagamentos mensais por cascade; a UI deve retirar apenas a linha mensal atual por `isActive=false`.
- Encerrar aluno financeiro deve continuar inativando snapshots mensais, nunca apagando o cadastro nem pagamentos antigos.
- Alterar parcelas precisa manter meses anteriores fechados e nao recalcular historico ja pago.
- Transformar exportacao em endpoint publico pode vazar dados financeiros.
- Alterar calculo de devedores sem considerar ano/mes pode gerar alerta errado.
- Editar snapshots de meses anteriores por engano quebra o conceito de mes fechado.

## Pendencias

- Nao ha importacao em massa de planilha.
- Nao ha filtro/busca por aluno.
- Nao ha relatorio anual consolidado.
- Nao ha pagamento online nem conciliacao.
- Nao ha auditoria financeira avancada alem do log simples.

## Como pode evoluir

- Adicionar busca e filtros.
- Adicionar importacao CSV/Excel com validacao.
- Criar relatorio anual por aluno.
- Adicionar permissao granular se futuramente outras roles precisarem consultar financeiro.
- Integrar pagamento online apenas se houver decisao explicita e revisao de seguranca.
