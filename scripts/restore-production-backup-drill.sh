#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 /caminho/backup.tar.gz.enc | --latest" >&2
  exit 2
fi

script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
key_file="${CANDY_BACKUP_KEY_FILE:-/home/ubuntu/.config/candy-english/backup.key}"
backup_dir="${CANDY_BACKUP_DIR:-/home/ubuntu/backups/candy-english}"
container_name="candy-backup-drill-$$"
temporary_dir="$(mktemp -d)"
drill_password="$(openssl rand -hex 32)"

if [[ "$1" == "--latest" ]]; then
  backup_file="$(find "$backup_dir" -maxdepth 1 -type f \
    -name 'candy-*.tar.gz.enc' -printf '%T@ %p\n' \
    | sort -nr | sed -n '1s/^[^ ]* //p')"
else
  backup_file="$1"
fi

if [[ -z "$backup_file" ]]; then
  echo "Nenhum backup encontrado em $backup_dir." >&2
  exit 1
fi

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  rm -rf -- "$temporary_dir"
}
trap cleanup EXIT

"$script_dir/verify-production-backup.sh" "$backup_file"

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass "file:$key_file" -in "$backup_file" \
  | tar -xzf - -C "$temporary_dir"

docker run -d --rm --name "$container_name" \
  -e POSTGRES_USER=restore \
  -e POSTGRES_PASSWORD="$drill_password" \
  -e POSTGRES_DB=candy_restore \
  postgres:17-alpine >/dev/null

for _ in {1..30}; do
  if docker exec "$container_name" pg_isready \
    -U restore -d candy_restore >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$container_name" pg_isready \
  -U restore -d candy_restore >/dev/null

docker exec -i "$container_name" pg_restore \
  --exit-on-error --no-owner --no-acl \
  --username=restore --dbname=candy_restore \
  < "$temporary_dir/database.dump"

table_count="$(docker exec "$container_name" psql \
  --username=restore --dbname=candy_restore --tuples-only --no-align \
  --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"

if [[ ! "$table_count" =~ ^[1-9][0-9]*$ ]]; then
  echo "Restore drill nao encontrou tabelas da aplicacao." >&2
  exit 1
fi

echo "Restore drill concluido em container isolado: $table_count tabela(s)."
