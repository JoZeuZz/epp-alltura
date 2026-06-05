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

jest.mock('../../services/plantillas.service', () => ({
  PlantillasService: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  requestLogger: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middleware/errorHandler');
const plantillasRoutes = require('../../routes/plantillas.routes');
const { PlantillasService } = require('../../services/plantillas.service');

const PLANTILLA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Plantillas API Route Integration', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/plantillas', plantillasRoutes);
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista plantillas con GET /api/plantillas', async () => {
    PlantillasService.list.mockResolvedValue([
      { id: PLANTILLA_ID, nombre: 'Casco V-Gard', tipo: 'epp', instance_count: 5 },
    ]);

    const app = buildApp();
    const response = await request(app).get('/api/plantillas');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(PlantillasService.list).toHaveBeenCalled();
  });

  it('crea plantilla con POST /api/plantillas', async () => {
    PlantillasService.create.mockResolvedValue({
      id: PLANTILLA_ID,
      tipo: 'epp',
      nombre: 'Casco V-Gard',
      instance_count: 0,
    });

    const app = buildApp();
    const payload = { tipo: 'epp', nombre: 'Casco V-Gard', marca: '3M' };

    const response = await request(app).post('/api/plantillas').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(PlantillasService.create).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'epp', nombre: 'Casco V-Gard' }),
      'user-1',
      {}
    );
  });

  it('rechaza creación de plantilla sin tipo', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/plantillas')
      .send({ nombre: 'Sin tipo' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/tipo/i);
  });

  it('rechaza creación de plantilla sin nombre', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/plantillas')
      .send({ tipo: 'epp' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body.errors || [])).toMatch(/nombre/i);
  });

  it('obtiene plantilla por id con GET /api/plantillas/:id', async () => {
    PlantillasService.getById.mockResolvedValue({
      id: PLANTILLA_ID,
      nombre: 'Casco V-Gard',
      tipo: 'epp',
      instance_count: 3,
    });

    const app = buildApp();
    const response = await request(app).get(`/api/plantillas/${PLANTILLA_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(PlantillasService.getById).toHaveBeenCalledWith(PLANTILLA_ID);
  });

  it('retorna 404 cuando plantilla no existe', async () => {
    const err = new Error('Plantilla no encontrada');
    err.statusCode = 404;
    PlantillasService.getById.mockRejectedValue(err);

    const app = buildApp();
    const response = await request(app).get(`/api/plantillas/${PLANTILLA_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
