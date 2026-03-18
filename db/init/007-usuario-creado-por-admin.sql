-- Soporte para trazabilidad de propiedad de administradores.

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS creado_por_admin_id UUID REFERENCES usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuario_creado_por_admin_id
  ON usuario(creado_por_admin_id)
  WHERE creado_por_admin_id IS NOT NULL;
