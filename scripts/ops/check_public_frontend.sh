#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-inventario.alltura.cl}"
BASE_URL="https://${DOMAIN}"

TMP_HTML="$(mktemp)"
TMP_API_BODY="$(mktemp)"

cleanup() {
  rm -f "$TMP_HTML" "$TMP_API_BODY"
}
trap cleanup EXIT

echo "[1/6] Fetch index: ${BASE_URL}"
curl -fsSL "${BASE_URL}" -o "$TMP_HTML"

INDEX_CHUNK="$(grep -oE 'assets/index-[^"[:space:]]+\.js' "$TMP_HTML" | head -n1 || true)"
VENDOR_CHUNK="$(grep -oE 'assets/vendor-[^"[:space:]]+\.js' "$TMP_HTML" | head -n1 || true)"
VENDOR_REACT_CHUNK="$(grep -oE 'assets/vendor-react-[^"[:space:]]+\.js' "$TMP_HTML" | head -n1 || true)"

if [[ -z "$INDEX_CHUNK" ]]; then
  echo "ERROR: no se encontro chunk principal index-*.js"
  exit 1
fi

echo "index chunk: ${INDEX_CHUNK}"
echo "vendor chunk: ${VENDOR_CHUNK:-N/A}"

if [[ -n "$VENDOR_REACT_CHUNK" ]]; then
  echo "ERROR: detectado chunk legacy vendor-react (${VENDOR_REACT_CHUNK})"
  exit 1
fi

echo "[2/6] Headers index"
curl -fsSI "${BASE_URL}" | sed -n '1,12p'

echo "[3/6] Headers chunk principal"
curl -fsSI "${BASE_URL}/${INDEX_CHUNK}" | sed -n '1,12p'

if [[ -n "$VENDOR_CHUNK" ]]; then
  echo "[4/6] Headers chunk vendor"
  curl -fsSI "${BASE_URL}/${VENDOR_CHUNK}" | sed -n '1,12p'
fi

echo "[5/6] Smoke API (esperado 400/401/403 sin auth)"
API_STATUS="$(curl -sS -o "$TMP_API_BODY" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -X POST "${BASE_URL}/api/auth/login" \
  -d '{}' || true)"

echo "POST /api/auth/login => ${API_STATUS}"
if [[ "$API_STATUS" != "400" && "$API_STATUS" != "401" && "$API_STATUS" != "403" ]]; then
  echo "ERROR: status inesperado en API"
  sed -n '1,60p' "$TMP_API_BODY"
  exit 1
fi

echo "[6/6] Service worker header"
curl -fsSI "${BASE_URL}/sw.js" | sed -n '1,15p'

echo "OK: frontend publico consistente para ${DOMAIN}"
