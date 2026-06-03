jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { id: 'user-1', role: 'admin', roles: ['admin'] };
    next();
  },
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: () => (_req, _res, next) => next(),
}));

jest.mock('../../services/dashboard.service', () => ({
  getDashboardSummary: jest.fn(),
  getOperationalIndicators: jest.fn(),
  getLocationDashboardSummary: jest.fn(),
  getAlertas: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  requestLogger: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middleware/errorHandler');
const dashboardRoutes = require('../../routes/dashboard.routes');
const DashboardService = require('../../services/dashboard.service');

describe('GET /api/dashboard/alertas', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns alertas with summary counts', async () => {
    const mockData = {
      alertas: [
        {
          custodia_id: 'c1',
          articulo_id: 'a1',
          trabajador_id: 't1',
          activo_codigo: '006',
          articulo_nombre: 'Casco EPP',
          trabajador_nombre: 'Juan Rodríguez',
          semaforo: 'rojo',
          dias_restantes: 0,
          porcentaje: 1.05,
        },
      ],
      total: 1,
      vencidas: 1,
      por_vencer: 0,
    };
    DashboardService.getAlertas.mockResolvedValue(mockData);

    const res = await request(buildApp()).get('/api/dashboard/alertas');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.vencidas).toBe(1);
    expect(res.body.data.alertas[0].activo_codigo).toBe('006');
    expect(res.body.data.alertas[0].semaforo).toBe('rojo');
  });

  it('returns empty alertas when none exist', async () => {
    DashboardService.getAlertas.mockResolvedValue({
      alertas: [], total: 0, vencidas: 0, por_vencer: 0,
    });

    const res = await request(buildApp()).get('/api/dashboard/alertas');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.alertas).toHaveLength(0);
  });

  it('propagates service errors to error handler', async () => {
    DashboardService.getAlertas.mockRejectedValue(new Error('DB error'));

    const res = await request(buildApp()).get('/api/dashboard/alertas');

    expect(res.status).toBe(500);
  });
});
