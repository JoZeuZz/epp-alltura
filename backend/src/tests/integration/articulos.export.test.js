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

jest.mock('../../services/articulos.service', () => ({
  ArticulosService: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deletePermanent: jest.fn(),
    cambiarEstado: jest.fn(),
  },
  deriveCodigo: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  requestLogger: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middleware/errorHandler');
const articulosRoutes = require('../../routes/articulos.routes');
const { ArticulosService } = require('../../services/articulos.service');
const { authMiddleware } = require('../../middleware/auth');

const MOCK_ITEMS = [
  {
    id: '1',
    tipo: 'epp',
    nombre: 'Casco',
    marca: 'MSA',
    modelo: 'V-Gard',
    codigo: 'EPP-001',
    nro_serie: 'SN001',
    estado: 'en_stock',
    valor: 25000,
    bodega_nombre: 'Bodega Central',
    bodega_ciudad: 'Santiago',
    proyecto_nombre: null,
    proyecto_ciudad: null,
    especialidades: ['oocc'],
    fecha_compra: '2024-01-15',
    proveedor_nombre: 'Proveedor A',
    creado_en: '2024-01-15T00:00:00.000Z',
  },
  {
    id: '2',
    tipo: 'epp',
    nombre: 'Guante',
    marca: null,
    modelo: null,
    codigo: 'EPP-002',
    nro_serie: 'SN002',
    estado: 'asignado',
    valor: 0,
    bodega_nombre: null,
    bodega_ciudad: null,
    proyecto_nombre: 'Proyecto Norte',
    proyecto_ciudad: 'Antofagasta',
    especialidades: [],
    fecha_compra: null,
    proveedor_nombre: null,
    creado_en: '2024-02-01T00:00:00.000Z',
  },
];

describe('GET /api/articulos/export', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/articulos', articulosRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ArticulosService.list.mockResolvedValue({ items: MOCK_ITEMS, total: 2 });
  });

  describe('validation', () => {
    it('returns 400 when tipo is missing', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?formato=excel');
      expect(res.status).toBe(400);
    });

    it('returns 400 when formato is missing', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp');
      expect(res.status).toBe(400);
    });

    it('returns 400 when tipo is invalid', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=invalid&formato=excel');
      expect(res.status).toBe(400);
    });

    it('returns 400 when formato is invalid', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=csv');
      expect(res.status).toBe(400);
    });
  });

  describe('auth', () => {
    it('returns 401 without valid token', async () => {
      authMiddleware.mockImplementationOnce((_req, res) => {
        res.status(401).json({ success: false, message: 'No autorizado' });
      });
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(res.status).toBe(401);
    });
  });

  describe('Excel export', () => {
    it('returns 200 with xlsx content-type', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    });

    it('returns attachment content-disposition with .xlsx filename', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toMatch(/inventario-epp-.+\.xlsx/);
    });

    it('calls ArticulosService.list with tipo and high limit', async () => {
      await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(ArticulosService.list).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'epp', limit: 5000 })
      );
    });

    it('passes estado filter to ArticulosService.list', async () => {
      await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel&estado=en_stock');
      expect(ArticulosService.list).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'en_stock' })
      );
    });

    it('filters by ciudad in-memory — returns only matching items', async () => {
      const res = await request(buildApp())
        .get('/api/articulos/export?tipo=epp&formato=excel&ciudad=Santiago');
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('filters by __none__ ciudad — returns items with no city', async () => {
      const res = await request(buildApp())
        .get('/api/articulos/export?tipo=epp&formato=excel&ciudad=__none__');
      expect(res.status).toBe(200);
    });

    it('returns Content-Length header', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(res.headers['content-length']).toBeDefined();
    });
  });

  describe('PDF export', () => {
    it('returns 200 with application/pdf content-type', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=pdf');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('returns attachment content-disposition with .pdf filename', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=pdf');
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toMatch(/inventario-epp-.+\.pdf/);
    });

    it('returns Content-Length header', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=pdf');
      expect(res.headers['content-length']).toBeDefined();
    });
  });
});
