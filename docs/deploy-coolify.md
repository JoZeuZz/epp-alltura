# Despliegue local con Coolify (Guía rápida)

## 1) Backend
- En Coolify crea una nueva aplicación tipo "Dockerfile/Build from repo" apuntando al path `./backend`.
- Dockerfile: deja el que está (`backend/Dockerfile`) — ya optimizado (multi-stage, healthcheck).
- Variables de entorno obligatorias (en Coolify -> Environment):
  - `DB_HOST` → nombre del servicio de Postgres en tu red (ej. `postgres_db` o el host/shortname creado por Coolify)
  - `DB_PORT` → `5432` (si aplica)
  - `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - `PORT` → `5000`
  - `NODE_ENV` → `production`
  - `CLIENT_URL` → URL pública del frontend (útil para CORS)
- Healthcheck: `http://<container-host>:5000/health`

## 2) Frontend
- En Coolify crea una app apuntando al path `./frontend`.
- Dockerfile ya incluye un `nginx` con template para `BACKEND_URL`.
- En Environment de la app establece `BACKEND_URL=http://<backend_service_name>:5000` (si las apps comparten red interna) o la URL pública del backend si usas proxy externo.
- Coolify también puede configurar un proxy inverso; si lo haces, `BACKEND_URL` puede apuntar a `https://api.tu-dominio`.

## 3) Base de datos (Postgres) y Redis
- Opciones:
  - Deploy con tu `docker-compose.yml` actual (postgres_db y redis) y usar `docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d` para levantar todo localmente.
  - O bien migrar Postgres/Redis dentro de Coolify (crear servicios o usar add-ons) y usar los hostnames que Coolify entrega.
- Asegúrate de que todas las apps (frontend, backend y la BD) queden en la misma red Docker para que el servicio por nombre funcione.

## 4) Notas de seguridad y CORS
- `backend` ya valida `CLIENT_URL` en `allowedOrigins`. Establece `CLIENT_URL` en la env del backend con la URL final del frontend.
- Para ambientes de desarrollo puedes usar el `BACKEND_URL` interno; en producción usa `https` y dominios gestionados por Coolify.

## 5) Comprobación local rápida
- Levanta infra: `docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d`
- Accede a:
  - Backend: `http://localhost:5000/health`
  - Frontend: `http://localhost` (o el puerto que mapees)

---
Si quieres, puedo:
- Añadir la configuración de `README.md` con estos pasos ✅
- Probar localmente levantando los contenedores si quieres que lo ejecute en tu máquina 📦
