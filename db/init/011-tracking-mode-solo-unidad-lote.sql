-- Fase 11: normalización tracking_mode (solo serial/unidad y lote).

-- 1) Migrar datos históricos que usaban 'cantidad' hacia 'lote'.
UPDATE articulo
SET tracking_mode = 'lote'
WHERE tracking_mode = 'cantidad';

-- 2) Reemplazar constraints para eliminar 'cantidad' del dominio.
ALTER TABLE articulo
  DROP CONSTRAINT IF EXISTS articulo_tracking_mode_check;

ALTER TABLE articulo
  DROP CONSTRAINT IF EXISTS chk_articulo_tracking_mode;

ALTER TABLE articulo
  ADD CONSTRAINT chk_articulo_tracking_mode
  CHECK (tracking_mode IN ('serial', 'lote'));
