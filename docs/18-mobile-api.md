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

Escopos atuais:

- `STUDENT`: aulas próprias, homework liberado, Candy XP, mensagens dos próprios
  vínculos e contratos gerais/próprios.
- `TEACHER`: alunos vinculados, aulas/homeworks próprios, submissões desses
  homeworks, mensagens vinculadas e pré-cadastros próprios/atribuídos.
- `ADMIN`: usuários, Secretaria, financeiro, agenda, supervisão do AVA e
  indicadores gerais.

O servidor valida role e vínculo antes da consulta. Escolher outro slug no app
não amplia a permissão.

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
