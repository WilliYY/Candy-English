# Contratos ADMIN na API mobile

## Objetivo

O aplicativo ADMIN consulta e envia os mesmos `ContractDocument` usados pelo
site. O PostgreSQL e o storage privado do backend continuam sendo a fonte
unica: um envio confirmado no app aparece no site e nas contas autorizadas sem
duplicar dados.

## Rotas

- `GET /api/mobile/v1/admin/contracts`: busca, filtro `ALL|GENERAL|STUDENT`,
  cursor e pagina de no maximo 100 contratos.
- `POST /api/mobile/v1/admin/contracts`: multipart com `title`,
  `studentProfileId`, `operationId`, `confirmUpload=true` e `contract`.
- `GET /api/mobile/v1/admin/contracts/[contractId]`: metadados seguros para o
  detalhe ADMIN.
- `GET /api/mobile/v1/contracts/[contractId]`: bytes do PDF, sempre com Bearer
  token e escopo calculado no servidor para `ADMIN`, `TEACHER` ou `STUDENT`.

## Regras preservadas

- Somente `ADMIN` usa catalogo, detalhe administrativo e upload.
- `TEACHER` baixa apenas documento geral ou de aluno vinculado; `STUDENT` baixa
  documento geral ou proprio.
- `storagePath`, e-mail, telefone e outros dados pessoais nao entram nas
  respostas deste modulo.
- O upload exige confirmacao explicita, PDF de ate 8 MB e assinatura `%PDF-`
  real, nao apenas extensao ou MIME declarada.
- `createdByMobileOperationId` e unico. Repetir o mesmo UUID devolve o contrato
  ja criado sem gravar outro arquivo ou registro; reutiliza-lo com titulo ou
  aluno diferentes retorna conflito.
- Falha depois de salvar o arquivo tenta remover o residuo privado antes de
  responder.
- O download responde `private, no-store`, `nosniff`, `Vary: Authorization` e
  nome de arquivo normalizado. O token nunca vai na URL.
- A lista limita opcoes de alunos ativos a 500 e nao trunca silenciosamente.

## Banco e deploy

A migration `20260801234500_mobile_admin_contract_upload` adiciona o campo
opcional e unico `ContractDocument.createdByMobileOperationId`. Execute as
migrations antes de disponibilizar a nova versao da API.

## Verificacao

```powershell
npm.cmd exec tsx -- --test src/lib/__tests__/mobile-admin-contracts.test.ts
npm.cmd run verify:mobile-teacher
```
