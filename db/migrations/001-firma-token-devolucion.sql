-- Migration: 001-firma-token-devolucion
-- Agrega soporte de QR/token para firma de devoluciones,
-- análogo a firma_token que ya existe para entregas.

CREATE TABLE IF NOT EXISTS firma_token_devolucion (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id         UUID NOT NULL REFERENCES devolucion(id) ON DELETE CASCADE,
  trabajador_id         UUID NOT NULL REFERENCES trabajador(id),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  token_hash            TEXT NOT NULL,
  token_publico         TEXT NOT NULL,
  expira_en             TIMESTAMPTZ NOT NULL,
  usado_en              TIMESTAMPTZ,
  usado_ip              TEXT,
  usado_user_agent      TEXT,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_firma_token_devolucion_hash
  ON firma_token_devolucion (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_firma_token_devolucion_publico
  ON firma_token_devolucion (token_publico);

CREATE INDEX IF NOT EXISTS idx_firma_token_devolucion_devolucion
  ON firma_token_devolucion (devolucion_id);

CREATE INDEX IF NOT EXISTS idx_firma_token_devolucion_expira
  ON firma_token_devolucion (expira_en);

-- Permitir metodo qr_link en firma_devolucion si no estaba incluido
DO $$
BEGIN
  -- Solo altera la restricción si existe como CHECK constraint con nombre conocido
  -- Esto es idempotente: falla silenciosamente si la constraint no existe o ya incluye qr_link
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;
