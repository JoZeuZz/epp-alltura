jest.mock('../../db', () => ({
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../../lib/auditoriaDb', () => ({
  writeAuditEvent: jest.fn(),
}));

jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
  deleteFileByUrl: jest.fn(),
  resolveImageUrl: jest.fn(async (url) => (url ? `/resolved/${url}` : url)),
}));

const db = require('../../db');
const EntregasService = require('../../services/entregas.service');
const DevolucionesService = require('../../services/devoluciones.service');
const { uploadFile, deleteFileByUrl } = require('../../lib/googleCloud');

const buildClient = () => ({
  query: jest.fn(async (sql) => {
    if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
    return { rows: [] };
  }),
  release: jest.fn(),
});

describe('evidence photo cleanup in create services', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('limpia evidencia de entrega si falla después del upload', async () => {
    const client = buildClient();
    db.pool.connect.mockResolvedValue(client);
    uploadFile.mockResolvedValue({ url: 'uploads/evidencias/entrega.jpg', dominantColor: null });
    jest.spyOn(EntregasService, '_validateWorkerActive').mockRejectedValue(new Error('worker failed'));

    await expect(EntregasService.create({ trabajador_id: 'trab-1' }, 'user-1', { path: 'tmp.jpg' }))
      .rejects.toThrow('worker failed');

    expect(uploadFile).toHaveBeenCalledWith({ path: 'tmp.jpg' }, expect.any(Object));
    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/evidencias/entrega.jpg');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('limpia evidencia de devolución si falla después del upload', async () => {
    const client = buildClient();
    db.pool.connect.mockResolvedValue(client);
    uploadFile.mockResolvedValue({ url: 'uploads/evidencias/devolucion.jpg', dominantColor: null });
    jest.spyOn(DevolucionesService, '_validateWorkerActive').mockRejectedValue(new Error('worker failed'));

    await expect(DevolucionesService.create({ trabajador_id: 'trab-1' }, 'user-1', { path: 'tmp.jpg' }))
      .rejects.toThrow('worker failed');

    expect(uploadFile).toHaveBeenCalledWith({ path: 'tmp.jpg' }, expect.any(Object));
    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/evidencias/devolucion.jpg');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
