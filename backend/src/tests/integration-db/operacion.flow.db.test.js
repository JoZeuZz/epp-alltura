const request = require('supertest');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const dotenvCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '../../..', '.env'),
  path.resolve(__dirname, '../../../../.env'),
];

for (const envPath of dotenvCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const RUN_DB_INTEGRATION = process.env.RUN_INTEGRATION_DB_TESTS === 'true';
const HAS_REQUIRED_ENV =
  Boolean(process.env.DB_HOST) &&
  Boolean(process.env.DB_USER) &&
  Boolean(process.env.DB_PASSWORD) &&
  Boolean(process.env.DB_NAME) &&
  Boolean(process.env.JWT_SECRET) &&
  Boolean(process.env.JWT_REFRESH_SECRET);

let db = null;
let isDbConfigured = () => false;
let initializeSchema = async () => {};
let resetTransactionalData = async () => {};
let closeAllPools = async () => {};
let buildTestApp = () => {
  throw new Error('Integration DB test app is not initialized');
};

jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    const actor = String(req.headers['x-test-actor'] || 'supervisor').toLowerCase();

    if (actor === 'admin') {
      req.user = {
        id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
        role: 'admin',
        roles: ['admin'],
      };
      return next();
    }

    if (actor === 'unprivileged') {
      req.user = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        role: 'none',
        roles: [],
      };
      return next();
    }

    req.user = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      role: 'supervisor',
      roles: ['supervisor'],
    };
    return next();
  },
  TOKEN_CONFIG: {
    ACCESS_TOKEN_EXPIRY: '15m',
  },
}));

jest.mock('../../middleware/roles', () => {
  const normalizeRole = (role) => {
    return role === 'admin' || role === 'supervisor' ? role : null;
  };

  const checkRole = (requiredRoles) => {
    const normalizedRequired = (Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]).map(
      normalizeRole
    );

    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado',
          data: null,
          errors: ['UNAUTHENTICATED'],
        });
      }

      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
      const normalizedUserRoles = userRoles.map(normalizeRole);
      const authorized = normalizedRequired.some((role) => normalizedUserRoles.includes(role));

      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'No autorizado',
          data: null,
          errors: ['FORBIDDEN'],
        });
      }

      return next();
    };
  };

  return {
    checkRole,
    isAdmin: checkRole(['admin']),
  };
});

if (RUN_DB_INTEGRATION && HAS_REQUIRED_ENV) {
  db = require('../../db');
  ({
    isDbConfigured,
    initializeSchema,
    resetTransactionalData,
    closeAllPools,
  } = require('./helpers/dbTestHarness'));
  ({ buildTestApp } = require('./helpers/testApp'));
}

const maybeDescribe =
  RUN_DB_INTEGRATION && HAS_REQUIRED_ENV && isDbConfigured() ? describe : describe.skip;

const IDS = {
  bodegaUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  bodegaPersonaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  trabajadorUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  trabajadorPersonaId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  trabajadorId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  adminUserId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  adminPersonaId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  ubicacionOrigenId: '11111111-1111-4111-8111-111111111111',
  ubicacionDestinoId: '22222222-2222-4222-8222-222222222222',
  ubicacionRecepcionId: '33333333-3333-4333-8333-333333333333',
  proveedorId: '44444444-4444-4444-8444-444444444444',
  articuloSerialId: '55555555-5555-4555-8555-555555555555',
  articuloCantidadId: '66666666-6666-4666-8666-666666666666',
};

const findRoleId = async (roleName) => {
  const result = await db.query('SELECT id FROM rol WHERE nombre = $1 LIMIT 1', [roleName]);
  if (!result.rows.length) {
    throw new Error(`Rol ${roleName} no encontrado`);
  }
  return result.rows[0].id;
};

