# 09 - Deploy e Ambiente

## O que esta parte do sistema faz

Este documento descreve ambientes, Docker, deploy Oracle e cuidados operacionais.

## Arquivos, rotas, componentes, tabelas ou servicos envolvidos

Arquivos:

- `.env.example`
- `Dockerfile`
- `docker-compose.yml`
- `next.config.ts`
- `prisma.config.ts`
- `scripts/server-smoke.ts`
- `scripts/auth-smoke.ts`
- `scripts/avatar-smoke.ts`

Servicos:

- `app`
- `postgres`
- `migrate`
- `seed`
- `audit-server-smoke`

Servidor oficial:

- `/home/ubuntu/projetos/candy-english`

## Regras de negocio que precisam ser preservadas

- `.env` real nunca deve ir para o Git.
- PostgreSQL deve permanecer interno.
- Uploads persistem no volume `app-storage`.
- `private/secrets` e `private/backups` ficam fora do Git quando existirem.
- Deploy com migration deve aplicar migration antes de recriar o app.

## Decisoes tecnicas tomadas

- O app publica porta em `APP_HOST_BIND`, por padrao `127.0.0.1`.
- `HOSTNAME=0.0.0.0` dentro do container permite healthcheck e acesso pela rede Docker.
- Docker usa healthcheck em `/api/health`.
- Logs Docker usam rotacao `max-size=10m` e `max-file=3`.
- Containers possuem limites/reservas de memoria.
- O app corrige permissao de `/app/storage` no boot e roda Next como `nextjs`.

## Riscos ao alterar esta parte

- Publicar `5432` pode expor o banco.
- Apagar volumes remove banco ou uploads.
- Rodar `seed` com `ADMIN_RESET_PASSWORD=true` sem intencao pode trocar senha.
- Pular migration pode quebrar paginas que dependem de tabelas novas.
- Alterar headers pode afetar Jitsi ou seguranca basica.

## Pendencias

- Rotina formal de backup e restore.
- Checklist de rollback.
- CI remoto documentado.
- Monitoramento externo de disponibilidade e erros.

## Como pode evoluir

- Criar `docs/11-seguranca.md`.
- Criar rotina de backup versionada fora do Git.
- Adicionar CI/CD com build, lint, typecheck e smokes.
- Documentar proxy reverso quando a configuracao final estiver estabilizada.
