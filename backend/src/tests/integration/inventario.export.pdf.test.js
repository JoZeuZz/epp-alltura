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

const MOCK_ACTIVOS = [
  {
    codigo: 'EPP-001',
    articulo_nombre: 'Casco',
    estado: 'disponible',
    bodega_nombre: 'Bodega Central',
    custodio_nombres: null,
    custodio_apellidos: null,
  },
];

describe('GET /api/inventario/export/pdf', () => {
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

  it('returns 200 with application/pdf and attachment disposition', async () => {
    InventarioService.getActivos.mockResolvedValue(MOCK_ACTIVOS);
    const app = buildApp();
    const res = await request(app)
      .get('/api/inventario/export/pdf?categoria=epp');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('returns 400 when categoria query param is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/inventario/export/pdf');
    expect(res.status).toBe(400);
  });

  it('returns 400 when categoria is an invalid value', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/inventario/export/pdf?categoria=invalid');
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    authMiddleware.mockImplementationOnce((_req, res, _next) => {
      res.status(401).json({ success: false, message: 'No autorizado' });
    });
    const app = buildApp();
    const res = await request(app)
      .get('/api/inventario/export/pdf?categoria=epp');
    expect(res.status).toBe(401);
  });
});
