jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = {
      id: 'user-1',
      role: 'bodega',
      roles: ['bodega'],
    };
    next();
  },
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: () => (_req, _res, next) => next(),
  isAdmin: (_req, _res, next) => next(),
}));

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
const EntregasService = require('../../services/entregas.service');
const FirmasService = require('../../services/firmas.service');
const DevolucionesService = require('../../services/devoluciones.service');
const DashboardService = require('../../services/dashboard.service');

describe('EPP API Route Integration', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/entregas', entregasRoutes);
    app.use('/api/firmas', firmasRoutes);
    app.use('/api/devoluciones', devolucionesRoutes);
    app.use('/api/dashboard', dashboardRoutes);
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

  it('returns canonical dashboard indicators and legacy alias with deprecation header', async () => {
    const indicatorsPayload = {
      periodo: '30d',
      movimientos_stock: { total: 10 },
      movimientos_activo: { total: 7 },
    };
    DashboardService.getOperationalIndicators.mockResolvedValue(indicatorsPayload);

    const app = buildApp();

    const canonical = await request(app).get('/api/dashboard/indicadores-operativos');
    const legacy = await request(app).get('/api/dashboard/cubic-meters');

    expect(canonical.status).toBe(200);
    expect(canonical.body.success).toBe(true);
    expect(canonical.body.data).toEqual(indicatorsPayload);

    expect(legacy.status).toBe(200);
    expect(legacy.body.success).toBe(true);
    expect(legacy.body.data).toEqual(indicatorsPayload);
    expect(legacy.headers['x-deprecated-endpoint']).toBe('true');
  });

  it('returns canonical location summary and legacy alias with deprecation header', async () => {
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
    const legacy = await request(app).get(
      '/api/dashboard/project/11111111-1111-4111-8111-111111111111'
    );

    expect(canonical.status).toBe(200);
    expect(canonical.body.success).toBe(true);
    expect(canonical.body.data).toEqual(locationPayload);

    expect(legacy.status).toBe(200);
    expect(legacy.body.success).toBe(true);
    expect(legacy.body.data).toEqual(locationPayload);
    expect(legacy.headers['x-deprecated-endpoint']).toBe('true');
  });
});
