# Estado Actual MVP EPP/Herramientas

## Dominio y seguridad
- Modelo de dominio alineado al MER EPP/Herramientas en PostgreSQL.
- Autenticación JWT con access/refresh, blacklist y control de estado de usuario.
- Compatibilidad de roles externa (`worker`/`client`) con rol DB (`trabajador`).
- Envelope estandarizado de respuesta: `{ success, message, data, errors }`.
- Redacción de datos sensibles en logs activos.

## Backend operativo
- Catálogos funcionales: `ubicaciones`, `articulos`, `trabajadores`, `proveedores`.
- Entregas, firmas y devoluciones operativas con trazabilidad (`movimiento_*`, `custodia_activo`) y reglas de confirmación.
- Compras operativas con reglas por `tracking_mode` (`serial`, `lote`, `cantidad`) y afectación de stock/movimientos.
- Inventario operativo:
  - `GET /api/inventario/stock` (con paginación `limit/offset`),
  - `GET /api/inventario/movimientos-stock`,
  - `GET /api/inventario/movimientos-activo`,
  - `GET /api/inventario/auditoria`.
- Ingresos de inventario operativos:
  - `POST /api/inventario/ingresos` (JSON o `multipart/form-data`),
  - `GET /api/inventario/ingresos` para listados recientes.
- `POST /api/inventario/ingresos` soporta documento opcional:
  - ingreso manual sin documento,
  - ingreso con metadata documental,
  - ingreso con archivo (`pdf`, `jpeg/jpg`, `png`, `webp`) + validación de magic bytes,
  - limpieza de archivo si falla lógica posterior al upload.
- Ciclo de artículos operativo:
  - `DELETE /api/articulos/:id` mantiene eliminación lógica (`estado = inactivo`),
  - `DELETE /api/articulos/:id/permanent` habilita borrado físico sólo para admin,
  - bloqueo de borrado permanente cuando existe trazabilidad (dependencias MER).
- Notificaciones alineadas a `usuario.id` UUID (`notifications`, `push_subscriptions`).
- Compatibilidad legacy mantenida en `/api/users` y `/api/notifications`.

## Frontend MVP por rol
- Navegación principal centrada en operación EPP para `admin`, `supervisor`, `bodega`, `worker`.
- Módulo admin de inventario refactorizado por subrutas:
  - `/admin/inventario/articulos`,
  - `/admin/inventario/stock`,
  - `/admin/inventario/movimientos`,
  - `/admin/inventario/ingresos`.
- Catálogo de artículos admin operativo:
  - alta de artículos vía modal (`Nuevo Artículo`) con validación de campos MER,
  - edición completa en modal reutilizable (`Editar Artículo`) con datos precargados,
  - acciones por fila: desactivar/activar y eliminar definitivo (este último sólo para inactivos),
  - manejo de bloqueo por trazabilidad en eliminación definitiva,
  - filtros por nombre/tipo/tracking/estado,
  - disponibilidad inmediata del artículo nuevo para ingresos y stock tras invalidación de queries.
- Vista de ingresos admin con modal wizard por pasos:
  1. Identificación (artículo existente, ubicación, fecha, notas).
  2. Detalle por `tracking_mode`.
  3. Documento opcional (proveedor/tipo/número/fecha/archivo).
- En ingreso sin documento, flujo manual permitido.
- En ingreso con documento, envío multipart desde frontend por same-origin `/api`.

## Pruebas y validación
- Backend:
  - unit tests de `auth`, `entregas`, `devoluciones`, `firmas`, `inventario.service`.
  - integración de rutas EPP incluyendo casos de `POST /api/inventario/ingresos`.
- Frontend:
  - tests de polling notificaciones,
  - tests de utilidades de ingreso de inventario,
  - tests de página de ingresos admin (render + submit wizard).
- Build frontend operativo.

## Riesgos técnicos vigentes
- `check:legacy` y `lint:ci` están en verde en el estado actual del repo local.
- Persisten módulos legacy fuera del flujo canónico EPP que requieren corte posterior.
- Smoke manual completo por rol y dispositivo aún depende de ejecución manual fuera de este entorno.
