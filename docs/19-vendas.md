# 19 - Vendas (PDV interno)

## Objetivo

`/ava/vendas` e o ponto de venda interno da Candy English. Ele controla catalogo, custo, preco de venda, estoque, comprador, forma de liquidacao e historico auditavel sem alterar o Financeiro de mensalidades.

## Acesso

- `ADMIN`: ve todos os alunos e todas as vendas; pode manter produtos, vender e estornar.
- `TEACHER`: ve apenas alunos vinculados por `StudentTeacherAssignment`; pode manter produtos, vender e consultar/estornar somente vendas registradas por ela.
- `STUDENT`: nao acessa a rota, os dados nem as server actions.

Os filtros de permissao sao repetidos no servidor. Esconder o card ou o menu nao e considerado autorizacao.

## Arquivos principais

- `src/app/ava/vendas/page.tsx`: consultas autorizadas e composicao da pagina.
- `src/app/ava/vendas/actions.ts`: produtos, checkout e estorno.
- `src/components/ava/sales-pos-panel.tsx`: PDV, produtos e historico rapido com estorno.
- `src/lib/sales-domain.ts`: normalizacao, competencia e calculos puros.
- `src/lib/sales-history.ts`: busca normalizada e filtros do historico rapido.
- `src/lib/validations/sales.ts`: contratos Zod.
- `prisma/migrations/20260823233000_add_sales_pos/migration.sql`: tabelas, indices, FKs e checks.

O cadastro de produto abre em um painel expansivel dentro do fluxo da pagina. O formulario ocupa a largura disponivel, empilha os campos no mobile e nao usa sobreposicao absoluta, evitando que nome, custo, valor de venda, estoque ou botao de salvar sejam cortados pelo card do catalogo.

O carrinho usa um unico campo de comprador. `Venda livre` aparece primeiro e aceita qualquer nome ou descricao digitada; abaixo ficam todos os alunos que a role logada pode acessar, filtrados no mesmo campo por nome ou email. Ao escolher um aluno, o polo vem automaticamente do `StudentProfile`; em venda livre, a equipe escolhe o polo manualmente.

## Dados

- `SaleProduct` guarda nome normalizado unico, foto WebP opcional, custo, preco, estoque, estado e auditoria de criacao/edicao.
- `Sale` guarda comprador, snapshots, liquidacao, forma de pagamento, competencia, data combinada da fatura, totais, operador e cancelamento.
- `SaleItem` preserva nome, custo e preco usados no momento da venda, mesmo que o produto seja editado depois.

Valores monetarios sao inteiros em centavos. Estoque e quantidade sao inteiros nao negativos.

## Regras do checkout

- Cadastro e edicao de produto aceitam PNG, JPG ou WebP de ate 8 MB.
- A previa mostra a linha do recorte 4:3; o servidor centraliza, recorta para `1200x900` e salva somente WebP no volume `storage/sale-product-images`.
- A foto e opcional. Produtos antigos ou sem foto continuam usando o icone do catalogo.
- A imagem e servida por rota autenticada somente para `ADMIN` e `TEACHER`; o caminho privado do arquivo nao e enviado ao client.
- Ao trocar ou remover a foto, o arquivo anterior e limpo depois que a atualizacao do banco termina com sucesso.
- O runtime Docker leva os pacotes nativos `@img` da plataforma e o `sharp` so e carregado durante a conversao, preservando o health check das demais rotas.
- `PAID_NOW` exige forma de pagamento e aceita aluno cadastrado ou nome avulso.
- `MONTHLY_INVOICE` exige `StudentProfile` ativo, mensalidade ativa ainda nao paga e uma `invoiceDueDate` dentro da competencia atual no fuso `America/Sao_Paulo`.
- Nome digitado livremente nunca cria divida mensal, pois nao existe identidade confiavel para cobrar depois.
- Produto inativo, preco alterado ou estoque insuficiente interrompe toda a venda.
- O cliente envia `expectedUpdatedAt` e `expectedSalePriceCents`; preco, estado, permissao e estoque sao relidos no servidor. Se a versao mudou, o checkout para e pede revisao, sem cobrar valor diferente do exibido.
- Baixa de estoque e criacao da venda ocorrem na mesma transaction Prisma. A linha da fatura mensal e bloqueada com `FOR UPDATE` antes da confirmacao para nao receber venda durante pagamento/fechamento concorrente.
- `operationId` torna o checkout idempotente: repeticao ou clique simultaneo do mesmo pedido devolve a venda ja registrada sem baixar estoque outra vez.

## Financeiro e fatura mensal

A compra mensal e uma cobranca do ledger `Sale`, identificada por `invoiceYear` e `invoiceMonth` e vinculada ao `FinancialPayment` ativo da competencia. Ela nao modifica `FinancialPayment.snapshotAmountCents`, status ou historico da mensalidade escolar. O Financeiro apresenta mensalidade, produtos e total consolidado, mantendo as duas origens separadas.

`invoiceDueDate` registra o dia combinado para cobrar a compra dentro da fatura atual. Escolher outro dia nao move nem recria a mensalidade: a venda continua ligada ao mesmo `FinancialPayment` do mes. Datas fora do mes financeiro corrente sao recusadas no servidor.

Nao ha gateway nem cobranca online: a forma de pagamento informa apenas como a venda interna foi liquidada.

## Historico rapido e estorno

O historico aparece no topo do PDV e lista as 40 vendas mais recentes autorizadas para a role. A busca localiza cliente, vendedor ou produto sem diferenciar acentos; os filtros separam todas, concluidas e estornadas. Admin ve o movimento geral e Teacher continua recebendo apenas as proprias vendas pelo filtro server-side.

Venda concluida nao e apagada. O estorno exige motivo e confirmacao explicita, registra operador/data e bloqueia venda, fatura e reposicao de estoque na mesma transaction. Uma venda estornada nao pode ser estornada novamente. Compra mensal vinculada a uma competencia ja paga ou fechada exige que o Admin reabra a competencia antes do estorno, evitando alterar silenciosamente uma fatura quitada.

## Concorrencia e riscos

- Edicao de produto usa `expectedUpdatedAt`; conflito obriga recarregar em vez de sobrescrever alteracao recente.
- Checkout faz baixa condicional por estoque e versao do produto; falha em um item reverte todos os itens.
- Fatura e venda usam locks de linha no PostgreSQL para serializar fechamento, inclusao e estorno concorrentes.
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
