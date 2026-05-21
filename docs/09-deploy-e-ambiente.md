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
- `OPENAI_API_KEY` e opcional/reservada; o fluxo padrao de homework interativo e manual e nao depende de OCR.

## Decisoes tecnicas tomadas

- O app publica porta em `APP_HOST_BIND`, por padrao `127.0.0.1`.
- `HOSTNAME=0.0.0.0` dentro do container permite healthcheck e acesso pela rede Docker.
- Docker usa healthcheck em `/api/health`.
- Logs Docker usam rotacao `max-size=10m` e `max-file=3`.
- Containers possuem limites/reservas de memoria.
- `next.config.ts` define Server Actions com limite de 15 MB para upload de homework interativo.
- O app corrige permissao de `/app/storage` no boot e roda Next como `nextjs`.
- Homework interativo usa o mesmo volume `app-storage` para `storage/homework-assets`.
- A imagem de ferramentas (`migrate`, `seed`, `audit-server-smoke`) gera o Prisma Client no build para que scripts de smoke e seed encontrem `src/generated/prisma/client`.

## Riscos ao alterar esta parte

- Publicar `5432` pode expor o banco.
- Apagar volumes remove banco ou uploads.
- Rodar `seed` com `ADMIN_RESET_PASSWORD=true` sem intencao pode trocar senha.
- Pular migration pode quebrar paginas que dependem de tabelas novas.
- Reativar OCR/OpenAI sem revisar custo, privacidade e volume pode gerar despesa por upload de homework.
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
