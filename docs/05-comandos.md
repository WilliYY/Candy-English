# 05 - Comandos

## Catty WhatsApp (opcional)

```bash
npx tsx --test src/lib/__tests__/catty-whatsapp-*.test.ts
npx tsx scripts/catty-whatsapp-smoke.ts --isolated-schema
docker compose -f docker-compose.yml -f docker-compose.whatsapp.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.whatsapp.yml up -d catty-evolution-db catty-evolution catty-worker
```

O smoke usa schema exclusivo temporário e bloqueia rede; requer permissão CREATE
SCHEMA, remove fixtures no finally e não envia WhatsApp. Antes de subir o worker,
aplicar a migration e publicar o app com a rede do overlay. A instância permanece
desconectada e a fila pausada. Procedimento completo em `docs/24-catty-whatsapp.md`.

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
- `scripts/mobile-auth-smoke.ts`
- `scripts/avatar-smoke.ts`
- `scripts/candy-xp-concurrency-smoke.ts`
- `scripts/candy-xp-submission-concurrency-smoke.ts`
- `scripts/homework-concurrency-smoke.ts`
- `scripts/candy-xp-visibility-smoke.ts`
- `scripts/catty-behavior-smoke.ts`
- `scripts/backup-production.sh`
- `scripts/verify-production-backup.sh`
- `scripts/restore-production-backup-drill.sh`
- `scripts/anonymize-expired-users.ts`

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

As três dependências do Prisma devem usar a mesma versão. Nesta revisão, `@prisma/config@7.10.1` fixa uma versão de Effect afetada por um alerta. O override específico seleciona `effect@3.22.5`, ainda na série 3. Ao atualizar o Prisma, revisar o override e validar geração do cliente, migrations e build. [Aviso do mantenedor](https://github.com/advisories/GHSA-7589-6fvf-x4pw).

`npm run test:mobile-homework` inclui arquivos `.test.ts` e `.test.tsx`, com as regressões de componentes. A ação de qualidade do GitHub também executa `bash scripts/test-monitor-production.sh`, que simula falha e recuperação na entrega de alertas, sem acesso a contêineres ou webhooks reais.

```bash
npm run lint
npm run typecheck
npm run build
npm run test:sales
npm run audit:teacher-finance
npm run audit:sales-settlement
npm run test:ponto
npm run audit:student-links
npm run audit:server-smoke
npm run audit:auth-smoke
npm run test:mobile-auth
npm run audit:mobile-auth
npm run audit:avatar-smoke
npm run audit:pre-registration
npm run audit:candy-xp-concurrency
npm run audit:candy-xp-submission-concurrency
npm run audit:homework-concurrency
npm run audit:candy-xp-visibility
npm run audit:catty-behavior
npm run retention:anonymize-users
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
docker compose --profile tools run --rm audit-server-smoke npm run audit:pre-registration
docker compose --profile tools run --rm audit-server-smoke npm run audit:candy-xp-concurrency
docker compose --profile tools run --rm audit-server-smoke npm run audit:candy-xp-submission-concurrency
docker compose --profile tools run --rm audit-server-smoke npm run audit:homework-concurrency
docker compose --profile tools run --rm audit-server-smoke npm run audit:candy-xp-visibility
docker compose --profile tools run --rm audit-server-smoke npm run audit:catty-behavior
docker compose --profile tools run --rm audit-server-smoke npm run audit:student-links
```

Para reparar os vinculos antigos depois de revisar a auditoria:

```bash
docker compose --profile tools run --rm audit-server-smoke npm run repair:student-links
```

## Retencao de contas excluidas

Auditar sem alterar dados:

```bash
docker compose --profile tools run --rm audit-server-smoke npm run retention:anonymize-users
```

Aplicar a anonimização das contas cujo prazo de 2 anos venceu:

```bash
docker compose --profile tools run --rm audit-server-smoke npm run retention:anonymize-users -- --apply
```

No Oracle, manter uma unica entrada no `crontab` do usuario de deploy:

```cron
15 3 * * * flock -n /tmp/candy-user-retention.lock bash -lc 'cd /home/ubuntu/projetos/candy-english && docker compose --profile tools run --rm audit-server-smoke npm run retention:anonymize-users -- --apply' 2>&1 | logger -t candy-user-retention
```

O script usa dry-run por padrao, processa apenas `deletedAt` com `scheduledAnonymizationAt <= agora` e ignora registros que ja possuem `anonymizedAt`.

## Backup e recuperacao

No Oracle, depois de criar a chave protegida conforme `docs/10-backup-e-recuperacao.md`:

```bash
./scripts/backup-production.sh
./scripts/verify-production-backup.sh /home/ubuntu/backups/candy-english/candy-AAAAMMDDTHHMMSSZ.tar.gz.enc
./scripts/restore-production-backup-drill.sh --latest
```

O backup diario e o restore drill semanal ficam no `crontab` documentado em `docs/10-backup-e-recuperacao.md`. O drill usa container isolado e nao altera o banco real.

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
docker compose --profile tools run --rm audit-server-smoke npm run audit:pre-registration
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
- `audit:candy-xp-visibility` valida que atividade Candy XP publicada para todos aparece para qualquer student e atividade individual aparece so para o aluno atribuido.
- `audit:catty-behavior` valida exemplos internos da Catty sem chamar Gemini nem OpenAI.
- Docker usa perfil `tools` para comandos sob demanda.
- `app-storage` e compartilhado para validar avatar/contratos.

## Riscos ao alterar esta parte

- Rodar deploy sem migration apos schema novo quebra producao.
- Rodar seed com senha real em terminal compartilhado pode expor segredo.
- Apagar volume `app-storage` remove uploads.
- Apagar volume `postgres-data` remove banco.

## Pendencias

- Ainda falta pipeline CI remoto documentado.

## Como pode evoluir

- Adicionar checklist de rollback.
- Criar CI com lint/typecheck/build e smokes essenciais.

## Ensaio de restauração dos arquivos AVA — 22/11/2026

O restore-production-backup-drill.sh requer python3 (biblioteca padrão) e, após restaurar o PostgreSQL descartável, extrai referências de avatar, contrato, homework, Candy XP e imagem de produto somente desse banco. O helper verify-backup-storage.py verifica CRC/truncamento do gzip, rejeita caminhos que escapem da pasta e links, extrai o storage em subdiretório temporário próprio e lê integralmente os arquivos referenciados. A saída contém somente contagens; referências privadas não são impressas. A pasta de extração é removida também em falha. Colunas ausentes em backups antigos são ignoradas pela consulta de metadados, sem exigir que todo backup histórico tenha o schema mais recente.

Teste local sem Docker, backup real, banco ou rede: python -B -m unittest discover -s scripts/tests -p test_backup_storage.py. As fixtures cobrem extração/leitura e limpeza, referência ausente, tar com traversal/caminho absoluto/link e gzip truncado. O verificador original já confere allowlist do tar externo, hashes, listagem do storage e estrutura do dump; a nova verificação complementa a leitura dos arquivos após restauração.

Limites: não testa login nem navegação autenticada no AVA, não busca links externos de materiais, não valida pareamento ou entrega WhatsApp. Os volumes da Evolution permanecem fora do backup do AVA; perda deles exige novo pareamento explícito, com o canal pausado, conforme docs/24-catty-whatsapp.md. Esta entrega não executou ensaio sobre backup ou serviços reais.
O serviço `audit-server-smoke` usa o mesmo usuário do AVA (UID/GID 1001) para criar arquivos no volume compartilhado. Isso permite ao site substituir e excluir o avatar criado pelo teste em um volume recém-inicializado.
