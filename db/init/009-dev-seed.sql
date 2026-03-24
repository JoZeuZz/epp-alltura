-- Seed de desarrollo integral para flujo EPP/Herramientas.
-- Este archivo esta pensado para entorno local y es idempotente.

DO $$
BEGIN
  IF current_database() NOT ILIKE '%dev%'
     AND current_database() NOT IN ('herramientas_epp') THEN
    RAISE NOTICE '009-dev-seed.sql omitido: base de datos no parece de desarrollo (%).', current_database();
    RETURN;
  END IF;

  -- ============================================================
  -- IDENTIDAD Y ACCESO (USUARIOS/TRABAJADORES DEMO)
  -- Password demo para todos: Dev12345!
  -- ============================================================

  INSERT INTO persona (id, rut, nombres, apellidos, telefono, email, estado)
  VALUES
    ('00000000-0000-0000-0000-000000000101', '11.111.111-1', 'Admin', 'Demo', '+56911111111', 'admin.dev@alltura.local', 'activo'),
    ('00000000-0000-0000-0000-000000000102', '22.222.222-2', 'Bodega', 'Demo', '+56922222222', 'bodega.dev@alltura.local', 'activo'),
    ('00000000-0000-0000-0000-000000000103', '33.333.333-3', 'Supervisor', 'Demo', '+56933333333', 'supervisor.dev@alltura.local', 'activo'),
    ('00000000-0000-0000-0000-000000000104', '44.444.444-4', 'Juan', 'Herrera', '+56944444444', 'juan.herrera@alltura.local', 'activo'),
    ('00000000-0000-0000-0000-000000000105', '55.555.555-5', 'Maria', 'Rojas', '+56955555555', 'maria.rojas@alltura.local', 'activo')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO usuario (id, persona_id, creado_por_admin_id, email_login, password_hash, estado)
  VALUES
    ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000101', NULL, 'admin.dev@alltura.local', crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000111', 'bodega.dev@alltura.local', crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000111', 'supervisor.dev@alltura.local', crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000111', 'juan.herrera@alltura.local', crypt('Dev12345!', gen_salt('bf', 10)), 'activo'),
    ('00000000-0000-0000-0000-000000000115', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000111', 'maria.rojas@alltura.local', crypt('Dev12345!', gen_salt('bf', 10)), 'activo')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT '00000000-0000-0000-0000-000000000111', r.id
  FROM rol r
  WHERE r.nombre = 'admin'
  ON CONFLICT (usuario_id, rol_id) DO NOTHING;

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT '00000000-0000-0000-0000-000000000112', r.id
  FROM rol r
  WHERE r.nombre = 'bodega'
  ON CONFLICT (usuario_id, rol_id) DO NOTHING;

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT '00000000-0000-0000-0000-000000000113', r.id
  FROM rol r
  WHERE r.nombre = 'supervisor'
  ON CONFLICT (usuario_id, rol_id) DO NOTHING;

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT '00000000-0000-0000-0000-000000000114', r.id
  FROM rol r
  WHERE r.nombre = 'trabajador'
  ON CONFLICT (usuario_id, rol_id) DO NOTHING;

  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT '00000000-0000-0000-0000-000000000115', r.id
  FROM rol r
  WHERE r.nombre = 'trabajador'
  ON CONFLICT (usuario_id, rol_id) DO NOTHING;

  INSERT INTO trabajador (id, persona_id, usuario_id, cargo, fecha_ingreso, estado)
  VALUES
    ('00000000-0000-0000-0000-000000000121', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000114', 'Maestro primera', NOW() - INTERVAL '300 days', 'activo'),
    ('00000000-0000-0000-0000-000000000122', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000115', 'Ayudante', NOW() - INTERVAL '220 days', 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- CATALOGOS BASE
  -- ============================================================

  INSERT INTO ubicacion (id, nombre, tipo, ubicacion_subtipo, cliente, direccion, estado, fecha_inicio_operacion)
  VALUES
    ('00000000-0000-0000-0000-000000000201', 'Bodega Central', 'bodega', 'fija', NULL, 'Camino Industrial 100', 'activo', NOW() - INTERVAL '1 year'),
    ('00000000-0000-0000-0000-000000000202', 'Faena Norte', 'planta', NULL, 'Cliente Norte', 'Ruta 5 Norte KM 1000', 'activo', NOW() - INTERVAL '8 months'),
    ('00000000-0000-0000-0000-000000000203', 'Taller Mantencion', 'taller_mantencion', NULL, NULL, 'Av. Talleres 45', 'activo', NOW() - INTERVAL '10 months')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO proveedor (id, nombre, rut, email, telefono, estado)
  VALUES
    ('00000000-0000-0000-0000-000000000301', 'Proveedor Demo EPP', '76.123.456-7', 'contacto@proveedor-demo.cl', '+56222223333', 'activo')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO articulo (
    id, tipo, nombre, marca, modelo, categoria,
    tracking_mode, retorno_mode, nivel_control,
    requiere_vencimiento, unidad_medida, estado
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000401',
      'herramienta', 'Taladro Industrial', 'Bosch', 'GSB-16', 'Herramientas electricas',
      'serial', 'retornable', 'alto',
      FALSE, 'unidad', 'activo'
    ),
    (
      '00000000-0000-0000-0000-000000000402',
      'epp', 'Arnes de Seguridad', '3M', 'Protecta X', 'EPP Altura',
      'serial', 'retornable', 'alto',
      TRUE, 'unidad', 'activo'
    ),
    (
      '00000000-0000-0000-0000-000000000403',
      'consumible', 'Guante de cabritilla', 'SegurPlus', 'GC-01', 'EPP Mano',
      'lote', 'consumible', 'bajo',
      FALSE, 'par', 'activo'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- INGRESOS (DOCUMENTO + COMPRA + DETALLES)
  -- ============================================================

  INSERT INTO documento_compra (id, proveedor_id, tipo, numero, fecha, archivo_url)
  VALUES
    (
      '00000000-0000-0000-0000-000000000501',
      '00000000-0000-0000-0000-000000000301',
      'factura',
      'DEV-FACT-0001',
      NOW() - INTERVAL '40 days',
      'https://example.local/docs/dev-fact-0001.pdf'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO compra (id, documento_compra_id, creado_por_usuario_id, creado_en, notas)
  VALUES
    (
      '00000000-0000-0000-0000-000000000502',
      '00000000-0000-0000-0000-000000000501',
      '00000000-0000-0000-0000-000000000112',
      NOW() - INTERVAL '39 days',
      'Compra inicial de desarrollo para QA de inventario mixto.'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO compra_detalle (id, compra_id, articulo_id, cantidad, costo_unitario, notas)
  VALUES
    ('00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000401', 5, 120000, 'Ingreso 5 taladros'),
    ('00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000402', 3, 85000, 'Ingreso 3 arneses'),
    ('00000000-0000-0000-0000-000000000513', '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000403', 200, 4500, 'Ingreso 200 pares de guante')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- ACTIVOS SERIALIZADOS (5 TALADROS + 3 ARNESES)
  -- ============================================================

  INSERT INTO activo (
    id, articulo_id, compra_detalle_id, nro_serie, codigo, valor,
    estado, ubicacion_actual_id, fecha_compra, fecha_vencimiento
  )
  VALUES
    ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000511', 'SER-TAL-001', 'TAL-001', 120000, 'asignado', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '39 days', NULL),
    ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000511', 'SER-TAL-002', 'TAL-002', 120000, 'en_stock', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '39 days', NULL),
    ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000511', 'SER-TAL-003', 'TAL-003', 120000, 'en_stock', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '39 days', NULL),
    ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000511', 'SER-TAL-004', 'TAL-004', 120000, 'en_stock', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '39 days', NULL),
    ('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000511', 'SER-TAL-005', 'TAL-005', 120000, 'en_stock', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '39 days', NULL),

    ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000512', 'SER-ARN-001', 'ARN-001', 85000, 'asignado', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '39 days', NOW() + INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000000712', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000512', 'SER-ARN-002', 'ARN-002', 85000, 'en_stock', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '39 days', NOW() + INTERVAL '10 months'),
    ('00000000-0000-0000-0000-000000000713', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000512', 'SER-ARN-003', 'ARN-003', 85000, 'en_stock', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '39 days', NOW() + INTERVAL '10 months')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- STOCK CONSUMIBLE
  -- Ingreso: 200 pares
  -- Entrega mixta: 12 pares
  -- Egreso consumo: 40 pares
  -- Remanente esperado: 148 pares
  -- ============================================================

  INSERT INTO stock (id, ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada)
  VALUES
    ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000403', NULL, 148, 0)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- ENTREGAS (incluye caso mixto: 1 taladro + 1 arnes + consumible)
  -- ============================================================

  INSERT INTO entrega (
    id, creado_por_usuario_id, trabajador_id,
    ubicacion_origen_id, ubicacion_destino_id,
    tipo, estado, nota_destino, creado_en, confirmada_en,
    recibido_por_usuario_id, recibido_en
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000112',
      '00000000-0000-0000-0000-000000000121',
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000202',
      'entrega', 'confirmada',
      'Entrega mixta de desarrollo: 1 taladro + 1 arnes + guantes.',
      NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days',
      NULL, NULL
    ),
    (
      '00000000-0000-0000-0000-000000000802',
      '00000000-0000-0000-0000-000000000112',
      '00000000-0000-0000-0000-000000000122',
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000202',
      'entrega', 'confirmada',
      'Entrega historica para ejemplo de devolucion.',
      NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days',
      NULL, NULL
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO entrega_detalle (
    id, entrega_id, articulo_id, activo_id, lote_id, cantidad,
    tipo_item_entrega, condicion_salida, notas
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000811',
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000701',
      NULL, 1,
      'retornable', 'ok', 'Taladro para tarea en Faena Norte.'
    ),
    (
      '00000000-0000-0000-0000-000000000812',
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000402',
      '00000000-0000-0000-0000-000000000711',
      NULL, 1,
      'retornable', 'ok', 'Arnes para trabajo en altura.'
    ),
    (
      '00000000-0000-0000-0000-000000000813',
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000403',
      NULL,
      NULL, 12,
      'asignacion', 'ok', 'Guantes de cabritilla consumibles.'
    ),
    (
      '00000000-0000-0000-0000-000000000814',
      '00000000-0000-0000-0000-000000000802',
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000705',
      NULL, 1,
      'retornable', 'usado', 'Taladro entregado para trabajo puntual.'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO firma_entrega (
    id, entrega_id, trabajador_id, metodo, texto_aceptacion,
    texto_hash, firma_imagen_url, ip, user_agent, firmado_en
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000821',
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000121',
      'en_dispositivo',
      'Declaro recibir en conformidad los elementos de esta entrega.',
      'dev-seed-signature-hash-801',
      'https://example.local/signatures/dev-801.png',
      '127.0.0.1',
      'dev-seed',
      NOW() - INTERVAL '6 days'
    ),
    (
      '00000000-0000-0000-0000-000000000822',
      '00000000-0000-0000-0000-000000000802',
      '00000000-0000-0000-0000-000000000122',
      'en_dispositivo',
      'Declaro recibir en conformidad los elementos de esta entrega.',
      'dev-seed-signature-hash-802',
      'https://example.local/signatures/dev-802.png',
      '127.0.0.1',
      'dev-seed',
      NOW() - INTERVAL '14 days'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO custodia_activo (
    id, activo_id, trabajador_id, ubicacion_destino_id,
    entrega_id, desde_en, hasta_en, estado
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000831',
      '00000000-0000-0000-0000-000000000701',
      '00000000-0000-0000-0000-000000000121',
      '00000000-0000-0000-0000-000000000202',
      '00000000-0000-0000-0000-000000000801',
      NOW() - INTERVAL '6 days',
      NULL,
      'activa'
    ),
    (
      '00000000-0000-0000-0000-000000000832',
      '00000000-0000-0000-0000-000000000711',
      '00000000-0000-0000-0000-000000000121',
      '00000000-0000-0000-0000-000000000202',
      '00000000-0000-0000-0000-000000000801',
      NOW() - INTERVAL '6 days',
      NULL,
      'activa'
    ),
    (
      '00000000-0000-0000-0000-000000000833',
      '00000000-0000-0000-0000-000000000705',
      '00000000-0000-0000-0000-000000000122',
      '00000000-0000-0000-0000-000000000202',
      '00000000-0000-0000-0000-000000000802',
      NOW() - INTERVAL '14 days',
      NOW() - INTERVAL '7 days',
      'devuelta'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- DEVOLUCION DE EJEMPLO (MODELO DEVOLUCION + DETALLE)
  -- ============================================================

  INSERT INTO devolucion (
    id, trabajador_id, recibido_por_usuario_id,
    ubicacion_recepcion_id, estado, creado_en, confirmada_en, notas
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000851',
      '00000000-0000-0000-0000-000000000122',
      '00000000-0000-0000-0000-000000000112',
      '00000000-0000-0000-0000-000000000201',
      'confirmada',
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '7 days',
      'Devolucion de cierre de tarea puntual.'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO devolucion_detalle (
    id, devolucion_id, custodia_activo_id, articulo_id, activo_id,
    lote_id, cantidad, condicion_entrada, disposicion, notas
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000861',
      '00000000-0000-0000-0000-000000000851',
      '00000000-0000-0000-0000-000000000833',
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000705',
      NULL, 1, 'ok', 'devuelto',
      'Activo devuelto en buenas condiciones.'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- EGRESO CONSUMIBLE (queda remanente)
  -- ============================================================

  INSERT INTO egreso (id, creado_por_usuario_id, tipo_motivo, creado_en, notas)
  VALUES
    (
      '00000000-0000-0000-0000-000000000871',
      '00000000-0000-0000-0000-000000000112',
      'consumo',
      NOW() - INTERVAL '5 days',
      'Consumo programado para pruebas de salida de consumibles.'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO egreso_detalle (
    id, egreso_id, articulo_id, ubicacion_id,
    lote_id, cantidad, notas, activo_id
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000881',
      '00000000-0000-0000-0000-000000000871',
      '00000000-0000-0000-0000-000000000403',
      '00000000-0000-0000-0000-000000000201',
      NULL, 40,
      'Egreso de guantes para consumo general.',
      NULL
    )
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- MOVIMIENTOS (TRAZABILIDAD DEMO)
  -- ============================================================

  INSERT INTO movimiento_stock (
    id, articulo_id, lote_id, fecha_movimiento, tipo,
    ubicacion_origen_id, ubicacion_destino_id, cantidad,
    responsable_usuario_id, compra_id, entrega_id, devolucion_id, egreso_id, notas
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000941',
      '00000000-0000-0000-0000-000000000401', NULL, NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201', 5,
      '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000502', NULL, NULL, NULL,
      'Ingreso de taladros en bodega central.'
    ),
    (
      '00000000-0000-0000-0000-000000000942',
      '00000000-0000-0000-0000-000000000402', NULL, NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201', 3,
      '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000502', NULL, NULL, NULL,
      'Ingreso de arneses en bodega central.'
    ),
    (
      '00000000-0000-0000-0000-000000000943',
      '00000000-0000-0000-0000-000000000403', NULL, NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201', 200,
      '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000502', NULL, NULL, NULL,
      'Ingreso inicial de guantes de cabritilla.'
    ),
    (
      '00000000-0000-0000-0000-000000000944',
      '00000000-0000-0000-0000-000000000403', NULL, NOW() - INTERVAL '6 days', 'entrega',
      '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202', 12,
      '00000000-0000-0000-0000-000000000112', NULL, '00000000-0000-0000-0000-000000000801', NULL, NULL,
      'Salida de guantes por entrega mixta.'
    ),
    (
      '00000000-0000-0000-0000-000000000945',
      '00000000-0000-0000-0000-000000000403', NULL, NOW() - INTERVAL '5 days', 'consumo',
      '00000000-0000-0000-0000-000000000201', NULL, 40,
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000871',
      'Egreso de consumo para pruebas de remanente.'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO movimiento_activo (
    id, activo_id, fecha_movimiento, tipo,
    ubicacion_origen_id, ubicacion_destino_id,
    responsable_usuario_id, entrega_id, devolucion_id, egreso_id, notas
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000951',
      '00000000-0000-0000-0000-000000000701', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo TAL-001'
    ),
    (
      '00000000-0000-0000-0000-000000000952',
      '00000000-0000-0000-0000-000000000702', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo TAL-002'
    ),
    (
      '00000000-0000-0000-0000-000000000953',
      '00000000-0000-0000-0000-000000000703', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo TAL-003'
    ),
    (
      '00000000-0000-0000-0000-000000000954',
      '00000000-0000-0000-0000-000000000704', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo TAL-004'
    ),
    (
      '00000000-0000-0000-0000-000000000955',
      '00000000-0000-0000-0000-000000000705', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo TAL-005'
    ),
    (
      '00000000-0000-0000-0000-000000000956',
      '00000000-0000-0000-0000-000000000711', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo ARN-001'
    ),
    (
      '00000000-0000-0000-0000-000000000957',
      '00000000-0000-0000-0000-000000000712', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo ARN-002'
    ),
    (
      '00000000-0000-0000-0000-000000000958',
      '00000000-0000-0000-0000-000000000713', NOW() - INTERVAL '39 days', 'entrada',
      NULL, '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, NULL, NULL,
      'Ingreso activo ARN-003'
    ),
    (
      '00000000-0000-0000-0000-000000000959',
      '00000000-0000-0000-0000-000000000701', NOW() - INTERVAL '6 days', 'entrega',
      '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202',
      '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000801', NULL, NULL,
      'Entrega activa TAL-001 a Juan Herrera.'
    ),
    (
      '00000000-0000-0000-0000-000000000960',
      '00000000-0000-0000-0000-000000000711', NOW() - INTERVAL '6 days', 'entrega',
      '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202',
      '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000801', NULL, NULL,
      'Entrega activa ARN-001 a Juan Herrera.'
    ),
    (
      '00000000-0000-0000-0000-000000000961',
      '00000000-0000-0000-0000-000000000705', NOW() - INTERVAL '14 days', 'entrega',
      '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202',
      '00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000802', NULL, NULL,
      'Entrega historica TAL-005 a Maria Rojas.'
    ),
    (
      '00000000-0000-0000-0000-000000000962',
      '00000000-0000-0000-0000-000000000705', NOW() - INTERVAL '7 days', 'devolucion',
      '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000112', NULL, '00000000-0000-0000-0000-000000000851', NULL,
      'Devolucion confirmada TAL-005.'
    )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '009-dev-seed.sql aplicado: dataset de desarrollo listo (usuarios, inventario, entregas, devoluciones, egresos).';
END $$;