#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[check-docs] validating required API mentions..."

grep -q "/api/entregas/:id/confirm" backend/README.md
grep -q "/api/devoluciones/:id/confirm" backend/README.md
grep -q "/api/firmas/events/deliveries" backend/README.md

grep -q "grupo_principal" README.md
grep -q "subclasificacion" README.md

grep -q "perfil de activo" frontend/README.md
grep -q "/admin/inventario/herramientas" frontend/README.md

echo "[check-docs] OK"
