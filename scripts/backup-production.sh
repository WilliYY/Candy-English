#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="${CANDY_PROJECT_DIR:-$(dirname -- "$script_dir")}"
backup_dir="${CANDY_BACKUP_DIR:-/home/ubuntu/backups/candy-english}"
key_file="${CANDY_BACKUP_KEY_FILE:-/home/ubuntu/.config/candy-english/backup.key}"
retention_days="${CANDY_BACKUP_RETENTION_DAYS:-14}"

if [[ "$backup_dir" != /* || "$backup_dir" == "/" ]]; then
  echo "CANDY_BACKUP_DIR precisa ser um caminho absoluto e especifico." >&2
  exit 1
fi

if [[ ! "$retention_days" =~ ^[0-9]+$ ]] || (( retention_days < 7 )); then
  echo "CANDY_BACKUP_RETENTION_DAYS precisa ser um inteiro de pelo menos 7." >&2
  exit 1
fi

if [[ ! -f "$key_file" ]] || [[ "$(tr -d '\r\n' < "$key_file" | wc -c)" -lt 32 ]]; then
  echo "Chave de backup ausente ou curta em $key_file." >&2
  exit 1
fi

if [[ -n "$(find "$key_file" -maxdepth 0 -perm /077 -print -quit)" ]]; then
  echo "A chave de backup precisa ter permissao 600: $key_file" >&2
  exit 1
fi

for command_name in docker openssl tar sha256sum mktemp flock find git; do
  command -v "$command_name" >/dev/null || {
    echo "Comando obrigatorio ausente: $command_name" >&2
    exit 1
  }
done

mkdir -p -- "$backup_dir"
chmod 700 "$backup_dir"

exec 9>"$backup_dir/.backup.lock"
flock -n 9 || {
  echo "Outro backup ja esta em execucao." >&2
  exit 1
}

cd "$project_dir"

for service_name in postgres app; do
  docker compose ps --status running --services | grep -Fxq "$service_name" || {
    echo "Servico Docker nao esta em execucao: $service_name" >&2
    exit 1
  }
done

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary_dir="$(mktemp -d "$backup_dir/.tmp.XXXXXX")"
partial_file="$backup_dir/.candy-$timestamp.tar.gz.enc.partial"
final_file="$backup_dir/candy-$timestamp.tar.gz.enc"

cleanup() {
  rm -rf -- "$temporary_dir"
  rm -f -- "$partial_file"
}
trap cleanup EXIT

docker compose exec -T postgres sh -c \
  'exec pg_dump --format=custom --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  > "$temporary_dir/database.dump"

docker compose exec -T app sh -c \
  'exec tar -C /app/storage -czf - .' \
  > "$temporary_dir/storage.tar.gz"

[[ -s "$temporary_dir/database.dump" ]] || {
  echo "O dump do PostgreSQL ficou vazio." >&2
  exit 1
}
[[ -s "$temporary_dir/storage.tar.gz" ]] || {
  echo "O arquivo do storage ficou vazio." >&2
  exit 1
}

commit_id="$(git rev-parse --verify HEAD 2>/dev/null || printf 'desconhecido')"
database_bytes="$(wc -c < "$temporary_dir/database.dump")"
storage_bytes="$(wc -c < "$temporary_dir/storage.tar.gz")"

{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'git_commit=%s\n' "$commit_id"
  printf 'database_bytes=%s\n' "$database_bytes"
  printf 'storage_bytes=%s\n' "$storage_bytes"
  printf 'postgres_major=17\n'
} > "$temporary_dir/manifest.txt"

(
  cd "$temporary_dir"
  sha256sum database.dump storage.tar.gz manifest.txt > manifest.sha256
  tar -czf - database.dump storage.tar.gz manifest.txt manifest.sha256
) | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
  -pass "file:$key_file" -out "$partial_file"

"$script_dir/verify-production-backup.sh" "$partial_file"
mv -- "$partial_file" "$final_file"

find "$backup_dir" -maxdepth 1 -type f \
  -name 'candy-*.tar.gz.enc' -mtime "+$retention_days" -delete

trap - EXIT
rm -rf -- "$temporary_dir"

echo "Backup concluido: $final_file ($(wc -c < "$final_file") bytes)"
