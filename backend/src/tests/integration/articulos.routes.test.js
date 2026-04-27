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

  it('crea un artículo con contrato V2 grupo/subclasificación/especialidades', async () => {
    ArticulosService.create.mockResolvedValue({
      id: 'articulo-v2-1',
      grupo_principal: 'equipo',
      subclasificacion: 'epp',
      especialidades: ['ooee'],
      nombre: 'Arnés dieléctrico',
      estado: 'activo',
    });

    const app = buildApp();
    const payload = {
      grupo_principal: 'equipo',
      subclasificacion: 'epp',
      especialidades: ['ooee'],
      nombre: 'Arnés dieléctrico',
      marca: '3M',
      modelo: 'Protecta',
      nivel_control: 'alto',
      requiere_vencimiento: true,
      unidad_medida: 'unidad',
      estado: 'activo',
    };

    const response = await request(app).post('/api/articulos').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Artículo creado correctamente');
    expect(ArticulosService.create).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it('crea un artículo de herramienta con múltiples especialidades', async () => {
    ArticulosService.create.mockResolvedValue({
      id: 'articulo-v2-2',
      grupo_principal: 'herramienta',
      subclasificacion: 'manual',
      especialidades: ['oocc', 'equipos'],
      nombre: 'Llave de impacto',
      estado: 'activo',
    });

    const app = buildApp();
    const payload = {
      grupo_principal: 'herramienta',
      subclasificacion: 'manual',
      especialidades: ['oocc', 'equipos'],
      nombre: 'Llave de impacto',
      marca: 'Makita',
      modelo: 'TW1000',
      nivel_control: 'medio',
      unidad_medida: 'unidad',
    };

    const response = await request(app).post('/api/articulos').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(ArticulosService.create).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it('edita un artículo con grupo/subclasificación compatibles', async () => {
    ArticulosService.update.mockResolvedValue({
      id: 'articulo-1',
      grupo_principal: 'herramienta',
      subclasificacion: 'electrica_cable',
      especialidades: ['ooee'],
      nombre: 'Taladro renovado',
      estado: 'activo',
    });

    const app = buildApp();
    const payload = {
      grupo_principal: 'herramienta',
      subclasificacion: 'electrica_cable',
      especialidades: ['ooee'],
      nombre: 'Taladro renovado',
    };

    const response = await request(app).put('/api/articulos/articulo-1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(ArticulosService.update).toHaveBeenCalledWith('articulo-1', expect.objectContaining(payload));
  });

  it('rechaza subclasificación incompatible para grupo_principal', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        grupo_principal: 'herramienta',
        subclasificacion: 'epp',
        especialidades: ['oocc'],
        nombre: 'Payload inválido',
        marca: 'Marca',
        modelo: 'Modelo',
        nivel_control: 'medio',
        unidad_medida: 'unidad',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/subclasificaci[oó]n|grupo_principal/i);
  });

  it('rechaza actualización de grupo_principal sin subclasificación', async () => {
    const app = buildApp();

    const response = await request(app)
      .put('/api/articulos/articulo-1')
      .send({
        grupo_principal: 'equipo',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/subclasificacion compatible/i);
  });

  it('rechaza especialidades con marcadores inválidos', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        grupo_principal: 'equipo',
        subclasificacion: 'epp',
        especialidades: ['ooee', 'marcador_invalido'],
        nombre: 'Artículo inválido',
        marca: 'Marca',
        modelo: 'Modelo',
        nivel_control: 'medio',
        unidad_medida: 'unidad',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/especialidades|marcador_invalido/i);
  });

  it('rechaza payload legacy cuando se envía tipo', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        tipo: 'epp',
        subclasificacion: 'epp',
        especialidades: ['ooee'],
        nombre: 'Payload Legacy',
        nivel_control: 'medio',
        unidad_medida: 'unidad',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(JSON.stringify(response.body.errors)).toMatch(/grupo_principal|tipo/i);
  });

  it('rechaza payload legacy cuando se envía retorno_mode', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/articulos')
      .send({
        grupo_principal: 'equipo',
        subclasificacion: 'epp',
        especialidades: ['ooee'],
        nombre: 'Payload Legacy retorno',
        marca: 'Marca',
        modelo: 'Modelo',
        nivel_control: 'medio',
        unidad_medida: 'unidad',
        retorno_mode: 'retornable',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/retorno_mode/i);
  });
});
