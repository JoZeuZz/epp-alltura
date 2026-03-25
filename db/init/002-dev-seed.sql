-- ==========================================================================
-- Seed de desarrollo integral para flujo EPP/Herramientas.
-- Este archivo esta pensado para entorno local y es idempotente.
--
-- Dataset: 13 usuarios, 8 trabajadores, 6 ubicaciones, 3 proveedores,
-- 15 taladros, 11 arneses, 150 guantes, 9 entregas, 3 devoluciones,
-- 2 egresos y ~60 movimientos de trazabilidad.
--
-- Cubre los 6 estados de activo: en_stock, asignado, en_traslado,
-- mantencion, dado_de_baja, perdido.
--
-- Password demo para todos: Dev12345!
-- ==========================================================================

DO $$
BEGIN
  IF current_database() NOT ILIKE '%dev%'
     AND current_database() NOT IN ('herramientas_epp') THEN
    RAISE NOTICE '002-dev-seed.sql omitido: base de datos no parece de desarrollo (%).', current_database();
    RETURN;
  END IF;

  -- ============================================================
  -- 1) PERSONAS (13): 5 sistema + 8 trabajadores
  -- ============================================================

  INSERT INTO persona (id, rut, nombres, apellidos, telefono, email, estado)
  VALUES
    ('00000000-0000-0000-0000-000000000101', '11.111.111-1', 'Admin',      'Demo',    '+56911111111', 'admin.dev@alltura.local',       'activo'),
    ('00000000-0000-0000-0000-000000000102', '22.222.222-2', 'Bodega',     'Demo',    '+56922222222', 'bodega.dev@alltura.local',      'activo'),
    ('00000000-0000-0000-0000-000000000103', '33.333.333-3', 'Supervisor', 'Demo',    '+56933333333', 'supervisor.dev@alltura.local',  'activo'),
    ('00000000-0000-0000-0000-000000000104', '44.444.444-4', 'Juan',       'Herrera', '+56944444444', 'juan.herrera@alltura.local',    'activo'),
    ('00000000-0000-0000-0000-000000000105', '55.555.555-5', 'Maria',      'Rojas',   '+56955555555', 'maria.rojas@alltura.local',     'activo'),
    ('00000000-0000-0000-0000-000000000106', '66.666.666-6', 'Carlos',     'Vega',    '+56966666666', 'carlos.vega@alltura.local',     'activo'),
    ('00000000-0000-0000-0000-000000000107', '77.777.777-7', 'Ana',        'Torres',  '+56977777777', 'ana.torres@alltura.local',      'activo'),
    ('00000000-0000-0000-0000-000000000108', '88.888.888-8', 'Pedro',      'Soto',    '+56988888888', 'pedro.soto@alltura.local',      'activo'),
    ('00000000-0000-0000-0000-000000000109', '99.999.999-9', 'Luis',       'Munoz',   '+56999999999', 'luis.munoz@alltura.local',      'activo'),
    ('00000000-0000-0000-0000-000000000110', '10.101.010-1', 'Rosa',       'Diaz',    '+56910101010', 'rosa.diaz@alltura.local',       'activo'),
    ('00000000-0000-0000-0000-000000000111', '12.121.212-1', 'Felipe',     'Castro',  '+56912121212', 'felipe.castro@alltura.local',   'activo'),
    ('00000000-0000-0000-0000-000000000112', '13.131.313-1', 'Bodeguero2', 'Demo',    '+56913131313', 'bodeguero2.dev@alltura.local',  'activo'),
    ('00000000-0000-0000-0000-000000000113', '14.141.414-1', 'Auditor',    'Demo',    '+56914141414', 'auditor.dev@alltura.local',     'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 2) USUARIOS (13) — todos con Dev12345!
  -- ============================================================

  INSERT INTO usuario (id, persona_id, creado_por_admin_id, email_login, password_hash, estado)
  VALUES
    ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', NULL,                                      'admin.dev@alltura.local',      crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000001001', 'bodega.dev@alltura.local',     crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000001001', 'supervisor.dev@alltura.local', crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000001001', 'juan.herrera@alltura.local',   crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000001001', 'maria.rojas@alltura.local',    crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000001001', 'carlos.vega@alltura.local',    crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000001001', 'ana.torres@alltura.local',     crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000001001', 'pedro.soto@alltura.local',     crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000001001', 'luis.munoz@alltura.local',     crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001010', '00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000001001', 'rosa.diaz@alltura.local',      crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001011', '00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000001001', 'felipe.castro@alltura.local',  crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001012', '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000001001', 'bodeguero2.dev@alltura.local', crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001013', '00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000001001', 'auditor.dev@alltura.local',    crypt('Dev12345!', gen_salt('bf', 10)), 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 3) ROLES: admin(1), bodega(2), supervisor(2), trabajador(8)
  -- ============================================================

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT u.id, r.id FROM (VALUES
    ('00000000-0000-0000-0000-000000001001', 'admin'),
    ('00000000-0000-0000-0000-000000001002', 'bodega'),
    ('00000000-0000-0000-0000-000000001003', 'supervisor'),
    ('00000000-0000-0000-0000-000000001004', 'trabajador'),
    ('00000000-0000-0000-0000-000000001005', 'trabajador'),
    ('00000000-0000-0000-0000-000000001006', 'trabajador'),
    ('00000000-0000-0000-0000-000000001007', 'trabajador'),
    ('00000000-0000-0000-0000-000000001008', 'trabajador'),
    ('00000000-0000-0000-0000-000000001009', 'trabajador'),
    ('00000000-0000-0000-0000-000000001010', 'trabajador'),
    ('00000000-0000-0000-0000-000000001011', 'trabajador'),
    ('00000000-0000-0000-0000-000000001012', 'bodega'),
    ('00000000-0000-0000-0000-000000001013', 'supervisor')
  ) AS v(uid, rname)
  JOIN usuario u ON u.id = v.uid::uuid
  JOIN rol r ON r.nombre = v.rname
  ON CONFLICT (usuario_id, rol_id) DO NOTHING;

  -- ============================================================
  -- 4) TRABAJADORES (8)
  -- ============================================================

  INSERT INTO trabajador (id, persona_id, usuario_id, cargo, fecha_ingreso, estado)
  VALUES
    ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000001004', 'Maestro primera',     NOW() - INTERVAL '400 days', 'activo'),
    ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000001005', 'Ayudante',            NOW() - INTERVAL '350 days', 'activo'),
    ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000001006', 'Operador grua',       NOW() - INTERVAL '300 days', 'activo'),
    ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000001007', 'Jefa cuadrilla',      NOW() - INTERVAL '280 days', 'activo'),
    ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000001008', 'Soldador',            NOW() - INTERVAL '260 days', 'activo'),
    ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000001009', 'Capataz',             NOW() - INTERVAL '240 days', 'activo'),
    ('00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000001010', 'Rigger',              NOW() - INTERVAL '200 days', 'activo'),
    ('00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000001011', 'Ayudante electrico',  NOW() - INTERVAL '180 days', 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 5) UBICACIONES (6)
  -- ============================================================

  INSERT INTO ubicacion (id, nombre, tipo, ubicacion_subtipo, cliente, direccion, estado, fecha_inicio_operacion)
  VALUES
    ('00000000-0000-0000-0000-000000003001', 'Bodega Central',          'bodega',            'fija',        NULL,                'Camino Industrial 100',     'activo', NOW() - INTERVAL '2 years'),
    ('00000000-0000-0000-0000-000000003002', 'Bodega Transitoria Sur',  'bodega',            'transitoria', NULL,                'Ruta 68 KM 12',            'activo', NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-000000003003', 'Faena Norte',             'planta',            NULL,          'Minera Norte SpA',  'Ruta 5 Norte KM 1000',     'activo', NOW() - INTERVAL '18 months'),
    ('00000000-0000-0000-0000-000000003004', 'Faena Sur',               'planta',            NULL,          'Constructora Sur',  'Ruta 5 Sur KM 500',        'activo', NOW() - INTERVAL '12 months'),
    ('00000000-0000-0000-0000-000000003005', 'Proyecto Minero Andes',   'proyecto',          NULL,          'Minera Andes SA',   'Camino Minera Andes s/n',  'activo', NOW() - INTERVAL '8 months'),
    ('00000000-0000-0000-0000-000000003006', 'Taller Mantencion',       'taller_mantencion', NULL,          NULL,                'Av. Talleres 45',          'activo', NOW() - INTERVAL '2 years')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 6) PROVEEDORES (3)
  -- ============================================================

  INSERT INTO proveedor (id, nombre, rut, email, telefono, estado)
  VALUES
    ('00000000-0000-0000-0000-000000004001', 'Herramientas Industriales SpA', '76.100.200-3', 'ventas@herramientas-ind.cl',   '+56222001001', 'activo'),
    ('00000000-0000-0000-0000-000000004002', 'Proveedor EPP Chile',           '76.200.300-4', 'contacto@epp-chile.cl',        '+56222002002', 'activo'),
    ('00000000-0000-0000-0000-000000004003', 'Suministros Generales Ltda',    '76.300.400-5', 'info@suministros-generales.cl', '+56222003003', 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 7) ARTICULOS (3) — mismos IDs para compatibilidad
  -- ============================================================

  INSERT INTO articulo (id, tipo, nombre, marca, modelo, categoria, tracking_mode, retorno_mode, nivel_control, requiere_vencimiento, unidad_medida, estado)
  VALUES
    ('00000000-0000-0000-0000-000000000401', 'herramienta', 'Taladro Industrial',    'Bosch',     'GSB-16',     'Herramientas electricas', 'serial', 'retornable', 'alto', FALSE, 'unidad', 'activo'),
    ('00000000-0000-0000-0000-000000000402', 'epp',         'Arnes de Seguridad',    '3M',        'Protecta X', 'EPP Altura',              'serial', 'retornable', 'alto', TRUE,  'unidad', 'activo'),
    ('00000000-0000-0000-0000-000000000403', 'consumible',  'Guante de cabritilla',  'SegurPlus', 'GC-01',      'EPP Mano',                'lote',   'consumible', 'bajo', FALSE, 'par',    'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 8) COMPRAS: 2 facturas, 2 compras, 3 detalles
  -- ============================================================

  INSERT INTO documento_compra (id, proveedor_id, tipo, numero, fecha, archivo_url) VALUES
    ('00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000004001', 'factura', 'FACT-HI-2025-0042', NOW() - INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000004002', 'factura', 'FACT-EPP-2025-0118', NOW() - INTERVAL '45 days', NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO compra (id, documento_compra_id, creado_por_usuario_id, creado_en, notas) VALUES
    ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000001002', NOW() - INTERVAL '60 days', 'Compra 15 taladros industriales Bosch.'),
    ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000001002', NOW() - INTERVAL '45 days', 'Compra 11 arneses 3M + 150 pares guantes cabritilla.')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO compra_detalle (id, compra_id, articulo_id, cantidad, costo_unitario, notas) VALUES
    ('00000000-0000-0000-0000-000000005201', '00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000000401', 15,  130000, 'Ingreso 15 taladros'),
    ('00000000-0000-0000-0000-000000005202', '00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000000402', 11,  95000,  'Ingreso 11 arneses'),
    ('00000000-0000-0000-0000-000000005203', '00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000000403', 150, 5500,   'Ingreso 150 pares guantes')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 9) ACTIVOS SERIALIZADOS: 15 taladros + 11 arneses = 26
  --
  --  Estado final planificado:
  --  TAL-001 asignado   Faena Norte        (custodia Juan)
  --  TAL-002 asignado   Faena Norte        (custodia Carlos)
  --  TAL-003 en_stock   Bodega Central     (devuelto D1)
  --  TAL-004 en_stock   Bodega Central     (nunca entregado)
  --  TAL-005 en_stock   Bodega Central     (borrador E9)
  --  TAL-006 en_stock   Bodega Transit.    (reubicado)
  --  TAL-007 mantencion Taller Mant.       (admin directo)
  --  TAL-008 dado_baja  Bodega Central     (egreso baja)
  --  TAL-009 perdido    Faena Sur          (devolucion D3)
  --  TAL-010 en_traslado Bodega Central    (traslado E6 en_transito)
  --  TAL-011 asignado   Faena Sur          (custodia Pedro)
  --  TAL-012 en_stock   Bodega Central     (devuelto D2)
  --  TAL-013 en_stock   Faena Norte        (ingreso directo)
  --  TAL-014 asignado   Proyecto Minero    (custodia Luis)
  --  TAL-015 en_stock   Bodega Central     (nunca entregado)
  --  ARN-001 asignado   Faena Norte        (custodia Juan)
  --  ARN-002 asignado   Faena Sur          (custodia Ana)
  --  ARN-003 en_stock   Bodega Central     (devuelto D2)
  --  ARN-004 en_stock   Bodega Central     (nunca entregado)
  --  ARN-005 mantencion Taller Mant.       (devolucion D3)
  --  ARN-006 dado_baja  Bodega Central     (devolucion D3)
  --  ARN-007 en_stock   Bodega Central     (nunca entregado)
  --  ARN-008 asignado   Proyecto Minero    (custodia Felipe)
  --  ARN-009 perdido    Faena Sur          (devolucion D3)
  --  ARN-010 en_stock   Bodega Transit.    (reubicado)
  --  ARN-011 en_stock   Bodega Central     (nunca entregado)
  -- ============================================================

  INSERT INTO activo (id, articulo_id, compra_detalle_id, nro_serie, codigo, valor, estado, ubicacion_actual_id, fecha_compra, fecha_vencimiento) VALUES
    ('00000000-0000-0000-0000-000000006001', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-001', 'TAL-001', 130000, 'asignado',      '00000000-0000-0000-0000-000000003003', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006002', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-002', 'TAL-002', 130000, 'asignado',      '00000000-0000-0000-0000-000000003003', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006003', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-003', 'TAL-003', 130000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006004', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-004', 'TAL-004', 130000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006005', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-005', 'TAL-005', 130000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006006', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-006', 'TAL-006', 130000, 'en_stock',      '00000000-0000-0000-0000-000000003002', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006007', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-007', 'TAL-007', 130000, 'mantencion',    '00000000-0000-0000-0000-000000003006', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006008', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-008', 'TAL-008', 130000, 'dado_de_baja',  '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006009', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-009', 'TAL-009', 130000, 'perdido',       '00000000-0000-0000-0000-000000003004', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006010', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-010', 'TAL-010', 130000, 'en_traslado',   '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006011', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-011', 'TAL-011', 130000, 'asignado',      '00000000-0000-0000-0000-000000003004', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006012', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-012', 'TAL-012', 130000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006013', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-013', 'TAL-013', 130000, 'en_stock',      '00000000-0000-0000-0000-000000003003', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006014', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-014', 'TAL-014', 130000, 'asignado',      '00000000-0000-0000-0000-000000003005', NOW()-INTERVAL '60 days', NULL),
    ('00000000-0000-0000-0000-000000006015', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000005201', 'SER-TAL-015', 'TAL-015', 130000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '60 days', NULL),
    -- arneses (requiere vencimiento)
    ('00000000-0000-0000-0000-000000006101', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-001', 'ARN-001', 95000, 'asignado',      '00000000-0000-0000-0000-000000003003', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006102', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-002', 'ARN-002', 95000, 'asignado',      '00000000-0000-0000-0000-000000003004', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006103', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-003', 'ARN-003', 95000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006104', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-004', 'ARN-004', 95000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006105', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-005', 'ARN-005', 95000, 'mantencion',    '00000000-0000-0000-0000-000000003006', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006106', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-006', 'ARN-006', 95000, 'dado_de_baja',  '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006107', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-007', 'ARN-007', 95000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006108', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-008', 'ARN-008', 95000, 'asignado',      '00000000-0000-0000-0000-000000003005', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006109', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-009', 'ARN-009', 95000, 'perdido',       '00000000-0000-0000-0000-000000003004', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006110', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-010', 'ARN-010', 95000, 'en_stock',      '00000000-0000-0000-0000-000000003002', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000006111', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000005202', 'SER-ARN-011', 'ARN-011', 95000, 'en_stock',      '00000000-0000-0000-0000-000000003001', NOW()-INTERVAL '45 days', NOW()+INTERVAL '10 months')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 10) STOCK CONSUMIBLE
  -- Balance: 150 ingreso - 35 entregas - 35 egresos = 80 pares
  -- ============================================================

  INSERT INTO stock (id, ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada) VALUES
    ('00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000000403', NULL, 80, 0)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 11) ENTREGAS (9)
  --  E1 confirmada  Juan    TAL-001+ARN-001+10guantes  → Faena Norte
  --  E2 confirmada  Carlos  TAL-002                    → Faena Norte
  --  E3 confirmada  Maria   TAL-003                    → Faena Norte
  --  E4 confirmada  Ana     TAL-012+ARN-002+ARN-003    → Faena Sur
  --  E5 confirmada  Pedro   TAL-011+TAL-009+ARN-005+ARN-006+ARN-009+15guantes → Faena Sur
  --  E6 en_transito Rosa    TAL-010 (traslado)         → Faena Sur
  --  E7 confirmada  Luis    TAL-014+10guantes          → Proyecto Minero
  --  E8 confirmada  Felipe  ARN-008                    → Proyecto Minero
  --  E9 borrador    Ana     TAL-005 (sin firma)        → Faena Sur
  -- ============================================================

  INSERT INTO entrega (id, creado_por_usuario_id, trabajador_id, ubicacion_origen_id, ubicacion_destino_id, tipo, estado, nota_destino, creado_en, confirmada_en, transportista_trabajador_id, recibido_por_usuario_id, recibido_en) VALUES
    ('00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', 'entrega',  'confirmada',  'Entrega taladro + arnes + guantes a Juan para faena.',         NOW()-INTERVAL '30 days', NOW()-INTERVAL '30 days', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000008002', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', 'entrega',  'confirmada',  'Entrega taladro a Carlos para obra norte.',                    NOW()-INTERVAL '28 days', NOW()-INTERVAL '28 days', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000008003', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', 'entrega',  'confirmada',  'Entrega taladro a Maria para tarea puntual.',                  NOW()-INTERVAL '25 days', NOW()-INTERVAL '25 days', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000008004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', 'entrega',  'confirmada',  'Entrega taladro + 2 arneses a Ana para faena sur.',            NOW()-INTERVAL '22 days', NOW()-INTERVAL '22 days', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', 'entrega',  'confirmada',  'Entrega de equipos a Pedro para cuadrilla sur.',               NOW()-INTERVAL '20 days', NOW()-INTERVAL '20 days', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000008006', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', 'traslado', 'en_transito', 'Traslado de taladro a Faena Sur por Rosa.',                    NOW()-INTERVAL '10 days', NULL,                      '00000000-0000-0000-0000-000000002007', NULL, NULL),
    ('00000000-0000-0000-0000-000000008007', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003005', 'entrega',  'confirmada',  'Entrega taladro + guantes a Luis para proyecto minero.',       NOW()-INTERVAL '15 days', NOW()-INTERVAL '15 days', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000008008', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003005', 'entrega',  'confirmada',  'Entrega arnes a Felipe para trabajo en altura.',              NOW()-INTERVAL '12 days', NOW()-INTERVAL '12 days', NULL, NULL, NULL),
    ('00000000-0000-0000-0000-000000008009', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', 'entrega',  'borrador',    'Entrega pendiente de revision para Ana.',                      NOW()-INTERVAL '2 days',  NULL,                      NULL, NULL, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 12) ENTREGA DETALLE (19 lineas)
  -- ============================================================

  INSERT INTO entrega_detalle (id, entrega_id, articulo_id, activo_id, lote_id, cantidad, tipo_item_entrega, condicion_salida, notas) VALUES
    -- E1: Juan (TAL-001 + ARN-001 + 10 guantes)
    ('00000000-0000-0000-0000-000000008101', '00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006001', NULL, 1,  'retornable', 'ok',    'Taladro para obra en Faena Norte.'),
    ('00000000-0000-0000-0000-000000008102', '00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006101', NULL, 1,  'retornable', 'ok',    'Arnes para trabajo en altura.'),
    ('00000000-0000-0000-0000-000000008103', '00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000000403', NULL,                                    NULL, 10, 'asignacion',  'ok',    'Guantes de cabritilla.'),
    -- E2: Carlos (TAL-002)
    ('00000000-0000-0000-0000-000000008104', '00000000-0000-0000-0000-000000008002', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006002', NULL, 1,  'retornable', 'ok',    'Taladro para Carlos.'),
    -- E3: Maria (TAL-003)
    ('00000000-0000-0000-0000-000000008105', '00000000-0000-0000-0000-000000008003', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006003', NULL, 1,  'retornable', 'ok',    'Taladro para tarea puntual Maria.'),
    -- E4: Ana (TAL-012 + ARN-002 + ARN-003)
    ('00000000-0000-0000-0000-000000008106', '00000000-0000-0000-0000-000000008004', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006012', NULL, 1,  'retornable', 'ok',    'Taladro para Ana.'),
    ('00000000-0000-0000-0000-000000008107', '00000000-0000-0000-0000-000000008004', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006102', NULL, 1,  'retornable', 'ok',    'Arnes para Ana.'),
    ('00000000-0000-0000-0000-000000008108', '00000000-0000-0000-0000-000000008004', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006103', NULL, 1,  'retornable', 'ok',    'Segundo arnes para Ana.'),
    -- E5: Pedro (TAL-011+TAL-009+ARN-005+ARN-006+ARN-009 + 15 guantes)
    ('00000000-0000-0000-0000-000000008109', '00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006011', NULL, 1,  'retornable', 'ok',    'Taladro para Pedro.'),
    ('00000000-0000-0000-0000-000000008110', '00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006009', NULL, 1,  'retornable', 'ok',    'Segundo taladro para Pedro.'),
    ('00000000-0000-0000-0000-000000008111', '00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006105', NULL, 1,  'retornable', 'ok',    'Arnes tipo 1 para Pedro.'),
    ('00000000-0000-0000-0000-000000008112', '00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006106', NULL, 1,  'retornable', 'usado', 'Arnes tipo 2, estado usado.'),
    ('00000000-0000-0000-0000-000000008113', '00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006109', NULL, 1,  'retornable', 'ok',    'Tercer arnes para Pedro.'),
    ('00000000-0000-0000-0000-000000008114', '00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000000403', NULL,                                    NULL, 15, 'asignacion',  'ok',    'Guantes consumibles para cuadrilla.'),
    -- E6: traslado (TAL-010)
    ('00000000-0000-0000-0000-000000008115', '00000000-0000-0000-0000-000000008006', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006010', NULL, 1,  'retornable', 'ok',    'Taladro para traslado a Faena Sur.'),
    -- E7: Luis (TAL-014 + 10 guantes)
    ('00000000-0000-0000-0000-000000008116', '00000000-0000-0000-0000-000000008007', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006014', NULL, 1,  'retornable', 'ok',    'Taladro para proyecto minero.'),
    ('00000000-0000-0000-0000-000000008117', '00000000-0000-0000-0000-000000008007', '00000000-0000-0000-0000-000000000403', NULL,                                    NULL, 10, 'asignacion',  'ok',    'Guantes para proyecto minero.'),
    -- E8: Felipe (ARN-008)
    ('00000000-0000-0000-0000-000000008118', '00000000-0000-0000-0000-000000008008', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006108', NULL, 1,  'retornable', 'ok',    'Arnes para Felipe.'),
    -- E9: borrador (TAL-005, sin confirmar)
    ('00000000-0000-0000-0000-000000008119', '00000000-0000-0000-0000-000000008009', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006005', NULL, 1,  'retornable', 'ok',    'Taladro pendiente de despacho.')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 13) FIRMAS ENTREGA (8 — todas menos E9 borrador)
  -- ============================================================

  INSERT INTO firma_entrega (id, entrega_id, trabajador_id, metodo, texto_aceptacion, texto_hash, firma_imagen_url, ip, user_agent, firmado_en) VALUES
    ('00000000-0000-0000-0000-000000008201', '00000000-0000-0000-0000-000000008001', '00000000-0000-0000-0000-000000002001', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e1', 'https://example.local/sig/e1.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '30 days'),
    ('00000000-0000-0000-0000-000000008202', '00000000-0000-0000-0000-000000008002', '00000000-0000-0000-0000-000000002003', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e2', 'https://example.local/sig/e2.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '28 days'),
    ('00000000-0000-0000-0000-000000008203', '00000000-0000-0000-0000-000000008003', '00000000-0000-0000-0000-000000002002', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e3', 'https://example.local/sig/e3.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '25 days'),
    ('00000000-0000-0000-0000-000000008204', '00000000-0000-0000-0000-000000008004', '00000000-0000-0000-0000-000000002004', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e4', 'https://example.local/sig/e4.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '22 days'),
    ('00000000-0000-0000-0000-000000008205', '00000000-0000-0000-0000-000000008005', '00000000-0000-0000-0000-000000002005', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e5', 'https://example.local/sig/e5.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000008206', '00000000-0000-0000-0000-000000008006', '00000000-0000-0000-0000-000000002007', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de este traslado.','dev-hash-e6', 'https://example.local/sig/e6.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000008207', '00000000-0000-0000-0000-000000008007', '00000000-0000-0000-0000-000000002006', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e7', 'https://example.local/sig/e7.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '15 days'),
    ('00000000-0000-0000-0000-000000008208', '00000000-0000-0000-0000-000000008008', '00000000-0000-0000-0000-000000002008', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e8', 'https://example.local/sig/e8.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '12 days')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 14) CUSTODIAS (14): 7 activas + 7 cerradas
  -- ============================================================

  INSERT INTO custodia_activo (id, activo_id, trabajador_id, ubicacion_destino_id, entrega_id, desde_en, hasta_en, estado) VALUES
    -- activas (7)
    ('00000000-0000-0000-0000-000000008301', '00000000-0000-0000-0000-000000006001', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000008001', NOW()-INTERVAL '30 days', NULL,                      'activa'),
    ('00000000-0000-0000-0000-000000008302', '00000000-0000-0000-0000-000000006101', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000008001', NOW()-INTERVAL '30 days', NULL,                      'activa'),
    ('00000000-0000-0000-0000-000000008303', '00000000-0000-0000-0000-000000006002', '00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000008002', NOW()-INTERVAL '28 days', NULL,                      'activa'),
    ('00000000-0000-0000-0000-000000008306', '00000000-0000-0000-0000-000000006102', '00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008004', NOW()-INTERVAL '22 days', NULL,                      'activa'),
    ('00000000-0000-0000-0000-000000008308', '00000000-0000-0000-0000-000000006011', '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008005', NOW()-INTERVAL '20 days', NULL,                      'activa'),
    ('00000000-0000-0000-0000-000000008313', '00000000-0000-0000-0000-000000006014', '00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000008007', NOW()-INTERVAL '15 days', NULL,                      'activa'),
    ('00000000-0000-0000-0000-000000008314', '00000000-0000-0000-0000-000000006108', '00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000008008', NOW()-INTERVAL '12 days', NULL,                      'activa'),
    -- cerradas por devolucion (7)
    ('00000000-0000-0000-0000-000000008304', '00000000-0000-0000-0000-000000006003', '00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000008003', NOW()-INTERVAL '25 days', NOW()-INTERVAL '18 days', 'devuelta'),
    ('00000000-0000-0000-0000-000000008305', '00000000-0000-0000-0000-000000006012', '00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008004', NOW()-INTERVAL '22 days', NOW()-INTERVAL '14 days', 'devuelta'),
    ('00000000-0000-0000-0000-000000008307', '00000000-0000-0000-0000-000000006103', '00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008004', NOW()-INTERVAL '22 days', NOW()-INTERVAL '14 days', 'devuelta'),
    ('00000000-0000-0000-0000-000000008309', '00000000-0000-0000-0000-000000006009', '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008005', NOW()-INTERVAL '20 days', NOW()-INTERVAL '11 days', 'perdida'),
    ('00000000-0000-0000-0000-000000008310', '00000000-0000-0000-0000-000000006105', '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008005', NOW()-INTERVAL '20 days', NOW()-INTERVAL '11 days', 'mantencion'),
    ('00000000-0000-0000-0000-000000008311', '00000000-0000-0000-0000-000000006106', '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008005', NOW()-INTERVAL '20 days', NOW()-INTERVAL '11 days', 'baja'),
    ('00000000-0000-0000-0000-000000008312', '00000000-0000-0000-0000-000000006109', '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000008005', NOW()-INTERVAL '20 days', NOW()-INTERVAL '11 days', 'perdida')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 15) DEVOLUCIONES (3 confirmadas)
  --  D1: Maria   → TAL-003 devuelto ok
  --  D2: Ana     → TAL-012 ok + ARN-003 ok
  --  D3: Pedro   → TAL-009 perdido, ARN-005 mantencion, ARN-006 baja, ARN-009 perdido
  -- ============================================================

  INSERT INTO devolucion (id, trabajador_id, recibido_por_usuario_id, ubicacion_recepcion_id, estado, creado_en, confirmada_en, notas) VALUES
    ('00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000003001', 'confirmada', NOW()-INTERVAL '18 days', NOW()-INTERVAL '18 days', 'Devolucion taladro de Maria tras tarea puntual.'),
    ('00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000003001', 'confirmada', NOW()-INTERVAL '14 days', NOW()-INTERVAL '14 days', 'Devolucion parcial de Ana: taladro + arnes.'),
    ('00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000003001', 'confirmada', NOW()-INTERVAL '11 days', NOW()-INTERVAL '11 days', 'Devolucion Pedro: 1 perdido, 1 mantencion, 1 baja, 1 perdido.')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 16) DEVOLUCION DETALLE (7 lineas)
  -- ============================================================

  INSERT INTO devolucion_detalle (id, devolucion_id, custodia_activo_id, articulo_id, activo_id, lote_id, cantidad, condicion_entrada, disposicion, notas) VALUES
    ('00000000-0000-0000-0000-000000009101', '00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000008304', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006003', NULL, 1, 'ok',      'devuelto',   'Taladro devuelto sin novedades.'),
    ('00000000-0000-0000-0000-000000009102', '00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000008305', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006012', NULL, 1, 'ok',      'devuelto',   'Taladro devuelto ok.'),
    ('00000000-0000-0000-0000-000000009103', '00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000008307', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006103', NULL, 1, 'usado',   'devuelto',   'Arnes devuelto con uso normal.'),
    ('00000000-0000-0000-0000-000000009104', '00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000008309', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000006009', NULL, 1, 'perdido', 'perdido',    'Taladro reportado como extraviado en faena.'),
    ('00000000-0000-0000-0000-000000009105', '00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000008310', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006105', NULL, 1, 'danado',  'mantencion', 'Arnes danado, requiere revision en taller.'),
    ('00000000-0000-0000-0000-000000009106', '00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000008311', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006106', NULL, 1, 'danado',  'baja',       'Arnes irrecuperable, dado de baja.'),
    ('00000000-0000-0000-0000-000000009107', '00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000008312', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000006109', NULL, 1, 'perdido', 'perdido',    'Arnes extraviado en obra.')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 17) FIRMAS DEVOLUCION (3)
  -- ============================================================

  INSERT INTO firma_devolucion (id, devolucion_id, receptor_usuario_id, metodo, texto_aceptacion, texto_hash, firma_imagen_url, ip, user_agent, firmado_en) VALUES
    ('00000000-0000-0000-0000-000000009201', '00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000001002', 'en_dispositivo', 'Confirmo recepcion y revision de los elementos devueltos.', 'dev-hash-d1', 'https://example.local/sig/d1.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '18 days'),
    ('00000000-0000-0000-0000-000000009202', '00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000001002', 'en_dispositivo', 'Confirmo recepcion y revision de los elementos devueltos.', 'dev-hash-d2', 'https://example.local/sig/d2.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '14 days'),
    ('00000000-0000-0000-0000-000000009203', '00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000001002', 'en_dispositivo', 'Confirmo recepcion y revision de los elementos devueltos.', 'dev-hash-d3', 'https://example.local/sig/d3.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '11 days')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 18) EGRESOS (2)
  --  EG1: baja (TAL-008 + 10 guantes danados)
  --  EG2: consumo (25 guantes)
  -- ============================================================

  INSERT INTO egreso (id, creado_por_usuario_id, tipo_motivo, creado_en, notas) VALUES
    ('00000000-0000-0000-0000-000000009301', '00000000-0000-0000-0000-000000001002', 'baja',    NOW()-INTERVAL '8 days', 'Baja de taladro danado y guantes irrecuperables.'),
    ('00000000-0000-0000-0000-000000009302', '00000000-0000-0000-0000-000000001002', 'consumo', NOW()-INTERVAL '5 days', 'Consumo programado de guantes para cuadrilla.')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO egreso_detalle (id, egreso_id, articulo_id, ubicacion_id, lote_id, cantidad, notas, activo_id) VALUES
    ('00000000-0000-0000-0000-000000009401', '00000000-0000-0000-0000-000000009301', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000003001', NULL, 1,  'Taladro TAL-008 dado de baja por falla mecanica.', '00000000-0000-0000-0000-000000006008'),
    ('00000000-0000-0000-0000-000000009402', '00000000-0000-0000-0000-000000009301', '00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000003001', NULL, 10, 'Guantes danados dados de baja.',                    NULL),
    ('00000000-0000-0000-0000-000000009403', '00000000-0000-0000-0000-000000009302', '00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000003001', NULL, 25, 'Consumo general de guantes.',                       NULL)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 19) MOVIMIENTOS STOCK (8)
  -- ============================================================

  INSERT INTO movimiento_stock (id, articulo_id, lote_id, fecha_movimiento, tipo, ubicacion_origen_id, ubicacion_destino_id, cantidad, responsable_usuario_id, compra_id, entrega_id, devolucion_id, egreso_id, notas) VALUES
    ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-000000000401', NULL, NOW()-INTERVAL '60 days', 'entrada',  NULL,                                    '00000000-0000-0000-0000-000000003001', 15,  '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000005101', NULL, NULL, NULL, 'Ingreso 15 taladros por compra.'),
    ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-000000000402', NULL, NOW()-INTERVAL '45 days', 'entrada',  NULL,                                    '00000000-0000-0000-0000-000000003001', 11,  '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000005102', NULL, NULL, NULL, 'Ingreso 11 arneses por compra.'),
    ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-000000000403', NULL, NOW()-INTERVAL '45 days', 'entrada',  NULL,                                    '00000000-0000-0000-0000-000000003001', 150, '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000005102', NULL, NULL, NULL, 'Ingreso 150 pares guantes por compra.'),
    ('00000000-0000-0000-0000-00000000a004', '00000000-0000-0000-0000-000000000403', NULL, NOW()-INTERVAL '30 days', 'entrega',  '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', 10,  '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000008001', NULL, NULL, 'Salida guantes E1 a Juan.'),
    ('00000000-0000-0000-0000-00000000a005', '00000000-0000-0000-0000-000000000403', NULL, NOW()-INTERVAL '20 days', 'entrega',  '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', 15,  '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000008005', NULL, NULL, 'Salida guantes E5 a Pedro.'),
    ('00000000-0000-0000-0000-00000000a006', '00000000-0000-0000-0000-000000000403', NULL, NOW()-INTERVAL '15 days', 'entrega',  '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003005', 10,  '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000008007', NULL, NULL, 'Salida guantes E7 a Luis.'),
    ('00000000-0000-0000-0000-00000000a007', '00000000-0000-0000-0000-000000000403', NULL, NOW()-INTERVAL '8 days',  'baja',     '00000000-0000-0000-0000-000000003001', NULL,                                    10,  '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, '00000000-0000-0000-0000-000000009301', 'Baja guantes danados EG1.'),
    ('00000000-0000-0000-0000-00000000a008', '00000000-0000-0000-0000-000000000403', NULL, NOW()-INTERVAL '5 days',  'consumo',  '00000000-0000-0000-0000-000000003001', NULL,                                    25,  '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, '00000000-0000-0000-0000-000000009302', 'Consumo guantes EG2.')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 20) MOVIMIENTOS ACTIVO (~52)
  -- b001-b015: entrada taladros
  -- b016-b026: entrada arneses
  -- b027-b041: entregas activos
  -- b042-b048: devoluciones
  -- b049:      baja egreso
  -- b050-b052: reubicaciones y mantencion admin
  -- ============================================================

  INSERT INTO movimiento_activo (id, activo_id, fecha_movimiento, tipo, ubicacion_origen_id, ubicacion_destino_id, responsable_usuario_id, entrega_id, devolucion_id, egreso_id, notas) VALUES
    -- ENTRADAS taladros (60 dias atras, todos a Bodega Central excepto TAL-013 a Faena Norte)
    ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000006001', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-001'),
    ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-000000006002', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-002'),
    ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-000000006003', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-003'),
    ('00000000-0000-0000-0000-00000000b004', '00000000-0000-0000-0000-000000006004', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-004'),
    ('00000000-0000-0000-0000-00000000b005', '00000000-0000-0000-0000-000000006005', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-005'),
    ('00000000-0000-0000-0000-00000000b006', '00000000-0000-0000-0000-000000006006', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-006'),
    ('00000000-0000-0000-0000-00000000b007', '00000000-0000-0000-0000-000000006007', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-007'),
    ('00000000-0000-0000-0000-00000000b008', '00000000-0000-0000-0000-000000006008', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-008'),
    ('00000000-0000-0000-0000-00000000b009', '00000000-0000-0000-0000-000000006009', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-009'),
    ('00000000-0000-0000-0000-00000000b010', '00000000-0000-0000-0000-000000006010', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-010'),
    ('00000000-0000-0000-0000-00000000b011', '00000000-0000-0000-0000-000000006011', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-011'),
    ('00000000-0000-0000-0000-00000000b012', '00000000-0000-0000-0000-000000006012', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-012'),
    ('00000000-0000-0000-0000-00000000b013', '00000000-0000-0000-0000-000000006013', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-013 directo a Faena Norte'),
    ('00000000-0000-0000-0000-00000000b014', '00000000-0000-0000-0000-000000006014', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-014'),
    ('00000000-0000-0000-0000-00000000b015', '00000000-0000-0000-0000-000000006015', NOW()-INTERVAL '60 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso TAL-015'),
    -- ENTRADAS arneses (45 dias atras, todos a Bodega Central)
    ('00000000-0000-0000-0000-00000000b016', '00000000-0000-0000-0000-000000006101', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-001'),
    ('00000000-0000-0000-0000-00000000b017', '00000000-0000-0000-0000-000000006102', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-002'),
    ('00000000-0000-0000-0000-00000000b018', '00000000-0000-0000-0000-000000006103', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-003'),
    ('00000000-0000-0000-0000-00000000b019', '00000000-0000-0000-0000-000000006104', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-004'),
    ('00000000-0000-0000-0000-00000000b020', '00000000-0000-0000-0000-000000006105', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-005'),
    ('00000000-0000-0000-0000-00000000b021', '00000000-0000-0000-0000-000000006106', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-006'),
    ('00000000-0000-0000-0000-00000000b022', '00000000-0000-0000-0000-000000006107', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-007'),
    ('00000000-0000-0000-0000-00000000b023', '00000000-0000-0000-0000-000000006108', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-008'),
    ('00000000-0000-0000-0000-00000000b024', '00000000-0000-0000-0000-000000006109', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-009'),
    ('00000000-0000-0000-0000-00000000b025', '00000000-0000-0000-0000-000000006110', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-010'),
    ('00000000-0000-0000-0000-00000000b026', '00000000-0000-0000-0000-000000006111', NOW()-INTERVAL '45 days', 'entrada', NULL, '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Ingreso ARN-011'),
    -- ENTREGAS activos (por entrega confirmada)
    ('00000000-0000-0000-0000-00000000b027', '00000000-0000-0000-0000-000000006001', NOW()-INTERVAL '30 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008001', NULL, NULL, 'Entrega TAL-001 a Juan.'),
    ('00000000-0000-0000-0000-00000000b028', '00000000-0000-0000-0000-000000006101', NOW()-INTERVAL '30 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008001', NULL, NULL, 'Entrega ARN-001 a Juan.'),
    ('00000000-0000-0000-0000-00000000b029', '00000000-0000-0000-0000-000000006002', NOW()-INTERVAL '28 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008002', NULL, NULL, 'Entrega TAL-002 a Carlos.'),
    ('00000000-0000-0000-0000-00000000b030', '00000000-0000-0000-0000-000000006003', NOW()-INTERVAL '25 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008003', NULL, NULL, 'Entrega TAL-003 a Maria.'),
    ('00000000-0000-0000-0000-00000000b031', '00000000-0000-0000-0000-000000006012', NOW()-INTERVAL '22 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008004', NULL, NULL, 'Entrega TAL-012 a Ana.'),
    ('00000000-0000-0000-0000-00000000b032', '00000000-0000-0000-0000-000000006102', NOW()-INTERVAL '22 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008004', NULL, NULL, 'Entrega ARN-002 a Ana.'),
    ('00000000-0000-0000-0000-00000000b033', '00000000-0000-0000-0000-000000006103', NOW()-INTERVAL '22 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008004', NULL, NULL, 'Entrega ARN-003 a Ana.'),
    ('00000000-0000-0000-0000-00000000b034', '00000000-0000-0000-0000-000000006011', NOW()-INTERVAL '20 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008005', NULL, NULL, 'Entrega TAL-011 a Pedro.'),
    ('00000000-0000-0000-0000-00000000b035', '00000000-0000-0000-0000-000000006009', NOW()-INTERVAL '20 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008005', NULL, NULL, 'Entrega TAL-009 a Pedro.'),
    ('00000000-0000-0000-0000-00000000b036', '00000000-0000-0000-0000-000000006105', NOW()-INTERVAL '20 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008005', NULL, NULL, 'Entrega ARN-005 a Pedro.'),
    ('00000000-0000-0000-0000-00000000b037', '00000000-0000-0000-0000-000000006106', NOW()-INTERVAL '20 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008005', NULL, NULL, 'Entrega ARN-006 a Pedro.'),
    ('00000000-0000-0000-0000-00000000b038', '00000000-0000-0000-0000-000000006109', NOW()-INTERVAL '20 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008005', NULL, NULL, 'Entrega ARN-009 a Pedro.'),
    -- E6: traslado en_transito TAL-010
    ('00000000-0000-0000-0000-00000000b039', '00000000-0000-0000-0000-000000006010', NOW()-INTERVAL '10 days', 'traslado', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008006', NULL, NULL, 'Traslado TAL-010 a Faena Sur (en transito).'),
    -- E7+E8: entregas a proyecto minero
    ('00000000-0000-0000-0000-00000000b040', '00000000-0000-0000-0000-000000006014', NOW()-INTERVAL '15 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008007', NULL, NULL, 'Entrega TAL-014 a Luis.'),
    ('00000000-0000-0000-0000-00000000b041', '00000000-0000-0000-0000-000000006108', NOW()-INTERVAL '12 days', 'entrega', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000008008', NULL, NULL, 'Entrega ARN-008 a Felipe.'),
    -- DEVOLUCIONES
    ('00000000-0000-0000-0000-00000000b042', '00000000-0000-0000-0000-000000006003', NOW()-INTERVAL '18 days', 'devolucion', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000009001', NULL, 'Devolucion TAL-003 ok.'),
    ('00000000-0000-0000-0000-00000000b043', '00000000-0000-0000-0000-000000006012', NOW()-INTERVAL '14 days', 'devolucion', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000009002', NULL, 'Devolucion TAL-012 ok.'),
    ('00000000-0000-0000-0000-00000000b044', '00000000-0000-0000-0000-000000006103', NOW()-INTERVAL '14 days', 'devolucion', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000009002', NULL, 'Devolucion ARN-003 ok.'),
    ('00000000-0000-0000-0000-00000000b045', '00000000-0000-0000-0000-000000006009', NOW()-INTERVAL '11 days', 'ajuste',     '00000000-0000-0000-0000-000000003004', NULL,                                    '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000009003', NULL, 'TAL-009 reportado perdido.'),
    ('00000000-0000-0000-0000-00000000b046', '00000000-0000-0000-0000-000000006105', NOW()-INTERVAL '11 days', 'mantencion', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000003006', '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000009003', NULL, 'ARN-005 danado, enviado a taller.'),
    ('00000000-0000-0000-0000-00000000b047', '00000000-0000-0000-0000-000000006106', NOW()-INTERVAL '11 days', 'baja',       '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000009003', NULL, 'ARN-006 irrecuperable, dado de baja.'),
    ('00000000-0000-0000-0000-00000000b048', '00000000-0000-0000-0000-000000006109', NOW()-INTERVAL '11 days', 'ajuste',     '00000000-0000-0000-0000-000000003004', NULL,                                    '00000000-0000-0000-0000-000000001002', NULL, '00000000-0000-0000-0000-000000009003', NULL, 'ARN-009 reportado perdido.'),
    -- BAJA EGRESO
    ('00000000-0000-0000-0000-00000000b049', '00000000-0000-0000-0000-000000006008', NOW()-INTERVAL '8 days',  'baja',       '00000000-0000-0000-0000-000000003001', NULL,                                    '00000000-0000-0000-0000-000000001002', NULL, NULL, '00000000-0000-0000-0000-000000009301', 'TAL-008 dado de baja por falla.'),
    -- REUBICACIONES
    ('00000000-0000-0000-0000-00000000b050', '00000000-0000-0000-0000-000000006006', NOW()-INTERVAL '35 days', 'traslado',   '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Reubicacion TAL-006 a Bodega Transitoria.'),
    ('00000000-0000-0000-0000-00000000b051', '00000000-0000-0000-0000-000000006110', NOW()-INTERVAL '35 days', 'traslado',   '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000001002', NULL, NULL, NULL, 'Reubicacion ARN-010 a Bodega Transitoria.'),
    -- MANTENCION ADMIN DIRECTA
    ('00000000-0000-0000-0000-00000000b052', '00000000-0000-0000-0000-000000006007', NOW()-INTERVAL '34 days', 'mantencion', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003006', '00000000-0000-0000-0000-000000001001', NULL, NULL, NULL, 'TAL-007 enviado a mantencion preventiva por admin.')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '002-dev-seed.sql aplicado: dataset completo — 13 usuarios, 8 trabajadores, 26 activos (6 estados), 9 entregas, 3 devoluciones, 2 egresos, ~60 movimientos.';
END $$;
