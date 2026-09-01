# 10 - Backup e Recuperacao

## Objetivo

Preservar PostgreSQL e o volume `app-storage` em um pacote unico, criptografado e verificavel, sem versionar dados reais ou segredos. O backup local reduz falhas operacionais; uma copia externa continua obrigatoria para sobreviver a perda total do servidor Oracle.

## Arquivos envolvidos

- `scripts/backup-production.sh`
- `scripts/verify-production-backup.sh`
- `scripts/restore-production-backup-drill.sh`
- `/home/ubuntu/backups/candy-english` no Oracle, permissao `700`
- `/home/ubuntu/.config/candy-english/backup.key` no Oracle, permissao `600`

## Preparacao unica no Oracle

Crie uma chave exclusiva. Nao use `AUTH_SECRET`, senha do banco ou outra chave da aplicacao:

```bash
install -d -m 700 /home/ubuntu/.config/candy-english
umask 077
openssl rand -base64 48 > /home/ubuntu/.config/candy-english/backup.key
chmod 600 /home/ubuntu/.config/candy-english/backup.key
install -d -m 700 /home/ubuntu/backups/candy-english
```

Guarde uma copia da chave em cofre externo/offline separado do servidor. Quem perder essa chave nao consegue recuperar os backups; quem obtiver a chave e os arquivos consegue le-los.

## Backup diario

O script exige `postgres` e `app` em execucao, cria `pg_dump` custom, compacta o storage, registra checksums internos, cifra o pacote com AES-256/PBKDF2, verifica o resultado antes de publicar e remove apenas backups locais com mais de 14 dias. Arquivo parcial nunca e promovido se qualquer etapa falhar.

Execucao manual:

```bash
cd /home/ubuntu/projetos/candy-english
./scripts/backup-production.sh
```

Entrada unica no `crontab -e` do usuario `ubuntu`:

```cron
30 2 * * * bash -lc 'cd /home/ubuntu/projetos/candy-english && ./scripts/backup-production.sh' 2>&1 | logger -t candy-backup
```

Variaveis opcionais: `CANDY_BACKUP_DIR`, `CANDY_BACKUP_KEY_FILE`, `CANDY_BACKUP_RETENTION_DAYS` (minimo 7) e `CANDY_PROJECT_DIR`.

## Verificacao e restore drill

A verificacao descriptografa em diretorio temporario, rejeita membros inesperados, confere SHA-256, testa o tar do storage e pede ao `pg_restore` para ler todo o catalogo do dump:

```bash
./scripts/verify-production-backup.sh /home/ubuntu/backups/candy-english/candy-AAAAMMDDTHHMMSSZ.tar.gz.enc
```

O drill sobe PostgreSQL 17 isolado, sem publicar porta, restaura o dump, exige tabelas no schema `public` e remove o container ao sair. Ele nao toca no banco real:

```bash
./scripts/restore-production-backup-drill.sh --latest
```

Executar semanalmente depois do backup de domingo:

```cron
30 4 * * 0 bash -lc 'cd /home/ubuntu/projetos/candy-english && ./scripts/restore-production-backup-drill.sh --latest' 2>&1 | logger -t candy-backup-drill
```

## Recuperacao real

Recuperacao real nao e automatica porque substituir o banco/volume atual e destrutivo. Em incidente:

1. manter o app indisponivel para escrita e preservar o estado atual;
2. validar o arquivo com `verify-production-backup.sh`;
3. executar primeiro o restore drill isolado;
4. provisionar PostgreSQL/volume novos, nunca sobrescrever os atuais sem autorizacao explicita;
5. restaurar `database.dump` com `pg_restore --exit-on-error --no-owner --no-acl` no banco vazio e extrair `storage.tar.gz` no volume novo;
6. aplicar migrations apenas se o codigo implantado exigir, recriar o app e rodar healthcheck + smokes;
7. trocar para os volumes recuperados somente depois da validacao e registrar o incidente.

## Copia externa obrigatoria

Os arquivos locais estao criptografados, mas permanecem no mesmo servidor. Replicar diariamente para Oracle Object Storage, S3 ou outro cofre com versionamento/retencao imutavel. A integracao externa depende da conta e das credenciais do provedor e nao deve ser improvisada nem armazenada no Git.

## Cuidados

- Nunca commitar backup, chave, dump ou storage.
- Nunca imprimir a chave nem dados do banco em logs.
- Nao considerar backup valido somente porque o arquivo existe; exigir verificacao e drill.
- Monitorar `journalctl -t candy-backup` e `journalctl -t candy-backup-drill`.
- Revisar espaco em disco e confirmar a copia externa periodicamente.
