# Alltura Control Operativo de Equipos y Herramientas

Sistema integral para gestionar inventario de equipos y herramientas, con trazabilidad operativa de ingresos, entregas, firmas, devoluciones, egresos y movimientos.

## Resumen

Alltura digitaliza la operación diaria de bodega y terreno con foco en:

- Control de stock por ubicación.
- Trazabilidad por artículo en modo serial o lote.
- Flujos operativos con validaciones de negocio y auditoría.
- Firma digital de entregas y devoluciones.
- Gestión por roles autenticables: admin y supervisor. El supervisor cubre la operación antes asociada a supervisor y bodega.

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Flujos Clave](#flujos-clave)
- [Quick Start Local](#quick-start-local)
- [Variables de Entorno Mínimas](#variables-de-entorno-mínimas)
- [Scripts Disponibles](#scripts-disponibles)
- [Testing y Calidad](#testing-y-calidad)
- [Deploy](#deploy)
- [Seguridad](#seguridad)
- [Documentación Relacionada](#documentación-relacionada)
- [Riesgos y Deuda Técnica Vigente](#riesgos-y-deuda-técnica-vigente)

## Arquitectura

Monorepo con tres bloques principales:

- Frontend: React 19 + Vite + React Router + TanStack Query.
- Backend: Node.js + Express 5 + Joi + JWT + Redis + PostgreSQL.
- Datos: esquema SQL versionado en db/init/001..012.

### Estructura Principal

```text
.
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── db/
│   │   └── index.js
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── router/
│   │   └── services/
│   └── README.md
├── db/
│   └── init/
├── docs/
└── README.md
```

## Flujos Clave

- Ingreso/compra: recepción de stock y/o activos.
- Entrega: asignación de artículos a trabajador/ubicación.
- Firma: token público o firma autenticada en dispositivo (ruta pública SPA `/firma/:token`, consumo API en `/api/firmas/tokens/:token`).
- Devolución: retorno de activos y cierre/actualización de custodia.
- Egreso: salida operativa o baja.
- Trazabilidad: movimientos de stock/activo y auditoría.

Compatibilidad legacy explícita:

- Términos y rutas históricas (`consumo`, `retorno_mode`, `traslado`, `en_transito`, `recibirTraslado`) se mantienen sólo por compatibilidad acotada y validaciones negativas.
- El flujo principal vigente es operativo simplificado con entregas/devoluciones serializadas y confirmación con firma.

### Reglas de Negocio Relevantes

- tracking_mode válido: serial o lote.
- Cantidades físicas: enteras de extremo a extremo.
- Custodia activa única por activo (restricción reforzada en DB).

## Quick Start Local

### 1) Instalar dependencias

```bash
npm run install:all
```

### 2) Levantar infraestructura local (PostgreSQL + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

Puertos locales por defecto:

- PostgreSQL: localhost:55432
- Redis: localhost:56379

### 3) Ejecutar backend + frontend

```bash
npm run dev
```

Servicios:

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### 4) Login de desarrollo (seed)

El baseline de desarrollo usa db/init/002-dev-seed.sql (junto con 001/003/004) y genera usuarios demo autenticables solo con roles `admin` y `supervisor`:

- admin.dev@alltura.local
- supervisor.dev@alltura.local
- operaciones.dev@alltura.local
- coordinador.dev@alltura.local
- auditor.dev@alltura.local

Password demo: Dev12345!

Los trabajadores se mantienen como entidad de dominio administrable, sin login ni dashboard propio.

Para reconstruir el entorno desde cero (reset destructivo):

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

## Variables de Entorno Mínimas

Configura al menos estas variables para backend local:

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=55432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=herramientas_epp

REDIS_URL=redis://localhost:56379

JWT_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me_too
AUTH_LOGIN_LOCK_MAX_ATTEMPTS=5
AUTH_LOGIN_RATE_LIMIT_WINDOW_MS=900000
AUTH_LOGIN_RATE_LIMIT_MAX=30
AUTH_EVENTS_STREAM_TOKEN_TTL_SECONDS=1800

CLIENT_URL=http://localhost:3000
SERVICE_URL_FRONTEND=http://localhost:3000
SERVICE_FQDN_FRONTEND=localhost:3000
TRUST_PROXY_HOPS=3
```

Notas:

- Ajusta credenciales DB/Redis a tu entorno.
- VAPID_* y configuración GCS son opcionales según despliegue.
- `AUTH_EVENTS_STREAM_TOKEN_TTL_SECONDS` controla el TTL del token efímero usado por SSE de firmas.
- `TRUST_PROXY_HOPS` define los saltos de proxy para Express (`trust proxy`).

## Scripts Disponibles

Scripts relevantes en raíz:

```bash
# Desarrollo
npm run dev
npm run start:backend:dev
npm run start:frontend

# Infra local
npm run db:up
npm run db:logs

# Calidad
npm run lint
npm run lint:ci
npm run check:legacy
npm run check:backend-validation

# Pruebas
npm test
npm run test:backend
npm run test:frontend
npm run test:integration-db
npm run test:smoke:real
```

## Testing y Calidad

- Backend: Jest (unitarias, servicios, integración DB).
- Frontend: Vitest (unitarias) + Playwright (smoke).
- CI principal: lint + test + build frontend.
- Integración DB: flujo separado (manual), recomendado antes de merge en cambios de dominio/SQL.

## Smoke Checklist Mínimo (P0.1) - Operación Supervisor y Firma

Alcance de UI (sin pantallas nuevas):

- `AdminEntregasPage`
- `AdminDevolucionesPage`

Precondición de baseline local:

```bash
npm run install:all
docker compose -f docker-compose.dev.yml up -d
npm run dev
```

Flujo smoke mínimo:

1. Login como `admin` o `supervisor` y abrir entregas/devoluciones. Endpoints: `GET /api/entregas`, `GET /api/devoluciones`.
2. En `AdminEntregasPage`, crear entrega serializada en borrador con al menos un activo. Endpoint: `POST /api/entregas`.
3. Firmar la entrega (al menos una vía). Endpoints: `POST /api/firmas/entregas/:entregaId/firmar-dispositivo`, `POST /api/firmas/entregas/:entregaId/token`, `POST /api/firmas/tokens/:token/firmar`, `GET /api/firmas/tokens/:token`.
4. Confirmar entrega desde `AdminEntregasPage`. Endpoint: `POST /api/entregas/:id/confirm`.
5. En `AdminDevolucionesPage`, crear devolución serializada con trabajador + recepción y detalle válido. Endpoints: `GET /api/devoluciones/activos-elegibles`, `POST /api/devoluciones`.
6. Firmar y confirmar devolución desde la misma página. Endpoints: `POST /api/devoluciones/:id/firmar-dispositivo`, `POST /api/devoluciones/:id/confirm`.
7. Validar trazabilidad básica por operación completada. Endpoints: `GET /api/entregas/:id`, `GET /api/devoluciones/:id`. Criterio: entrega en `confirmada`, devolución en `confirmada`, y detalle consistente (firma y disposiciones).

Troubleshooting rápido:

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f postgres_db
docker compose -f docker-compose.dev.yml logs -f redis
docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d
curl -fsS http://localhost:5000/health/ready
ss -ltnp | rg '3000|5000|55432|56379'
```

## Deploy

Hay soporte para despliegue con Docker Compose y guía para Coolify + Cloudflare Tunnel.

Recomendación operativa:

- Publicar frontend por dominio público.
- Consumir backend desde frontend vía rutas same-origin (/api/...) cuando aplique.
- Mantener backend/DB/Redis sin exposición pública directa salvo necesidad explícita.

## Seguridad

Controles activos de seguridad en backend:

- Helmet, CORS, HPP, sanitización estricta y validación Joi.
- JWT access + refresh.
- Rate limiting en autenticación.
- Lockout por email configurable (`AUTH_LOGIN_LOCK_MAX_ATTEMPTS`) y stream token efímero para SSE de firmas.
- Trazabilidad por requestId y logging estructurado.

## Documentación Relacionada

- [docs/coolify-quickstart.md](docs/coolify-quickstart.md)
- [docs/deploy-coolify.md](docs/deploy-coolify.md)
- [docs/DEPLOY_COOLIFY_CLOUDFLARE_TUNNEL.md](docs/DEPLOY_COOLIFY_CLOUDFLARE_TUNNEL.md)
- [docs/epp-smoke-checklist.md](docs/epp-smoke-checklist.md)
- [docs/legacy-deprecation-matrix.md](docs/legacy-deprecation-matrix.md)
- [docs/legacy-phase2-cutover-checklist.md](docs/legacy-phase2-cutover-checklist.md)

## Riesgos y Deuda Técnica Vigente

- Doble cliente HTTP en frontend (fetchAPI en loaders y apiService con axios interceptors).
- Drift potencial entre Swagger y contratos efectivos.
- Integration DB no bloquea PR por defecto.

## Estado

Aplicación operativa enfocada en dominio de equipos y herramientas, con flujo productivo en evolución continua.
