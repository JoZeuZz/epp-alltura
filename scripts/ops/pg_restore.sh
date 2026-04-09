#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.dev.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres_db}"
DB_NAME="${DB_NAME:-herramientas_epp}"
DB_USER="${DB_USER:-epp_user}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-epp_pass}}"

DUMP_FILE="${1:-}"

if [[ -z "${DUMP_FILE}" ]]; then
  echo "Uso: $0 /ruta/al/backup.dump" >&2
  exit 1
fi

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "[pg_restore] ERROR: dump no encontrado: ${DUMP_FILE}" >&2
  exit 1
fi

if ! docker compose -f "${COMPOSE_FILE}" ps "${POSTGRES_SERVICE}" >/dev/null 2>&1; then
  echo "[pg_restore] ERROR: servicio ${POSTGRES_SERVICE} no disponible en ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "[pg_restore] ERROR: DB_PASSWORD no definido" >&2
  exit 1
fi

echo "[pg_restore] compose=${COMPOSE_FILE} service=${POSTGRES_SERVICE} db=${DB_NAME} user=${DB_USER}"

docker compose -f "${COMPOSE_FILE}" exec -T \
  -e PGPASSWORD="${DB_PASSWORD}" \
  "${POSTGRES_SERVICE}" \
  psql \
    --host 127.0.0.1 \
    --port 5432 \
    --username "${DB_USER}" \
    --dbname postgres \
    -v ON_ERROR_STOP=1 \
    <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS "${DB_NAME}";
CREATE DATABASE "${DB_NAME}";
SQL

cat "${DUMP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T \
  -e PGPASSWORD="${DB_PASSWORD}" \
  "${POSTGRES_SERVICE}" \
  pg_restore \
    --host 127.0.0.1 \
    --port 5432 \
    --username "${DB_USER}" \
    --dbname "${DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose

echo "[pg_restore] OK"
