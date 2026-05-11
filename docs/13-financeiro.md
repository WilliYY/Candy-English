# 13 - Financeiro

## O que esta parte do sistema faz

O modulo Financeiro e um controle interno do administrador em `/ava/admin?task=financeiro`. Ele organiza mensalidades de 2026 por aluno financeiro recorrente, mantendo cada mes como um snapshot proprio para que meses anteriores funcionem como historico fechado.

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

Tabelas:

- `FinancialStudent`
- `FinancialPayment`
- `FinancialLog`

Rota:

- `/ava/admin?task=financeiro`

## Regras de negocio que precisam ser preservadas

- Apenas `ADMIN` visualiza e escreve no financeiro.
- `FinancialStudent` guarda o cadastro recorrente/base do aluno financeiro.
- `FinancialPayment` guarda a linha mensal: mes, ano, status, data paga, observacao, `isActive` e snapshot de nome, valor, dia de pagamento, forma, telefone, CPF, email e endereco.
- Observacao e pagamento sao por mes; ao trocar mes, esses campos nao devem carregar automaticamente de outro mes.
- Ao criar aluno em um mes, o sistema cria linhas daquele mes ate dezembro de 2026; meses anteriores nao recebem o novo aluno automaticamente.
- Ao editar dados recorrentes em um mes, a edicao vale do mes selecionado em diante; meses anteriores ficam preservados.
- Ao retirar aluno em um mes, apenas a linha daquele mes fica inativa; os outros meses continuam seguindo os registros ativos ja criados.
- Alunos ativos no mes aparecem ordenados por dia de pagamento crescente.
- Status padrao e pendente/vermelho.
- Ao marcar como pago, o status fica verde e pode receber data paga.
- Indicador de devedores conta alunos pendentes cujo dia previsto ja passou no mes selecionado.
- `FinancialLog` registra criacao, edicao, status, exclusao e exportacao.

## Decisoes tecnicas tomadas

- A estrutura recorrente substituiu `FinancialEntry`.
- `FinancialPayment` passou a guardar snapshots mensais para impedir que alteracoes futuras reescrevam meses ja fechados.
- Remocao de aluno financeiro e soft remove da linha mensal atual com `isActive=false`, nao hard delete.
- Exportacao PDF/Excel acontece no cliente com os dados ja carregados na pagina autorizada.
- Exportacoes registram log via server action.
- Dados extras e observacao ficam recolhidos para reduzir poluicao visual.
- A migration de recorrencia preserva linhas antigas convertendo-as para aluno financeiro e pagamento mensal.
- A migration `20260511110000_finance_month_snapshots` preenche snapshots e cria linhas mensais ausentes de 2026 para alunos ja existentes.

## Riscos ao alterar esta parte

- Misturar dados recorrentes e mensais pode fazer observacoes ou alteracoes de aluno vazarem para meses errados.
- Remover ordenacao por `paymentDay` prejudica uso tipo planilha.
- Apagar fisicamente `FinancialStudent` remove pagamentos mensais por cascade; a UI deve retirar apenas a linha mensal atual por `isActive=false`.
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