const seedBaseData = async () => {
  const rolSupervisor = await findRoleId('supervisor');
  const rolAdmin = await findRoleId('admin');

  await db.query(
    `
    INSERT INTO persona (id, rut, nombres, apellidos, email, estado)
    VALUES
      ($1, '11.111.111-1', 'Supervisor', 'Tester', 'supervisor@test.local', 'activo'),
      ($2, '22.222.222-2', 'Trabajador', 'Tester', 'trabajador@test.local', 'activo'),
      ($3, '33.333.333-3', 'Admin', 'Tester', 'admin@test.local', 'activo')
    `,
    [IDS.bodegaPersonaId, IDS.trabajadorPersonaId, IDS.adminPersonaId]
  );

  await db.query(
    `
    INSERT INTO usuario (id, persona_id, email_login, password_hash, estado)
    VALUES
      ($1, $2, 'supervisor@test.local', 'hash', 'activo'),
      ($3, $4, 'admin@test.local', 'hash', 'activo')
    `,
    [
      IDS.bodegaUserId,
      IDS.bodegaPersonaId,
      IDS.adminUserId,
      IDS.adminPersonaId,
    ]
  );

  await db.query(
    `
    INSERT INTO usuario_rol (usuario_id, rol_id)
    VALUES
      ($1, $2),
      ($3, $4)
    `,
    [IDS.bodegaUserId, rolSupervisor, IDS.adminUserId, rolAdmin]
  );

  await db.query(
    `
    INSERT INTO trabajador (id, persona_id, cargo, estado)
    VALUES ($1, $2, 'Operario', 'activo')
    `,
    [IDS.trabajadorId, IDS.trabajadorPersonaId]
  );

  await db.query(
    `
    INSERT INTO ubicacion (id, nombre, tipo, ubicacion_subtipo, estado)
    VALUES
      ($1, 'Bodega Central', 'bodega', 'fija', 'activo'),
      ($2, 'Faena Norte', 'planta', NULL, 'activo'),
      ($3, 'Taller Mantencion', 'taller_mantencion', NULL, 'activo')
    `,
    [IDS.ubicacionOrigenId, IDS.ubicacionDestinoId, IDS.ubicacionRecepcionId]
  );

  await db.query(
    `
    INSERT INTO proveedor (id, nombre, rut, email, estado)
    VALUES ($1, 'Proveedor Test', '76.543.210-0', 'proveedor@test.local', 'activo')
    `,
    [IDS.proveedorId]
  );

  await db.query(
    `
    INSERT INTO articulo (
      id, tipo, grupo_principal, nombre, categoria, subclasificacion,
      tracking_mode, retorno_mode, nivel_control, requiere_vencimiento, unidad_medida, estado
    )
    VALUES
      ($1, 'herramienta', 'herramienta', 'Taladro Industrial', 'manual', 'manual', 'serial', 'retornable', 'alto', false, 'unidad', 'activo'),
      ($2, 'equipo', 'equipo', 'Guante Nitrilo', 'epp', 'epp', 'lote', 'retornable', 'medio', false, 'par', 'activo')
    `,
    [IDS.articuloSerialId, IDS.articuloCantidadId]
  );
};

