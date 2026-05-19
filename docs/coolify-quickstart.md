# Coolify Quickstart (rápido) 🚀

1) Backend
- En Coolify crea una nueva app: "Dockerfile/Build from repo" apuntando a `./backend`.
- Build command: usa Dockerfile por defecto.
- Env vars (establecer como "Secret envs"):
  - `DB_HOST` (p.ej. nombre del servicio Postgres o host suministrado por Coolify)
  - `DB_PORT=5432`
  - `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - `REDIS_URL` (p.ej. `redis://redis:6379` o el URL que Coolify suministre)
  - `NODE_ENV=production`, `PORT=5000`
- Health check: `http://<container-host>:5000/health` (Coolify UI permite configurar path y port).

2) Frontend
- En Coolify crea la app apuntando a `./frontend`.
- Env vars:
  - `BACKEND_URL` → si llegan a compartir red interna, `http://backend:5000`; si usas proxy, el endpoint público.
- Build: Dockerfile ya genera una imagen estática con nginx.
- Health check: `/` (puerto 80) o `http://<container-host>/`.

3) Base de datos / Redis
- Puedes usar tu `docker-compose.yml` para mantener Postgres y Redis fuera de Coolify, o crear/usar servicios dentro de Coolify si prefieres todo gestionado por la plataforma.
- Si usas el servicio de Postgres dentro de Coolify, ajusta `DB_HOST` con el host/connection string que provea Coolify.

4) Seguridad y secretos
- No subas `.env` con secretos al repo. Usa `Secrets` en Coolify o un secret manager.
- Usa `scripts/generate-secrets.sh` para generar valores seguros.

5) Recomendación de red
- Asegúrate que services (backend) y DB/Redis estén accesibles entre sí; en Coolify esto suele resolverse al desplegar servicios en el mismo proyecto/stack.

---
Si quieres, puedo:
- Ejecutar una subida de prueba (rebuild + up) en tu máquina local y validar endpoints y logs ✅
- Preparar plantillas adicionales para integración con un pipeline CI que despliegue en Coolify automáticamente 🔁
