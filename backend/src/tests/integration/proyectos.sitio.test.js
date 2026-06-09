'use strict';

jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { id: 'user-1', role: 'admin', roles: ['admin'] };
    next();
  },
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: () => (_req, _res, next) => next(),
}));

jest.mock('../../services/proyectos.service', () => ({
  list: jest.fn(),
  create: jest.fn(),
  getById: jest.fn(),
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
const proyectosRoutes = require('../../routes/proyectos.routes');
const ProyectosService = require('../../services/proyectos.service');

describe('Proyectos API — campo sitio', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/proyectos', proyectosRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/proyectos acepta campo sitio y lo retorna', async () => {
    const mockProyecto = {
      id: 'proj-uuid-1',
      nombre: 'TEST_SITIO_Proyecto',
      sitio: 'Faena El Teniente',
      estado: 'activo',
    };
    ProyectosService.create.mockResolvedValue(mockProyecto);

    const res = await request(buildApp())
      .post('/api/proyectos')
      .send({ nombre: 'TEST_SITIO_Proyecto', sitio: 'Faena El Teniente' });

    expect(res.status).toBe(201);
    expect(res.body.data.sitio).toBe('Faena El Teniente');
    expect(res.body.data).not.toHaveProperty('ciudad');
    expect(ProyectosService.create).toHaveBeenCalledWith(
      expect.objectContaining({ sitio: 'Faena El Teniente' })
    );
    expect(ProyectosService.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ ciudad: expect.anything() })
    );
  });

  it('POST /api/proyectos rechaza campo ciudad (campo desconocido tras renombrar)', async () => {
    // After rename, ciudad is unknown to Joi.object → returns 400 validation error
    const res = await request(buildApp())
      .post('/api/proyectos')
      .send({ nombre: 'TEST_SITIO_NoCiudad', ciudad: 'Santiago' });

    expect(res.status).toBe(400);
    expect(ProyectosService.create).not.toHaveBeenCalled();
  });

  it('GET /api/proyectos retorna sitio en cada item', async () => {
    const mockList = [
      { id: 'proj-uuid-3', nombre: 'TEST_SITIO_Lista', sitio: 'Planta Quintero', estado: 'activo' },
    ];
    ProyectosService.list.mockResolvedValue(mockList);

    const res = await request(buildApp())
      .get('/api/proyectos');

    expect(res.status).toBe(200);
    const proyecto = res.body.data.find((p) => p.nombre === 'TEST_SITIO_Lista');
    expect(proyecto).toBeDefined();
    expect(proyecto.sitio).toBe('Planta Quintero');
    expect(proyecto).not.toHaveProperty('ciudad');
  });
});
