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

## Opcionales
- `GCS_*` → Cuando se use Google Cloud Storage
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` → Para Web Push (generar con `npx web-push generate-vapid-keys`)

> Consejo: Guarda estas variables como *secret environment variables* en Coolify (no las dejes como plain envs en el repo). 🔐
