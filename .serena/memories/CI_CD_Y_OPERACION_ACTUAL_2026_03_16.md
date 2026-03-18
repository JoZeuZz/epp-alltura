# CI/CD y operación actual (2026-03-16)

## Workflows GitHub
- `ci.yml` corre en push/pull_request:
  - Job `lint`: `npm run lint:ci` (incluye guardias de validación backend y de legacy frontend).
  - Job `test`: tests backend + frontend.
  - Job `build`: build frontend.
- `integration-db.yml` existe pero es manual (`workflow_dispatch`), no bloquea PR por defecto.

## Guardias custom del repo
- `scripts/check-backend-validation-usage.js`:
  - Prohíbe imports legacy de validación.
  - Exige imports canónicos desde `lib/validation`.
  - Detecta símbolos legacy no permitidos.
- `scripts/check-legacy.js`:
  - Bloquea referencias de rutas/patrones legacy en frontend.
  - Falla si existe archivo retirado `frontend/src/services/apiService.legacy.ts`.

## Docker Compose
- `docker-compose.yml` (stack): postgres + redis + backend + frontend, healthchecks y red interna (más red `coolify` externa).
- `docker-compose.dev.yml` (local dev): solo postgres y redis con puertos host (`55432`, `56379`) para correr backend/frontend fuera de contenedor.

## Testing
- Backend jest config con threshold global 60%.
- Frontend: vitest + smoke Playwright (desktop y mobile chromium).
- Playwright arranca Vite local si no existe server (`reuseExistingServer: true`).

## PM2
- `ecosystem.config.js` incluye app frontend con `cmd.exe /c npm run dev` (orientado a Windows). En Linux requiere ajuste para uso directo.
