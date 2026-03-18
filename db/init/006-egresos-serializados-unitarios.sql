-- Fase egresos serializados unitarios.

ALTER TABLE egreso_detalle
  ADD COLUMN IF NOT EXISTS activo_id UUID REFERENCES activo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_egreso_detalle_activo_id
  ON egreso_detalle(activo_id)
  WHERE activo_id IS NOT NULL;

ALTER TABLE movimiento_activo
  ADD COLUMN IF NOT EXISTS egreso_id UUID REFERENCES egreso(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimiento_activo_egreso_id
  ON movimiento_activo(egreso_id)
  WHERE egreso_id IS NOT NULL;
