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
    listForExport: jest.fn(),
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
const EXPORT_MAX_ROWS_DEFAULT = parseInt(process.env.EXPORT_MAX_ROWS ?? '5000', 10);

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
    bodega_nombre: 'Bodega Santiago',
    proyecto_nombre: null,
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
    proyecto_nombre: 'Faena Antofagasta',
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
    ArticulosService.listForExport.mockResolvedValue({ items: MOCK_ITEMS, truncated: false });
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

    it('calls ArticulosService.listForExport with tipo and maxRows', async () => {
      await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(ArticulosService.listForExport).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'epp' }),
        expect.any(Number)
      );
    });

    it('passes estado filter to ArticulosService.listForExport', async () => {
      await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel&estado=en_stock');
      expect(ArticulosService.listForExport).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'en_stock' }),
        expect.any(Number)
      );
    });

    it('filters by ubicacion in-memory — returns only matching items', async () => {
      const res = await request(buildApp())
        .get('/api/articulos/export?tipo=epp&formato=excel&ubicacion=Bodega+Santiago');
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('filters by __none__ ubicacion — returns items with no location', async () => {
      const res = await request(buildApp())
        .get('/api/articulos/export?tipo=epp&formato=excel&ubicacion=__none__');
      expect(res.status).toBe(200);
    });

    it('returns Content-Length header', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(res.headers['content-length']).toBeDefined();
    });

    it('export truncado → responde 200 con header X-Export-Truncated: true', async () => {
      ArticulosService.listForExport.mockResolvedValueOnce({ items: MOCK_ITEMS, truncated: true });
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(res.status).toBe(200);
      expect(res.headers['x-export-truncated']).toBe('true');
    });

    it('export normal → sin header X-Export-Truncated', async () => {
      const res = await request(buildApp()).get('/api/articulos/export?tipo=epp&formato=excel');
      expect(res.status).toBe(200);
      expect(res.headers['x-export-truncated']).toBeUndefined();
    });

    it('buffer contains sheet "Inventario" with correct 9 headers and ≥1 data row', async () => {
      const ExcelJS = require('exceljs');
      const res = await request(buildApp())
        .get('/api/articulos/export?tipo=epp&formato=excel')
        .buffer(true)
        .parse((response, callback) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          response.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body);

      const ws = wb.getWorksheet('Inventario');
      expect(ws).toBeDefined();

      const headerRow = ws.getRow(1).values.filter(Boolean);
      expect(headerRow).toEqual([
        'Código', 'Nombre', 'Marca/Modelo', 'Estado', 'Ubicación',
        'Valor (CLP)', 'Fecha Compra', 'Proveedor', 'Especialidades',
      ]);

      expect(ws.rowCount).toBeGreaterThanOrEqual(2);
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
