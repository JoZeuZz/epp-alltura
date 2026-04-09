-- Entrega templates MVP (idempotent)

CREATE TABLE IF NOT EXISTS entrega_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  scope_cargo VARCHAR(120),
  scope_proyecto VARCHAR(150),
  creado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE entrega_template
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS scope_cargo VARCHAR(120),
  ADD COLUMN IF NOT EXISTS scope_proyecto VARCHAR(150),
  ADD COLUMN IF NOT EXISTS creado_por_usuario_id UUID REFERENCES usuario(id),
  ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'entrega_template' AND column_name = 'estado'
  ) THEN
    ALTER TABLE entrega_template
      DROP CONSTRAINT IF EXISTS entrega_template_estado_check;

    ALTER TABLE entrega_template
      ADD CONSTRAINT entrega_template_estado_check CHECK (estado IN ('activo', 'inactivo'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_entrega_template_nombre_ci
  ON entrega_template ((lower(nombre)));

CREATE TABLE IF NOT EXISTS entrega_template_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES entrega_template(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulo(id),
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  requiere_serial BOOLEAN NOT NULL DEFAULT FALSE,
  notas_default TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_entrega_template_item_cantidad_entera CHECK (cantidad = trunc(cantidad))
);

ALTER TABLE entrega_template_item
  ADD COLUMN IF NOT EXISTS requiere_serial BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notas_default TEXT,
  ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS ux_entrega_template_item_template_articulo
  ON entrega_template_item (template_id, articulo_id);

CREATE INDEX IF NOT EXISTS idx_entrega_template_item_template
  ON entrega_template_item (template_id);

CREATE INDEX IF NOT EXISTS idx_entrega_template_creador
  ON entrega_template (creado_por_usuario_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_entrega_template_actualizado_en'
  ) THEN
    CREATE TRIGGER trg_entrega_template_actualizado_en
      BEFORE UPDATE ON entrega_template
      FOR EACH ROW
      EXECUTE FUNCTION set_actualizado_en();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_entrega_template_item_actualizado_en'
  ) THEN
    CREATE TRIGGER trg_entrega_template_item_actualizado_en
      BEFORE UPDATE ON entrega_template_item
      FOR EACH ROW
      EXECUTE FUNCTION set_actualizado_en();
  END IF;
END $$;
