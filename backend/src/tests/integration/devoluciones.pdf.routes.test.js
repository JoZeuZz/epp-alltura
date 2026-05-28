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

jest.mock('../../services/devoluciones.service');

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
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
const devolucionesRoutes = require('../../routes/devoluciones.routes');
const DevolucionesService = require('../../services/devoluciones.service');
const { authMiddleware } = require('../../middleware/auth');

const MOCK_DEVOLUCION = {
  id: '22222222-0000-0000-0000-000000000001',
  nombres: 'Juan',
  apellidos: 'Pérez',
  rut: '12.345.678-9',
  receptor_nombres: 'Ana',
  receptor_apellidos: 'García',
  estado: 'confirmada',
  creado_en: new Date().toISOString(),
  confirmada_en: new Date().toISOString(),
  firmado_en: new Date().toISOString(),
  firma_imagen_url: null,
  firma_imagen_url_raw: null,
  evidencia_foto_url: null,
  evidencia_foto_url_raw: null,
  texto_aceptacion: null,
  detalles: [
    {
      articulo_nombre: 'Casco',
      codigo: 'CSC-001',
      condicion_entrada: 'ok',
      disposicion: 'devuelto',
      valor: 18000,
      notas: null,
    },
  ],
};

describe('GET /api/devoluciones/:id/pdf', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/devoluciones', devolucionesRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with application/pdf content type', async () => {
    DevolucionesService.getById.mockResolvedValue(MOCK_DEVOLUCION);
    const res = await request(buildApp()).get(`/api/devoluciones/${MOCK_DEVOLUCION.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('returns 404 when devolucion not found', async () => {
    const err = new Error('Devolución no encontrada');
    err.statusCode = 404;
    DevolucionesService.getById.mockRejectedValue(err);
    const res = await request(buildApp()).get('/api/devoluciones/00000000-0000-0000-0000-000000000000/pdf');
    expect(res.status).toBe(404);
  });

  it('returns 401 when auth rejects', async () => {
    authMiddleware.mockImplementationOnce((_req, res) => res.status(401).json({ success: false, message: 'No autorizado' }));
    const res = await request(buildApp()).get(`/api/devoluciones/${MOCK_DEVOLUCION.id}/pdf`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with PDF even when detalles is empty', async () => {
    DevolucionesService.getById.mockResolvedValue({ ...MOCK_DEVOLUCION, detalles: [] });
    const res = await request(buildApp()).get(`/api/devoluciones/${MOCK_DEVOLUCION.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('includes Content-Length header', async () => {
    DevolucionesService.getById.mockResolvedValue(MOCK_DEVOLUCION);
    const res = await request(buildApp()).get(`/api/devoluciones/${MOCK_DEVOLUCION.id}/pdf`);
    expect(res.headers['content-length']).toBeDefined();
  });

  it('returns 200 for signed devolucion with evidence photo', async () => {
    const { downloadImageBuffer } = require('../../lib/googleCloud');
    downloadImageBuffer.mockResolvedValue(Buffer.from('fake-img'));
    DevolucionesService.getById.mockResolvedValue({
      ...MOCK_DEVOLUCION,
      firma_imagen_url_raw: 'https://storage/firma.png',
      evidencia_foto_url_raw: 'https://storage/evidencia.jpg',
    });
    const res = await request(buildApp())
      .get(`/api/devoluciones/${MOCK_DEVOLUCION.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(Number(res.headers['content-length'])).toBeGreaterThan(0);
  });
});
