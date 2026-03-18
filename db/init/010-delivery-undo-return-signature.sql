-- Fase 10: firma de devolucion y reversa administrativa de entregas.

ALTER TABLE entrega
  ADD COLUMN IF NOT EXISTS deshecha_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deshecha_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS devolucion_reversa_id UUID REFERENCES devolucion(id) ON DELETE SET NULL;

ALTER TABLE devolucion
  ADD COLUMN IF NOT EXISTS es_reversa_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS entrega_revertida_id UUID REFERENCES entrega(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_reversa TEXT;

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

ALTER TABLE devolucion
  DROP CONSTRAINT IF EXISTS devolucion_estado_check;

ALTER TABLE devolucion
  ADD CONSTRAINT devolucion_estado_check
  CHECK (
    estado IN ('borrador', 'pendiente_firma', 'confirmada', 'anulada')
  );

ALTER TABLE devolucion
  DROP CONSTRAINT IF EXISTS chk_devolucion_motivo_reversa;

ALTER TABLE devolucion
  ADD CONSTRAINT chk_devolucion_motivo_reversa
  CHECK (
    es_reversa_admin = FALSE
    OR (motivo_reversa IS NOT NULL AND length(btrim(motivo_reversa)) >= 5)
  );

CREATE TABLE IF NOT EXISTS firma_devolucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id UUID NOT NULL UNIQUE REFERENCES devolucion(id) ON DELETE CASCADE,
  receptor_usuario_id UUID NOT NULL REFERENCES usuario(id),
  metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('en_dispositivo')),
  texto_aceptacion TEXT NOT NULL,
  texto_hash VARCHAR(255) NOT NULL,
  firma_imagen_url TEXT NOT NULL,
  ip VARCHAR(64),
  user_agent TEXT,
  firmado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrega_estado_revertida
  ON entrega(estado, deshecha_en DESC)
  WHERE estado = 'revertida_admin';

CREATE INDEX IF NOT EXISTS idx_devolucion_entrega_revertida_id
  ON devolucion(entrega_revertida_id)
  WHERE entrega_revertida_id IS NOT NULL;
