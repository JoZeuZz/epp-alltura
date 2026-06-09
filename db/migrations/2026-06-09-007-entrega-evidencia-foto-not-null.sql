-- UP
-- Revert migration 006: evidencia_foto_url must be NOT NULL for entregas and devoluciones.
-- Business rule: every delivery and return to/from a worker requires photo evidence.
-- This will FAIL if any row has evidencia_foto_url = NULL.
-- To diagnose: SELECT id, estado FROM entrega WHERE evidencia_foto_url IS NULL;
--              SELECT id, estado FROM devolucion WHERE evidencia_foto_url IS NULL;
DO $$
DECLARE
  null_entregas int;
  null_devoluciones int;
BEGIN
  SELECT COUNT(*) INTO null_entregas FROM entrega WHERE evidencia_foto_url IS NULL;
  SELECT COUNT(*) INTO null_devoluciones FROM devolucion WHERE evidencia_foto_url IS NULL;
  IF null_entregas > 0 OR null_devoluciones > 0 THEN
    RAISE EXCEPTION 'Cannot set NOT NULL: % entrega(s) and % devolucion(es) have NULL evidencia_foto_url. Fix data first.',
      null_entregas, null_devoluciones;
  END IF;
END $$;

ALTER TABLE entrega ALTER COLUMN evidencia_foto_url SET NOT NULL;
ALTER TABLE devolucion ALTER COLUMN evidencia_foto_url SET NOT NULL;

-- DOWN
ALTER TABLE entrega ALTER COLUMN evidencia_foto_url DROP NOT NULL;
ALTER TABLE devolucion ALTER COLUMN evidencia_foto_url DROP NOT NULL;
