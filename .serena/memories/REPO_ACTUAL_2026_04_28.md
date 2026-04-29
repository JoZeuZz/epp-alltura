# Estado real del repositorio — 2026-04-28

## Estructura monorepo
- `backend/` — Express 5, CommonJS, Node 24
- `frontend/` — React 19, Vite, TypeScript
- `db/init/` — SQL idempotente único (001-init.sql + 002-dev-seed.sql)
- `scripts/` — check-legacy.js, check-backend-validation-usage.js
- `docker-compose.dev.yml` — monta `./db/init` en `/docker-entrypoint-initdb.d`

## Roles autenticables (confirmados)
Solo `admin` y `supervisor`. Sin `bodega`, `worker`, `trabajador`, `client`.
`trabajador` existe como entidad de dominio (persona que recibe EPP) pero sin login.

## Frontend — páginas activas por rol

### Admin
- `/admin/dashboard` — AdminDashboard (con loader: stock, movimientos, summary)
- `/admin/trabajadores` — AdminTrabajadoresPage
- `/admin/users` — UsersPage
- `/admin/entregas` — AdminEntregasPage
- `/admin/devoluciones` — AdminDevolucionesPage
- `/admin/ubicaciones` — AdminUbicacionesPage (nueva)
- `/admin/bodegas` — AdminBodegasPage (nueva, filtra tipo=bodega)
- `/admin/proyectos` — AdminProyectosPage (nueva, filtra tipo=proyecto)
- `/admin/inventario/*` — AdminInventoryLayout con sub-rutas:
  - `/articulos`, `/stock`, `/movimientos`, `/ingresos`, `/egresos`
  - `/activos` — AdminInventoryActivosPage
  - `/epp` — AdminInventoryEppPage (filtra categoria=epp)
  - `/equipos` — AdminInventoryEquiposPage (filtra categoria=equipos)
  - `/herramientas` — AdminInventoryHerramientasPage (filtra categoria=herramientas)

### Supervisor
- `/supervisor/dashboard` — SupervisorDashboard
- `/supervisor/operaciones` — SupervisorOperationsPage (hereda lo que era /bodega/operaciones)

### Compartidas
- `/perfil` — ProfilePage
- `/notificaciones` — NotificationsPage
- `/firma/:token` — PublicSignPage (pública)

## Frontend — capa shell (`frontend/src/shell/`)
Nueva capa introducida como librería compartida de UI primitivos:
- `shell/components/` — duplica componentes core: ConfirmationModal, ErrorMessage, Modal, NotificationBell, Spinner, TourOverlay, etc.
- `shell/context/` — AuthContext, NotificationContext, TourContext
- `shell/layout/` — AppLayout, Container, ResponsiveGrid, ResponsiveTable
- `shell/services/` — apiService, authRefresh, httpClient, notificationService, performanceService, frontendLogger
- `shell/utils/` — imageProcessing, image, name, tourSteps
- `shell/index.ts` — actualmente vacío (sin exports)
Estado: en transición, los imports de páginas aún apuntan a `src/components/`, `src/services/` etc. directamente.

## Backend — rutas activas
`/api/auth`, `/api/users`, `/api/articulos`, `/api/inventario`, `/api/entregas`, `/api/devoluciones`, `/api/firmas`, `/api/trabajadores`, `/api/ubicaciones`, `/api/proveedores`, `/api/compras`, `/api/dashboard`, `/api/documentos`, `/api/notifications`, `/api/image-proxy`, `/api-docs` (Swagger).

## Backend — servicios nuevos (no documentados previamente)
- `custodyCheck.service.js` — cron diario: detecta activos entregados sin devolución, notifica a admin/supervisor.
- `documentos.service.js` — gestión de documentos adjuntos (actas, anexos) con subida de archivos.
- `notification.service.js` — push notifications vía web push + persistencia en tabla `notifications`.
- `egresos.service.js` — servicio de egresos de inventario (separado de compras).

## DB — tablas nuevas (no documentadas previamente)
- `articulo_especialidad` — especialidades por artículo: `oocc`, `ooee`, `equipos`, `trabajos_verticales_lineas_de_vida`
- `inspeccion_activo` — inspecciones y calibraciones de activos (tipo: `inspeccion` | `calibracion`)
- `documento`, `documento_compra`, `documento_referencia` — sistema de documentos adjuntos
- `notifications` — notificaciones persistidas por usuario
- `push_subscriptions` — suscripciones Web Push

## DB — nuevos campos en tablas existentes
- `articulo.categoria` — valores: `epp`, `medicion_ensayos`, `manual`, `electrica_cable`, `inalambrica_bateria`
- `articulo.subclasificacion` — campo API (la validación Joi rechaza `categoria` como nombre de campo y dirige a usar `subclasificacion`)
- `ubicacion.tipo` — valores: `bodega`, `planta`, `proyecto`, `taller_mantencion` (antes solo `bodega`)

## Deuda técnica observada
- `shell/index.ts` vacío: la capa shell existe en FS pero no exporta nada; los imports siguen apuntando a los originales.
- Duplicación de validation: `backend/src/lib/validation/index.js` Y `backend/src/validation/index.js` (posible legacy).
- `frontend/src/components/`, `src/services/`, etc. coexisten con su espejo en `src/shell/`; pendiente consolidar.
