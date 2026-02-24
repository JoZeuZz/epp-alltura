-- ============================================================
-- EGRESOS DE INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS egreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  tipo_motivo VARCHAR(20) NOT NULL CHECK (tipo_motivo IN ('salida', 'baja', 'consumo', 'ajuste')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT
);

CREATE TABLE IF NOT EXISTS egreso_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  egreso_id UUID NOT NULL REFERENCES egreso(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  ubicacion_id UUID NOT NULL REFERENCES ubicacion(id),
  lote_id UUID REFERENCES lote(id) ON DELETE SET NULL,
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  notas TEXT
);

ALTER TABLE movimiento_stock
  ADD COLUMN IF NOT EXISTS egreso_id UUID REFERENCES egreso(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimiento_stock_egreso_id ON movimiento_stock(egreso_id);
CREATE INDEX IF NOT EXISTS idx_egreso_creado_por ON egreso(creado_por_usuario_id);
CREATE INDEX IF NOT EXISTS idx_egreso_tipo ON egreso(tipo_motivo);
CREATE INDEX IF NOT EXISTS idx_egreso_creado_en ON egreso(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_egreso_detalle_egreso_id ON egreso_detalle(egreso_id);
CREATE INDEX IF NOT EXISTS idx_egreso_detalle_articulo_id ON egreso_detalle(articulo_id);
