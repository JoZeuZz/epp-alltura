-- UP

-- Expand chk_ma_origen to 3-way mutex (bodega, proyecto, usuario)
ALTER TABLE movimiento_activo DROP CONSTRAINT IF EXISTS chk_ma_origen;
ALTER TABLE movimiento_activo ADD CONSTRAINT chk_ma_origen CHECK (
  (
    (bodega_origen_id IS NOT NULL)::int +
    (proyecto_origen_id IS NOT NULL)::int +
    (usuario_origen_id IS NOT NULL)::int
  ) <= 1
);

-- Expand chk_ma_destino to 3-way mutex (bodega, proyecto, usuario)
ALTER TABLE movimiento_activo DROP CONSTRAINT IF EXISTS chk_ma_destino;
ALTER TABLE movimiento_activo ADD CONSTRAINT chk_ma_destino CHECK (
  (
    (bodega_destino_id IS NOT NULL)::int +
    (proyecto_destino_id IS NOT NULL)::int +
    (usuario_destino_id IS NOT NULL)::int
  ) <= 1
);

-- DOWN

-- Restore the original 2-way origen constraint (bodega XOR proyecto, no usuario)
ALTER TABLE movimiento_activo DROP CONSTRAINT IF EXISTS chk_ma_origen;
ALTER TABLE movimiento_activo ADD CONSTRAINT chk_ma_origen CHECK (
  (
    (bodega_origen_id IS NOT NULL)::int +
    (proyecto_origen_id IS NOT NULL)::int
  ) <= 1
);

-- Restore the original 2-way destino constraint (bodega XOR proyecto, no usuario)
ALTER TABLE movimiento_activo DROP CONSTRAINT IF EXISTS chk_ma_destino;
ALTER TABLE movimiento_activo ADD CONSTRAINT chk_ma_destino CHECK (
  (
    (bodega_destino_id IS NOT NULL)::int +
    (proyecto_destino_id IS NOT NULL)::int
  ) <= 1
);
