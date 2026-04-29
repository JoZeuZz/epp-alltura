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

    if (actor === 'trabajador' || actor === 'worker' || actor === 'client') {
      req.user = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        role: 'worker',
        roles: ['worker', 'trabajador', 'client'],
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
  articuloCantidadId: '66666666-6666-4666-8666-666666666666',
  activoSerialId: '77777777-7777-4777-8777-777777777777',
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
      ($2, 'Faena Norte', 'planta', NULL, 'activo')
    `,
    [IDS.ubicacionOrigenId, IDS.ubicacionDestinoId]
  );

  await db.query(
    `
    INSERT INTO articulo (
      id, tipo, grupo_principal, nombre, categoria, subclasificacion,
      tracking_mode, retorno_mode, nivel_control, requiere_vencimiento, unidad_medida, estado
    )
    VALUES
      ($1, 'equipo', 'equipo', 'Arnés Dieléctrico', 'epp', 'epp', 'serial', 'retornable', 'alto', true, 'unidad', 'activo')
    `,
    [IDS.articuloCantidadId]
  );

  await db.query(
    `
    INSERT INTO activo (id, articulo_id, nro_serie, codigo, estado, ubicacion_actual_id)
    VALUES ($1, $2, 'SER-ACTA-0001', 'ACT-ACTA-0001', 'en_stock', $3)
    `,
    [IDS.activoSerialId, IDS.articuloCantidadId, IDS.ubicacionOrigenId]
  );
};

const createDeliveryDraft = async (app) => {
  const response = await request(app)
    .post('/api/entregas')
    .set('x-test-actor', 'supervisor')
    .send({
      trabajador_id: IDS.trabajadorId,
      ubicacion_origen_id: IDS.ubicacionOrigenId,
      ubicacion_destino_id: IDS.ubicacionDestinoId,
      tipo: 'entrega',
      detalles: [
        {
          articulo_id: IDS.articuloCantidadId,
          activo_ids: [IDS.activoSerialId],
          condicion_salida: 'ok',
        },
      ],
    });

  expect(response.status).toBe(201);
  return response.body.data;
};

const signDelivery = async (app, entregaId) => {
  const response = await request(app)
    .post(`/api/firmas/entregas/${entregaId}/firmar-dispositivo`)
    .set('x-test-actor', 'supervisor')
    .send({
      firma_imagen_url: 'https://example.com/signatures/firma.png',
      texto_aceptacion: 'Acepto recepción para la entrega de prueba de acta PDF.',
    });

  expect(response.status).toBe(201);
};

maybeDescribe('Entrega acta PDF and anexos integration', () => {
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

  it('generates acta_entrega, stores hash, and reuses existing document on second call', async () => {
    const entrega = await createDeliveryDraft(app);
    await signDelivery(app, entrega.id);

    const firstCall = await request(app)
      .get(`/api/entregas/${entrega.id}/acta`)
      .set('x-test-actor', 'supervisor');

    expect(firstCall.status).toBe(200);
    expect(firstCall.body.data.tipo).toBe('acta_entrega');
    expect(firstCall.body.data.archivo_hash).toMatch(/^[a-f0-9]{64}$/);

    const secondCall = await request(app)
      .get(`/api/entregas/${entrega.id}/acta`)
      .set('x-test-actor', 'supervisor');

    expect(secondCall.status).toBe(200);
    expect(secondCall.body.data.documento_id).toBe(firstCall.body.data.documento_id);

    const docsResult = await db.query(
      `
      SELECT COUNT(*)::int AS total
      FROM documento d
      INNER JOIN documento_referencia dr ON dr.documento_id = d.id
      WHERE d.tipo = 'acta_entrega'
        AND dr.entidad_tipo = 'entrega'
        AND dr.entidad_id = $1
      `,
      [entrega.id]
    );

    expect(docsResult.rows[0].total).toBe(1);
  });

  it('rejects acta access for worker role', async () => {
    const entrega = await createDeliveryDraft(app);

    const response = await request(app)
      .get(`/api/entregas/${entrega.id}/acta`)
      .set('x-test-actor', 'trabajador');

    expect(response.status).toBe(403);
  });

  it('creates anexo and validates mime and size constraints', async () => {
    const entrega = await createDeliveryDraft(app);

    const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8');
    const createAnexoResponse = await request(app)
      .post('/api/documentos/anexos')
      .set('x-test-actor', 'supervisor')
      .field('entidad_tipo', 'entrega')
      .field('entidad_id', entrega.id)
      .field('tipo', 'informe')
      .attach('archivo', validPdf, {
        filename: 'anexo.pdf',
        contentType: 'application/pdf',
      });

    expect(createAnexoResponse.status).toBe(201);
    expect(createAnexoResponse.body.data.archivo_hash).toMatch(/^[a-f0-9]{64}$/);

    const badMimeResponse = await request(app)
      .post('/api/documentos/anexos')
      .set('x-test-actor', 'supervisor')
      .field('entidad_tipo', 'entrega')
      .field('entidad_id', entrega.id)
      .field('tipo', 'informe')
      .attach('archivo', Buffer.from('no-pdf', 'utf8'), {
        filename: 'anexo.txt',
        contentType: 'text/plain',
      });

    expect(badMimeResponse.status).toBe(400);

    const tooLargePdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n', 'utf8'),
      Buffer.alloc(26 * 1024 * 1024, 0x20),
    ]);

    const largeFileResponse = await request(app)
      .post('/api/documentos/anexos')
      .set('x-test-actor', 'supervisor')
      .field('entidad_tipo', 'entrega')
      .field('entidad_id', entrega.id)
      .field('tipo', 'informe')
      .attach('archivo', tooLargePdf, {
        filename: 'anexo-grande.pdf',
        contentType: 'application/pdf',
      });

    expect(largeFileResponse.status).toBe(413);
  });
});
