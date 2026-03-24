-- Fase 13: soporte de reutilizacion de token QR por entrega activa.

ALTER TABLE firma_token
  ADD COLUMN IF NOT EXISTS token_publico VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS ux_firma_token_token_publico
  ON firma_token(token_publico)
  WHERE token_publico IS NOT NULL;
