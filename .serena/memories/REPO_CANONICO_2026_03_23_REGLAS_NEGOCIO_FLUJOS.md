## Reglas de negocio por flujo (2026-03-23)

## Modelo
- Artículo define tracking_mode (serial|lote) y retorno_mode.
- Activo representa unidad física serializada.
- Stock agrega cantidades por artículo/ubicación/lote.

## Tracking y cantidades
- serial: gestión por unidad (activo_ids), no por cantidad agregada.
- lote: gestión por cantidad agregada.
- legacy cantidad eliminado (migración 011).
- cantidades físicas enteras en todos los flujos críticos:
  - validación Joi integer positive,
  - validación de servicios con Number.isInteger,
  - constraints SQL (migración 012),
  - parse/format de UI centralizado.

## Entregas
- Flujo: crear -> firmar -> confirmar.
- Anular y deshacer requieren motivo.
- Deshacer reservado a admin.
- Eliminación permanente reservada a admin y solo en estados anulada/revertida_admin.
- Para serializados, evitar duplicidad de activos en payload.

## Devoluciones
- Flujo: borrador -> firma recepción -> confirmación.
- Firma y confirmación solo por usuario creador operacional (recibido_por_usuario_id).
- Detalle: activo_ids o articulo_id; si activo_ids, cantidad=1.
- Disposiciones válidas: devuelto | perdido | baja | mantencion.

## Custodia
- Invariante: una sola custodia activa por activo serializado.
- Confirmar entrega abre/actualiza custodia; confirmar devolución la cierra o actualiza según disposición.

## Reversiones y trazabilidad
- Eliminación de ingreso/egreso no destruye trazabilidad: crea movimientos inversos con notas de reversión.
- Movimientos de stock exponen origen de evento (ingreso, egreso, entrega, deshacer_entrega, devolución, inventario).

## Firma remota en tiempo real
- Tokens QR reutilizables mientras no expiren (reused=true).
- SSE publica delivery-signed para sincronizar UI sin polling continuo.

## Reglas de UI operativa
- Stock serializado debe mostrar quién lo tiene, dónde está, desde cuándo y estado actual.
- Filtro solo_entregados permitido para focalizar activos con custodia/entrega activa.
- Consistencia entre vistas depende de query keys estables e invalidación por familias tras mutaciones.