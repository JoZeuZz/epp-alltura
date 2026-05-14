# Reglas de Negocio y Flujos — EPP Alltura (2026-05-14)

> Reemplaza REPO_CANONICO_2026_05_08_REGLAS_NEGOCIO_FLUJOS. Refleja refactor completo del modelo de artículos.

## Dominio
Sistema de gestión, asignación y trazabilidad de artículos (EPP, herramientas y equipos) asignados a trabajadores en obras/proyectos.

## Actores
- `admin` — login, acceso total
- `supervisor` — login, acceso operacional idéntico a admin para entregas/devoluciones
- `trabajador` — entidad de dominio, SIN login; solo firma vía QR o dispositivo

## Modelo de Artículo (nuevo desde 2026-05-14)
- Cada fila en `articulo` = objeto físico individual (no template + instancia)
- `activo` tabla ELIMINADA; `articulo` absorbe todos sus campos
- 3 tipos: `epp` | `herramienta` | `equipo`
- Campos: tipo, nombre, marca, modelo, descripcion, nro_serie (único), codigo (últimos 3 chars de nro_serie, derivado en backend), valor (CLP, obligatorio), foto_url, estado, bodega_actual_id XOR proyecto_actual_id, fecha_vencimiento
- `tracking_mode` ELIMINADO — todos los artículos son entidades individuales
- `lote`, `stock`, `movimiento_stock` ELIMINADOS
- `especialidades[]` N:M: oocc | ooee | equipos | trabajos_verticales_lineas_de_vida

## Estados de Artículo
```
en_stock  → asignado       (vía entrega.confirm)
asignado  → en_stock       (devolucion disposicion=devuelto)
asignado  → mantencion     (devolucion disposicion=mantencion)
asignado  → perdido        (devolucion disposicion=perdido)
asignado  → dado_de_baja   (devolucion disposicion=baja)
en_stock  → mantencion     (cambiarEstado directo, sin bodega cambio)
en_stock  → dado_de_baja   (cambiarEstado directo)
en_stock  → perdido        (cambiarEstado directo)
mantencion → en_stock      (cambiarEstado directo, requiere bodega_destino)
perdido   → en_stock       (cambiarEstado directo, requiere bodega_destino)
dado_de_baja → en_stock    (cambiarEstado directo, requiere bodega_destino)
```
Transiciones directas bloqueadas si artículo tiene custodia activa.

## Ubicaciones
- `bodega`: entidad independiente (almacén físico); artículos en_stock aquí
- `proyecto`: entidad independiente (obra/faena); artículos asignados aquí
- Sin `planta` ni `taller_mantencion` — esos tipos eliminados
- Artículo tiene bodega_actual_id XOR proyecto_actual_id (nunca ambos)

## Creación de Artículo (reemplaza compra/ingreso)
- Modal "Nuevo artículo" en frontend: tipo, nombre, marca, modelo, nro_serie, valor, bodega_id, especialidades[], fecha_vencimiento
- `codigo` = `nro_serie.slice(-3).toUpperCase()` — calculado en backend (deriveCodigo)
- Estado inicial: `en_stock` en bodega seleccionada
- Movimiento inicial: `movimiento_activo(tipo=entrada)`
- Sin `compra`, sin `documento_compra`, sin `proveedor` activo (conservado para uso futuro)

## Flujo de Entrega
Estado: borrador → [firma obligatoria] → confirmada | anulada

1. **Crear**: valida trabajador activo; ruta (bodega origen activa → proyecto destino activo); detalles ({ articulo_id, condicion_salida, notas }) — articulo debe estar en_stock en bodega origen
2. **Firmar**: QR/token (trabajador escanea, firma en dispositivo) o en_dispositivo. Tokens reutilizables mientras vigentes. SSE: delivery-signed.
3. **Confirmar**: verifica firma; por cada artículo — estado=asignado, bodega_actual_id=NULL, proyecto_actual_id=destino, crea custodia_activo(activa), movimiento_activo(tipo=entrega)
4. **Anular**: solo desde borrador

`entrega_detalle` campos: entrega_id, articulo_id, condicion_salida, notas (sin activo_id, lote_id, tipo_item_entrega, cantidad)

## Flujo de Devolución
Estado: borrador → [firma obligatoria] → confirmada | anulada

1. **Crear**: valida trabajador activo; bodega_recepcion activa; detalles ({ custodia_id, articulo_id, condicion_entrada, disposicion, notas }) — custodia debe estar activa y pertenecer al trabajador
2. **Firmar**: QR/token o en_dispositivo. SSE: return-signed.
3. **Confirmar**: verifica firma; verifica custodia activa + trabajador correcto + articulo en estado=asignado; aplica disposicion:
   - devuelto → en_stock, bodega=recepcion, mov=devolucion
   - mantencion → mantencion, bodega=recepcion, mov=mantencion
   - perdido → perdido, bodega=NULL, mov=ajuste
   - baja → dado_de_baja, bodega=NULL, mov=baja
4. **Anular**: solo desde borrador

`devolucion_detalle` campos: devolucion_id, custodia_id, articulo_id, condicion_entrada, disposicion, notas (sin activo_id, lote_id, cantidad)

## Cambio de Estado Directo (reemplaza egreso)
`POST /api/articulos/:id/estado` — admin + supervisor
- Solo artículos sin custodia activa
- Requiere motivo para baja/perdido
- Requiere bodega_destino_id para transiciones de vuelta a en_stock

## Trazabilidad
- `movimiento_activo`: cada transición de artículo (articulo_id — no activo_id)
- `custodia_activo`: quién tiene qué (articulo_id — no activo_id)
- `auditoria`: log de acciones
- `inspeccion_activo`: inspecciones/calibraciones futuras (articulo_id — no activo_id, tabla conservada)

## Alertas
- CustodyCheck cron 08:00 diario: detecta custodias vencidas → notifica admin/supervisor
- Limpieza semanal domingos 03:00

## Firma Pública
- `/firma/:token` — sin auth; trabajador firma y acepta entrega
- `firma_token_devolucion` — tabla en schema (no creada en runtime)

## Rutas API Activas (post-refactor)
- `GET/POST /api/articulos` — CRUD
- `POST /api/articulos/:id/estado` — cambiar estado
- `DELETE /api/articulos/:id` — eliminar permanente (admin)
- `GET/POST /api/entregas`, `POST /api/entregas/:id/confirm`, `POST /api/entregas/:id/anular`
- `GET /api/devoluciones/activos-elegibles`, `GET/POST /api/devoluciones`, `POST /api/devoluciones/:id/confirm`, etc.
- Firmas: tokens + SSE (sin cambios de contrato)
- ELIMINADAS: /api/compras, /api/egresos, /api/activos (standalone)
