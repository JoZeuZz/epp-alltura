jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = {
      id: 'user-1',
      role: 'admin',
      roles: ['admin'],
    };
    next();
  },
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: () => (_req, _res, next) => next(),
}));

jest.mock('../../services/articulos.service', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  removePermanent: jest.fn(),
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
const articulosRoutes = require('../../routes/articulos.routes');
const ArticulosService = require('../../services/articulos.service');

describe('Articulos API Route Integration', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/articulos', articulosRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('desactiva un artículo con DELETE /api/articulos/:id', async () => {
    ArticulosService.remove.mockResolvedValue({
      id: 'articulo-1',
      estado: 'inactivo',
    });

    const app = buildApp();
    const response = await request(app).delete('/api/articulos/articulo-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Artículo desactivado correctamente');
    expect(response.body.data.estado).toBe('inactivo');
  });

  it('elimina permanentemente un artículo sin trazabilidad', async () => {
    ArticulosService.removePermanent.mockResolvedValue({
      id: 'articulo-2',
      deleted_permanently: true,
    });

    const app = buildApp();
    const response = await request(app).delete('/api/articulos/articulo-2/permanent');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Artículo eliminado permanentemente');
    expect(response.body.data.deleted_permanently).toBe(true);
  });

  it('retorna 409 cuando el borrado permanente está bloqueado por trazabilidad', async () => {
    const blockedError = new Error(
      'No se puede eliminar permanentemente un artículo con trazabilidad.'
    );
    blockedError.statusCode = 409;
    blockedError.errors = [
      {
        code: 'ARTICULO_REFERENCIADO',
        details: {
          movimiento_stock: 2,
          compra_detalle: 1,
        },
      },
    ];
    ArticulosService.removePermanent.mockRejectedValue(blockedError);

    const app = buildApp();
    const response = await request(app).delete('/api/articulos/articulo-3/permanent');

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'No se puede eliminar permanentemente un artículo con trazabilidad.'
    );
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ARTICULO_REFERENCIADO',
        }),
      ])
    );
  });
});
