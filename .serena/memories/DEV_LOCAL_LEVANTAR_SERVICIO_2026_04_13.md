# Levantar servicio en desarrollo local (backend+frontend fuera de Docker)

- Infra dev: `docker compose -f docker-compose.dev.yml up -d`
- Error común: `docker compose up -d docker-compose.dev.yml` => Docker interpreta el archivo como servicio (`no such service`).
- `npm run dev` en raíz ejecuta backend con `cd backend`, por lo que dotenv lee `backend/.env` (no el `.env` de raíz).
- Como backend corre en host, en `backend/.env` usar:
  - `DB_HOST=localhost`
  - `DB_PORT=55432`
  - `REDIS_URL=redis://localhost:56379`
- No usar `DB_HOST=postgres_db` ni `redis://redis:6379` cuando backend se ejecuta fuera de Docker (provoca timeout).
- Validación rápida:
  - `docker compose -f docker-compose.dev.yml ps` (postgres y redis en `healthy`)
  - `cd backend && node src/db/check_db.js` (debe listar tablas/roles)
  - `npm run dev` (debe iniciar servidor sin `Timed out waiting for database`).