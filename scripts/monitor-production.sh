#!/usr/bin/env bash

set -Eeuo pipefail

umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CANDY_PROJECT_DIR:-$(cd -- "${SCRIPT_DIR}/.." && pwd)}"
MONITOR_ENV_FILE="${CANDY_MONITOR_ENV_FILE:-${PROJECT_DIR}/private/monitor.env}"

if [[ -f "${MONITOR_ENV_FILE}" ]]; then
  env_mode="$(stat -c '%a' "${MONITOR_ENV_FILE}")"

  if (( (10#${env_mode} % 100) != 0 )); then
    echo "ERRO monitor: ${MONITOR_ENV_FILE} precisa ter permissao 600 ou mais restrita." >&2
    exit 1
  fi

  # Arquivo local, ignorado pelo Git e controlado pelo operador do servidor.
  # shellcheck disable=SC1090
  source "${MONITOR_ENV_FILE}"
fi

PUBLIC_HEALTH_URL="${CANDY_PUBLIC_HEALTH_URL:-https://candyenglish.com.br/api/health}"
BACKUP_DIR="${CANDY_BACKUP_DIR:-/home/ubuntu/backups/candy-english}"
STATE_DIR="${CANDY_MONITOR_STATE_DIR:-${PROJECT_DIR}/private/monitor-state}"
APP_CONTAINER="${CANDY_APP_CONTAINER:-candy-english-app}"
POSTGRES_CONTAINER="${CANDY_POSTGRES_CONTAINER:-candy-english-postgres}"
MAX_BACKUP_AGE_HOURS="${CANDY_MAX_BACKUP_AGE_HOURS:-36}"
MAX_DISK_PERCENT="${CANDY_MAX_DISK_PERCENT:-85}"
LOGIN_FAILURE_THRESHOLD="${CANDY_LOGIN_FAILURE_ALERT_THRESHOLD:-30}"
ALERT_REPEAT_MINUTES="${CANDY_ALERT_REPEAT_MINUTES:-60}"

require_unsigned_integer() {
  local name="$1"
  local value="$2"

  if [[ ! "${value}" =~ ^[0-9]+$ ]]; then
    echo "ERRO monitor: ${name} precisa ser inteiro positivo." >&2
    exit 1
  fi
}

require_unsigned_integer "CANDY_MAX_BACKUP_AGE_HOURS" "${MAX_BACKUP_AGE_HOURS}"
require_unsigned_integer "CANDY_MAX_DISK_PERCENT" "${MAX_DISK_PERCENT}"
require_unsigned_integer "CANDY_LOGIN_FAILURE_ALERT_THRESHOLD" "${LOGIN_FAILURE_THRESHOLD}"
require_unsigned_integer "CANDY_ALERT_REPEAT_MINUTES" "${ALERT_REPEAT_MINUTES}"

mkdir -p "${STATE_DIR}"
chmod 700 "${STATE_DIR}"

failures=()

add_failure() {
  failures+=("$1")
}

if ! curl --fail --silent --show-error --max-time 15 --output /dev/null "${PUBLIC_HEALTH_URL}"; then
  add_failure "health publico indisponivel"
fi

check_container() {
  local container="$1"
  local label="$2"
  local state

  state="$(
    docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "${container}" 2>/dev/null || true
  )"

  if [[ "${state}" != "healthy" && "${state}" != "running" ]]; then
    add_failure "container ${label} em estado ${state:-ausente}"
  fi
}

check_container "${APP_CONTAINER}" "app"
check_container "${POSTGRES_CONTAINER}" "postgres"

disk_percent="$(df -P / | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')"

if [[ ! "${disk_percent}" =~ ^[0-9]+$ ]]; then
  add_failure "uso de disco nao pode ser consultado"
elif (( disk_percent >= MAX_DISK_PERCENT )); then
  add_failure "disco raiz em ${disk_percent}%"
fi

latest_backup="$(
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'candy-*.tar.gz.enc' \
    -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2- || true
)"

if [[ -z "${latest_backup}" ]]; then
  add_failure "nenhum backup criptografado encontrado"
else
  now_epoch="$(date +%s)"
  backup_epoch="$(stat -c '%Y' "${latest_backup}")"
  backup_age_hours="$(( (now_epoch - backup_epoch) / 3600 ))"

  if (( backup_age_hours > MAX_BACKUP_AGE_HOURS )); then
    add_failure "backup mais recente tem ${backup_age_hours}h"
  fi
fi

failed_logins=""

if failed_logins="$(
  docker exec -i "${POSTGRES_CONTAINER}" sh -c \
    'psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --tuples-only --no-align --set=ON_ERROR_STOP=1' \
    2>/dev/null <<'SQL'
SELECT COUNT(*)
FROM "LoginAttempt"
WHERE "createdAt" >= NOW() - INTERVAL '15 minutes'
  AND "success" = false;
SQL
)"; then
  failed_logins="${failed_logins//[[:space:]]/}"

  if [[ ! "${failed_logins}" =~ ^[0-9]+$ ]]; then
    add_failure "contador de falhas de login retornou valor invalido"
  elif (( failed_logins >= LOGIN_FAILURE_THRESHOLD )); then
    add_failure "${failed_logins} falhas de login nos ultimos 15 minutos"
  fi
else
  add_failure "falhas de login nao puderam ser consultadas"
fi

timestamp="$(date --iso-8601=seconds)"

if (( ${#failures[@]} == 0 )); then
  rm -f "${STATE_DIR}/last-alert"
  echo "${timestamp} OK monitor: health, containers, disco, backup e login normais."
  exit 0
fi

message="Candy English alerta: $(IFS='; '; echo "${failures[*]}")"
echo "${timestamp} ALERTA monitor: ${message}" >&2

alert_hash="$(printf '%s' "${message}" | sha256sum | awk '{ print $1 }')"
now_epoch="$(date +%s)"
last_hash=""
last_epoch="0"

if [[ -f "${STATE_DIR}/last-alert" ]]; then
  read -r last_hash last_epoch < "${STATE_DIR}/last-alert" || true
fi

if [[ ! "${last_epoch}" =~ ^[0-9]+$ ]]; then
  last_epoch="0"
fi

repeat_seconds="$(( ALERT_REPEAT_MINUTES * 60 ))"

if [[ "${alert_hash}" != "${last_hash}" || $(( now_epoch - last_epoch )) -ge repeat_seconds ]]; then
  if [[ -n "${CANDY_ALERT_WEBHOOK_URL:-}" ]]; then
    payload="$(
      printf '%s' "${message}" | python3 -c \
        'import json, sys; print(json.dumps({"text": sys.stdin.read()}))'
    )"

    if ! curl --fail --silent --show-error --max-time 15 \
      --header 'Content-Type: application/json' \
      --data-binary "${payload}" \
      --url "${CANDY_ALERT_WEBHOOK_URL}" \
      --output /dev/null; then
      echo "${timestamp} ALERTA monitor: webhook nao recebeu a notificacao." >&2
    fi
  fi

  printf '%s %s\n' "${alert_hash}" "${now_epoch}" > "${STATE_DIR}/last-alert"
fi

exit 1
