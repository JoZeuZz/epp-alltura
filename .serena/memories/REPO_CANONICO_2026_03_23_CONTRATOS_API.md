## Contratos API canónicos (2026-03-23)

## Convenciones
- Prefijo API: /api/*.
- Auth: Bearer JWT.
- Envelope esperado: { success, message?, data, errors? } (validar excepciones legacy por endpoint).

## Inventario
- GET /api/inventario/stock-summary
  - Query: search?, articulo_id?, ubicacion_id?, limit?, cursor?
  - Respuesta: { items, hasMore, nextCursor }
  - Item: articulo_id, articulo_nombre, tracking_mode, retorno_mode, ubicaciones_count, disponible_total, reservada_total, registros_count.
- GET /api/inventario/stock-paged
  - Query: search?, articulo_id?, ubicacion_id?, lote_id?, limit?, cursor?
  - Respuesta: { items, hasMore, nextCursor }
  - Item: stock + ubicacion/lote + ultimo_movimiento_*.
- GET /api/inventario/activos-paged
  - Query: search?, articulo_id?, ubicacion_id?, estado?, solo_entregados?, limit?, cursor?
  - Respuesta: { items, hasMore, nextCursor }
  - Item: activo + custodia_* + ultima_entrega_id/entrega_confirmada_en + ultima_devolucion_id/devolucion_confirmada_en + dias_en_custodia + ultimo_movimiento_*.
- GET /api/inventario/movimientos-stock
  - Incluye evento_origen y referencia_origen_id para trazabilidad de origen.

## Entregas
- GET /api/entregas, GET /api/entregas/:id.
- POST /api/entregas, POST /api/entregas/:id/confirm, /recibir, /anular, /deshacer.
- DELETE /api/entregas/:id/permanent
  - Rol: admin.
  - Precondición: estado anulada o revertida_admin.
- Validación detalle entrega: cantidad integer positiva cuando aplica.

## Devoluciones
- GET /api/devoluciones, GET /api/devoluciones/:id.
- POST /api/devoluciones (detalles min 1).
- POST /api/devoluciones/:id/firmar-dispositivo.
- POST /api/devoluciones/:id/confirm.
- Reglas de autorización operativa:
  - Firma y confirmación de devolución: solo el usuario recibido_por_usuario_id (creador operacional).
- Validación detalle devolución: cantidad integer positiva; si activo_ids, cantidad=1.

## Firmas
- GET /api/firmas/tokens/:token (info token público).
- POST /api/firmas/tokens/:token/firmar (firma remota).
- POST /api/firmas/entregas/:entregaId/token
  - Request: expira_minutos.
  - Response: id, entrega_id, trabajador_id, expira_en, token, url, reused?, time_to_expiry_minutes?.
- POST /api/firmas/entregas/:entregaId/firmar-dispositivo.
- GET /api/firmas/events/deliveries
  - SSE autenticado (header Authorization o query access_token).
  - Evento: delivery-signed.
  - Payload: signature_id, entrega_id, metodo, firmado_en, trabajador_id.

## Ingresos y egresos
- DELETE /api/inventario/ingresos/:id y DELETE /api/inventario/egresos/:id reciben userId en capa servicio para registrar reversiones trazables.
- En servicios de compras/egresos, la reversión crea movimientos inversos en vez de borrar histórico de movimientos.

## OpenAPI/Documentación
- Mantener cada operación con respuesta de éxito y errores conocidos documentados.
- Responses Object debe contener al menos un status code.
- Evitar drift entre rutas reales y swagger antes de publicar contratos externos.