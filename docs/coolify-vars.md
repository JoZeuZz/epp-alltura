# Plantillas de variables para Coolify 📦

## Backend (requeridas)
- `DB_HOST` → Host o connection string de Postgres (ej.: `postgres-db.internal`)
- `DB_PORT` → 5432
- `DB_USER` → Usuario de la BD
- `DB_PASSWORD` → Contraseña segura
- `DB_NAME` → Nombre de la BD
- `PORT` → `5000`
- `NODE_ENV` → `production`
- `CLIENT_URL` → URL pública del frontend (para CORS)

## Seguridad
- `JWT_SECRET`, `JWT_REFRESH_SECRET` → Generar con `openssl rand -hex 64` o `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- `REDIS_URL` → URL de Redis (ej. `redis://redis:6379`)

## Admin inicial (bootstrap automático)

Al arrancar, el backend crea el primer administrador **solo si no existe ningún admin** y estas variables están definidas:

- `ADMIN_EMAIL` → Email de login del admin inicial (ej.: `admin@tuempresa.cl`)
- `ADMIN_PASSWORD` → Contraseña segura (mínimo 12 caracteres). **Nunca se loguea.**
- `ADMIN_NAME` → Nombre completo (ej.: `Juan Pérez`). El primer token es `nombres`, el resto `apellidos`.
- `ADMIN_RUT` → RUT chileno (ej.: `12345678-9`). Opcional; si omites usa placeholder `11111111-1`.

El bootstrap es **idempotente**: si ya existe un admin o el email ya está registrado, no hace nada. Seguro de llamar en cada restart.

> Si no defines estas variables, el backend arranca sin crear admin y lo advierte en los logs. Puedes crear el admin manualmente con `npm run create-admin --prefix backend`.

## Opcionales
- `GCS_*` → Cuando se use Google Cloud Storage
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` → Para Web Push (generar con `npx web-push generate-vapid-keys`)

> Consejo: Guarda estas variables como *secret environment variables* en Coolify (no las dejes como plain envs en el repo). 🔐
