-- EPP phase: ubicaciones extendidas + contexto de traslado
-- Migración aditiva e idempotente.

ALTER TABLE ubicacion
  ADD COLUMN IF NOT EXISTS ubicacion_subtipo VARCHAR(20)
    CHECK (ubicacion_subtipo IN ('fija', 'transitoria')),
  ADD COLUMN IF NOT EXISTS fecha_inicio_operacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_cierre_operacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planta_padre_id UUID REFERENCES ubicacion(id) ON DELETE SET NULL;

UPDATE ubicacion
SET ubicacion_subtipo = 'fija'
WHERE tipo = 'bodega'
  AND ubicacion_subtipo IS NULL;

ALTER TABLE ubicacion
  DROP CONSTRAINT IF EXISTS chk_ubicacion_subtipo_bodega;

ALTER TABLE ubicacion
  ADD CONSTRAINT chk_ubicacion_subtipo_bodega
  CHECK (
    (tipo = 'bodega' AND ubicacion_subtipo IS NOT NULL)
    OR (tipo <> 'bodega' AND ubicacion_subtipo IS NULL)
  );

ALTER TABLE ubicacion
  DROP CONSTRAINT IF EXISTS chk_ubicacion_vigencia;

ALTER TABLE ubicacion
  ADD CONSTRAINT chk_ubicacion_vigencia
  CHECK (
    fecha_cierre_operacion IS NULL
    OR fecha_inicio_operacion IS NULL
    OR fecha_cierre_operacion >= fecha_inicio_operacion
  );

ALTER TABLE entrega
  ADD COLUMN IF NOT EXISTS transportista_trabajador_id UUID REFERENCES trabajador(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receptor_trabajador_id UUID REFERENCES trabajador(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ubicacion_subtipo ON ubicacion(ubicacion_subtipo);
CREATE INDEX IF NOT EXISTS idx_ubicacion_planta_padre_id ON ubicacion(planta_padre_id);
CREATE INDEX IF NOT EXISTS idx_ubicacion_inicio_operacion ON ubicacion(fecha_inicio_operacion);
CREATE INDEX IF NOT EXISTS idx_ubicacion_cierre_operacion ON ubicacion(fecha_cierre_operacion);

CREATE INDEX IF NOT EXISTS idx_entrega_transportista_trabajador_id ON entrega(transportista_trabajador_id);
CREATE INDEX IF NOT EXISTS idx_entrega_receptor_trabajador_id ON entrega(receptor_trabajador_id);
