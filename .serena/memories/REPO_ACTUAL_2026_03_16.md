# Estado real del repositorio (2026-03-16)

## Monorepo
- Raíz: orquesta backend + frontend + DB con scripts npm.
- Backend: Express 5.1.0 CommonJS en `backend/src`.
- Frontend: React 19 + Vite 7 + React Router 7 + TanStack Query v5 en `frontend/src`.
- DB: PostgreSQL + Redis con init SQL versionado en `db/init/001..004`.

## Dominio funcional vigente
- Dominio canónico: herramientas/EPP (no andamios legacy como núcleo).
- Módulos backend operativos: `articulos`, `inventario`, `entregas`, `devoluciones`, `firmas`, `proveedores`, `trabajadores`, `ubicaciones`, `users`, `auth`, `dashboard`, `notifications`.
- Flujos clave: compra/ingreso, entrega, firma (token QR + dispositivo), confirmación, devolución, movimientos de stock/activo, auditoría.

## Frontend actual
- Router con loaders por rol: `admin`, `supervisor`, `bodega`, `worker` (+ normalización de `trabajador` y `client` -> `worker`).
- Rutas lazy-loaded y `createBrowserRouter` en `frontend/src/router/index.tsx`.
- Capa API principal vía `frontend/src/services/apiService.ts` (axios + refresh interceptor), pero también existe `fetchAPI` en router para loaders.

## Seguridad y middleware backend
- Orden explícito de seguridad en `backend/src/index.js`: helmet, cors, hpp, headers, csp logger, requestId, compression, body parsers, sanitizeStrict.
- `trust proxy` fijado en 3 saltos.
- Handler 404 + errorHandler global al final.
- Sanitización amplia con DOMPurify/validator en `middleware/sanitization.js`.

## Firma y custodia
- `firmas.routes.js`: firma por token público y firma autenticada en dispositivo; soporte multipart opcional + validación de magic bytes.
- `firmas.service.js`: hash SHA-256 para token, control de expiración/uso único, validación de trabajador firmante esperado, escritura de auditoría.

## Base de datos
- `001-init.sql`: modelo base MER EPP (persona/usuario/rol, ubicacion, articulo, compra, lote, activo, stock, entrega, firma, custodia, devolucion, movimientos, documento, auditoria, notifications).
- `002-egresos.sql`: egresos y detalle, integración con movimiento_stock.
- `003-ubicaciones-entregas-epp-rules.sql`: reglas de ubicación/entrega + índices.
- `004-movement-integrity-rules.sql`: checks de integridad y estados para entrega/devolución/activo.
