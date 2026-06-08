-- ============================================================
-- 002-init-data.sql  — Data base para producción
-- Idempotente: puede ejecutarse en DB ya inicializada.
--
-- ADMIN INICIAL: NO se crea aquí. El backend lo crea automáticamente
-- al arrancar, leyendo las variables de entorno:
--   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
-- Ver: backend/src/db/bootstrap.js y docs/coolify-vars.md
-- ============================================================

DO $$
BEGIN

  -- --------------------------------------------------------
  -- 1. Plantillas genéricas (3 tipos)
  -- --------------------------------------------------------

  INSERT INTO articulo_plantilla (tipo, nombre, descripcion, estado, creado_por_usuario_id)
  SELECT 'epp', 'EPP — Básico',
    'Plantilla base para equipos de protección personal. Completar con marca, modelo y talla según el artículo.',
    'activo', NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM articulo_plantilla WHERE nombre = 'EPP — Básico' AND tipo = 'epp'
  );

  INSERT INTO articulo_plantilla (tipo, nombre, descripcion, estado, creado_por_usuario_id)
  SELECT 'herramienta', 'Herramienta — Básico',
    'Plantilla base para herramientas manuales y eléctricas. Completar con marca, modelo y número de serie.',
    'activo', NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM articulo_plantilla WHERE nombre = 'Herramienta — Básico' AND tipo = 'herramienta'
  );

  INSERT INTO articulo_plantilla (tipo, nombre, descripcion, estado, creado_por_usuario_id)
  SELECT 'equipo', 'Equipo — Básico',
    'Plantilla base para equipos y maquinaria. Completar con marca, modelo y código interno.',
    'activo', NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM articulo_plantilla WHERE nombre = 'Equipo — Básico' AND tipo = 'equipo'
  );

END $$;
