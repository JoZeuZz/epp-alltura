ALTER TABLE entrega ALTER COLUMN bodega_origen_id DROP NOT NULL;

ALTER TABLE entrega ADD COLUMN IF NOT EXISTS usuario_origen_id UUID REFERENCES usuario(id);

ALTER TABLE entrega DROP CONSTRAINT IF EXISTS chk_entrega_origen;
ALTER TABLE entrega ADD CONSTRAINT chk_entrega_origen CHECK (
  (bodega_origen_id IS NOT NULL)::int + (usuario_origen_id IS NOT NULL)::int = 1
);
