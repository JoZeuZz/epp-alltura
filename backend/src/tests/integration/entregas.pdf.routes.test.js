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

jest.mock('../../services/entregas.service');

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  requestLogger: (_req, _res, next) => next(),
}));

jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
  deleteFileByUrl: jest.fn(),
  downloadImageBuffer: jest.fn().mockResolvedValue(null),
}));

const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middleware/errorHandler');
const entregasRoutes = require('../../routes/entregas.routes');
const EntregasService = require('../../services/entregas.service');
const { authMiddleware } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roles');

const MOCK_ENTREGA = {
  id: '11111111-0000-0000-0000-000000000001',
  nombres: 'Juan',
  apellidos: 'Pérez',
  rut: '12345678-9',
  creador_nombres: 'Admin',
  creador_apellidos: 'Sistema',
  estado: 'confirmada',
  tipo: 'entrega',
  creado_en: new Date().toISOString(),
  confirmada_en: new Date().toISOString(),
  firmado_en: new Date().toISOString(),
  firma_imagen_url: null,
  firma_imagen_url_raw: null,
  evidencia_foto_url_raw: null,
  detalles: [
    {
      articulo_nombre: 'Casco',
      activo_codigo: 'EPP-001',
      codigo: 'EPP-001',
      cantidad: 1,
      condicion_salida: 'ok',
      valor: 24500,
      notas: null,
    },
  ],
};

describe('GET /api/entregas/:id/pdf', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/entregas', entregasRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with application/pdf content type', async () => {
    EntregasService.getById.mockResolvedValue(MOCK_ENTREGA);
    const app = buildApp();
    const res = await request(app)
      .get(`/api/entregas/${MOCK_ENTREGA.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('returns 404 when entrega not found', async () => {
    const notFoundError = new Error('Entrega no encontrada');
    notFoundError.statusCode = 404;
    EntregasService.getById.mockRejectedValue(notFoundError);
    const app = buildApp();
    const res = await request(app)
      .get('/api/entregas/00000000-0000-0000-0000-000000000000/pdf');
    expect(res.status).toBe(404);
  });

  it('returns 401 without token when auth rejects', async () => {
    authMiddleware.mockImplementationOnce((_req, res, _next) => {
      res.status(401).json({ success: false, message: 'No autorizado' });
    });

    const app = buildApp();
    const res = await request(app)
      .get(`/api/entregas/${MOCK_ENTREGA.id}/pdf`);

    expect(res.status).toBe(401);
  });

  it('returns 200 with PDF even when detalles is empty', async () => {
    EntregasService.getById.mockResolvedValue({ ...MOCK_ENTREGA, detalles: [] });
    const res = await request(buildApp())
      .get(`/api/entregas/${MOCK_ENTREGA.id}/pdf`)
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('returns 403 when role is not admin or supervisor', async () => {
    checkRole.mockImplementation(() => (_req, res) =>
      res.status(403).json({ message: 'Forbidden' })
    );
    let res;
    await jest.isolateModulesAsync(async () => {
      const freshRoutes = require('../../routes/entregas.routes');
      const app = express();
      app.use(express.json());
      app.use('/api/entregas', freshRoutes);
      app.use(errorHandler);
      res = await request(app)
        .get(`/api/entregas/${MOCK_ENTREGA.id}/pdf`)
        .set('Authorization', 'Bearer test-token');
    });
    checkRole.mockImplementation(() => (_req, _res, next) => next());
    expect(res.status).toBe(403);
  });

  it('includes Content-Length header in response', async () => {
    EntregasService.getById.mockResolvedValue(MOCK_ENTREGA);
    const app = buildApp();
    const res = await request(app)
      .get(`/api/entregas/${MOCK_ENTREGA.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-length']).toBeDefined();
  });

  it('returns 200 for signed entrega with evidence photo', async () => {
    const { downloadImageBuffer } = require('../../lib/googleCloud');
    downloadImageBuffer.mockResolvedValue(Buffer.from('fake-img'));
    EntregasService.getById.mockResolvedValue({
      ...MOCK_ENTREGA,
      firma_imagen_url_raw: 'https://storage/firma.png',
      evidencia_foto_url_raw: 'https://storage/evidencia.jpg',
    });
    const res = await request(buildApp())
      .get(`/api/entregas/${MOCK_ENTREGA.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(Number(res.headers['content-length'])).toBeGreaterThan(0);
  });
});
