# Estado MVP EPP/Herramientas (resumen depurado)

## Operativo hoy (actualizado 2026-05-15 — post refactor modelo artículo)
- Catálogos: artículos físicos individuales (tipo epp/herramienta/equipo + especialidades), bodegas, proyectos, trabajadores.
- Flujos: creación de artículo, entrega (borrador→firma→confirmar), devolución (borrador→firma→confirmar), cambio de estado directo.
- ELIMINADOS: compra/ingreso/egreso como flujos separados — la creación de artículo los reemplaza.
- Trazabilidad: movimiento_activo, custodia_activo, auditoría.
- Notificaciones: Web Push + persistencia en DB; cron diario de custodia (`CustodyCheckService`).
- Inspecciones: tabla `inspeccion_activo` para calibraciones/inspecciones (pendiente flujo UI completo).

## Frontend por rol (actualizado 2026-05-15)
- Roles activos: `admin` y `supervisor` únicamente.
- Admin: dashboard, trabajadores, users, entregas, devoluciones, bodegas, proyectos, inventario/epp, inventario/equipos, inventario/herramientas.
- Supervisor: dashboard, operaciones.
- Módulo admin inventario: rutas activas epp/equipos/herramientas (con `ArticuloCreateModal`). Eliminadas: stock, ingresos, egresos, activos (ruta independiente).

## Calidad
- CI con lint + guardias + tests + build frontend.
- Integration DB existe pero no bloquea PR (manual).

## Referencias
- Detalle técnico completo: `REPO_ACTUAL_2026_03_16`.
- Operación/CI: `CI_CD_Y_OPERACION_ACTUAL_2026_03_16`.
