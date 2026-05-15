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

jest.mock('../../services/entregas.service', () => ({
  create: jest.fn(),
}));

jest.mock('../../services/devoluciones.service', () => ({
  create: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const errorHandler = require('../../middleware/errorHandler');
const entregasRoutes = require('../../routes/entregas.routes');
const devolucionesRoutes = require('../../routes/devoluciones.routes');
const EntregasService = require('../../services/entregas.service');
const DevolucionesService = require('../../services/devoluciones.service');

const UUID = {
  trabajador: '11111111-1111-4111-8111-111111111111',
  origen: '22222222-2222-4222-8222-222222222222',
  destino: '33333333-3333-4333-8333-333333333333',
  recepcion: '44444444-4444-4444-8444-444444444444',
  articulo: '55555555-5555-4555-8555-555555555555',
  activo: '66666666-6666-4666-8666-666666666666',
  custodia: '77777777-7777-4777-8777-777777777777',
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/entregas', entregasRoutes);
  app.use('/api/devoluciones', devolucionesRoutes);
  app.use(errorHandler);
  return app;
};

describe('multipart payload routes for evidence photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parsea payload multipart en POST /api/entregas antes de validar', async () => {
    const payload = {
      trabajador_id: UUID.trabajador,
      ubicacion_origen_id: UUID.origen,
      ubicacion_destino_id: UUID.destino,
      detalles: [
        {
          articulo_id: UUID.articulo,
          activo_ids: [UUID.activo],
          condicion_salida: 'ok',
        },
      ],
    };
    EntregasService.create.mockResolvedValue({ id: 'entrega-1', evidencia_foto_url: null });

    const response = await request(buildApp())
      .post('/api/entregas')
      .field('payload', JSON.stringify(payload));

    expect(response.status).toBe(201);
    expect(EntregasService.create).toHaveBeenCalledWith(expect.objectContaining(payload), 'user-1', undefined);
  });

  it('parsea payload multipart en POST /api/devoluciones antes de validar', async () => {
    const payload = {
      trabajador_id: UUID.trabajador,
      ubicacion_recepcion_id: UUID.recepcion,
      detalles: [
        {
          custodia_id: UUID.custodia,
          articulo_id: UUID.articulo,
          condicion_entrada: 'ok',
          disposicion: 'devuelto',
        },
      ],
    };
    DevolucionesService.create.mockResolvedValue({ id: 'devolucion-1', evidencia_foto_url: null });

    const response = await request(buildApp())
      .post('/api/devoluciones')
      .field('payload', JSON.stringify(payload));

    expect(response.status).toBe(201);
    expect(DevolucionesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trabajador_id: UUID.trabajador,
        ubicacion_recepcion_id: UUID.recepcion,
        detalles: expect.arrayContaining([
          expect.objectContaining({
            custodia_id: UUID.custodia,
            articulo_id: UUID.articulo,
            disposicion: 'devuelto',
          }),
        ]),
      }),
      'user-1',
      undefined
    );
  });
});
