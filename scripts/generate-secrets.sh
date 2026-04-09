#!/usr/bin/env bash
set -euo pipefail

# small helper to generate secrets for local testing or to copy into Coolify envs
# Usage: ./scripts/generate-secrets.sh [--write .env.local]

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required to generate secure random secrets. Install it and retry." >&2
  exit 1
fi

JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
POSTGRES_PASSWORD=$(openssl rand -hex 32)

cat <<EOF
# Copy these values to your Coolify envs or save them securely in a secret manager
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# VAPID keys (web push) must be generated separately with: npx web-push generate-vapid-keys
# Example: npx web-push generate-vapid-keys --json
EOF

if [ "${1-}" = "--write" ]; then
  TARGET_FILE=".env.local"
  echo "Writing to ${TARGET_FILE} (do not commit this file)"
  cat > ${TARGET_FILE} <<ENV
# Local secrets (auto-generated)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
ENV
  echo "Done. ${TARGET_FILE} created. Add it to .gitignore if not already ignored.";
fi
