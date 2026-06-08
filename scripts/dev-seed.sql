-- ==========================================================================
-- Seed de desarrollo para flujo EPP/Herramientas/Equipos con modelo físico.
-- articulo = objeto físico; cada fila = un ítem individual.
--
-- Dataset: 2 usuarios, 8 trabajadores, 3 bodegas, 3 proyectos,
-- 20 artículos físicos (7 epp + 7 herramienta + 6 equipo),
-- 3 entregas confirmadas, 5 custodias activas, ~23 movimientos.
--
-- Cubre los 5 estados: en_stock(12), asignado(5), mantencion(1),
-- dado_de_baja(1), perdido(1).
--
-- Password demo para todos: Dev12345!
-- ==========================================================================

DO $$
BEGIN
  IF current_database() NOT ILIKE '%dev%'
     AND current_database() NOT IN ('herramientas_epp', 'herramientas', 'herramientas_dev', 'alltura_dev') THEN
    RAISE NOTICE '002-dev-seed.sql omitido: base de datos no parece de desarrollo (%).', current_database();
    RETURN;
  END IF;

  -- ============================================================
  -- TRUNCATE (orden inverso a FK dependencies)
  -- ============================================================

  TRUNCATE TABLE auditoria, movimiento_activo, inspeccion_activo,
    firma_devolucion, firma_token_devolucion, devolucion_detalle, devolucion,
    firma_token, firma_entrega, entrega_detalle, entrega,
    custodia_activo, articulo_certificacion, articulo_especialidad, articulo,
    proyectos, bodegas, trabajador, usuario_rol, usuario, persona,
    notifications, push_subscriptions
    RESTART IDENTITY CASCADE;

  -- ============================================================
  -- 1) PERSONAS (10): 2 sistema + 8 trabajadores
  -- ============================================================

  INSERT INTO persona (id, rut, nombres, apellidos, telefono, email, estado)
  VALUES
    ('00000000-0000-0000-0000-000000000101', '11.111.111-1', 'Admin',      'Demo',    '+56911111111', 'admin.dev@alltura.local',       'activo'),
    ('00000000-0000-0000-0000-000000000103', '33.333.333-3', 'Supervisor', 'Demo',    '+56933333333', 'supervisor.dev@alltura.local',  'activo'),
    ('00000000-0000-0000-0000-000000000104', '44.444.444-4', 'Juan',       'Herrera', '+56944444444', 'juan.herrera@alltura.local',    'activo'),
    ('00000000-0000-0000-0000-000000000105', '55.555.555-5', 'Maria',      'Rojas',   '+56955555555', 'maria.rojas@alltura.local',     'activo'),
    ('00000000-0000-0000-0000-000000000106', '66.666.666-6', 'Carlos',     'Vega',    '+56966666666', 'carlos.vega@alltura.local',     'activo'),
    ('00000000-0000-0000-0000-000000000107', '77.777.777-7', 'Ana',        'Torres',  '+56977777777', 'ana.torres@alltura.local',      'activo'),
    ('00000000-0000-0000-0000-000000000108', '88.888.888-8', 'Pedro',      'Soto',    '+56988888888', 'pedro.soto@alltura.local',      'activo'),
    ('00000000-0000-0000-0000-000000000109', '99.999.999-9', 'Luis',       'Munoz',   '+56999999999', 'luis.munoz@alltura.local',      'activo'),
    ('00000000-0000-0000-0000-000000000110', '10.101.010-1', 'Rosa',       'Diaz',    '+56910101010', 'rosa.diaz@alltura.local',       'activo'),
    ('00000000-0000-0000-0000-000000000111', '12.121.212-1', 'Felipe',     'Castro',  '+56912121212', 'felipe.castro@alltura.local',   'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 2) USUARIOS (2) — admin + supervisor, todos con Dev12345!
  -- ============================================================

  INSERT INTO usuario (id, persona_id, creado_por_admin_id, email_login, password_hash, estado)
  VALUES
    ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', NULL,                                    'admin.dev@alltura.local',      crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000001001', 'supervisor.dev@alltura.local',  crypt('Dev12345!', gen_salt('bf', 10)), 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 3) ROLES: admin(1), supervisor(1)
  -- ============================================================

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT u.id, r.id FROM (VALUES
    ('00000000-0000-0000-0000-000000001001', 'admin'),
    ('00000000-0000-0000-0000-000000001003', 'supervisor')
  ) AS v(uid, rname)
  JOIN usuario u ON u.id = v.uid::uuid
  JOIN rol r ON r.nombre = v.rname
  ON CONFLICT (usuario_id, rol_id) DO NOTHING;

  -- ============================================================
  -- 4) TRABAJADORES (8)
  -- ============================================================

  INSERT INTO trabajador (id, persona_id, cargo, fecha_ingreso, estado)
  VALUES
    ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000000104', 'Maestro primera',     NOW() - INTERVAL '400 days', 'activo'),
    ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000105', 'Ayudante',            NOW() - INTERVAL '350 days', 'activo'),
    ('00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000000106', 'Operador grua',       NOW() - INTERVAL '300 days', 'activo'),
    ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000000107', 'Jefa cuadrilla',      NOW() - INTERVAL '280 days', 'activo'),
    ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000000108', 'Soldador',            NOW() - INTERVAL '260 days', 'activo'),
    ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000000109', 'Capataz',             NOW() - INTERVAL '240 days', 'activo'),
    ('00000000-0000-0000-0000-000000002007', '00000000-0000-0000-0000-000000000110', 'Rigger',              NOW() - INTERVAL '200 days', 'activo'),
    ('00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000000111', 'Ayudante electrico',  NOW() - INTERVAL '180 days', 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 5) BODEGAS (3) y PROYECTOS (3)
  --    bodega1 = 3001, bodega2 = 3002, bodega3 = 3006
  --    proyecto1 = 3003, proyecto2 = 3004, proyecto3 = 3005
  -- ============================================================

  INSERT INTO bodegas (id, nombre, direccion, ciudad, descripcion, estado)
  VALUES
    ('00000000-0000-0000-0000-000000003001', 'Bodega Central',         'Camino Industrial 100', 'Santiago',       NULL,                    'activo'),
    ('00000000-0000-0000-0000-000000003002', 'Bodega Transitoria Sur', 'Ruta 68 KM 12',         'Valparaíso',     NULL,                    'activo'),
    ('00000000-0000-0000-0000-000000003006', 'Taller Mantencion',      'Av. Talleres 45',        'Antofagasta',    'Bodega de mantencion', 'activo')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO proyectos (id, nombre, descripcion, ciudad, cliente, presupuesto_clp, estado, fecha_inicio, fecha_fin)
  VALUES
    ('00000000-0000-0000-0000-000000003003', 'Faena Norte',           NULL, 'Concepción', 'Minera Norte SpA', NULL, 'activo', (NOW() - INTERVAL '18 months')::DATE, NULL),
    ('00000000-0000-0000-0000-000000003004', 'Faena Sur',             NULL, 'Calama',     'Constructora Sur', NULL, 'activo', (NOW() - INTERVAL '12 months')::DATE, NULL),
    ('00000000-0000-0000-0000-000000003005', 'Proyecto Minero Andes', NULL, 'Santiago',   'Minera Andes SA',  NULL, 'activo', (NOW() - INTERVAL '8 months')::DATE,  NULL)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 5b) PROVEEDORES (2 semilla)
  -- ============================================================

  INSERT INTO proveedor (id, nombre, rut, email, telefono, estado)
  VALUES
    ('00000000-0000-0000-0000-000000009001', 'MSA Safety Chile', '76.100.001-1', 'ventas@msasafety.cl', '+56222000001', 'activo'),
    ('00000000-0000-0000-0000-000000009002', 'Bosch Tools Chile', '76.100.002-2', 'ventas@bosch.cl',    '+56222000002', 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 6) ARTICULOS — 20 objetos físicos
  --
  --  EPP (7):
  --   art-001  Casco MSA V-Gard         en_stock    bodega1
  --   art-002  Casco MSA V-Gard         en_stock    bodega1
  --   art-003  Arnes Petzl C072BA       en_stock    bodega1
  --   art-004  Arnes Petzl C072BA       asignado    proyecto1
  --   art-005  Arnes Petzl C072BA       asignado    proyecto1
  --   art-006  Guante anticorte Ansell  mantencion  bodega2
  --   art-007  Lentes 3M                en_stock    bodega2
  --
  --  Herramienta (7):
  --   art-008  Taladro Bosch GSB18      en_stock    bodega1
  --   art-009  Taladro Bosch GSB18      asignado    proyecto2
  --   art-010  Sierra DeWalt DWE575     en_stock    bodega2
  --   art-011  Sierra DeWalt DWE575     dado_de_baja NULL
  --   art-012  Esmeril Makita GA9020    en_stock    bodega1
  --   art-013  Llave Snap-On QD2R200    asignado    proyecto3
  --   art-014  Atornillador Bosch GSR18 en_stock    bodega3
  --
  --  Equipo (6):
  --   art-015  Medidor gas BW GasAlert  en_stock    bodega1
  --   art-016  Medidor gas BW GasAlert  asignado    proyecto1
  --   art-017  Clamp Fluke 376FC        en_stock    bodega2
  --   art-018  Multímetro Fluke 115     en_stock    bodega1
  --   art-019  Termómetro Fluke 62MAX   perdido     NULL
  --   art-020  Detector Fluke LVD2      en_stock    bodega3
  -- ============================================================

  INSERT INTO articulo (id, tipo, nombre, marca, modelo, nro_serie, codigo, valor, estado,
                        bodega_actual_id, proyecto_actual_id, fecha_vencimiento,
                        fecha_compra, proveedor_id, creado_por_usuario_id)
  VALUES
    -- EPP
    ('00000000-0000-0000-0000-000000010001', 'epp',        'Casco de seguridad',         'MSA',     'V-Gard',     'MSA-VGARD-001',  '001', 15000,  'en_stock',    '00000000-0000-0000-0000-000000003001', NULL,                                    NULL,                           NOW()-INTERVAL '90 days',  '00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010002', 'epp',        'Casco de seguridad',         'MSA',     'V-Gard',     'MSA-VGARD-002',  '002', 15000,  'en_stock',    '00000000-0000-0000-0000-000000003001', NULL,                                    NULL,                           NOW()-INTERVAL '90 days',  '00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010003', 'epp',        'Arnes de seguridad',         'Petzl',   'C072BA',     'PET-C072-003',   '003', 85000,  'en_stock',    '00000000-0000-0000-0000-000000003001', NULL,                                    NOW() + INTERVAL '18 months',   NOW()-INTERVAL '120 days', '00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010004', 'epp',        'Arnes de seguridad',         'Petzl',   'C072BA',     'PET-C072-004',   '004', 85000,  'asignado',    NULL,                                    '00000000-0000-0000-0000-000000003003', NOW() + INTERVAL '18 months',   NOW()-INTERVAL '120 days', '00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010005', 'epp',        'Arnes de seguridad',         'Petzl',   'C072BA',     'PET-C072-005',   '005', 85000,  'asignado',    NULL,                                    '00000000-0000-0000-0000-000000003003', NOW() + INTERVAL '18 months',   NOW()-INTERVAL '120 days', '00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010006', 'epp',        'Guante anticorte',           'Ansell',  'HyFlex 11',  'ANS-GLOVE-006',  '006', 8500,   'mantencion',  '00000000-0000-0000-0000-000000003002', NULL,                                    NULL,                           NOW()-INTERVAL '60 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010007', 'epp',        'Lentes de proteccion',       '3M',      'SecureFit',  '3M-LENTE-007',   '007', 5500,   'en_stock',    '00000000-0000-0000-0000-000000003002', NULL,                                    NULL,                           NOW()-INTERVAL '60 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    -- Herramienta
    ('00000000-0000-0000-0000-000000010008', 'herramienta','Taladro percutor',            'Bosch',   'GSB18',      'BSH-GSB18-008',  '008', 120000, 'en_stock',    '00000000-0000-0000-0000-000000003001', NULL,                                    NULL,                           NOW()-INTERVAL '80 days',  '00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010009', 'herramienta','Taladro percutor',            'Bosch',   'GSB18',      'BSH-GSB18-009',  '009', 120000, 'asignado',    NULL,                                    '00000000-0000-0000-0000-000000003004', NULL,                           NOW()-INTERVAL '80 days',  '00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010010', 'herramienta','Sierra circular',             'DeWalt',  'DWE575',     'DEW-DWE575-010', '010', 185000, 'en_stock',    '00000000-0000-0000-0000-000000003002', NULL,                                    NULL,                           NOW()-INTERVAL '80 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010011', 'herramienta','Sierra circular',             'DeWalt',  'DWE575',     'DEW-DWE575-011', '011', 185000, 'dado_de_baja',NULL,                                    NULL,                                    NULL,                           NOW()-INTERVAL '80 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010012', 'herramienta','Esmeril angular',             'Makita',  'GA9020',     'MAK-GA9020-012', '012', 95000,  'en_stock',    '00000000-0000-0000-0000-000000003001', NULL,                                    NULL,                           NOW()-INTERVAL '80 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010013', 'herramienta','Llave de torque',             'Snap-On', 'QD2R200',    'SNP-QD200-013',  '013', 145000, 'asignado',    NULL,                                    '00000000-0000-0000-0000-000000003005', NULL,                           NOW()-INTERVAL '80 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010014', 'herramienta','Atornillador inalambrico',    'Bosch',   'GSR18',      'BSH-GSR18-014',  '014', 78000,  'en_stock',    '00000000-0000-0000-0000-000000003006', NULL,                                    NULL,                           NOW()-INTERVAL '75 days',  '00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000001001'),
    -- Equipo
    ('00000000-0000-0000-0000-000000010015', 'equipo',     'Medidor de gas multigas',    'BW',      'GasAlert',   'BWG-ALERT-015',  '015', 450000, 'en_stock',    '00000000-0000-0000-0000-000000003001', NULL,                                    NOW() + INTERVAL '24 months',   NOW()-INTERVAL '60 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010016', 'equipo',     'Medidor de gas multigas',    'BW',      'GasAlert',   'BWG-ALERT-016',  '016', 450000, 'asignado',    NULL,                                    '00000000-0000-0000-0000-000000003003', NOW() + INTERVAL '24 months',   NOW()-INTERVAL '60 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010017', 'equipo',     'Clamp amperimetrico',        'Fluke',   '376FC',      'FLK-376FC-017',  '017', 320000, 'en_stock',    '00000000-0000-0000-0000-000000003002', NULL,                                    NULL,                           NOW()-INTERVAL '60 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010018', 'equipo',     'Multimetro digital',         'Fluke',   '115',        'FLK-115-018',    '018', 95000,  'en_stock',    '00000000-0000-0000-0000-000000003001', NULL,                                    NULL,                           NOW()-INTERVAL '60 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010019', 'equipo',     'Termometro infrarrojo',      'Fluke',   '62MAX',      'FLK-62MAX-019',  '019', 78000,  'perdido',     NULL,                                    NULL,                                    NULL,                           NOW()-INTERVAL '55 days',  NULL,                                    '00000000-0000-0000-0000-000000001001'),
    ('00000000-0000-0000-0000-000000010020', 'equipo',     'Detector de voltaje',        'Fluke',   'LVD2',       'FLK-LVD2-020',   '020', 35000,  'en_stock',    '00000000-0000-0000-0000-000000003006', NULL,                                    NULL,                           NOW()-INTERVAL '55 days',  NULL,                                    '00000000-0000-0000-0000-000000001001')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 7) ESPECIALIDADES
  -- ============================================================

  INSERT INTO articulo_especialidad (articulo_id, especialidad)
  VALUES
    -- Arneses → trabajos verticales
    ('00000000-0000-0000-0000-000000010003', 'trabajos_verticales_lineas_de_vida'),
    ('00000000-0000-0000-0000-000000010004', 'trabajos_verticales_lineas_de_vida'),
    ('00000000-0000-0000-0000-000000010005', 'trabajos_verticales_lineas_de_vida'),
    -- Guantes → oocc + ooee
    ('00000000-0000-0000-0000-000000010006', 'oocc'),
    ('00000000-0000-0000-0000-000000010006', 'ooee'),
    -- Taladros → oocc + ooee
    ('00000000-0000-0000-0000-000000010008', 'oocc'),
    ('00000000-0000-0000-0000-000000010008', 'ooee'),
    ('00000000-0000-0000-0000-000000010009', 'oocc'),
    ('00000000-0000-0000-0000-000000010009', 'ooee'),
    -- Medidor gas → oocc + equipos
    ('00000000-0000-0000-0000-000000010015', 'oocc'),
    ('00000000-0000-0000-0000-000000010015', 'equipos'),
    ('00000000-0000-0000-0000-000000010016', 'oocc'),
    ('00000000-0000-0000-0000-000000010016', 'equipos'),
    -- Clamp → ooee + equipos
    ('00000000-0000-0000-0000-000000010017', 'ooee'),
    ('00000000-0000-0000-0000-000000010017', 'equipos')
  ON CONFLICT (articulo_id, especialidad) DO NOTHING;

  -- ============================================================
  -- 7b) CERTIFICACIONES (muestra — 3 artículos)
  -- ============================================================

  INSERT INTO articulo_certificacion (articulo_id, nombre, url)
  VALUES
    ('00000000-0000-0000-0000-000000010003', 'Certificado de conformidad EN361',        'https://example.local/certs/arnes-003-en361.pdf'),
    ('00000000-0000-0000-0000-000000010003', 'Certificado ACHS 2024',                   'https://example.local/certs/arnes-003-achs.pdf'),
    ('00000000-0000-0000-0000-000000010015', 'Certificado de calibración gas 2025',     'https://example.local/certs/medgas-015-calib.pdf'),
    ('00000000-0000-0000-0000-000000010015', 'Certificado ATEX zona explosiva',         'https://example.local/certs/medgas-015-atex.pdf'),
    ('00000000-0000-0000-0000-000000010008', 'Garantía extendida Bosch 3 años',         'https://example.local/certs/taladro-008-garantia.pdf')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 8) MOVIMIENTOS DE ENTRADA — registro inicial de los 20 artículos
  -- ============================================================

  INSERT INTO movimiento_activo (id, articulo_id, fecha_movimiento, tipo, bodega_origen_id, proyecto_origen_id, bodega_destino_id, proyecto_destino_id, responsable_usuario_id, entrega_id, devolucion_id, notas)
  VALUES
    -- EPP
    ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-000000010001', NOW()-INTERVAL '90 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso casco MSA-001'),
    ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-000000010002', NOW()-INTERVAL '90 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso casco MSA-002'),
    ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-000000010003', NOW()-INTERVAL '90 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso arnes Petzl-003'),
    ('00000000-0000-0000-0000-00000000c004', '00000000-0000-0000-0000-000000010004', NOW()-INTERVAL '90 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso arnes Petzl-004'),
    ('00000000-0000-0000-0000-00000000c005', '00000000-0000-0000-0000-000000010005', NOW()-INTERVAL '90 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso arnes Petzl-005'),
    ('00000000-0000-0000-0000-00000000c006', '00000000-0000-0000-0000-000000010006', NOW()-INTERVAL '90 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003002', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso guante Ansell-006'),
    ('00000000-0000-0000-0000-00000000c007', '00000000-0000-0000-0000-000000010007', NOW()-INTERVAL '90 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003002', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso lente 3M-007'),
    -- Herramienta
    ('00000000-0000-0000-0000-00000000c008', '00000000-0000-0000-0000-000000010008', NOW()-INTERVAL '80 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso taladro Bosch-008'),
    ('00000000-0000-0000-0000-00000000c009', '00000000-0000-0000-0000-000000010009', NOW()-INTERVAL '80 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso taladro Bosch-009'),
    ('00000000-0000-0000-0000-00000000c010', '00000000-0000-0000-0000-000000010010', NOW()-INTERVAL '80 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003002', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso sierra DeWalt-010'),
    ('00000000-0000-0000-0000-00000000c011', '00000000-0000-0000-0000-000000010011', NOW()-INTERVAL '80 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso sierra DeWalt-011'),
    ('00000000-0000-0000-0000-00000000c012', '00000000-0000-0000-0000-000000010012', NOW()-INTERVAL '80 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso esmeril Makita-012'),
    ('00000000-0000-0000-0000-00000000c013', '00000000-0000-0000-0000-000000010013', NOW()-INTERVAL '80 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso llave Snap-On-013'),
    ('00000000-0000-0000-0000-00000000c014', '00000000-0000-0000-0000-000000010014', NOW()-INTERVAL '80 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003006', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso atornillador Bosch-014'),
    -- Equipo
    ('00000000-0000-0000-0000-00000000c015', '00000000-0000-0000-0000-000000010015', NOW()-INTERVAL '60 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso medidor gas BW-015'),
    ('00000000-0000-0000-0000-00000000c016', '00000000-0000-0000-0000-000000010016', NOW()-INTERVAL '60 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso medidor gas BW-016'),
    ('00000000-0000-0000-0000-00000000c017', '00000000-0000-0000-0000-000000010017', NOW()-INTERVAL '60 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003002', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso clamp Fluke-017'),
    ('00000000-0000-0000-0000-00000000c018', '00000000-0000-0000-0000-000000010018', NOW()-INTERVAL '60 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso multimetro Fluke-018'),
    ('00000000-0000-0000-0000-00000000c019', '00000000-0000-0000-0000-000000010019', NOW()-INTERVAL '60 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003001', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso termometro Fluke-019'),
    ('00000000-0000-0000-0000-00000000c020', '00000000-0000-0000-0000-000000010020', NOW()-INTERVAL '60 days', 'entrada', NULL, NULL, '00000000-0000-0000-0000-000000003006', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Ingreso detector Fluke-020')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 9) ENTREGAS (3 confirmadas)
  --  E1: bodega1 → proyecto1 (Faena Norte), trabajador1 (Juan)
  --      artículos: art-004 (arnes), art-005 (arnes)
  --  E2: bodega1 → proyecto2 (Faena Sur), trabajador2 (Maria)
  --      artículos: art-009 (taladro)
  --  E3: bodega1 → proyecto3 (Minero Andes), trabajador3 (Carlos)
  --      artículos: art-013 (llave torque), art-016 (medidor gas)
  -- ============================================================

  INSERT INTO entrega (id, creado_por_usuario_id, trabajador_id, bodega_origen_id, proyecto_destino_id, tipo, estado, nota_destino, creado_en, confirmada_en, evidencia_foto_url)
  VALUES
    ('00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003003', 'entrega', 'confirmada', 'Entrega arneses a Juan para Faena Norte.',          NOW()-INTERVAL '30 days', NOW()-INTERVAL '30 days', 'https://example.local/evidencia/seed-e1.jpg'),
    ('00000000-0000-0000-0000-000000020002', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003004', 'entrega', 'confirmada', 'Entrega taladro a Maria para Faena Sur.',            NOW()-INTERVAL '20 days', NOW()-INTERVAL '20 days', 'https://example.local/evidencia/seed-e2.jpg'),
    ('00000000-0000-0000-0000-000000020003', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000003005', 'entrega', 'confirmada', 'Entrega llave torque y medidor gas a Carlos para Proyecto Minero.', NOW()-INTERVAL '15 days', NOW()-INTERVAL '15 days', 'https://example.local/evidencia/seed-e3.jpg')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 10) ENTREGA DETALLE (5 líneas)
  -- ============================================================

  INSERT INTO entrega_detalle (id, entrega_id, articulo_id, condicion_salida, notas)
  VALUES
    -- E1: Juan (art-004 arnes + art-005 arnes)
    ('00000000-0000-0000-0000-000000021001', '00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-000000010004', 'ok',    'Arnes certificado para trabajo en altura.'),
    ('00000000-0000-0000-0000-000000021002', '00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-000000010005', 'ok',    'Segundo arnes para cuadrilla.'),
    -- E2: Maria (art-009 taladro)
    ('00000000-0000-0000-0000-000000021003', '00000000-0000-0000-0000-000000020002', '00000000-0000-0000-0000-000000010009', 'ok',    'Taladro Bosch para faena sur.'),
    -- E3: Carlos (art-013 llave torque + art-016 medidor gas)
    ('00000000-0000-0000-0000-000000021004', '00000000-0000-0000-0000-000000020003', '00000000-0000-0000-0000-000000010013', 'ok',    'Llave de torque para proyecto minero.'),
    ('00000000-0000-0000-0000-000000021005', '00000000-0000-0000-0000-000000020003', '00000000-0000-0000-0000-000000010016', 'ok',    'Medidor gas multigas para proyecto minero.')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 11) FIRMAS ENTREGA (3 — una por entrega confirmada)
  -- ============================================================

  INSERT INTO firma_entrega (id, entrega_id, trabajador_id, metodo, texto_aceptacion, texto_hash, firma_imagen_url, ip, user_agent, firmado_en)
  VALUES
    ('00000000-0000-0000-0000-000000022001', '00000000-0000-0000-0000-000000020001', '00000000-0000-0000-0000-000000002001', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e1', 'https://example.local/sig/e1.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '30 days'),
    ('00000000-0000-0000-0000-000000022002', '00000000-0000-0000-0000-000000020002', '00000000-0000-0000-0000-000000002002', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e2', 'https://example.local/sig/e2.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000022003', '00000000-0000-0000-0000-000000020003', '00000000-0000-0000-0000-000000002003', 'en_dispositivo', 'Declaro recibir en conformidad los elementos de esta entrega.', 'dev-hash-e3', 'https://example.local/sig/e3.png', '127.0.0.1', 'dev-seed', NOW()-INTERVAL '15 days')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 12) CUSTODIAS ACTIVAS (5 — una por artículo asignado)
  -- ============================================================

  INSERT INTO custodia_activo (id, articulo_id, trabajador_id, proyecto_id, entrega_id, desde_en, hasta_en, estado)
  VALUES
    -- E1: Juan (art-004 + art-005)
    ('00000000-0000-0000-0000-000000023001', '00000000-0000-0000-0000-000000010004', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000020001', NOW()-INTERVAL '30 days', NULL, 'activa'),
    ('00000000-0000-0000-0000-000000023002', '00000000-0000-0000-0000-000000010005', '00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000020001', NOW()-INTERVAL '30 days', NULL, 'activa'),
    -- E2: Maria (art-009)
    ('00000000-0000-0000-0000-000000023003', '00000000-0000-0000-0000-000000010009', '00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000020002', NOW()-INTERVAL '20 days', NULL, 'activa'),
    -- E3: Carlos (art-013 + art-016)
    ('00000000-0000-0000-0000-000000023004', '00000000-0000-0000-0000-000000010013', '00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000020003', NOW()-INTERVAL '15 days', NULL, 'activa'),
    ('00000000-0000-0000-0000-000000023005', '00000000-0000-0000-0000-000000010016', '00000000-0000-0000-0000-000000002003', '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000020003', NOW()-INTERVAL '15 days', NULL, 'activa')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 13) MOVIMIENTOS ENTREGA (5 — uno por artículo entregado)
  -- ============================================================

  INSERT INTO movimiento_activo (id, articulo_id, fecha_movimiento, tipo, bodega_origen_id, proyecto_origen_id, bodega_destino_id, proyecto_destino_id, responsable_usuario_id, entrega_id, devolucion_id, notas)
  VALUES
    -- E1
    ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-000000010004', NOW()-INTERVAL '30 days', 'entrega', '00000000-0000-0000-0000-000000003001', NULL, NULL, '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000020001', NULL, 'Entrega arnes-004 a Juan para Faena Norte.'),
    ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-000000010005', NOW()-INTERVAL '30 days', 'entrega', '00000000-0000-0000-0000-000000003001', NULL, NULL, '00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000020001', NULL, 'Entrega arnes-005 a Juan para Faena Norte.'),
    -- E2
    ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-000000010009', NOW()-INTERVAL '20 days', 'entrega', '00000000-0000-0000-0000-000000003001', NULL, NULL, '00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000020002', NULL, 'Entrega taladro-009 a Maria para Faena Sur.'),
    -- E3
    ('00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-000000010013', NOW()-INTERVAL '15 days', 'entrega', '00000000-0000-0000-0000-000000003001', NULL, NULL, '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000020003', NULL, 'Entrega llave-013 a Carlos para Proyecto Minero.'),
    ('00000000-0000-0000-0000-00000000d005', '00000000-0000-0000-0000-000000010016', NOW()-INTERVAL '15 days', 'entrega', '00000000-0000-0000-0000-000000003001', NULL, NULL, '00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000020003', NULL, 'Entrega medidor-016 a Carlos para Proyecto Minero.')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 14) MOVIMIENTOS ESPECIALES: baja, perdido, mantencion
  -- ============================================================

  INSERT INTO movimiento_activo (id, articulo_id, fecha_movimiento, tipo, bodega_origen_id, proyecto_origen_id, bodega_destino_id, proyecto_destino_id, responsable_usuario_id, entrega_id, devolucion_id, notas)
  VALUES
    -- art-011 sierra dado_de_baja
    ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-000000010011', NOW()-INTERVAL '10 days', 'baja',       '00000000-0000-0000-0000-000000003001', NULL, NULL, NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Sierra DWE575-011 dada de baja por falla irreparable.'),
    -- art-019 termometro perdido
    ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-000000010019', NOW()-INTERVAL '7 days',  'ajuste',     '00000000-0000-0000-0000-000000003001', NULL, NULL, NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Termometro Fluke-019 reportado como perdido en faena.'),
    -- art-006 guante mantencion
    ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-000000010006', NOW()-INTERVAL '5 days',  'mantencion', '00000000-0000-0000-0000-000000003002', NULL, '00000000-0000-0000-0000-000000003002', NULL, '00000000-0000-0000-0000-000000001001', NULL, NULL, 'Guante Ansell-006 enviado a revision de mantencion.')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '002-dev-seed.sql aplicado: 2 usuarios, 8 trabajadores, 2 proveedores, 3 bodegas, 3 proyectos, 20 artículos (7 epp + 7 herramienta + 6 equipo), 5 certificaciones, 3 entregas confirmadas, 5 custodias activas, 28 movimientos.';
END $$;
