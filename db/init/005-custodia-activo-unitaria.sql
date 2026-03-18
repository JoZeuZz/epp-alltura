-- Fase activos unitarios: garantizar una sola custodia activa por activo.

CREATE UNIQUE INDEX IF NOT EXISTS uq_custodia_activo_activa_por_activo
  ON custodia_activo (activo_id)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_custodia_activo_activo_estado
  ON custodia_activo (activo_id, estado, desde_en DESC);
