-- UP
CREATE TABLE IF NOT EXISTS asignacion_usuario (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id               UUID        NOT NULL REFERENCES articulo(id),
  usuario_id                UUID        NOT NULL REFERENCES usuario(id),
  asignado_por_usuario_id   UUID        NOT NULL REFERENCES usuario(id),
  bodega_origen_id          UUID        REFERENCES bodegas(id),
  usuario_origen_id         UUID        REFERENCES usuario(id),
  estado                    VARCHAR(20) NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'cerrada', 'anulada')),
  desde_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hasta_en                  TIMESTAMPTZ,
  cerrado_por_usuario_id    UUID        REFERENCES usuario(id),
  motivo_cierre             TEXT,
  notas                     TEXT,
  CONSTRAINT chk_au_origen CHECK (
    (bodega_origen_id IS NOT NULL)::int + (usuario_origen_id IS NOT NULL)::int = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_usuario_activa
  ON asignacion_usuario(articulo_id) WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_asignacion_usuario_usuario_id
  ON asignacion_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_asignacion_usuario_estado
  ON asignacion_usuario(estado);
CREATE INDEX IF NOT EXISTS idx_asignacion_usuario_articulo
  ON asignacion_usuario(articulo_id);

-- DOWN
DROP INDEX IF EXISTS idx_asignacion_usuario_articulo;
DROP INDEX IF EXISTS idx_asignacion_usuario_estado;
DROP INDEX IF EXISTS idx_asignacion_usuario_usuario_id;
DROP INDEX IF EXISTS uq_asignacion_usuario_activa;
DROP TABLE IF EXISTS asignacion_usuario;
