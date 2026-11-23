#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
fixture="$(mktemp -d)"
trap 'rm -rf -- "${fixture:?}"' EXIT
mkdir -p "${fixture}/bin" "${fixture}/backup"
touch "${fixture}/backup/candy-test.tar.gz.enc"
export CANDY_PROJECT_DIR="${fixture}" CANDY_MONITOR_STATE_DIR="${fixture}/state"
export CANDY_BACKUP_DIR="${fixture}/backup" CANDY_ALERT_WEBHOOK_URL="https://alerts.invalid/"
export CANDY_PUBLIC_HEALTH_URL="https://health.invalid/" PATH="${fixture}/bin:${PATH}"
cat > "${fixture}/bin/docker" <<'MOCK'
#!/usr/bin/env bash
if [[ "$1" == inspect ]]; then echo healthy; else echo 0; fi
MOCK
cat > "${fixture}/bin/curl" <<'MOCK'
#!/usr/bin/env bash
if [[ "$*" != *alerts.invalid* ]]; then exit 22; fi
echo attempted >> "${CANDY_PROJECT_DIR}/calls"
if [[ -f "${CANDY_PROJECT_DIR}/accept" ]]; then printf '204'; else printf '302'; fi
MOCK
chmod +x "${fixture}/bin/"*
check_incident() {
  local status=0
  bash "${script_dir}/monitor-production.sh" || status=$?
  [[ "${status}" == 1 ]]
}
check_incident
[[ ! -f "${fixture}/state/last-alert" ]]
touch "${fixture}/accept"
check_incident
[[ -s "${fixture}/state/last-alert" ]]
check_incident
[[ "$(wc -l < "${fixture}/calls")" -eq 2 ]]
