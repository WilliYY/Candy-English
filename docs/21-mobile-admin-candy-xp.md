# Candy XP ADMIN na API mobile

## Objetivo

O aplicativo ADMIN consulta e altera os mesmos `CandyXpActivity`, entregas e
eventos de XP usados pelo site. PostgreSQL continua sendo a fonte única: edição,
liberação, feedback e XP confirmado aparecem nos dois canais sem sincronização
paralela ou duplicação de dados.

## Rotas

- `GET /api/mobile/v1/admin/candy-xp`: busca, filtro
  `ALL|DRAFT|PUBLISHED|ARCHIVED`, cursor, página de até 50 atividades, indicadores
  e ranking privado.
- `GET /api/mobile/v1/admin/candy-xp/[activityId]`: metadados, perguntas,
  gabarito, campos interativos, até 50 entregas recentes e alunos ativos para
  liberação.
- `PATCH /api/mobile/v1/admin/candy-xp/[activityId]`: atualiza metadados, status
  e liberação com `confirmChange=true`, `expectedUpdatedAt` e `operationId`.
- `POST /api/mobile/v1/admin/candy-xp/submissions/[submissionId]/review`:
  confirma `APPROVE|RETURN`, feedback, versão esperada e `operationId`.

## Proteções

- Todas as rotas exigem sessão Bearer válida e role `ADMIN`; a role também é
  validada antes de qualquer acesso ao banco no serviço de domínio.
- Catálogo e ranking não devolvem e-mail, telefone, documento, `userId`, caminho
  de avatar, `storagePath` ou gabarito.
- O gabarito é devolvido somente no detalhe ADMIN necessário para correção.
- Respostas possuem limites de atividades, vínculos, alunos, perguntas, campos,
  entregas e tamanho agregado de respostas; excesso vira `RESULT_LIMIT`.
- Escritas usam advisory locks, versão otimista e registro idempotente com hash
  da intenção. Reutilizar um UUID com ator, alvo ou payload diferente é conflito.
- Aprovação concede XP transacionalmente pelo ledger `CandyXpEvent` com chave de
  origem única. Retry não duplica prêmio e o cache `CandyXpProfile` é atualizado
  após a transação.
- Liberação individual aceita somente perfil de aluno ativo. A troca de vínculos
  ocorre na mesma transação da edição da atividade.

## Banco e deploy

A migration `20260802003000_mobile_admin_candy_xp_operations` cria
`MobileAdminCandyXpOperation`, usada somente para idempotência administrativa.
Execute a migration antes de publicar a API. Atividades, entregas e XP continuam
nas tabelas compartilhadas já usadas pelo site.

## Verificação

```powershell
npx.cmd tsx --test src/lib/__tests__/mobile-admin-candy-xp.test.ts
npm.cmd run verify:mobile-teacher
```
