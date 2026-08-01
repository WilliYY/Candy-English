# Operações seguras do ADMIN na API mobile

## Objetivo

O aplicativo ADMIN controla o mesmo `AppSetting` de manutenção usado pelo site.
A mudança entra no PostgreSQL compartilhado e passa a valer para os dois canais
sem duplicar configuração.

## Rota

- `GET /api/mobile/v1/admin/operations`: devolve somente o estado global de
  manutenção, a versão `updatedAt`, a data de geração e o total agregado de
  bytes no storage privado.
- `PATCH /api/mobile/v1/admin/operations`: recebe `enabled`,
  `expectedUpdatedAt`, `operationId` e `confirmChange=true`.

## Proteções

- As duas operações exigem sessão Bearer válida e role `ADMIN`.
- A resposta não contém nomes ou caminhos de arquivos, chaves de API, senhas,
  credenciais administrativas, variáveis de ambiente ou configuração interna.
- O total de armazenamento usa cache de 30 segundos para evitar varrer o disco
  em todo ciclo de atualização do aplicativo.
- A alteração exige confirmação explícita e compara `expectedUpdatedAt`; uma
  mudança feita pelo site ou por outro aparelho retorna conflito.
- Uma trava transacional serializa mudanças móveis. O
  `MobileAdminMaintenanceOperation.operationId` torna retries idempotentes e
  impede reutilizar o UUID com outro ator ou outra intenção.
- Corridas com a action do site são detectadas por `updateMany` condicionado à
  versão. Violações de unicidade viram conflito, sem declarar sucesso incerto.
- Ativar manutenção bloqueia alunos; contas `ADMIN` e `TEACHER` continuam
  disponíveis para correções, como já ocorre no painel web.

## Banco e deploy

A migration `20260802000000_mobile_admin_operations` cria somente o registro de
idempotência operacional. O estado continua no `AppSetting` já usado pelo site.
Execute a migration antes de publicar a versão da API.

## Verificação

```powershell
npm.cmd exec tsx -- --test src/lib/__tests__/mobile-admin-operations.test.ts
npm.cmd run verify:mobile-teacher
```
