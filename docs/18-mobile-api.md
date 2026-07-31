# 18 - API móvel

## Objetivo

O aplicativo Candy English para Android e iOS usa o mesmo backend Next.js,
PostgreSQL, usuários, roles e regras do AVA web. A API fica sob
`/api/mobile/v1` e nunca expõe acesso direto ao banco ou ao storage.

## Autenticação

Rotas:

- `POST /api/mobile/v1/auth/login`
- `POST /api/mobile/v1/auth/refresh`
- `POST /api/mobile/v1/auth/logout`
- `GET /api/mobile/v1/auth/me`

O login usa `authenticatePasswordCredentials`, a mesma verificação de senha,
usuário ativo, rate limit e manutenção do site. O app recebe um access token de
15 minutos e um refresh token rotativo de 30 dias.

Controles:

- tokens aleatórios com prefixos diferentes;
- somente SHA-256 dos tokens no PostgreSQL;
- refresh de uso único, com detecção de replay;
- vínculo com `MobileDevice.installationId`;
- revogação por logout, replay, usuário inativo ou `User.sessionVersion`;
- respostas `no-store`, request ID e mensagens sem segredo;
- senha usada apenas no login e nunca persistida pelo app.

## Dados por role

- `GET /api/mobile/v1/overview` devolve indicadores e próximo item autorizados.
- `GET /api/mobile/v1/modules/[module]` devolve listas nativas normalizadas.
- `GET /api/mobile/v1/chat/threads` lista somente vínculos autorizados.
- `GET /api/mobile/v1/chat/messages` carrega a conversa do vínculo.
- `POST /api/mobile/v1/chat/messages` envia mensagem pelo serviço de domínio
  compartilhado com o site.
- `GET /api/mobile/v1/homeworks/[homeworkId]` carrega detalhe, entrega e
  feedback da homework autorizada do aluno.
- `POST /api/mobile/v1/homeworks/[homeworkId]/submit` envia homework `TEXT`
  pelo mesmo serviço de domínio usado no AVA web.
- `GET /api/mobile/v1/lessons/[lessonId]` entrega somente a aula `PUBLISHED`
  vinculada ao aluno, com materiais, vocabulário e homeworks. Materiais externos
  são expostos ao app somente quando usam HTTPS e não contêm credenciais na URL.
- `PUT /api/mobile/v1/homeworks/[homeworkId]/interactive` salva o rascunho
  interativo de forma idempotente.
- `POST /api/mobile/v1/homeworks/[homeworkId]/interactive` entrega a atividade
  interativa e bloqueia reenvio divergente.
- `GET /api/mobile/v1/homeworks/[homeworkId]/listening/[fieldId]` gera o áudio
  protegido normal ou lento sem expor a frase configurada.
- `GET /api/mobile/v1/contracts/[contractId]` entrega somente PDF geral ou do
  próprio aluno por bearer token, com limite de 8 MB, assinatura validada,
  headers `no-store`/`nosniff` e nome de download sem injeção de cabeçalhos.
- `GET /api/mobile/v1/profile` entrega somente o perfil do aluno autenticado.
- `PATCH /api/mobile/v1/profile` atualiza nome, contato e dados do aluno pelo
  mesmo serviço de domínio usado no AVA web.
- `GET /api/mobile/v1/profile/avatar` entrega somente a foto do aluno
  autenticado, sem expor o caminho interno do arquivo.
- `POST /api/mobile/v1/profile/avatar` recebe JPEG, PNG ou WebP de até 2 MB,
  confere a assinatura real do arquivo e substitui a foto de forma transacional.
- `GET /api/mobile/v1/candy-xp` sincroniza de forma idempotente o XP do perfil e
  entrega progresso, streak, badges, eventos recentes, ranking interno de alunos
  e atividades `PUBLISHED` gerais ou atribuídas ao próprio aluno.
  A resposta não inclui e-mail, `userId`, `avatarPath`, respostas corretas ou
  qualquer caminho interno de arquivo.
- `GET /api/mobile/v1/candy-xp/:activityId` entrega perguntas, alternativas,
  campos interativos e somente o envio do aluno autenticado. Respostas corretas
  e caminhos de storage permanecem no servidor.
- `PUT /api/mobile/v1/candy-xp/:activityId/submission` salva rascunho e
  `POST /api/mobile/v1/candy-xp/:activityId/submission` envia a missão. Os dois
  fluxos usam lock transacional; repetição do mesmo envio é idempotente e XP
  automático possui `sourceKey` único.
- `GET /api/mobile/v1/candy-xp/:activityId/asset` entrega PDF ou imagem somente
  ao aluno no escopo da atividade, com validação de tamanho e assinatura.

Escopos atuais:

- `STUDENT`: aulas próprias, homework liberado, Candy XP, mensagens dos próprios
  vínculos e contratos gerais/próprios.
- `TEACHER`: alunos vinculados, aulas/homeworks próprios, submissões desses
  homeworks, mensagens vinculadas e pré-cadastros próprios/atribuídos.
- `ADMIN`: usuários, Secretaria, financeiro, agenda, supervisão do AVA e
  indicadores gerais.

O servidor valida role e vínculo antes da consulta. Escolher outro slug no app
não amplia a permissão.

O site e a API móvel compartilham `getAuthorizedContractDocument` para contratos.
O app mantém o bearer token somente no cabeçalho, valida tipo, tamanho e
assinatura do PDF, usa cache temporário limitado a 64 MB e o remove no logout.

O chat web e o móvel chamam `sendAuthorizedChatMessage`; a regra de vínculo não
fica duplicada nos dois clientes.

O envio de homework `TEXT` no site e no app chama
`submitStudentTextHomework`. A operação usa lock transacional por
homework/aluno, aceita vínculo direto ou atribuição explícita, oculta
homeworks não publicadas, não sobrescreve correções e trata a repetição da mesma
resposta enviada como idempotente.

Rascunho e entrega interativa no site e no app chamam
`saveStudentInteractiveHomeworkDraft` e
`submitStudentInteractiveHomework`. O serviço normaliza campos, valida
obrigatórios, usa o mesmo lock transacional e aceita somente o aluno vinculado.
O listening web e móvel usa `synthesizeListeningSpeech`; a chave OpenAI e a
frase do exercício permanecem somente no servidor. Replays usam cache em
memória com tamanho e validade limitados. Novas gerações aceitam no máximo 10
solicitações por usuário a cada minuto em cada instância do servidor; uma
implantação horizontal deve substituir esse limite local por armazenamento
compartilhado.

## Persistência

A migration `20260730121000_mobile_sessions` adiciona:

- `MobileDevice`
- `MobileSession`
- `MobileRefreshToken`

Ela deve ser aplicada com `prisma migrate deploy` antes de liberar o login
móvel em produção.

## Validação

```bash
npm run test:mobile-auth
npm run test:mobile-homework
npm run typecheck
npm run lint
npm run prisma:validate
npm run build
```

Com PostgreSQL disponível:

```bash
npm run audit:mobile-auth
```

Ou pelo ambiente Docker:

```bash
docker compose --profile tools run --rm audit-server-smoke npm run audit:mobile-auth
```

O smoke integrado cria usuários temporários das três roles, valida
login/me/logout, rotação, replay e revogação por `sessionVersion`, e remove os
dados no final.

## Cuidados operacionais

- Não registrar Authorization, access token, refresh token ou senha.
- Não expor o cofre administrativo `APIs e senhas` no celular.
- Não publicar o app antes da migration e do smoke integrado no ambiente.
- As operações de escrita dos módulos serão extraídas das server actions para
  serviços de domínio compartilhados, sem duplicar regras entre web e API.
