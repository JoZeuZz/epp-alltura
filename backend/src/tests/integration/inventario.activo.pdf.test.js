'use strict';

jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((req, _res, next) => {
    req.user = {
      id: 'user-1',
      role: 'admin',
      roles: ['admin'],
    };
    next();
  }),
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../../services/inventario.service');

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
const inventarioRoutes = require('../../routes/inventario.routes');
const InventarioService = require('../../services/inventario.service');
const { authMiddleware } = require('../../middleware/auth');

const MOCK_PROFILE = {
  id: '22222222-0000-0000-0000-000000000001',
  codigo: 'EPP-001',
  nro_serie: 'SN-ABC',
  estado: 'disponible',
  bodega_nombre: 'Bodega Central',
  articulo_nombre: 'Casco de seguridad',
  creado_en: new Date().toISOString(),
  custodia_activa: null,
  compra: null,
  timeline: [],
  custodias: [],
  estadisticas: { total_entregas: 0, total_devoluciones: 0, dias_total_custodia: 0 },
};

describe('GET /api/inventario/activos/:id/pdf', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/inventario', inventarioRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with application/pdf', async () => {
    InventarioService.getActivoProfile.mockResolvedValue(MOCK_PROFILE);
    const app = buildApp();
    const res = await request(app)
      .get(`/api/inventario/activos/${MOCK_PROFILE.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('returns 401 without token', async () => {
    authMiddleware.mockImplementationOnce((_req, res, _next) => {
      res.status(401).json({ success: false, message: 'No autorizado' });
    });

    const app = buildApp();
    const res = await request(app)
      .get(`/api/inventario/activos/${MOCK_PROFILE.id}/pdf`);
    expect(res.status).toBe(401);
  });
});
