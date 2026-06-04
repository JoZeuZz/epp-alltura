'use strict';

jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((req, _res, next) => {
    req.user = { id: 'user-1', role: 'admin', roles: ['admin'] };
    next();
  }),
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../../services/trabajadores.service', () => ({
  getActas: jest.fn(),
  getProfile: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  requestLogger: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middleware/errorHandler');
const trabajadoresRoutes = require('../../routes/trabajadores.routes');
const TrabajadoresService = require('../../services/trabajadores.service');
const { authMiddleware } = require('../../middleware/auth');

const TRABAJADOR_ID = 'aaaaaa00-0000-4000-8000-000000000001';

const MOCK_ACTAS = [
  {
    entrega_id: 'ee000000-0000-4000-8000-000000000001',
    entrega_fecha: '2024-01-15T12:00:00Z',
    articulo_codigo: 'EPP-001',
    articulo_nombre: 'Casco MSA',
    articulo_tipo: 'epp',
    es_activo: true,
    devolucion_id: null,
    devolucion_fecha: null,
  },
];

describe('GET /api/trabajadores/:id/actas', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/trabajadores', trabajadoresRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with actas array', async () => {
    TrabajadoresService.getActas.mockResolvedValue(MOCK_ACTAS);
    const res = await request(buildApp())
      .get(`/api/trabajadores/${TRABAJADOR_ID}/actas`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(MOCK_ACTAS);
  });

  it('returns 200 with empty array when no actas', async () => {
    TrabajadoresService.getActas.mockResolvedValue([]);
    const res = await request(buildApp())
      .get(`/api/trabajadores/${TRABAJADOR_ID}/actas`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('calls TrabajadoresService.getActas with the trabajador id', async () => {
    TrabajadoresService.getActas.mockResolvedValue([]);
    await request(buildApp()).get(`/api/trabajadores/${TRABAJADOR_ID}/actas`);
    expect(TrabajadoresService.getActas).toHaveBeenCalledWith(TRABAJADOR_ID);
  });

  it('returns 401 without authentication', async () => {
    authMiddleware.mockImplementationOnce((_req, res) => {
      res.status(401).json({ success: false, message: 'No autorizado' });
    });
    const res = await request(buildApp())
      .get(`/api/trabajadores/${TRABAJADOR_ID}/actas`);
    expect(res.status).toBe(401);
  });

  it('returns 500 when service throws', async () => {
    TrabajadoresService.getActas.mockRejectedValue(new Error('db error'));
    const res = await request(buildApp())
      .get(`/api/trabajadores/${TRABAJADOR_ID}/actas`);
    expect(res.status).toBe(500);
  });
});