const createPurchase = async (app, serialCodes = ['SER-0001']) => {
  const compraResponse = await request(app)
    .post('/api/compras')
    .set('x-test-actor', 'supervisor')
    .send({
      documento_compra: {
        proveedor_id: IDS.proveedorId,
        tipo: 'factura',
        numero: `F-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        fecha: new Date().toISOString(),
      },
      detalles: [
        {
          articulo_id: IDS.articuloSerialId,
          ubicacion_id: IDS.ubicacionOrigenId,
          cantidad: serialCodes.length,
          costo_unitario: 100,
          activos: serialCodes.map((code) => ({ codigo: code })),
        },
        {
          articulo_id: IDS.articuloCantidadId,
          ubicacion_id: IDS.ubicacionOrigenId,
          cantidad: 5,
          costo_unitario: 2,
        },
      ],
    });

  expect(compraResponse.status).toBe(201);
  return compraResponse.body.data;
};

const createDeliveryWithItems = async (app, serialAssetIds, cantidad = 2) => {
  const detalles = serialAssetIds.map((assetId) => ({
    articulo_id: IDS.articuloSerialId,
    activo_ids: [assetId],
    condicion_salida: 'ok',
  }));

  if (cantidad > 0) {
    detalles.push({
      articulo_id: IDS.articuloCantidadId,
      cantidad,
      condicion_salida: 'ok',
    });
  }

  const entregaResponse = await request(app)
    .post('/api/entregas')
    .set('x-test-actor', 'supervisor')
    .send({
      trabajador_id: IDS.trabajadorId,
      ubicacion_origen_id: IDS.ubicacionOrigenId,
      ubicacion_destino_id: IDS.ubicacionDestinoId,
      tipo: 'entrega',
      detalles,
    });

  if (entregaResponse.status !== 201) {
    throw new Error(
      `createDeliveryWithItems expected 201, got ${entregaResponse.status}: ${JSON.stringify(entregaResponse.body)}`
    );
  }
  return entregaResponse.body.data;
};

const signDeliveryInDevice = async (app, entregaId, actor = 'supervisor') => {
  const response = await request(app)
    .post(`/api/firmas/entregas/${entregaId}/firmar-dispositivo`)
    .set('x-test-actor', actor)
    .send({
      firma_imagen_url: 'https://example.com/signatures/firma.png',
      texto_aceptacion: 'Acepto recepción de activos y custodia responsable para uso operacional.',
    });

  expect(response.status).toBe(201);
  return response.body.data;
};

const signReturnInDevice = async (app, devolucionId, actor = 'supervisor') => {
  const response = await request(app)
    .post(`/api/devoluciones/${devolucionId}/firmar-dispositivo`)
    .set('x-test-actor', actor)
    .send({
      firma_imagen_url: 'https://example.com/signatures/firma-devolucion.png',
      texto_aceptacion: 'Declaro recepcionar la devolución y validar la condición de entrada.',
    });

  expect(response.status).toBe(201);
  return response.body.data;
};

maybeDescribe('Flujo operativo integration with real DB', () => {
  let app;

  beforeAll(async () => {
    await initializeSchema();
    app = buildTestApp();
  });

  beforeEach(async () => {
    await resetTransactionalData();
    await seedBaseData();
  });

  afterAll(async () => {
    await closeAllPools();
  });

  it('runs full happy flow compra -> entrega -> firma -> confirmacion -> devolucion', async () => {
    const compra = await createPurchase(app, ['SER-HAPPY-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    expect(serialDetail).toBeTruthy();
    const serialAssetId = serialDetail.activos[0].id;

    const entrega = await createDeliveryWithItems(app, [serialAssetId], 0);
    await signDeliveryInDevice(app, entrega.id, 'supervisor');

    const confirmEntregaResponse = await request(app)
      .post(`/api/entregas/${entrega.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    if (confirmEntregaResponse.status !== 200) {
      throw new Error(
        `confirm entrega expected 200, got ${confirmEntregaResponse.status}: ${JSON.stringify(confirmEntregaResponse.body)}`
      );
    }
    expect(confirmEntregaResponse.body.data.estado).toBe('confirmada');

    const devolucionDraftResponse = await request(app)
      .post('/api/devoluciones')
      .set('x-test-actor', 'supervisor')
      .send({
        trabajador_id: IDS.trabajadorId,
        ubicacion_recepcion_id: IDS.ubicacionRecepcionId,
        detalles: [
          {
            activo_ids: [serialAssetId],
            cantidad: 1,
            condicion_entrada: 'ok',
            disposicion: 'devuelto',
          },
        ],
      });

    expect(devolucionDraftResponse.status).toBe(201);

    const devolucionId = devolucionDraftResponse.body.data.id;
    await signReturnInDevice(app, devolucionId, 'supervisor');

    const confirmDevolucionResponse = await request(app)
      .post(`/api/devoluciones/${devolucionId}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(confirmDevolucionResponse.status).toBe(200);
    expect(confirmDevolucionResponse.body.data.estado).toBe('confirmada');

    const custodiaResult = await db.query(
      'SELECT estado, hasta_en FROM custodia_activo WHERE activo_id = $1 ORDER BY desde_en DESC LIMIT 1',
      [serialAssetId]
    );
    expect(custodiaResult.rows[0].estado).toBe('devuelta');
    expect(custodiaResult.rows[0].hasta_en).not.toBeNull();

    const activoResult = await db.query(
      'SELECT estado, ubicacion_actual_id FROM activo WHERE id = $1',
      [serialAssetId]
    );
    expect(activoResult.rows[0].estado).toBe('en_stock');
    expect(activoResult.rows[0].ubicacion_actual_id).toBe(IDS.ubicacionRecepcionId);

    const movActivoResult = await db.query(
      'SELECT tipo FROM movimiento_activo WHERE activo_id = $1 ORDER BY fecha_movimiento ASC',
      [serialAssetId]
    );
    const movActivoTipos = movActivoResult.rows.map((row) => row.tipo);
    expect(movActivoTipos).toContain('entrega');
    expect(movActivoTipos).toContain('devolucion');

    const firmaResult = await db.query(
      'SELECT firma_imagen_url, texto_hash FROM firma_entrega WHERE entrega_id = $1',
      [entrega.id]
    );
    expect(firmaResult.rows.length).toBe(1);
    expect(firmaResult.rows[0].firma_imagen_url).toBe('https://example.com/signatures/firma.png');
    expect(firmaResult.rows[0].texto_hash).toBeTruthy();
  });

  it('returns validation error when confirming an entrega without signature', async () => {
    const compra = await createPurchase(app, ['SER-NO-SIGN-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const entrega = await createDeliveryWithItems(app, [serialDetail.activos[0].id], 0);

    const response = await request(app)
      .post(`/api/entregas/${entrega.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/sin una firma|estado "borrador"/i);
  });

  it('returns validation error when confirming a devolucion without return signature', async () => {
    const compra = await createPurchase(app, ['SER-RET-NO-SIGN-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const serialAssetId = serialDetail.activos[0].id;

    const entrega = await createDeliveryWithItems(app, [serialAssetId], 0);
    await signDeliveryInDevice(app, entrega.id, 'supervisor');

    const confirmEntregaResponse = await request(app)
      .post(`/api/entregas/${entrega.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(confirmEntregaResponse.status).toBe(200);

    const devolucionDraftResponse = await request(app)
      .post('/api/devoluciones')
      .set('x-test-actor', 'supervisor')
      .send({
        trabajador_id: IDS.trabajadorId,
        ubicacion_recepcion_id: IDS.ubicacionRecepcionId,
        detalles: [
          {
            activo_ids: [serialAssetId],
            cantidad: 1,
            condicion_entrada: 'ok',
            disposicion: 'devuelto',
          },
        ],
      });

    expect(devolucionDraftResponse.status).toBe(201);

    const response = await request(app)
      .post(`/api/devoluciones/${devolucionDraftResponse.body.data.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/sin una firma|estado "borrador"/i);
  });

  it('returns items count in list and signature/details in entrega detail', async () => {
    const compra = await createPurchase(app, ['SER-DETAIL-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const serialAssetId = serialDetail.activos[0].id;

    const entrega = await createDeliveryWithItems(app, [serialAssetId], 0);
    await signDeliveryInDevice(app, entrega.id, 'supervisor');

    const confirmEntregaResponse = await request(app)
      .post(`/api/entregas/${entrega.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(confirmEntregaResponse.status).toBe(200);

    const listResponse = await request(app)
      .get('/api/entregas')
      .set('x-test-actor', 'admin');

    expect(listResponse.status).toBe(200);
    const listedEntrega = listResponse.body.data.find((row) => row.id === entrega.id);
    expect(listedEntrega).toBeTruthy();
    expect(listedEntrega.cantidad_items).toBeGreaterThan(0);

    const detailResponse = await request(app)
      .get(`/api/entregas/${entrega.id}`)
      .set('x-test-actor', 'admin');

    expect(detailResponse.status).toBe(200);
    expect(Array.isArray(detailResponse.body.data.detalles)).toBe(true);
    expect(detailResponse.body.data.detalles.length).toBeGreaterThan(0);
    expect(detailResponse.body.data.firma_imagen_url).toBe('https://example.com/signatures/firma.png');
    expect(detailResponse.body.data.firmado_en).toBeTruthy();
  });

  it('lists serial assets available for delivery selector and eligible assets for return selector', async () => {
    const compra = await createPurchase(app, ['SER-SELECTOR-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const serialAssetId = serialDetail.activos[0].id;

    const availableAssetsResponse = await request(app)
      .get('/api/inventario/activos-disponibles')
      .set('x-test-actor', 'supervisor')
      .query({
        articulo_id: IDS.articuloSerialId,
        ubicacion_id: IDS.ubicacionOrigenId,
        limit: 25,
      });

    expect(availableAssetsResponse.status).toBe(200);
    expect(Array.isArray(availableAssetsResponse.body.data)).toBe(true);

    const foundAvailable = availableAssetsResponse.body.data.some((row) => row.id === serialAssetId);
    expect(foundAvailable).toBe(true);

    const entrega = await createDeliveryWithItems(app, [serialAssetId], 0);
    await signDeliveryInDevice(app, entrega.id, 'supervisor');

    const confirmEntregaResponse = await request(app)
      .post(`/api/entregas/${entrega.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(confirmEntregaResponse.status).toBe(200);

    const eligibleReturnResponse = await request(app)
      .get('/api/devoluciones/activos-elegibles')
      .set('x-test-actor', 'supervisor')
      .query({
        trabajador_id: IDS.trabajadorId,
        articulo_id: IDS.articuloSerialId,
        limit: 25,
      });

    expect(eligibleReturnResponse.status).toBe(200);
    expect(Array.isArray(eligibleReturnResponse.body.data)).toBe(true);

    const foundEligible = eligibleReturnResponse.body.data.some((row) => row.activo_id === serialAssetId);
    expect(foundEligible).toBe(true);
  });

  it('enforces one-time token usage for signature links', async () => {
    const compra = await createPurchase(app, ['SER-TOKEN-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const entrega = await createDeliveryWithItems(app, [serialDetail.activos[0].id], 0);

    const tokenResponse = await request(app)
      .post(`/api/firmas/entregas/${entrega.id}/token`)
      .set('x-test-actor', 'supervisor')
      .send({ expira_minutos: 60 });

    expect(tokenResponse.status).toBe(201);
    const { token } = tokenResponse.body.data;
    expect(token).toBeTruthy();

    const firstUseResponse = await request(app)
      .post(`/api/firmas/tokens/${token}/firmar`)
      .send({
        firma_imagen_url: 'https://example.com/signatures/firma-token.png',
        texto_aceptacion: 'Acepto recepción con token y asumo custodia de activos.',
      });

    if (firstUseResponse.status !== 201) {
      throw new Error(
        `first token signature expected 201, got ${firstUseResponse.status}: ${JSON.stringify(firstUseResponse.body)}`
      );
    }

    const secondUseResponse = await request(app)
      .post(`/api/firmas/tokens/${token}/firmar`)
      .send({
        firma_imagen_url: 'https://example.com/signatures/firma-token-2.png',
        texto_aceptacion: 'Segundo intento no permitido por token de un solo uso.',
      });

    expect(secondUseResponse.status).toBe(409);
    expect(secondUseResponse.body.message).toMatch(/ya fue utilizado/i);

    const tokenDb = await db.query(
      'SELECT usado_en FROM firma_token WHERE token_hash IS NOT NULL ORDER BY expira_en DESC LIMIT 1'
    );
    expect(tokenDb.rows[0].usado_en).not.toBeNull();
  });

  it('applies devolucion dispositions and verifies custody, asset state and movement types', async () => {
    const compra = await createPurchase(app, [
      'SER-DISP-01',
      'SER-DISP-02',
      'SER-DISP-03',
      'SER-DISP-04',
    ]);

    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const assetIds = serialDetail.activos.map((item) => item.id);

    const entrega = await createDeliveryWithItems(app, assetIds, 0);
    await signDeliveryInDevice(app, entrega.id, 'supervisor');

    const confirmEntregaResponse = await request(app)
      .post(`/api/entregas/${entrega.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    if (confirmEntregaResponse.status !== 200) {
      throw new Error(
        `confirm entrega before devolucion expected 200, got ${confirmEntregaResponse.status}: ${JSON.stringify(confirmEntregaResponse.body)}`
      );
    }

    const dispositionMap = [
      { assetId: assetIds[0], disposicion: 'devuelto', custodia: 'devuelta', activo: 'en_stock', mov: 'devolucion' },
      { assetId: assetIds[1], disposicion: 'perdido', custodia: 'perdida', activo: 'perdido', mov: 'ajuste' },
      { assetId: assetIds[2], disposicion: 'baja', custodia: 'baja', activo: 'dado_de_baja', mov: 'baja' },
      { assetId: assetIds[3], disposicion: 'mantencion', custodia: 'mantencion', activo: 'mantencion', mov: 'mantencion' },
    ];

    const devolucionDraftResponse = await request(app)
      .post('/api/devoluciones')
      .set('x-test-actor', 'supervisor')
      .send({
        trabajador_id: IDS.trabajadorId,
        ubicacion_recepcion_id: IDS.ubicacionRecepcionId,
        detalles: dispositionMap.map((entry) => ({
          activo_ids: [entry.assetId],
          cantidad: 1,
          condicion_entrada: 'ok',
          disposicion: entry.disposicion,
        })),
      });

    expect(devolucionDraftResponse.status).toBe(201);
    const devolucionId = devolucionDraftResponse.body.data.id;
    await signReturnInDevice(app, devolucionId, 'supervisor');

    const confirmDevolucionResponse = await request(app)
      .post(`/api/devoluciones/${devolucionId}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(confirmDevolucionResponse.status).toBe(200);

    for (const entry of dispositionMap) {
      const custodiaRow = await db.query(
        'SELECT estado, hasta_en FROM custodia_activo WHERE activo_id = $1 ORDER BY desde_en DESC LIMIT 1',
        [entry.assetId]
      );
      expect(custodiaRow.rows[0].estado).toBe(entry.custodia);
      expect(custodiaRow.rows[0].hasta_en).not.toBeNull();

      const activoRow = await db.query(
        'SELECT estado, ubicacion_actual_id FROM activo WHERE id = $1',
        [entry.assetId]
      );
      expect(activoRow.rows[0].estado).toBe(entry.activo);

      if (entry.disposicion === 'devuelto' || entry.disposicion === 'mantencion') {
        expect(activoRow.rows[0].ubicacion_actual_id).toBe(IDS.ubicacionRecepcionId);
      } else {
        expect(activoRow.rows[0].ubicacion_actual_id).toBe(IDS.ubicacionDestinoId);
      }

      const movementRow = await db.query(
        'SELECT tipo FROM movimiento_activo WHERE activo_id = $1 AND devolucion_id = $2 ORDER BY fecha_movimiento DESC LIMIT 1',
        [entry.assetId, devolucionId]
      );
      expect(movementRow.rows[0].tipo).toBe(entry.mov);
    }
  });

  it('creates and deletes serial egreso using activo_ids with asset rollback', async () => {
    const compra = await createPurchase(app, ['SER-EGRESO-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const serialAssetId = serialDetail.activos[0].id;

    const createEgresoResponse = await request(app)
      .post('/api/inventario/egresos')
      .set('x-test-actor', 'admin')
      .send({
        tipo_motivo: 'baja',
        notas: 'Baja técnica por prueba de integración',
        detalles: [
          {
            articulo_id: IDS.articuloSerialId,
            ubicacion_id: IDS.ubicacionOrigenId,
            activo_ids: [serialAssetId],
            notas: 'Activo unitario egresado',
          },
        ],
      });

    if (createEgresoResponse.status !== 201) {
      throw new Error(
        `create serial egreso expected 201, got ${createEgresoResponse.status}: ${JSON.stringify(createEgresoResponse.body)}`
      );
    }
    const egresoId = createEgresoResponse.body.data.id;

    const activoAfterEgreso = await db.query(
      'SELECT estado FROM activo WHERE id = $1',
      [serialAssetId]
    );
    expect(activoAfterEgreso.rows[0].estado).toBe('dado_de_baja');

    const movActivo = await db.query(
      'SELECT tipo FROM movimiento_activo WHERE egreso_id = $1 AND activo_id = $2 ORDER BY fecha_movimiento DESC LIMIT 1',
      [egresoId, serialAssetId]
    );
    expect(movActivo.rows[0].tipo).toBe('baja');

    const deleteEgresoResponse = await request(app)
      .delete(`/api/inventario/egresos/${egresoId}`)
      .set('x-test-actor', 'admin')
      .send();

    expect(deleteEgresoResponse.status).toBe(200);

    const activoAfterDelete = await db.query(
      'SELECT estado FROM activo WHERE id = $1',
      [serialAssetId]
    );
    expect(activoAfterDelete.rows[0].estado).toBe('en_stock');
  });

  it('allows admin to undo confirmed entrega and restores stock/custody/asset location', async () => {
    const compra = await createPurchase(app, ['SER-UNDO-01']);
    const serialDetail = compra.detalles.find((item) => item.articulo_id === IDS.articuloSerialId);
    const serialAssetId = serialDetail.activos[0].id;

    const entrega = await createDeliveryWithItems(app, [serialAssetId], 0);
    await signDeliveryInDevice(app, entrega.id, 'supervisor');

    const confirmEntregaResponse = await request(app)
      .post(`/api/entregas/${entrega.id}/confirm`)
      .set('x-test-actor', 'supervisor')
      .send();

    expect(confirmEntregaResponse.status).toBe(200);
    expect(confirmEntregaResponse.body.data.estado).toBe('confirmada');

    const undoResponse = await request(app)
      .post(`/api/entregas/${entrega.id}/deshacer`)
      .set('x-test-actor', 'admin')
      .send({ motivo: 'Error de despacho en bodega central.' });

    expect(undoResponse.status).toBe(200);
    expect(undoResponse.body.data.estado).toBe('revertida_admin');

    const custodyRow = await db.query(
      'SELECT estado, hasta_en FROM custodia_activo WHERE activo_id = $1 ORDER BY desde_en DESC LIMIT 1',
      [serialAssetId]
    );
    expect(custodyRow.rows[0].estado).toBe('devuelta');
    expect(custodyRow.rows[0].hasta_en).not.toBeNull();

    const assetRow = await db.query(
      'SELECT estado, ubicacion_actual_id FROM activo WHERE id = $1',
      [serialAssetId]
    );
    expect(assetRow.rows[0].estado).toBe('en_stock');
    expect(assetRow.rows[0].ubicacion_actual_id).toBe(IDS.ubicacionOrigenId);

    const activosEnStockResponse = await request(app)
      .get('/api/inventario/activos')
      .set('x-test-actor', 'admin')
      .query({
        articulo_id: IDS.articuloSerialId,
        ubicacion_id: IDS.ubicacionOrigenId,
        estado: 'en_stock',
        limit: 25,
      });

    expect(activosEnStockResponse.status).toBe(200);
    const serialVisible = activosEnStockResponse.body.data.some((row) => row.id === serialAssetId);
    expect(serialVisible).toBe(true);
  });

  it('does not expose removed authenticated worker custody endpoint', async () => {
    const response = await request(app)
      .get('/api/devoluciones/mis-custodias/activos')
      .set('x-test-actor', 'supervisor');

    expect(response.status).toBe(404);
  });

  it('rejects draft devolucion when detalle references non-serial article without activo_ids', async () => {
    const response = await request(app)
      .post('/api/devoluciones')
      .set('x-test-actor', 'supervisor')
      .send({
        trabajador_id: IDS.trabajadorId,
        ubicacion_recepcion_id: IDS.ubicacionRecepcionId,
        detalles: [
          {
            articulo_id: IDS.articuloCantidadId,
            cantidad: 1,
            condicion_entrada: 'ok',
            disposicion: 'devuelto',
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/error de validaci[oó]n|activo_ids|serial/i);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/activo_ids|serial/i);
  });

  it('requires trabajador_id when listing eligible assets for return', async () => {
    const response = await request(app)
      .get('/api/devoluciones/activos-elegibles')
      .set('x-test-actor', 'supervisor');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/trabajador_id/i);
  });
});
