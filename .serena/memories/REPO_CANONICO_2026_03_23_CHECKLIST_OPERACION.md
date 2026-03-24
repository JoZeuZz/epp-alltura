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

## Integridad de negocio (smoke)
- Entrega serial: crear -> firmar -> confirmar.
- Devolución serial: crear -> firmar recepción (mismo usuario) -> confirmar.
- Egreso e ingreso: validar reversión trazable al eliminar.
- Confirmar rechazo de fracciones y visualización de enteros en UI.

## Firma remota
- Generar token de firma y repetir llamada para validar reused=true.
- Abrir stream SSE /api/firmas/events/deliveries y verificar evento delivery-signed al firmar remotamente.

## Inventario/stock
- Validar /stock-summary, /stock-paged y /activos-paged con cursor.
- Verificar filtro solo_entregados y consistencia del modal de detalle serializado.
- Revisar coherencia cross-tab sin hard refresh.

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