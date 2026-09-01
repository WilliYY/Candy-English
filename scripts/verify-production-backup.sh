#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 /caminho/backup.tar.gz.enc" >&2
  exit 2
fi

backup_file="$1"
script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="${CANDY_PROJECT_DIR:-$(dirname -- "$script_dir")}"
key_file="${CANDY_BACKUP_KEY_FILE:-/home/ubuntu/.config/candy-english/backup.key}"

if [[ ! -f "$backup_file" || ! -s "$backup_file" ]]; then
  echo "Backup inexistente ou vazio: $backup_file" >&2
  exit 1
fi

if [[ ! -f "$key_file" ]] || [[ "$(tr -d '\r\n' < "$key_file" | wc -c)" -lt 32 ]]; then
  echo "Chave de backup ausente ou curta em $key_file." >&2
  exit 1
fi

for command_name in docker openssl tar sha256sum mktemp; do
  command -v "$command_name" >/dev/null || {
    echo "Comando obrigatorio ausente: $command_name" >&2
    exit 1
  }
done

temporary_dir="$(mktemp -d)"
cleanup() {
  rm -rf -- "$temporary_dir"
}
trap cleanup EXIT

archive_list="$temporary_dir/archive-list.txt"

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass "file:$key_file" -in "$backup_file" \
  | tar -tzf - > "$archive_list"

while IFS= read -r member; do
  case "$member" in
    database.dump|storage.tar.gz|manifest.txt|manifest.sha256) ;;
    *)
      echo "Membro inesperado ou inseguro no backup: $member" >&2
      exit 1
      ;;
  esac
done < "$archive_list"

for expected_member in database.dump storage.tar.gz manifest.txt manifest.sha256; do
  grep -Fxq "$expected_member" "$archive_list" || {
    echo "Backup incompleto: falta $expected_member" >&2
    exit 1
  }
done

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass "file:$key_file" -in "$backup_file" \
  | tar -xzf - -C "$temporary_dir"

(
  cd "$temporary_dir"
  sha256sum -c manifest.sha256 >/dev/null
)

tar -tzf "$temporary_dir/storage.tar.gz" >/dev/null

cd "$project_dir"
docker compose exec -T postgres pg_restore --list \
  < "$temporary_dir/database.dump" >/dev/null

echo "Backup verificado: $(basename -- "$backup_file")"
