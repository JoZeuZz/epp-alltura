# Estado MVP EPP/Herramientas (resumen depurado)

## Operativo hoy (actualizado 2026-04-28)
- Catálogos: articulos (con categoria + especialidades), ubicaciones (por tipo), trabajadores, proveedores.
- Flujos: ingreso/compra, entrega, firma (token + dispositivo), confirmación, devolución, egreso.
- Trazabilidad: movimientos de stock/activo, custodia y auditoría.
- Documentos: adjuntos a compras/actas con subida de archivos.
- Notificaciones: Web Push + persistencia en DB; cron diario de custodia (`CustodyCheckService`).
- Inspecciones: tabla `inspeccion_activo` para calibraciones/inspecciones (endpoints a confirmar).

## Frontend por rol (actualizado 2026-04-28)
- Roles activos: `admin` y `supervisor` únicamente.
- Admin: dashboard, trabajadores, users, entregas, devoluciones, ubicaciones, bodegas, proyectos, inventario/*.
- Supervisor: dashboard, operaciones (hereda el flujo operativo antes en /bodega).
- Módulo admin inventario: articulos, stock, movimientos, ingresos, egresos, activos, epp, equipos, herramientas.

## Calidad
- CI con lint + guardias + tests + build frontend.
- Integration DB existe pero no bloquea PR (manual).

## Referencias
- Detalle técnico completo: `REPO_ACTUAL_2026_03_16`.
- Operación/CI: `CI_CD_Y_OPERACION_ACTUAL_2026_03_16`.
