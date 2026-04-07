#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.dev.yml}"
REDIS_SERVICE="${REDIS_SERVICE:-redis}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups/redis}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
OUT_FILE="${1:-${BACKUP_DIR}/redis_${TIMESTAMP}.tar.gz}"

mkdir -p "$(dirname "${OUT_FILE}")"

echo "[redis_backup] compose=${COMPOSE_FILE} service=${REDIS_SERVICE}"

if ! docker compose -f "${COMPOSE_FILE}" ps "${REDIS_SERVICE}" >/dev/null 2>&1; then
  echo "[redis_backup] ERROR: servicio ${REDIS_SERVICE} no disponible en ${COMPOSE_FILE}" >&2
  exit 1
fi

# Fuerza snapshot y empaqueta directorio /data completo.
docker compose -f "${COMPOSE_FILE}" exec -T "${REDIS_SERVICE}" redis-cli BGSAVE >/dev/null || true

docker compose -f "${COMPOSE_FILE}" exec -T "${REDIS_SERVICE}" sh -lc 'cd /data && tar -czf - .' > "${OUT_FILE}"

sha256sum "${OUT_FILE}" > "${OUT_FILE}.sha256"

echo "[redis_backup] OK"
echo "[redis_backup] BACKUP_FILE=${OUT_FILE}"
echo "[redis_backup] CHECKSUM_FILE=${OUT_FILE}.sha256"
