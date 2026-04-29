jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    const actor = String(req.headers['x-test-actor'] || 'supervisor').toLowerCase();

    if (actor === 'admin') {
      req.user = {
        id: 'user-admin-1',
        role: 'admin',
        roles: ['admin'],
      };
      return next();
    }

    if (actor === 'unprivileged') {
      req.user = {
        id: 'user-unprivileged-1',
        role: 'none',
        roles: [],
      };
      return next();
    }

    req.user = {
      id: 'user-supervisor-1',
      role: 'supervisor',
      roles: ['supervisor'],
    };
    return next();
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

jest.mock('../../services/entregas.service', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  confirm: jest.fn(),
}));

jest.mock('../../services/firmas.service', () => ({
  generateToken: jest.fn(),
  createSignatureInDevice: jest.fn(),
  getTokenInfo: jest.fn(),
  consumeTokenAndSign: jest.fn(),
  getPendingDeliveriesForUser: jest.fn(),
}));

jest.mock('../../services/devoluciones.service', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  confirm: jest.fn(),
  getActiveCustodiasForUser: jest.fn(),
}));

jest.mock('../../services/dashboard.service', () => ({
  getDashboardSummary: jest.fn(),
  getOperationalIndicators: jest.fn(),
  getLocationDashboardSummary: jest.fn(),
}));

