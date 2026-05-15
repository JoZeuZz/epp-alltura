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
const { ArticulosService } = require('../../services/articulos.service');

const BODEGA_ID = '22222222-2222-4222-8222-222222222222';

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

  it('elimina permanentemente un artículo con DELETE /api/articulos/:id', async () => {
    ArticulosService.deletePermanent.mockResolvedValue(undefined);

    const app = buildApp();
    const response = await request(app).delete('/api/articulos/articulo-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Artículo eliminado permanentemente');
    expect(ArticulosService.deletePermanent).toHaveBeenCalledWith('articulo-1', 'user-1');
  });

  it('retorna 409 cuando el borrado permanente está bloqueado por custodia activa', async () => {
    const blockedError = new Error(
      'No se puede eliminar un artículo con custodia activa'
    );
    blockedError.statusCode = 409;
    blockedError.errors = [
      {
        code: 'ARTICULO_ASSIGNED',
      },
    ];
    ArticulosService.deletePermanent.mockRejectedValue(blockedError);

    const app = buildApp();
    const response = await request(app).delete('/api/articulos/articulo-3');

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'No se puede eliminar un artículo con custodia activa'
    );
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ARTICULO_ASSIGNED',
        }),
      ])
    );
  });

  it('crea un artículo físico con contrato tipo/nro_serie/bodega', async () => {
    ArticulosService.create.mockResolvedValue({
      id: 'articulo-v2-1',
      tipo: 'epp',
      nombre: 'Arnés dieléctrico',
      nro_serie: 'ARN-0001',
      codigo: '001',
      estado: 'en_stock',
      especialidades: ['ooee'],
    });

    const app = buildApp();
    const payload = {
      tipo: 'epp',
      nombre: 'Arnés dieléctrico',
      marca: '3M',
      modelo: 'Protecta',
      nro_serie: 'ARN-0001',
      valor: 150000,
      bodega_id: BODEGA_ID,
      especialidades: ['ooee'],
    };

    const response = await request(app).post('/api/articulos').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Artículo creado correctamente');
    expect(ArticulosService.create).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      'user-1',
      null
    );
  });

  it('acepta foto_url opcional en payload JSON de artículo', async () => {
    ArticulosService.create.mockResolvedValue({
      id: 'articulo-foto-1',
      tipo: 'epp',
      nombre: 'Casco con foto',
      nro_serie: 'CAS-0001',
      estado: 'en_stock',
      foto_url: '/api/image-proxy?token=abc',
    });

    const app = buildApp();
    const payload = {
      tipo: 'epp',
      nombre: 'Casco con foto',
      marca: '3M',
      modelo: 'X1',
      nro_serie: 'CAS-0001',
      bodega_id: BODEGA_ID,
      foto_url: 'https://example.com/uploads/catalogo/casco.jpg',
    };

    const response = await request(app).post('/api/articulos').send(payload);

    expect(response.status).toBe(201);
    expect(ArticulosService.create).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      'user-1',
      null
    );
  });

  it('crea un artículo de herramienta con múltiples especialidades', async () => {
    ArticulosService.create.mockResolvedValue({
      id: 'articulo-v2-2',
      tipo: 'herramienta',
      nombre: 'Llave de impacto',
      nro_serie: 'LLV-0001',
      estado: 'en_stock',
      especialidades: ['oocc', 'equipos'],
    });

    const app = buildApp();
    const payload = {
      tipo: 'herramienta',
      nombre: 'Llave de impacto',
      marca: 'Makita',
      modelo: 'TW1000',
      nro_serie: 'LLV-0001',
      bodega_id: BODEGA_ID,
      especialidades: ['oocc', 'equipos'],
    };

    const response = await request(app).post('/api/articulos').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(ArticulosService.create).toHaveBeenCalledWith(
      expect.objectContaining(payload),
      'user-1',
      null
    );
  });

  it('edita un artículo con campos físicos compatibles', async () => {
    ArticulosService.update.mockResolvedValue({
      id: 'articulo-1',
      tipo: 'herramienta',
      nombre: 'Taladro renovado',
      nro_serie: 'TAL-0009',
      estado: 'en_stock',
      especialidades: ['ooee'],
    });

    const app = buildApp();
    const payload = {
      nombre: 'Taladro renovado',
      nro_serie: 'TAL-0009',
      especialidades: ['ooee'],
    };

    const response = await request(app).put('/api/articulos/articulo-1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(ArticulosService.update).toHaveBeenCalledWith(
      'articulo-1',
      expect.objectContaining(payload),
      'user-1',
      null
    );
  });

  it('rechaza tipo inválido en la creación', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        tipo: 'invalido',
        nombre: 'Payload inválido',
        nro_serie: 'INV-0001',
        bodega_id: BODEGA_ID,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/tipo/i);
  });

  it('rechaza creación sin nro_serie', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        tipo: 'epp',
        nombre: 'Sin serie',
        bodega_id: BODEGA_ID,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/nro_serie/i);
  });

  it('rechaza creación sin bodega_id', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        tipo: 'epp',
        nombre: 'Sin bodega',
        nro_serie: 'SB-0001',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/bodega_id/i);
  });

  it('rechaza especialidades con marcadores inválidos', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        tipo: 'epp',
        nombre: 'Artículo inválido',
        nro_serie: 'AI-0001',
        bodega_id: BODEGA_ID,
        especialidades: ['ooee', 'marcador_invalido'],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/especialidades|marcador_invalido/i);
  });

  it('rechaza update con payload vacío', async () => {
    const app = buildApp();

    const response = await request(app)
      .put('/api/articulos/articulo-1')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('cambia el estado de un artículo con POST /api/articulos/:id/estado', async () => {
    ArticulosService.cambiarEstado.mockResolvedValue({
      id: 'articulo-1',
      estado: 'mantencion',
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/articulos/articulo-1/estado')
      .send({ nuevo_estado: 'mantencion', motivo: 'Revisión preventiva' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Estado del artículo actualizado');
    expect(response.body.data.estado).toBe('mantencion');
    expect(ArticulosService.cambiarEstado).toHaveBeenCalledWith(
      'articulo-1',
      expect.objectContaining({ nuevo_estado: 'mantencion' }),
      'user-1'
    );
  });
});
