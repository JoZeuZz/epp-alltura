## Contratos API activos (post-refactor 2026-05-15)

> Reemplaza contratos anteriores con grupo_principal/subclasificacion/tracking_mode.

### Artículos `/api/articulos`
- `GET /` — lista paginada; params: tipo (epp|herramienta|equipo), estado, bodega_id, proyecto_id, especialidad, search, limit, offset
- `GET /:id`
- `POST /` — crea artículo físico; payload: { tipo, nombre, nro_serie (único), valor, bodega_id, marca?, modelo?, descripcion?, especialidades[]?, fecha_vencimiento? }; acepta multipart con `foto`
- `PUT /:id` — actualiza; payload: { nombre?, marca?, modelo?, descripcion?, nro_serie?, valor?, especialidades[]?, fecha_vencimiento? }
- `POST /:id/estado` — cambia estado directo; payload: { nuevo_estado (en_stock|mantencion|dado_de_baja|perdido), motivo?, bodega_destino_id? }
- `DELETE /:id` — eliminación permanente (admin only) — sin sufijo /permanent

Campos respuesta Articulo: id, tipo, nombre, marca, modelo, descripcion, nro_serie, codigo (derivado: últimos 3 chars), valor, foto_url, estado, bodega_actual_id, bodega_nombre, proyecto_actual_id, proyecto_nombre, especialidades[], fecha_vencimiento, creado_en, creado_por_email

### Entregas `/api/entregas`
- `GET /` — lista; params: estado, trabajador_id
- `GET /:id`
- `POST /` — crea borrador; payload: { trabajador_id, bodega_origen_id, proyecto_destino_id, notas?, detalles: [{ articulo_id, condicion_salida?, notas? }] }
- `POST /:id/confirm`
- `POST /:id/anular`

### Devoluciones `/api/devoluciones`
- `GET /activos-elegibles?trabajador_id=&articulo_id?=&search?=`
- `GET /` — params: estado, trabajador_id
- `GET /:id`
- `POST /` — crea borrador; payload: { trabajador_id, ubicacion_recepcion_id, notas?, detalles: [{ custodia_id, articulo_id, condicion_entrada?, disposicion (devuelto|perdido|baja|mantencion), notas? }] }
- `POST /:id/firmar-dispositivo`
- `POST /:id/confirm`
- `POST /:id/anular`

### Firmas (sin cambios de contrato)
- Tokens + SSE delivery-signed / return-signed (ver REGLAS_NEGOCIO_FLUJOS_2026_05_14)

### Rutas ELIMINADAS (ya no existen)
- `/api/compras`, `/api/egresos`, `/api/activos` (standalone)
- DELETE permanente ahora en `DELETE /api/articulos/:id` (NO más /permanent sufijo)
