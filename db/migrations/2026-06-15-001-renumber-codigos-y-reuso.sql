-- Reuso de huecos + renumeración 1..N por familia.
-- El runner (backend/src/scripts/migrate.js, auto-aplicado al arrancar el backend)
-- ejecuta el bloque -- UP dentro de una sola transacción (BEGIN/COMMIT), por lo que
-- SET CONSTRAINTS ... DEFERRED aplica y la unicidad se valida al COMMIT.

-- UP

-- 1. Hacer el constraint unico DEFERRABLE para permitir renumerar sin colisiones transitorias.
ALTER TABLE articulo DROP CONSTRAINT IF EXISTS articulo_codigo_key;
ALTER TABLE articulo ADD CONSTRAINT articulo_codigo_key
  UNIQUE (codigo) DEFERRABLE INITIALLY IMMEDIATE;

-- 2. Diferir la validacion de unicidad al COMMIT y renumerar las 3 familias a 1..N.
SET CONSTRAINTS articulo_codigo_key DEFERRED;

UPDATE articulo a
   SET codigo = m.nuevo_codigo
  FROM (
    SELECT id,
           CASE tipo
             WHEN 'epp'         THEN 'EPP'
             WHEN 'herramienta' THEN 'HRR'
             WHEN 'equipo'      THEN 'EQP'
           END || '-' ||
           LPAD(ROW_NUMBER() OVER (
             PARTITION BY tipo ORDER BY creado_en, id
           )::text, 5, '0') AS nuevo_codigo
      FROM articulo
  ) m
 WHERE a.id = m.id;

-- 3. Eliminar las secuencias obsoletas (ya no se usan; el codigo se calcula por hueco libre).
DROP SEQUENCE IF EXISTS seq_codigo_epp;
DROP SEQUENCE IF EXISTS seq_codigo_herramienta;
DROP SEQUENCE IF EXISTS seq_codigo_equipo;

-- DOWN
-- Migración intencionalmente irreversible: la renumeración descarta los códigos
-- antiguos (no se conservan), por lo que un rollback no puede restaurarlos.
-- Sin SQL en este bloque, migrate.js rechaza el rollback con un mensaje explícito.
