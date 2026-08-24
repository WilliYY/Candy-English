# 19 - Vendas (PDV interno)

## Objetivo

`/ava/vendas` e o ponto de venda interno da Candy English. Ele controla catalogo, custo, preco de venda, estoque, comprador, forma de liquidacao e historico auditavel sem alterar o Financeiro de mensalidades.

## Acesso

- `ADMIN`: ve todos os alunos e todas as vendas; pode manter produtos, vender e cancelar.
- `TEACHER`: ve apenas alunos vinculados por `StudentTeacherAssignment`; pode manter produtos, vender e consultar/cancelar somente vendas registradas por ela.
- `STUDENT`: nao acessa a rota, os dados nem as server actions.

Os filtros de permissao sao repetidos no servidor. Esconder o card ou o menu nao e considerado autorizacao.

## Arquivos principais

- `src/app/ava/vendas/page.tsx`: consultas autorizadas e composicao da pagina.
- `src/app/ava/vendas/actions.ts`: produtos, checkout e cancelamento.
- `src/components/ava/sales-pos-panel.tsx`: abas PDV, Produtos e Historico.
- `src/lib/sales-domain.ts`: normalizacao, competencia e calculos puros.
- `src/lib/validations/sales.ts`: contratos Zod.
- `prisma/migrations/20260823233000_add_sales_pos/migration.sql`: tabelas, indices, FKs e checks.

O cadastro de produto abre em um painel expansivel dentro do fluxo da pagina. O formulario ocupa a largura disponivel, empilha os campos no mobile e nao usa sobreposicao absoluta, evitando que nome, custo, valor de venda, estoque ou botao de salvar sejam cortados pelo card do catalogo.

## Dados

- `SaleProduct` guarda nome normalizado unico, custo, preco, estoque, estado e auditoria de criacao/edicao.
- `Sale` guarda comprador, snapshots, liquidacao, forma de pagamento, competencia, totais, operador e cancelamento.
- `SaleItem` preserva nome, custo e preco usados no momento da venda, mesmo que o produto seja editado depois.

Valores monetarios sao inteiros em centavos. Estoque e quantidade sao inteiros nao negativos.

## Regras do checkout

- `PAID_NOW` exige forma de pagamento e aceita aluno cadastrado ou nome avulso.
- `MONTHLY_INVOICE` exige `StudentProfile` ativo, mensalidade ativa ainda nao paga e grava a competencia no fuso `America/Sao_Paulo`.
- Nome digitado livremente nunca cria divida mensal, pois nao existe identidade confiavel para cobrar depois.
- Produto inativo, preco alterado ou estoque insuficiente interrompe toda a venda.
- O cliente envia `expectedUpdatedAt` e `expectedSalePriceCents`; preco, estado, permissao e estoque sao relidos no servidor. Se a versao mudou, o checkout para e pede revisao, sem cobrar valor diferente do exibido.
- Baixa de estoque e criacao da venda ocorrem na mesma transaction Prisma. A linha da fatura mensal e bloqueada com `FOR UPDATE` antes da confirmacao para nao receber venda durante pagamento/fechamento concorrente.
- `operationId` torna o checkout idempotente: repeticao ou clique simultaneo do mesmo pedido devolve a venda ja registrada sem baixar estoque outra vez.

## Financeiro e fatura mensal

A compra mensal e uma cobranca do ledger `Sale`, identificada por `invoiceYear` e `invoiceMonth` e vinculada ao `FinancialPayment` ativo da competencia. Ela nao modifica `FinancialPayment.snapshotAmountCents`, status ou historico da mensalidade escolar. O Financeiro apresenta mensalidade, produtos e total consolidado, mantendo as duas origens separadas.

Nao ha gateway nem cobranca online: a forma de pagamento informa apenas como a venda interna foi liquidada.

## Cancelamento

Venda concluida nao e apagada. O cancelamento exige motivo, registra operador/data e bloqueia venda, fatura e reposicao de estoque na mesma transaction. Uma venda cancelada nao pode ser cancelada novamente. Compra mensal vinculada a uma competencia ja paga ou fechada exige que o Admin reabra a competencia antes do cancelamento, evitando alterar silenciosamente uma fatura quitada.

## Concorrencia e riscos

- Edicao de produto usa `expectedUpdatedAt`; conflito obriga recarregar em vez de sobrescrever alteracao recente.
- Checkout faz baixa condicional por estoque e versao do produto; falha em um item reverte todos os itens.
- Fatura e venda usam locks de linha no PostgreSQL para serializar fechamento, inclusao e cancelamento concorrentes.
- Excluir produto foi evitado para preservar FKs e auditoria; use `Ativo`/`Inativo`.
- Custo fica visivel para Admin e Teacher porque ambos foram autorizados a gerenciar o PDV.
- A migration deve ser aplicada antes de publicar a nova aplicacao.

## Validacao

```bash
npm run test:sales
npm run prisma:validate
npm run lint
npm run typecheck
npm run build
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm auth-smoke
```
