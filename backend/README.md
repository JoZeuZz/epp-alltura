# Backend Alltura Equipos y Herramientas

API para autenticacion, inventario, articulos, entregas, devoluciones, firmas y trazabilidad.

## Stack

- Node.js + Express 5
- PostgreSQL (pg)
- Redis
- Joi
- JWT (access + refresh)

## Arquitectura

- routes: HTTP + validacion
- controllers: capa HTTP
- services: logica de negocio y transacciones
- models/db: acceso a datos

## Setup rapido

## 1) Instalar dependencias

```bash
npm install
```

## 2) Variables minimas

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

## 3) Infra local (desde raiz)

```bash
docker compose -f docker-compose.dev.yml up -d
```

## 4) Ejecutar API

```bash
npm run dev
```

## Endpoints principales

Todos con prefijo /api.

- /auth
- /users
- /dashboard
- /articulos
- /inventario
- /entregas
- /devoluciones
- /firmas
- /trabajadores
- /bodegas
- /proyectos
- /proveedores
- /notifications
- /compras
- /activos (sub-rutas de inventario: entregar, devolver)
- /image-proxy

Health:

- /health
- /health/live
- /health/ready

## Contratos vigentes clave

## Articulos

- GET /api/articulos
- GET /api/articulos/:id
- POST /api/articulos
- PUT /api/articulos/:id
- DELETE /api/articulos/:id
- DELETE /api/articulos/:id/permanent

Notas:

- payload usa grupo_principal, subclasificacion, especialidades.
- tipo, categoria, tracking_mode y retorno_mode se rechazan por validacion.

## Entregas

- GET /api/entregas
- GET /api/entregas/:id
- POST /api/entregas
- POST /api/entregas/:id/confirm
- POST /api/entregas/:id/anular

## Devoluciones

- GET /api/devoluciones/activos-elegibles
- GET /api/devoluciones
- GET /api/devoluciones/:id
- POST /api/devoluciones
- POST /api/devoluciones/:id/firmar-dispositivo
- POST /api/devoluciones/:id/confirm
- POST /api/devoluciones/:id/anular

## Firmas

Entregas:

- GET /api/firmas/tokens/:token
- POST /api/firmas/tokens/:token/firmar
- POST /api/firmas/entregas/:entregaId/token
- POST /api/firmas/entregas/:entregaId/firmar-dispositivo

Devoluciones:

- POST /api/firmas/devoluciones/:devolucionId/token
- GET /api/firmas/devoluciones/:token
- POST /api/firmas/devoluciones/:token/firmar

SSE de firmas:

- POST /api/firmas/events/deliveries/token
- GET /api/firmas/events/deliveries?stream_token=...

Eventos:

- delivery-signed
- return-signed

## Inventario (rutas principales)

- GET /api/inventario/ingresos
- POST /api/inventario/ingresos
- DELETE /api/inventario/ingresos/:id
- GET /api/inventario/egresos | /egresos/:id
- POST /api/inventario/egresos
- DELETE /api/inventario/egresos/:id
- GET /api/inventario/stock | /stock-summary | /stock-paged
- GET /api/inventario/movimientos-stock | /movimientos-stock/export
- GET /api/inventario/movimientos-activo
- GET /api/inventario/activos | /activos-paged | /activos-disponibles
- GET /api/inventario/activos/:id/perfil
- PATCH /api/inventario/activos/:id/estado | /activos/:id/reubicar | /activos/:id
- GET /api/inventario/auditoria
- POST /api/activos/:id/entregar
- POST /api/activos/:id/devolver

## Reglas de negocio clave

- Roles login activos: admin, supervisor.
- trabajador es entidad de dominio, no usuario autenticable.
- Entregas y devoluciones operan sobre activos serializados.
- Entrega confirmada abre custodia activa.
- Devolucion confirmada cierra custodia y aplica disposicion del activo.
- Disposiciones de devolucion: devuelto, perdido, baja, mantencion.

## Scripts utiles

```bash
# Ejecucion
npm run dev
npm start

# Calidad
npm run lint

# Tests
npm test
npm run test:services
npm run test:integration-db
```

## Observabilidad y seguridad

- requestId en pipeline de request y logs.
- logging estructurado.
- middleware de hardening: helmet, cors, hpp, sanitizacion.
- error handler global.

## Deuda tecnica conocida

- Swagger desactualizado respecto a rutas reales (endpoints de inventario/activos no documentados).
- Tablas DB sin CRUD activo: `inspeccion_activo`, `lote` (existen en schema, sin servicios/rutas).
- Columnas candidatas a DROP: `articulo.categoria` (nullable legacy), `persona.foto_url`.