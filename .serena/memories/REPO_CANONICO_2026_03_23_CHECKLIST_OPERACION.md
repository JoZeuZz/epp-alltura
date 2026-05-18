## Checklist operativo producción (2026-03-23)

## Arranque y salud
- Verificar /health, /health/live, /health/ready.
- Confirmar conexión DB y Redis en logs de startup.
- Confirmar inicialización db/init completa (001..013) sin rollback.

## Variables y secretos
- Backend mínimo: NODE_ENV, PORT, DB_*, JWT_SECRET, JWT_REFRESH_SECRET, REDIS_URL.
- Frontend/proxy: BACKEND_URL y orígenes CORS consistentes.
- Revisar CLIENT_URL / SERVICE_URL_FRONTEND / SERVICE_FQDN_FRONTEND.

## Seguridad y red
- Validar orden de middlewares de seguridad en backend.
- Validar trust proxy de acuerdo con topología real.
- Verificar rate-limit en login.

## Integridad de negocio (smoke) — actualizado 2026-05-15
- Entrega: crear borrador -> firmar -> confirmar; validar artículo pasa a estado `asignado`.
- Devolución: crear borrador -> firmar -> confirmar; validar disposición (devuelto/perdido/baja/mantencion).
- Cambio de estado directo: `POST /api/articulos/:id/estado` con nuevo_estado válido.
- ELIMINADOS: egreso/ingreso — ya no existen como flujos independientes.

## Firma remota
- Generar token de firma y repetir llamada para validar reused=true.
- Abrir stream SSE /api/firmas/events/deliveries y verificar evento delivery-signed al firmar remotamente.

## Inventario/artículos
- Validar GET /api/articulos con filtros (tipo, estado, bodega_id).
- Validar GET /api/inventario/activos-paged con cursor.
- ELIMINADOS: /stock-summary, /stock-paged (stock eliminado del modelo).

## Frontend cache
- Query keys deben incluir variables que afectan queryFn.
- Invalidación por familias/prefijos tras mutaciones relacionadas (entregas/devoluciones/stock).
- Verificar limpieza de cache al logout.

## CI/CD y QA
- Ejecutar lint y suites relevantes (backend/frontend).
- Ejecutar smoke operativo por roles con evidencia mínima (IDs y capturas).
- Para cambios SQL o flujo crítico, correr test de integración DB antes de merge.

## Riesgos vigentes
- Drift potencial swagger vs rutas reales.
- Coexistencia fetchAPI y axios requiere disciplina de consistencia.
- Comparación exacta contra remoto quedó pendiente por decisión actual (validación local aplicada).