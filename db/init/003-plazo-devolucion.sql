-- 003: Plazo de devolución esperada en entregas y custodias
-- Permite registrar cuándo se espera que un activo retornable sea devuelto.

ALTER TABLE entrega
  ADD COLUMN IF NOT EXISTS fecha_devolucion_esperada TIMESTAMPTZ;

ALTER TABLE custodia_activo
  ADD COLUMN IF NOT EXISTS fecha_devolucion_esperada TIMESTAMPTZ;
