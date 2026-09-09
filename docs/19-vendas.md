# 19 - Vendas (PDV interno)

## Objetivo

`/ava/vendas` e o ponto de venda interno da Candy English. Ele controla catalogo, custo, preco de venda, estoque, comprador, forma de liquidacao e historico auditavel, somando produtos a fatura sem alterar o valor-base da mensalidade.

## Acesso

- `ADMIN`: ve todos os alunos e todas as vendas; pode manter produtos, vender e estornar.
- `TEACHER`: pode selecionar qualquer aluno ativo e qualquer conta `TEACHER` ativa; pode manter produtos, vender e consultar/estornar somente vendas registradas por ela. No Financeiro, le apenas a propria fatura pessoal de doces.
- `STUDENT`: nao acessa a rota, os dados nem as server actions.

Os filtros de permissao sao repetidos no servidor. Esconder o card ou o menu nao e considerado autorizacao.

## Arquivos principais

- `src/app/ava/vendas/page.tsx`: consultas autorizadas e composicao da pagina.
- `src/app/ava/vendas/actions.ts`: produtos, checkout e estorno.
- `src/components/ava/sales-pos-panel.tsx`: PDV, produtos e historico rapido com estorno.
- `src/lib/sales-domain.ts`: normalizacao, competencia e calculos puros.
- `src/lib/sales-history.ts`: busca normalizada e filtros do historico rapido.
- `src/lib/staff-invoices.ts`: agrupamento seguro das faturas separadas de produtos por comprador e competencia.
- `src/lib/validations/sales.ts`: contratos Zod.
- `prisma/migrations/20260823233000_add_sales_pos/migration.sql`: tabelas, indices, FKs e checks.
- `prisma/migrations/20260831120000_add_teacher_personal_invoices/migration.sql`: vinculo opcional entre `Sale` e a conta compradora.

O cadastro de produto abre em um painel expansivel dentro do fluxo da pagina. O formulario ocupa a largura disponivel, empilha os campos no mobile e nao usa sobreposicao absoluta, evitando que nome, custo, valor de venda, estoque ou botao de salvar sejam cortados pelo card do catalogo.

O carrinho usa um unico campo de comprador. `Venda livre` aparece primeiro e aceita qualquer nome ou descricao digitada; abaixo ficam professores e alunos ativos, identificados por tipo e filtrados no mesmo campo por nome ou email. Ao escolher um aluno, o polo vem automaticamente do `StudentProfile`; para professor ou venda livre, a equipe escolhe o polo da compra.

Produto ativo com estoque `0` continua visivel para permitir reposicao pelo editor, mas o card fica vermelho, mostra `Sem estoque` e `Indisponivel para venda`, remove o hover de disponibilidade e mantem o botao de adicionar desabilitado. O helper de dominio tambem impede inclusao programatica no carrinho; o servidor continua sendo a barreira final.

## Dados

- `SaleProduct` guarda nome normalizado unico, foto WebP opcional, custo, preco, estoque, estado e auditoria de criacao/edicao.
- `Sale` guarda comprador, snapshots, liquidacao, forma de pagamento, competencia, data combinada da fatura, totais, operador e cancelamento. `buyerUserId` liga a venda a uma conta registrada; `buyerStudentProfileId` e `FinancialPayment` continuam identificando especificamente o fluxo do aluno.
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
- `MONTHLY_INVOICE` exige uma identidade registrada. Para aluno, a competencia e escolhida no servidor: mensalidade atual ativa/nao paga recebe a compra; se a atual estiver paga ou inativa, recebe a mensalidade aberta do mes seguinte. Se a proxima tambem estiver fechada ou ausente, o checkout pede revisao ao Admin e nao altera estoque. Aluno sem mensalidade atual mantem a fatura somente de produtos existente. Para professor, exige `User role=TEACHER` ativo e data na competencia atual, gravando a conta pessoal sem `FinancialPayment`.
- Nome digitado livremente nunca cria divida mensal, pois nao existe identidade confiavel para cobrar depois.
- Produto inativo, preco alterado ou estoque insuficiente interrompe toda a venda.
- O cliente envia `expectedUpdatedAt` e `expectedSalePriceCents`; preco, estado, permissao e estoque sao relidos no servidor. Se a versao mudou, o checkout para e pede revisao, sem cobrar valor diferente do exibido.
- Baixa de estoque e criacao da venda ocorrem na mesma transaction Prisma. A linha da fatura mensal e bloqueada com `FOR UPDATE` antes da confirmacao para nao receber venda durante pagamento/fechamento concorrente.
- `operationId` torna o checkout idempotente: repeticao ou clique simultaneo do mesmo pedido devolve a venda ja registrada sem baixar estoque outra vez.

## Financeiro e fatura mensal

