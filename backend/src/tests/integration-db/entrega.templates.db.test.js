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
  adminUserId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  adminPersonaId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  workerPersonaId1: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  workerPersonaId2: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  workerId1: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  workerId2: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
  ubicacionOrigenId: '11111111-1111-4111-8111-111111111111',
  ubicacionDestinoId: '22222222-2222-4222-8222-222222222222',
  articuloSerialId: '55555555-5555-4555-8555-555555555555',
  activoSerialId: '99999999-9999-4999-8999-999999999999',
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
      ($2, '33.333.333-3', 'Admin', 'Tester', 'admin@test.local', 'activo'),
      ($3, '22.222.222-2', 'Trabajador', 'Uno', 'worker1@test.local', 'activo'),
      ($4, '44.444.444-4', 'Trabajador', 'Dos', 'worker2@test.local', 'activo')
    `,
    [IDS.bodegaPersonaId, IDS.adminPersonaId, IDS.workerPersonaId1, IDS.workerPersonaId2]
  );

  await db.query(
    `
    INSERT INTO usuario (id, persona_id, email_login, password_hash, estado)
    VALUES
      ($1, $2, 'supervisor@test.local', 'hash', 'activo'),
      ($3, $4, 'admin@test.local', 'hash', 'activo')
    `,
    [IDS.bodegaUserId, IDS.bodegaPersonaId, IDS.adminUserId, IDS.adminPersonaId]
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
    VALUES
      ($1, $2, 'Operario', 'activo'),
      ($3, $4, 'Operario', 'activo')
    `,
    [IDS.workerId1, IDS.workerPersonaId1, IDS.workerId2, IDS.workerPersonaId2]
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
      ($1, 'herramienta', 'herramienta', 'Taladro Industrial', 'manual', 'manual', 'serial', 'retornable', 'alto', false, 'unidad', 'activo')
    `,
    [IDS.articuloSerialId]
  );

  await db.query(
    `
    INSERT INTO activo (id, articulo_id, nro_serie, codigo, estado, ubicacion_actual_id)
    VALUES ($1, $2, 'SERIAL-P2-1', 'ACT-P2-1', 'en_stock', $3)
    `,
    [IDS.activoSerialId, IDS.articuloSerialId, IDS.ubicacionOrigenId]
  );
};

maybeDescribe('Entrega templates integration with real DB', () => {
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

  it('rejects serial template item when requiere_serial is false', async () => {
    const response = await request(app)
      .post('/api/entregas/templates')
      .set('x-test-actor', 'admin')
      .send({
        nombre: 'Plantilla inválida serial',
        descripcion: 'No debe aceptar serial sin requiere_serial',
        items: [
          {
            articulo_id: IDS.articuloSerialId,
            cantidad: 1,
            requiere_serial: false,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(String(response.body.message || '')).toMatch(/requiere_serial/i);
  });

  it('creates draft from template with serial override and rejects batch creation for serial templates', async () => {
    const serialTemplateResponse = await request(app)
      .post('/api/entregas/templates')
      .set('x-test-actor', 'admin')
      .send({
        nombre: 'Plantilla Serial P2',
        descripcion: 'Template serial para pruebas',
        items: [
          {
            articulo_id: IDS.articuloSerialId,
            cantidad: 1,
            requiere_serial: true,
          },
        ],
      });

    expect(serialTemplateResponse.status).toBe(201);
    const serialTemplateId = serialTemplateResponse.body.data.id;

    const draftFromTemplateResponse = await request(app)
      .post(`/api/entregas/templates/${serialTemplateId}/create-draft`)
      .set('x-test-actor', 'supervisor')
      .send({
        trabajador_id: IDS.workerId1,
        ubicacion_origen_id: IDS.ubicacionOrigenId,
        ubicacion_destino_id: IDS.ubicacionDestinoId,
        tipo: 'entrega',
        detalles_overrides: [
          {
            articulo_id: IDS.articuloSerialId,
            activo_ids: [IDS.activoSerialId],
            condicion_salida: 'ok',
          },
        ],
      });

    expect(draftFromTemplateResponse.status).toBe(201);
    expect(draftFromTemplateResponse.body.data.estado).toBe('borrador');
    expect(draftFromTemplateResponse.body.data.detalles).toHaveLength(1);

    const serialBatchTemplateResponse = await request(app)
      .post('/api/entregas/templates')
      .set('x-test-actor', 'admin')
      .send({
        nombre: 'Plantilla Serial Batch P2',
        descripcion: 'Template serial para validar rechazo de batch',
        items: [
          {
            articulo_id: IDS.articuloSerialId,
            cantidad: 1,
            requiere_serial: true,
            notas_default: 'Debe forzar validación serial en batch',
          },
        ],
      });

    expect(serialBatchTemplateResponse.status).toBe(201);
    const serialBatchTemplateId = serialBatchTemplateResponse.body.data.id;

    const batchResponse = await request(app)
      .post(`/api/entregas/templates/${serialBatchTemplateId}/create-draft-batch`)
      .set('x-test-actor', 'supervisor')
      .send({
        trabajador_ids: [IDS.workerId1, IDS.workerId2],
        ubicacion_origen_id: IDS.ubicacionOrigenId,
        ubicacion_destino_id: IDS.ubicacionDestinoId,
        tipo: 'entrega',
        detalles_overrides: [
          {
            articulo_id: IDS.articuloSerialId,
            activo_ids: [IDS.activoSerialId],
            condicion_salida: 'ok',
          },
        ],
      });

    expect(batchResponse.status).toBe(400);
    expect(String(batchResponse.body.message || '')).toMatch(/error de validaci[oó]n|serializados/i);
    expect(JSON.stringify(batchResponse.body.errors || [])).toMatch(/serializados|activo_ids|requiere_serial/i);

    const createdDeliveriesResult = await db.query(
      `
      SELECT id, trabajador_id, estado
      FROM entrega
      WHERE creado_por_usuario_id = $1
      ORDER BY creado_en ASC
      `,
      [IDS.bodegaUserId]
    );

    expect(createdDeliveriesResult.rows.length).toBe(1);
    expect(createdDeliveriesResult.rows[0].id).toBe(draftFromTemplateResponse.body.data.id);
  });
});
