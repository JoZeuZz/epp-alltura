-- UP
-- Make evidencia_foto_url nullable on entrega and devolucion.
-- Rationale: when the delivery origin is a system user (usuario_origen_id),
-- no photo is taken at create-time; photo evidence is captured during
-- the signature/confirmation step. The NOT NULL constraint was incorrectly
-- preventing createFromUsuario from inserting rows.
ALTER TABLE entrega ALTER COLUMN evidencia_foto_url DROP NOT NULL;
ALTER TABLE devolucion ALTER COLUMN evidencia_foto_url DROP NOT NULL;

-- DOWN
-- WARNING: will fail if any row has evidencia_foto_url = NULL.
-- Backfill NULLs before running down, or drop the rows.
ALTER TABLE entrega ALTER COLUMN evidencia_foto_url SET NOT NULL;
ALTER TABLE devolucion ALTER COLUMN evidencia_foto_url SET NOT NULL;
