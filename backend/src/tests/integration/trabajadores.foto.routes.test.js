const request = require('supertest');

jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => { req.user = { id: 'admin-1' }; next(); },
}));
jest.mock('../../middleware/roles', () => ({
  checkRole: () => (_req, _res, next) => next(),
}));
jest.mock('../../services/trabajadores.service', () => ({
  create: jest.fn().mockResolvedValue({ id: 't1', foto_url: 'uploads/trabajadores/fotos/x.webp' }),
  update: jest.fn(),
}));
jest.mock('../../middleware/upload', () => {
  const actual = jest.requireActual('../../middleware/upload');
  return { ...actual, validateImageMagic: (_req, _res, next) => next() };
});

const express = require('express');
const TrabajadoresService = require('../../services/trabajadores.service');
const trabajadoresRoutes = require('../../routes/trabajadores.routes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/trabajadores', trabajadoresRoutes);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));
  return app;
};

describe('POST /api/trabajadores con foto (multipart)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parsea payload + foto y pasa req.file al service', async () => {
    const app = buildApp();
    const payload = JSON.stringify({ rut: '12.345.678-5', nombres: 'Ana', apellidos: 'Rojas' });

    const res = await request(app)
      .post('/api/trabajadores')
      .field('payload', payload)
      .attach('foto', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'ana.jpg');

    expect(res.status).toBe(201);
    expect(TrabajadoresService.create).toHaveBeenCalledTimes(1);
    const [data, file] = TrabajadoresService.create.mock.calls[0];
    expect(data.nombres).toBe('Ana');
    expect(file).toBeDefined();
    expect(file.fieldname).toBe('foto');
  });

  it('sigue aceptando JSON sin foto', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/trabajadores')
      .send({ rut: '12.345.678-5', nombres: 'Ana', apellidos: 'Rojas' });

    expect(res.status).toBe(201);
    const [data, file] = TrabajadoresService.create.mock.calls[0];
    expect(data.nombres).toBe('Ana');
    expect(file).toBeUndefined();
  });
});
