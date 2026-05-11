# Alltura Control Operativo de Equipos y Herramientas

Sistema para gestionar inventario, entregas, devoluciones, firmas y trazabilidad operacional de activos y articulos.

## Estado actual (2026-05-11)

- Roles autenticables vigentes: admin, supervisor.
- trabajador permanece como entidad de dominio (sin login).
- Frontend consume backend en same-origin mediante rutas /api.
- Flujo operativo principal: activos serializados con custodia y firma.

## Arquitectura

Monorepo con:

- frontend: React 19 + Vite + TypeScript + React Query.
- backend: Express 5 + Joi + JWT + PostgreSQL + Redis.
- db/init: SQL idempotente de inicializacion y seed de desarrollo.

Patron backend:

- routes -> controllers -> services -> models/db.

## Flujos clave de negocio

## 1) Articulos y tipos

- Contrato vigente: grupo_principal + subclasificacion + especialidades.
- grupo_principal: epp, equipo, herramienta.
- subclasificacion por grupo:
  - epp -> epp
  - equipo -> medicion_ensayos
  - herramienta -> manual, electrica_cable, inalambrica_bateria
- tracking_mode se resuelve en backend:
  - epp -> lote
  - resto -> serial
- Campos legacy rechazados en payload: tipo, categoria, tracking_mode, retorno_mode.

## 2) Entrega

- Flujo: crear borrador -> firmar -> confirmar.
- Validaciones: trabajador activo, origen bodega activa, destino proyecto activo.
- Solo se permiten activos serializados.
- Confirmar entrega:
  - exige firma previa,
  - cambia activo a asignado,
  - abre custodia_activo,
  - registra movimiento_activo tipo entrega.

## 3) Devolucion

- Flujo: crear borrador -> firmar -> confirmar.
- Solo activos serializados con custodia activa del trabajador.
- Disposiciones: devuelto, perdido, baja, mantencion.
- Confirmar devolucion:
  - cierra custodia,
  - actualiza estado/ubicacion del activo segun disposicion,
  - registra movimiento_activo.

## 4) Firma digital y sincronizacion

- Firma en dispositivo o por QR (token publico).
- Tokens de firma reutilizables mientras esten vigentes.
- SSE de firmas en tiempo real con eventos:
  - delivery-signed
  - return-signed

## Rutas frontend activas

- /login
- /firma/:token
- /admin/dashboard
- /admin/trabajadores
- /admin/users
- /admin/ubicacion/bodegas
- /admin/ubicacion/proyectos
- /admin/inventario/epp
- /admin/inventario/equipos
- /admin/inventario/herramientas
- /admin/inventario/articulos
- /supervisor/dashboard

Nota operativa:

- La operacion de entregar/devolver se ejecuta hoy desde el perfil del activo (modales), no desde paginas dedicadas de entregas/devoluciones.

## Quick start local

## 1) Instalar dependencias

```bash
npm run install:all
```

## 2) Levantar infraestructura local

```bash
docker compose -f docker-compose.dev.yml up -d
```

Puertos por defecto:

- PostgreSQL: 55432
- Redis: 56379

## 3) Levantar backend + frontend

```bash
npm run dev
```

Servicios:

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

## Variables de entorno minimas

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
AUTH_EVENTS_STREAM_TOKEN_TTL_SECONDS=1800

CLIENT_URL=http://localhost:3000
SERVICE_URL_FRONTEND=http://localhost:3000
SERVICE_FQDN_FRONTEND=localhost:3000
TRUST_PROXY_HOPS=3
```

## Scripts utiles (raiz)

```bash
# Desarrollo
npm run dev

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
```

## Seguridad

- RequestId por request y logging estructurado.
- Validacion Joi de entradas en rutas API.
- JWT access + refresh.
- Hardening de middleware: helmet, cors, hpp, sanitizacion y handler global.

## Deuda tecnica conocida

- Posible drift entre swagger y rutas reales (Swagger desactualizado; endpoints de inventario/activos no documentados).
- Integracion DB no bloquea PR por defecto (workflow manual).
- Tablas DB sin CRUD activo: `inspeccion_activo`, `lote` (existen en schema, sin endpoints).
- Columnas candidatas a DROP: `articulo.categoria` (nullable legacy), `persona.foto_url`.

## Documentacion relacionada

- docs/epp-smoke-checklist.md
- docs/legacy-deprecation-matrix.md
- docs/ops/backup-restore.md
- backend/README.md
- frontend/README.md