A compra mensal e uma cobranca do ledger `Sale`, identificada por `invoiceYear` e `invoiceMonth`. Aluno com mensalidade aberta recebe a compra no `FinancialPayment` atual; mensalidade atual paga/inativa encaminha ao `FinancialPayment` aberto do mes seguinte, incluindo virada dezembro/janeiro. O valor-base, status e historico da mensalidade permanecem intactos. Ausencia de mensalidade atual preserva a cobranca somente de produtos; proxima mensalidade indisponivel apos fechamento exige revisao administrativa, sem criar mensalidade automaticamente. Para professor, `buyerUserId` aponta para a conta pessoal e `financialPaymentId` fica nulo.

O Financeiro do aluno apresenta `Mensalidade`, `Produtos` e total consolidado quando a compra esta vinculada a uma mensalidade aberta. Faturas separadas aparecem no bloco `Produtos de alunos e professores`, identificadas por role, com itens, pendencia e acao de confirmar/reabrir. A Teacher ve apenas a propria conta; o Admin confirma ou reabre essas cobrancas usando os IDs esperados e registra a acao no `FinancialLog`. O perfil da Teacher mostra um indicador clicavel enquanto existir valor pessoal pendente.

Para alunos, `invoiceDueDate` vem do vencimento da mensalidade de destino e o carrinho mostra mes/ano antes da confirmacao. O servidor reavalia a competencia sob lock; se houver fechamento concorrente, pode encaminhar ao proximo mes preservando o dia e ajustando dias inexistentes (31 para 28/29 em fevereiro). Para professores, permanece a data combinada dentro do mes atual. Nenhuma data arbitraria cria/reabre mensalidade.

Em 08/09/2026 foi corrigida a consulta de checkout que usava a coluna inexistente `FinancialPayment.financialStudentId`; o campo real e `studentId`. A consulta agora bloqueia as duas competencias por esse campo e a venda completa e coberta por smoke HTTP autenticado. A falha anterior era transacional e nao consumia estoque.

O detalhe e o historico do Financeiro mostram cada produto sem truncar: `Kit Kat · 1 unidade · R$ 3,00 cada`, com total da linha ao lado, subtotal de produtos, mensalidade e total consolidado.

Nao ha gateway nem cobranca online: a forma de pagamento informa apenas como a venda interna foi liquidada.

## Historico rapido e estorno

O historico aparece no topo do PDV e lista as 40 vendas mais recentes autorizadas para a role. A busca localiza cliente, vendedor ou produto sem diferenciar acentos; os filtros separam todas, concluidas e estornadas. Admin ve o movimento geral e Teacher continua recebendo apenas as proprias vendas pelo filtro server-side.

Venda concluida nao e apagada. O estorno exige motivo e confirmacao explicita, registra operador/data e bloqueia venda, fatura e reposicao de estoque na mesma transaction. Uma venda estornada nao pode ser estornada novamente. Compra vinculada a uma mensalidade paga/fechada ou fatura separada de aluno/professor ja quitada precisa ser reaberta pelo Admin antes do estorno.

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
npm run audit:sales-invoice
npm run prisma:validate
npm run lint
npm run typecheck
npm run build
docker compose --profile tools run --rm audit-server-smoke npm run audit:sales-invoice
```

O smoke usa contas, produto, mensalidades e vendas temporarias exclusivas; verifica permissao, checkout real, total discriminado, idempotencia, mes pago/inativo, proxima fatura indisponivel, estorno e estoque zero, limpando somente seus proprios dados em `finally`. Nao usa produtos nem cobrancas reais.

### Evidencia da correcao em 09/09/2026

- Antes da correcao, o smoke HTTP reproduziu o erro no checkout da mensalidade; o rollback e a limpeza das fixtures funcionaram.
- Commit `a535750`: `test:sales` 34/34 e `test:mobile-homework` 261/261; schema, tipos, lint e builds Windows/Docker aprovados.
- Na imagem candidata interna do Oracle (sem porta publica), `audit:sales-invoice` passou em todos os cenarios acima, incluindo duas requisicoes simultaneas com o mesmo `operationId`. Fixtures e container foram removidos.
- Versao final `7b95a0f`, com a atualizacao de seguranca de `docs/11-seguranca.md`, publicada no Oracle em 09/09/2026. GitHub Actions aprovado; `test:mobile-homework` 261/261, `test:mobile-auth` 9/9, tipos, lint e build Docker aprovados.
- Na versao publicada, `audit:server-smoke`, `audit:sales-invoice`, `audit:auth-smoke`, `audit:avatar-smoke` e `audit:mobile-auth` retornaram sucesso. Google OAuth foi ignorado pelo smoke porque nao esta configurado nesse ambiente; login por senha foi validado nas tres roles. Health publico HTTP 200, app `healthy`, zero reinicios, Next.js `15.5.25` e Sharp `0.35.4` conferidos no container. Nenhuma migration ou cobranca real foi aplicada; fixtures e arquivos temporarios do teste foram removidos.
