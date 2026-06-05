# 05 - Comandos

## O que esta parte do sistema faz

Este documento centraliza comandos de desenvolvimento, validacao, Docker e deploy.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

- `package.json`
- `Dockerfile`
- `docker-compose.yml`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `scripts/server-smoke.ts`
- `scripts/auth-smoke.ts`
- `scripts/avatar-smoke.ts`
- `scripts/catty-behavior-smoke.ts`

## Instalar

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

Depois ajuste `.env` sem commitar segredos.

## Desenvolvimento local

```bash
npm run prisma:validate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Validacao local

```bash
npm run lint
npm run typecheck
npm run build
npm run audit:server-smoke
npm run audit:auth-smoke
npm run audit:avatar-smoke
npm run audit:catty-behavior
```

## Docker local

```bash
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose run --rm seed
docker compose up -d --build app
docker compose ps
```

## Smokes via Docker

```bash
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:catty-behavior
```

## Deploy Oracle sem migration

Regra operacional: quando houver acesso remoto disponivel, o Codex deve executar este pull/deploy no Oracle por conta propria. Se nao houver SSH, chave, sessao remota ou permissao no ambiente atual, reportar o bloqueio exato e deixar estes comandos para PuTTY.

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose build app audit-server-smoke
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

## Deploy Oracle com migration

Regra operacional: usar este fluxo quando `prisma/migrations/` mudar. Quando houver acesso remoto disponivel, o Codex deve executar o pull/deploy no Oracle por conta propria; se nao houver acesso, reportar o bloqueio e deixar estes comandos para PuTTY.

```bash
cd /home/ubuntu/projetos/candy-english
git pull
docker compose up -d postgres
docker compose build app migrate audit-server-smoke
docker compose --profile tools run --rm migrate
docker compose up -d --force-recreate app
sleep 45
docker compose ps
docker compose --profile tools run --rm audit-server-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:auth-smoke
docker compose --profile tools run --rm audit-server-smoke npm run audit:avatar-smoke
```

## Regras de negocio que precisam ser preservadas

- Quando `prisma/migrations/` mudar, usar deploy com migration.
- Seed nao deve redefinir senha de admin sem `ADMIN_RESET_PASSWORD=true`.
- Smokes criam dados temporarios e limpam ao final.
- Banco deve permanecer interno no Docker.

## Decisoes tecnicas tomadas

- `verify:*` roda smokes via Docker Compose.
- `audit-server-smoke` depende do app healthy.
- `audit:catty-behavior` valida exemplos internos da Catty sem chamar Gemini nem OpenAI.
- Docker usa perfil `tools` para comandos sob demanda.
- `app-storage` e compartilhado para validar avatar/contratos.

## Riscos ao alterar esta parte

- Rodar deploy sem migration apos schema novo quebra producao.
- Rodar seed com senha real em terminal compartilhado pode expor segredo.
- Apagar volume `app-storage` remove uploads.
- Apagar volume `postgres-data` remove banco.

## Pendencias

- Ainda falta documentacao formal de backup e restore.
- Ainda falta pipeline CI remoto documentado.

## Como pode evoluir

- Adicionar comandos de backup verificado.
- Adicionar checklist de rollback.
- Criar CI com lint/typecheck/build e smokes essenciais.