jest.mock('../../services/inventario.service', () => ({
  getStock: jest.fn(),
  getStockMovements: jest.fn(),
  getAssetMovements: jest.fn(),
  getAuditoria: jest.fn(),
  getIngresos: jest.fn(),
  createIngreso: jest.fn(),
  createEgreso: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  requestLogger: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middleware/errorHandler');
const entregasRoutes = require('../../routes/entregas.routes');
const firmasRoutes = require('../../routes/firmas.routes');
const devolucionesRoutes = require('../../routes/devoluciones.routes');
const dashboardRoutes = require('../../routes/dashboard.routes');
const inventarioRoutes = require('../../routes/inventario.routes');
const EntregasService = require('../../services/entregas.service');
const FirmasService = require('../../services/firmas.service');
const DevolucionesService = require('../../services/devoluciones.service');
const DashboardService = require('../../services/dashboard.service');
const InventarioService = require('../../services/inventario.service');

describe('Operación API Route Integration', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/entregas', entregasRoutes);
    app.use('/api/firmas', firmasRoutes);
    app.use('/api/devoluciones', devolucionesRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/inventario', inventarioRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an entrega and returns standardized response envelope', async () => {
    EntregasService.create.mockResolvedValue({
      id: 'entrega-1',
      estado: 'borrador',
      detalles: [],
    });

    const app = buildApp();

    const response = await request(app).post('/api/entregas').send({
      trabajador_id: '11111111-1111-4111-8111-111111111111',
      ubicacion_origen_id: '22222222-2222-4222-8222-222222222222',
      ubicacion_destino_id: '33333333-3333-4333-8333-333333333333',
      tipo: 'entrega',
      detalles: [
        {
          articulo_id: '44444444-4444-4444-8444-444444444444',
          cantidad: 1,
          condicion_salida: 'ok',
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Entrega creada correctamente');
    expect(response.body.data.id).toBe('entrega-1');
  });

  it('returns validation error envelope for invalid entrega payload', async () => {
    const app = buildApp();

    const response = await request(app).post('/api/entregas').send({
      tipo: 'entrega',
      detalles: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Error de validación');
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('rejects entrega payload when tipo is different from entrega', async () => {
    const app = buildApp();

    const response = await request(app).post('/api/entregas').send({
      trabajador_id: '11111111-1111-4111-8111-111111111111',
      ubicacion_origen_id: '22222222-2222-4222-8222-222222222222',
      ubicacion_destino_id: '33333333-3333-4333-8333-333333333333',
      tipo: 'traslado',
      detalles: [
        {
          articulo_id: '44444444-4444-4444-8444-444444444444',
          cantidad: 1,
          condicion_salida: 'ok',
        },
      ],
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Error de validación');
    expect(JSON.stringify(response.body.errors || [])).toMatch(/tipo/i);
  });

  it('consumes firma token route and returns standardized success envelope', async () => {
    FirmasService.consumeTokenAndSign.mockResolvedValue({
      id: 'firma-1',
      entrega_id: 'entrega-1',
      token_consumido: true,
    });

    const app = buildApp();

    const response = await request(app).post('/api/firmas/tokens/token-demo/firmar').send({
      firma_imagen_url: 'https://example.com/signature.png',
      texto_aceptacion: 'Acepto recibir el equipo y mantener su custodia.',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('firma-1');
  });

  it('returns business error envelope when devolucion confirm fails', async () => {
    const businessError = new Error('La devolución no tiene detalles');
    businessError.statusCode = 409;
    DevolucionesService.confirm.mockRejectedValue(businessError);

    const app = buildApp();

    const response = await request(app).post('/api/devoluciones/devolucion-1/confirm').send();

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('La devolución no tiene detalles');
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('returns canonical dashboard indicators', async () => {
    const indicatorsPayload = {
      periodo: '30d',
      movimientos_stock: { total: 10 },
      movimientos_activo: { total: 7 },
    };
    DashboardService.getOperationalIndicators.mockResolvedValue(indicatorsPayload);

    const app = buildApp();

    const canonical = await request(app).get('/api/dashboard/indicadores-operativos');
    expect(canonical.status).toBe(200);
    expect(canonical.body.success).toBe(true);
    expect(canonical.body.data).toEqual(indicatorsPayload);
  });

  it('returns canonical location summary', async () => {
    const locationPayload = {
      ubicacion_id: '11111111-1111-4111-8111-111111111111',
      stock: { registros_stock: 3 },
      activos: { total: 2 },
      entregas: { total: 1 },
    };
    DashboardService.getLocationDashboardSummary.mockResolvedValue(locationPayload);

    const app = buildApp();

    const canonical = await request(app).get(
      '/api/dashboard/ubicaciones/11111111-1111-4111-8111-111111111111/resumen'
    );
    expect(canonical.status).toBe(200);
    expect(canonical.body.success).toBe(true);
    expect(canonical.body.data).toEqual(locationPayload);
  });

  it('returns 404 for removed legacy dashboard aliases', async () => {
    const app = buildApp();

    const oldIndicators = await request(app).get('/api/dashboard/cubic-meters');
    const oldProjectSummary = await request(app).get(
      '/api/dashboard/project/11111111-1111-4111-8111-111111111111'
    );

    expect(oldIndicators.status).toBe(404);
    expect(oldProjectSummary.status).toBe(404);
  });

  it('returns 404 for removed legacy entrega receive endpoint', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/entregas/11111111-1111-4111-8111-111111111111/recibir-traslado')
      .send();

    expect(response.status).toBe(404);
  });

  it('creates inventory ingreso without documento and returns standardized envelope', async () => {
    InventarioService.createIngreso.mockResolvedValue({
      id: 'compra-1',
      documento_compra_id: null,
      detalles: [{ id: 'detalle-1' }],
    });

    const app = buildApp();

    const response = await request(app).post('/api/inventario/ingresos').send({
      fecha_ingreso: '2026-02-12T00:00:00.000Z',
      notas: 'Ingreso manual de prueba',
      detalles: [
        {
          articulo_id: '44444444-4444-4444-8444-444444444444',
          ubicacion_id: '33333333-3333-4333-8333-333333333333',
          cantidad: 3,
          costo_unitario: 1000,
        },
      ],
    }).set('x-test-actor', 'admin');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Ingreso de inventario registrado correctamente');
    expect(response.body.data.id).toBe('compra-1');
  });

  it('rejects multipart ingreso with document file but missing metadata', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/inventario/ingresos')
      .set('x-test-actor', 'admin')
      .field(
        'payload_json',
        JSON.stringify({
          fecha_ingreso: '2026-02-12T00:00:00.000Z',
          detalles: [
            {
              articulo_id: '44444444-4444-4444-8444-444444444444',
              ubicacion_id: '33333333-3333-4333-8333-333333333333',
              cantidad: 1,
              costo_unitario: 1000,
            },
          ],
        })
      )
      .attach('documento_archivo', Buffer.from('%PDF-1.4\n%EOF\n', 'utf8'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('documento_compra');
  });

  it('rejects egreso payload when tipo_motivo is consumo', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/inventario/egresos')
      .set('x-test-actor', 'admin')
      .send({
        tipo_motivo: 'consumo',
        notas: 'No permitido en contrato canónico',
        detalles: [
          {
            articulo_id: '44444444-4444-4444-8444-444444444444',
            ubicacion_id: '33333333-3333-4333-8333-333333333333',
            cantidad: 1,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Error de validación');
    expect(JSON.stringify(response.body.errors || [])).toMatch(/tipo_motivo|consumo/i);
  });

  it('returns 403 when unprivileged actor tries to create egreso', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/inventario/egresos')
      .set('x-test-actor', 'unprivileged')
      .send({
        tipo_motivo: 'baja',
        notas: 'Intento sin permisos',
        detalles: [
          {
            articulo_id: '44444444-4444-4444-8444-444444444444',
            ubicacion_id: '33333333-3333-4333-8333-333333333333',
            cantidad: 1,
          },
        ],
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No autorizado');
  });
});
