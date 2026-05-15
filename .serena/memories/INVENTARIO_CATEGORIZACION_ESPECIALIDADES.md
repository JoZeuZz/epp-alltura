# Inventario: tipos, estados y especialidades (post-refactor 2026-05-15)

> Reemplaza categorización anterior basada en subclasificacion/tracking_mode/categoria.

## Tipos de artículo (`tipo`)
3 valores: `epp` | `herramienta` | `equipo`.
Campo directo en tabla `articulo`. Reemplaza grupo_principal + subclasificacion + categoria (todos eliminados).
tracking_mode ELIMINADO — todos los artículos son entidades físicas individuales (serial).

## Estados de artículo (`estado`)
5 valores: `en_stock` | `asignado` | `mantencion` | `dado_de_baja` | `perdido`.
Transiciones: ver REGLAS_NEGOCIO_FLUJOS_2026_05_14.

## `articulo_especialidad` (tabla N:M)
Valores: `oocc`, `ooee`, `equipos`, `trabajos_verticales_lineas_de_vida`.
Un artículo puede tener múltiples. Filtro API: `especialidad`.

## Páginas de inventario
- `/admin/inventario/epp` → `AdminInventoryScopedAssetPage` con tipo='epp'
- `/admin/inventario/equipos` → tipo='equipo'
- `/admin/inventario/herramientas` → tipo='herramienta'
- Constante de configuración: `INVENTORY_ASSET_SCOPE_COPY` en `inventoryAssetScope.constants.ts`
- `AssetScopeKey`: `'epp' | 'herramientas' | 'equipos'` (plural para key URL)
- Creación de artículo: `ArticuloCreateModal` (wired en cada scope page)

## Ubicaciones vigentes
- `bodega`: almacén físico — artículos en_stock. Tabla independiente.
- `proyecto`: obra/faena — artículos asignados. Tabla independiente.
- `planta` y `taller_mantencion` eliminados del dominio activo.
- `articulo.bodega_actual_id` XOR `proyecto_actual_id` — nunca ambos.

## `inspeccion_activo`
Tabla conservada (usa `articulo_id`). Flujo UI pendiente.
