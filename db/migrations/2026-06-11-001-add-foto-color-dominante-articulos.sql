-- UP
ALTER TABLE articulo ADD COLUMN IF NOT EXISTS foto_color_dominante VARCHAR(7);

-- DOWN
ALTER TABLE articulo DROP COLUMN IF EXISTS foto_color_dominante;
