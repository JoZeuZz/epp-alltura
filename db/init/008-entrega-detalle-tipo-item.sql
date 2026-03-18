-- Fase entrega por item: clasificacion retornable/asignacion en detalle.

ALTER TABLE entrega_detalle
  ADD COLUMN IF NOT EXISTS tipo_item_entrega VARCHAR(20);

UPDATE entrega_detalle ed
SET tipo_item_entrega = CASE
  WHEN a.retorno_mode = 'retornable' THEN 'retornable'
  ELSE 'asignacion'
END
FROM articulo a
WHERE a.id = ed.articulo_id
  AND ed.tipo_item_entrega IS NULL;

ALTER TABLE entrega_detalle
  DROP CONSTRAINT IF EXISTS chk_entrega_detalle_tipo_item_entrega;

ALTER TABLE entrega_detalle
  ADD CONSTRAINT chk_entrega_detalle_tipo_item_entrega
  CHECK (tipo_item_entrega IN ('retornable', 'asignacion'));

ALTER TABLE entrega_detalle
  ALTER COLUMN tipo_item_entrega SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entrega_detalle_tipo_item_entrega
  ON entrega_detalle(tipo_item_entrega);
