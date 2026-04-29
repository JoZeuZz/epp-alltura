## Canonico 2026-03-23

## Panorama general
- Monorepo: backend Express 5 (CommonJS) + frontend React 19/Vite + PostgreSQL + Redis.
- Dominio vigente: control EPP/herramientas (no andamios).
- Patrón backend: rutas -> controladores -> servicios -> DB; envelope de respuesta en la mayoría de endpoints.
- Middleware crítico en backend: helmet -> cors -> hpp -> headers/csp -> requestId -> compression -> parsers -> sanitizeStrict(/api) -> logger -> rutas -> error handlers.

## Rutas por rol vigentes (actualizado 2026-04-28)
- Admin: /admin/dashboard, /admin/inventario/*, /admin/users, /admin/trabajadores, /admin/ubicaciones, /admin/bodegas, /admin/proyectos, /admin/entregas, /admin/devoluciones.
- Supervisor: /supervisor/dashboard, /supervisor/operaciones.
- ELIMINADAS: /bodega/*, /worker/*, /admin/trazabilidad, /admin/auditoria.
- Inventario admin subrutas: /articulos, /stock, /movimientos, /ingresos, /egresos, /activos, /epp, /equipos, /herramientas.

## Inventario y trazabilidad
- Stock escalable: /inventario/stock-summary + /inventario/stock-paged + /inventario/activos-paged (cursor por offset codificado en base64url).
- Patrón UI de stock: resumen por artículo y detalle lazy en modal (serial vs lote).
- Para serializados en detalle se exponen custodia actual, poseedor, ubicación, desde cuándo, días en custodia, última entrega/devolución y último movimiento.
- Filtro operativo implementado: solo_entregados para activos paginados.

## Firma y eventos en tiempo real
- SSE backend en /api/firmas/events/deliveries con evento delivery-signed.
- Soporte de token QR reutilizable: si hay token activo no expirado se retorna con reused=true.
- Se agregó token_publico en firma_token (migración 013) para persistir token reusable y lookup eficiente.
- Frontend usa hook de suscripción para refrescar entregas al firmar remotamente.

## Reglas estructurales de dominio
- tracking_mode válido: serial | lote (legacy cantidad eliminado).
- Cantidades físicas enteras end-to-end (DB + Joi + servicios + UI formatter/parser).
- Custodia activa única por activo serializado (invariante de integridad).
- Eliminaciones de ingreso/egreso modeladas como reversión de movimientos para preservar trazabilidad.
- Entrega admite eliminación permanente solo en estados anulada o revertida_admin.

## Migraciones relevantes
- 011: normalización tracking_mode (cantidad -> lote).
- 012: normalización de cantidades a enteros con CHECK en tablas críticas.
- 013: soporte de reutilización de token de firma (token_publico + índice único parcial).

## Deuda y cautelas
- Puede existir drift entre swagger y contratos reales; verificar antes de exponer APIs a terceros.
- Coexisten fetchAPI (loaders) y apiService (axios); mantener consistencia de invalidación/cache.
- Comparación exacta local-vs-remoto GitHub queda pendiente cuando haya contexto remoto confirmado (owner/repo/branch).