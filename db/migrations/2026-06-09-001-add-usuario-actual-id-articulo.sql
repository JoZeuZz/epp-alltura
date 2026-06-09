ALTER TABLE articulo ADD COLUMN IF NOT EXISTS usuario_actual_id UUID REFERENCES usuario(id);

ALTER TABLE articulo DROP CONSTRAINT IF EXISTS chk_articulo_ubicacion;
ALTER TABLE articulo ADD CONSTRAINT chk_articulo_ubicacion CHECK (
  (
    (bodega_actual_id IS NOT NULL)::int +
    (proyecto_actual_id IS NOT NULL)::int +
    (usuario_actual_id IS NOT NULL)::int
  ) <= 1
);

CREATE INDEX IF NOT EXISTS idx_articulo_usuario_actual_id ON articulo(usuario_actual_id)
  WHERE usuario_actual_id IS NOT NULL;
