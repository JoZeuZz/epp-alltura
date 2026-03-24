-- Fase integridad: motivos de anulación y estado operativo de activos en traslado.

ALTER TABLE entrega
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

ALTER TABLE entrega
  ADD COLUMN IF NOT EXISTS recibido_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recibido_en TIMESTAMPTZ;

ALTER TABLE devolucion
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

ALTER TABLE entrega
  DROP CONSTRAINT IF EXISTS chk_entrega_motivo_anulacion;

ALTER TABLE entrega
  DROP CONSTRAINT IF EXISTS entrega_estado_check;

ALTER TABLE entrega
  ADD CONSTRAINT entrega_estado_check
  CHECK (
    estado IN (
      'borrador',
      'pendiente_firma',
      'en_transito',
      'recibido',
      'confirmada',
      'anulada',
      'revertida_admin'
    )
  );

ALTER TABLE entrega
  ADD CONSTRAINT chk_entrega_motivo_anulacion
  CHECK (
    estado <> 'anulada'
    OR (motivo_anulacion IS NOT NULL AND length(btrim(motivo_anulacion)) >= 5)
  );

ALTER TABLE entrega
  DROP CONSTRAINT IF EXISTS chk_entrega_recepcion_traslado;

ALTER TABLE entrega
  ADD CONSTRAINT chk_entrega_recepcion_traslado
  CHECK (
    estado <> 'recibido'
    OR (recibido_en IS NOT NULL AND recibido_por_usuario_id IS NOT NULL)
  );

ALTER TABLE devolucion
  DROP CONSTRAINT IF EXISTS chk_devolucion_motivo_anulacion;

ALTER TABLE devolucion
  ADD CONSTRAINT chk_devolucion_motivo_anulacion
  CHECK (
    estado <> 'anulada'
    OR (motivo_anulacion IS NOT NULL AND length(btrim(motivo_anulacion)) >= 5)
  );

ALTER TABLE activo
  DROP CONSTRAINT IF EXISTS activo_estado_check;

ALTER TABLE activo
  ADD CONSTRAINT activo_estado_check
  CHECK (
    estado IN (
      'en_stock',
      'asignado',
      'en_traslado',
      'mantencion',
      'dado_de_baja',
      'perdido'
    )
  );

CREATE INDEX IF NOT EXISTS idx_entrega_estado_motivo_anulacion
  ON entrega(estado, creado_en DESC)
  WHERE estado = 'anulada';

CREATE INDEX IF NOT EXISTS idx_entrega_estado_recibido
  ON entrega(estado, recibido_en DESC)
  WHERE estado = 'recibido';

CREATE INDEX IF NOT EXISTS idx_devolucion_estado_motivo_anulacion
  ON devolucion(estado, creado_en DESC)
  WHERE estado = 'anulada';
