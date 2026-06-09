ALTER TABLE movimiento_activo DROP CONSTRAINT IF EXISTS movimiento_activo_tipo_check;
ALTER TABLE movimiento_activo ADD CONSTRAINT movimiento_activo_tipo_check
  CHECK (tipo IN (
    'entrada', 'entrega', 'devolucion', 'ajuste', 'baja', 'mantencion', 'reubicacion',
    'asignacion_usuario', 'devolucion_usuario_bodega', 'entrega_desde_usuario'
  ));

ALTER TABLE movimiento_activo ADD COLUMN IF NOT EXISTS usuario_origen_id  UUID REFERENCES usuario(id);
ALTER TABLE movimiento_activo ADD COLUMN IF NOT EXISTS usuario_destino_id UUID REFERENCES usuario(id);
ALTER TABLE movimiento_activo ADD COLUMN IF NOT EXISTS asignacion_id      UUID REFERENCES asignacion_usuario(id) ON DELETE SET NULL;
