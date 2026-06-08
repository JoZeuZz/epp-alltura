-- ============================================================
-- 002-init-data.sql  — Data base para producción
-- Idempotente: puede ejecutarse en DB ya inicializada.
-- IMPORTANTE: Cambiar la contraseña del admin antes de usar en producción.
--             Usar script: cd backend && node src/scripts/create-admin.js
-- ============================================================

DO $$
DECLARE
  v_persona_id  UUID;
  v_usuario_id  UUID;
  v_rol_id      UUID;
BEGIN

  -- --------------------------------------------------------
  -- 1. Admin por defecto
  -- --------------------------------------------------------

  -- Persona del admin (RUT artificial de sistema)
  INSERT INTO persona (rut, nombres, apellidos, email, estado)
  VALUES ('99.999.999-9', 'Administrador', 'Sistema', 'admin@alltura.cl', 'activo')
  ON CONFLICT (rut) DO NOTHING;

  SELECT id INTO v_persona_id FROM persona WHERE rut = '99.999.999-9';

  -- Usuario admin
  INSERT INTO usuario (persona_id, email_login, password_hash, estado)
  VALUES (
    v_persona_id,
    'admin@alltura.cl',
    '$2b$12$as.b3wzE7UZJJcGpxszbzOKg2uNgAx0psDeu0aOWW3CNwh7dBE0fe',
    'activo'
  )
  ON CONFLICT (email_login) DO NOTHING;

  SELECT id INTO v_usuario_id FROM usuario WHERE email_login = 'admin@alltura.cl';

  -- Rol admin
  SELECT id INTO v_rol_id FROM rol WHERE nombre = 'admin';

  -- Asignar rol (idempotente gracias a PK compuesta)
  INSERT INTO usuario_rol (usuario_id, rol_id)
  VALUES (v_usuario_id, v_rol_id)
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------
  -- 2. Plantillas genéricas (3 tipos)
  -- --------------------------------------------------------

  INSERT INTO articulo_plantilla (tipo, nombre, descripcion, estado, creado_por_usuario_id)
  SELECT 'epp', 'EPP — Básico',
    'Plantilla base para equipos de protección personal. Completar con marca, modelo y talla según el artículo.',
    'activo', v_usuario_id
  WHERE NOT EXISTS (
    SELECT 1 FROM articulo_plantilla WHERE nombre = 'EPP — Básico' AND tipo = 'epp'
  );

  INSERT INTO articulo_plantilla (tipo, nombre, descripcion, estado, creado_por_usuario_id)
  SELECT 'herramienta', 'Herramienta — Básico',
    'Plantilla base para herramientas manuales y eléctricas. Completar con marca, modelo y número de serie.',
    'activo', v_usuario_id
  WHERE NOT EXISTS (
    SELECT 1 FROM articulo_plantilla WHERE nombre = 'Herramienta — Básico' AND tipo = 'herramienta'
  );

  INSERT INTO articulo_plantilla (tipo, nombre, descripcion, estado, creado_por_usuario_id)
  SELECT 'equipo', 'Equipo — Básico',
    'Plantilla base para equipos y maquinaria. Completar con marca, modelo y código interno.',
    'activo', v_usuario_id
  WHERE NOT EXISTS (
    SELECT 1 FROM articulo_plantilla WHERE nombre = 'Equipo — Básico' AND tipo = 'equipo'
  );

END $$;
