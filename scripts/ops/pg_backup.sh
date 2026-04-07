#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.dev.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres_db}"
DB_NAME="${DB_NAME:-herramientas_epp}"
DB_USER="${DB_USER:-epp_user}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-epp_pass}}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups/postgres}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
OUT_FILE="${1:-${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump}"

mkdir -p "$(dirname "${OUT_FILE}")"

echo "[pg_backup] compose=${COMPOSE_FILE} service=${POSTGRES_SERVICE} db=${DB_NAME} user=${DB_USER}"

if ! docker compose -f "${COMPOSE_FILE}" ps "${POSTGRES_SERVICE}" >/dev/null 2>&1; then
  echo "[pg_backup] ERROR: servicio ${POSTGRES_SERVICE} no disponible en ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "[pg_backup] ERROR: DB_PASSWORD no definido" >&2
  exit 1
fi

docker compose -f "${COMPOSE_FILE}" exec -T \
  -e PGPASSWORD="${DB_PASSWORD}" \
  "${POSTGRES_SERVICE}" \
  pg_dump \
    --host 127.0.0.1 \
    --port 5432 \
    --username "${DB_USER}" \
    --dbname "${DB_NAME}" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --verbose \
    > "${OUT_FILE}"

sha256sum "${OUT_FILE}" > "${OUT_FILE}.sha256"

echo "[pg_backup] OK"
echo "[pg_backup] BACKUP_FILE=${OUT_FILE}"
echo "[pg_backup] CHECKSUM_FILE=${OUT_FILE}.sha256"
