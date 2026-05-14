⚠️ OBSOLETA — ver REGLAS_NEGOCIO_FLUJOS_2026_05_14 (refactor 2026-05-14: activo merged into articulo, lote/stock/compra/egreso eliminados)

- Articulos: contrato vigente usa grupo_principal + subclasificacion + especialidades; tracking_mode se calcula backend (epp->lote, resto->serial); bloquear tipo/categoria/tracking_mode/retorno_mode en payload.
- Entregas: crear(borrador)->firmar->confirmar; solo serializados; origen=bodega activa, destino=proyecto activo; confirm crea custodia_activo activa y movimiento_activo entrega.
- Devoluciones: crear(borrador)->firmar->confirmar; solo serializados con custodia activa del trabajador; recepcion en bodega activa; disposicion devuelto/perdido/baja/mantencion.
- Confirm devolucion cierra custodia y actualiza estado/ubicacion de activo segun disposicion.
- Firmas: qr_link y en_dispositivo para entrega/devolucion; tokens reutilizables mientras vigentes; SSE emite delivery-signed y return-signed.
- Roles login activos: admin/supervisor; trabajador es entidad dominio sin login.