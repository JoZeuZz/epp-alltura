# Categorización e inventario por tipo de activo (2026-04-28)

## Campo `subclasificacion` (API) / `categoria` (DB)
La API usa el nombre `subclasificacion`; el campo interno en DB es `categoria`.
La validación Joi **rechaza** el campo `categoria` en requests y redirige a usar `subclasificacion`.

Valores válidos de categoria (DB):
- `epp` — Equipos de Protección Personal
- `medicion_ensayos` — Equipos de medición y ensayos
- `manual` — Herramientas manuales
- `electrica_cable` — Herramientas eléctricas con cable
- `inalambrica_bateria` — Herramientas inalámbricas con batería

## `articulo_especialidad` (tabla N:M)
Relaciona artículos con especialidades de obra.
Valores: `oocc`, `ooee`, `equipos`, `trabajos_verticales_lineas_de_vida`.
Un artículo puede tener múltiples especialidades.
Filtro disponible en API: `especialidades[]`.

## `ubicacion.tipo`
Valores: `bodega`, `planta`, `proyecto`, `taller_mantencion`.
- `bodega`: almacén físico (usa AdminBodegasPage)
- `proyecto`: obras o faenas (usa AdminProyectosPage)
- `planta` / `taller_mantencion`: otras ubicaciones operativas.

## Páginas de inventario por categoría
- `/admin/inventario/epp` → AdminInventoryEppPage → filtra `categoria=epp`
- `/admin/inventario/equipos` → AdminInventoryEquiposPage → filtra por categoria de equipos
- `/admin/inventario/herramientas` → AdminInventoryHerramientasPage → filtra herramientas manuales/eléctricas
- Patrón genérico: `AdminInventoryScopedAssetPage` + `AdminInventoryScopedAssetCards`
- Constantes de UI de cada scope: `INVENTORY_ASSET_SCOPE_COPY` en `inventoryAssetScope.constants.ts`

## `inspeccion_activo`
Nueva tabla para trazabilidad de mantenimiento.
- `tipo`: `inspeccion` | `calibracion`
- Índices: por `activo_id`, por `fecha_inspeccion DESC`, por `responsable_usuario_id`
- Flujo UI aún no completamente mapeado (servicio existe, pendiente verificar endpoints).
