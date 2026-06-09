-- UP
ALTER TABLE entrega ALTER COLUMN bodega_origen_id DROP NOT NULL;

ALTER TABLE entrega ADD COLUMN IF NOT EXISTS usuario_origen_id UUID REFERENCES usuario(id);

ALTER TABLE entrega DROP CONSTRAINT IF EXISTS chk_entrega_origen;
ALTER TABLE entrega ADD CONSTRAINT chk_entrega_origen CHECK (
  (bodega_origen_id IS NOT NULL)::int + (usuario_origen_id IS NOT NULL)::int = 1
);

-- DOWN
ALTER TABLE entrega DROP CONSTRAINT IF EXISTS chk_entrega_origen;
ALTER TABLE entrega DROP COLUMN IF EXISTS usuario_origen_id;
-- NOTE: restoring NOT NULL on bodega_origen_id would fail if any row has bodega_origen_id = NULL.
-- Run only after verifying no such rows exist, or after backfilling.
ALTER TABLE entrega ALTER COLUMN bodega_origen_id SET NOT NULL;
