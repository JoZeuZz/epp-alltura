'use strict';

jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../../services/facturaParser.service', () => ({
  parseFactura: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  requestLogger: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const facturaRoutes = require('../../routes/facturaParser.routes');
const { parseFactura } = require('../../services/facturaParser.service');
const errorHandler = require('../../middleware/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/facturas', facturaRoutes);
  app.use(errorHandler);
  return app;
};

const MOCK_RESULT = {
  proveedor_id:     'prov-uuid-1',
  proveedor_nombre: 'AGUA-BLANCA INVERSIONES SPA',
  proveedor_creado: false,
  fecha_compra:     '2026-06-12',
  valor:            43780,
  extractado_ok:    true,
};

describe('POST /api/facturas/parse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 si no se envía archivo', async () => {
    const res = await request(buildApp())
      .post('/api/facturas/parse')
      .field('articulo_nombre', 'anclaje');

    expect(res.status).toBe(400);
  });

  it('retorna resultado del servicio cuando se envía PDF', async () => {
    parseFactura.mockResolvedValueOnce(MOCK_RESULT);

    const res = await request(buildApp())
      .post('/api/facturas/parse')
      .attach('factura', Buffer.from('%PDF-1.4 fake'), { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('articulo_nombre', 'anclaje de cinta');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.proveedor_nombre).toBe('AGUA-BLANCA INVERSIONES SPA');
    expect(res.body.data.valor).toBe(43780);
    expect(parseFactura).toHaveBeenCalledWith(
      expect.stringContaining('upload-'),
      'anclaje de cinta'
    );
  });

  it('retorna extractado_ok:false si el servicio lanza error (no rompe el flujo)', async () => {
    parseFactura.mockRejectedValueOnce(new Error('PDF corrupto'));

    const res = await request(buildApp())
      .post('/api/facturas/parse')
      .attach('factura', Buffer.from('%PDF-1.4 fake'), { filename: 'bad.pdf', contentType: 'application/pdf' })
      .field('articulo_nombre', 'algo');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.extractado_ok).toBe(false);
    expect(res.body.data.proveedor_id).toBeNull();
  });
});
