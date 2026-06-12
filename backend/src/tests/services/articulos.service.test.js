jest.mock('../../db', () => {
  const query = jest.fn(async (sql, params) => {
    // Handle bodega check before transaction
    if (/FROM bodegas/.test(sql)) {
      return { rows: [{ id: params[0] }] };
    }
    return { rows: [] };
  });
  const connect = jest.fn();
  return {
    query,
    pool: { connect },
  };
});
jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
  deleteFileByUrl: jest.fn(),
  resolveImageUrl: jest.fn(async (url) => (url ? `/resolved/${url}` : url)),
}));
jest.mock('../../lib/auditoriaDb', () => ({
  writeAuditEvent: jest.fn(async () => {}),
}));
jest.mock('../../lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const db = require('../../db');
const { uploadFile, deleteFileByUrl } = require('../../lib/googleCloud');
const { logger } = require('../../lib/logger');
const { ArticulosService } = require('../../services/articulos.service');

const BODEGA_ID = '22222222-2222-4222-8222-222222222222';
const ARTICULO_ID = '11111111-1111-4111-8111-111111111111';

function makeClient(queryImpl) {
  return {
    query: jest.fn(queryImpl),
    release: jest.fn(),
  };
}

describe('ArticulosService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea un artículo físico, sube foto opcional y devuelve la entidad', async () => {
    const payload = {
      tipo: 'epp',
      nombre: 'Casco',
      marca: '3M',
      modelo: 'X1',
      nro_serie: 'CAS-0007',
      valor: 50000,
      bodega_id: BODEGA_ID,
      especialidades: ['ooee'],
    };
    const imageFile = { originalname: 'casco.jpg' };
    uploadFile.mockResolvedValue({ url: 'uploads/catalogo/casco.jpg', dominantColor: null });

    // Mock the pre-transaction bodega check
    db.query.mockResolvedValueOnce({ rows: [{ id: BODEGA_ID }] });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (/nextval/.test(sql)) return { rows: [{ val: '7' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID }] };
      if (/INSERT INTO articulo\s*\n?\s*\(tipo/.test(sql) || /INSERT INTO articulo/.test(sql)) {
        return { rows: [{ id: ARTICULO_ID }] };
      }
      if (/INSERT INTO articulo_especialidad/.test(sql)) return { rows: [] };
      if (/INSERT INTO movimiento_activo/.test(sql)) return { rows: [] };
      if (/SELECT a\.\*/.test(sql)) {
        return {
          rows: [{ id: ARTICULO_ID, ...payload, codigo: 'EPP-00007', estado: 'en_stock' }],
        };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const result = await ArticulosService.create(payload, 'user-1', { foto: [imageFile] });

    expect(uploadFile).toHaveBeenCalledWith(imageFile, expect.any(Object));
    expect(result.id).toBe(ARTICULO_ID);
    expect(result.estado).toBe('en_stock');
    expect(client.release).toHaveBeenCalled();
  });

  it('limpia foto subida y hace rollback si falla la creación', async () => {
    const imageFile = { originalname: 'casco.jpg' };
    uploadFile.mockResolvedValue({ url: 'uploads/catalogo/casco.jpg', dominantColor: null });

    // Pre-transaction bodega check succeeds
    db.query.mockResolvedValueOnce({ rows: [{ id: BODEGA_ID }] });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/nextval/.test(sql)) return { rows: [{ val: '1' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID }] };
      if (/INSERT INTO articulo\s*\n?\s*\(tipo/.test(sql) || /INSERT INTO articulo/.test(sql)) {
        throw new Error('db failed');
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(
      ArticulosService.create(
        { tipo: 'epp', nombre: 'Casco', nro_serie: 'CAS-0007', bodega_id: BODEGA_ID },
        'user-1',
        { foto: [imageFile] }
      )
    ).rejects.toThrow('db failed');

    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/catalogo/casco.jpg');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('loggea warn si la limpieza del archivo huérfano falla, pero propaga el error original', async () => {
    const imageFile = { originalname: 'casco.jpg' };
    uploadFile.mockResolvedValue({ url: 'uploads/catalogo/casco.jpg', dominantColor: null });
    deleteFileByUrl.mockRejectedValue(new Error('GCS unavailable'));

    db.query.mockResolvedValueOnce({ rows: [{ id: BODEGA_ID }] });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/nextval/.test(sql)) return { rows: [{ val: '1' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID }] };
      if (/INSERT INTO articulo/.test(sql)) throw new Error('db failed');
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(
      ArticulosService.create(
        { tipo: 'epp', nombre: 'Casco', nro_serie: 'CAS-0007', bodega_id: BODEGA_ID },
        'user-1',
        { foto: [imageFile] }
      )
    ).rejects.toThrow('db failed');

    expect(logger.warn).toHaveBeenCalledWith('Orphaned file cleanup failed', {
      url: 'uploads/catalogo/casco.jpg',
      error: 'GCS unavailable',
    });
  });

  it('rechaza creación si la bodega no existe o está inactiva', async () => {
    // Mock the pre-transaction bodega check to return empty rows
    db.query.mockResolvedValueOnce({ rows: [] });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/nextval/.test(sql)) return { rows: [{ val: '1' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(
      ArticulosService.create(
        { tipo: 'epp', nombre: 'Casco', nro_serie: 'CAS-0007', bodega_id: BODEGA_ID },
        'user-1'
      )
    ).rejects.toMatchObject({ statusCode: 400, code: 'BODEGA_NOT_FOUND' });
  });
});

describe('ArticulosService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default pre-check: article exists with a codigo
    db.query.mockResolvedValue({ rows: [{ id: ARTICULO_ID, codigo: 'EPP-00001' }] });
  });

  it('borra foto antigua al actualizar con nueva imagen', async () => {
    const imageFile = { originalname: 'casco-v2.jpg' };
    uploadFile.mockResolvedValue({ url: 'uploads/catalogo/casco-v2.jpg', dominantColor: null });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (/SELECT id, foto_url, factura_url, manual_url, nro_serie/.test(sql) || /FOR UPDATE/.test(sql)) {
        return {
          rows: [{ id: ARTICULO_ID, foto_url: 'uploads/catalogo/casco-old.jpg', nro_serie: 'CAS-0001', factura_url: null, manual_url: null }],
        };
      }
      if (/UPDATE articulo SET/.test(sql)) return { rows: [] };
      if (/SELECT a\.\*/.test(sql)) {
        return { rows: [{ id: ARTICULO_ID, nombre: 'Casco', foto_url: 'uploads/catalogo/casco-v2.jpg' }] };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await ArticulosService.update(ARTICULO_ID, { nombre: 'Casco' }, 'user-1', { foto: [imageFile] });

    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/catalogo/casco-old.jpg');
  });

  it('no borra foto antigua si el artículo no tenía foto', async () => {
    const imageFile = { originalname: 'casco-v2.jpg' };
    uploadFile.mockResolvedValue({ url: 'uploads/catalogo/casco-v2.jpg', dominantColor: null });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (/SELECT id, foto_url, factura_url, manual_url, nro_serie/.test(sql) || /FOR UPDATE/.test(sql)) {
        return { rows: [{ id: ARTICULO_ID, foto_url: null, nro_serie: 'CAS-0001', factura_url: null, manual_url: null }] };
      }
      if (/UPDATE articulo SET/.test(sql)) return { rows: [] };
      if (/SELECT a\.\*/.test(sql)) {
        return { rows: [{ id: ARTICULO_ID, foto_url: 'uploads/catalogo/casco-v2.jpg' }] };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await ArticulosService.update(ARTICULO_ID, {}, 'user-1', { foto: [imageFile] });

    expect(deleteFileByUrl).not.toHaveBeenCalledWith(null);
    expect(deleteFileByUrl).not.toHaveBeenCalledWith(undefined);
  });

  it('limpia nueva foto si update falla (no borra la antigua)', async () => {
    const imageFile = { originalname: 'casco-v2.jpg' };
    uploadFile.mockResolvedValue({ url: 'uploads/catalogo/casco-v2.jpg', dominantColor: null });
    deleteFileByUrl.mockResolvedValue(undefined);

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/SELECT id, foto_url, factura_url, manual_url, nro_serie/.test(sql) || /FOR UPDATE/.test(sql)) {
        return {
          rows: [{ id: ARTICULO_ID, foto_url: 'uploads/catalogo/casco-old.jpg', nro_serie: 'CAS-0001', factura_url: null, manual_url: null }],
        };
      }
      if (/UPDATE articulo SET/.test(sql)) throw new Error('db error');
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(
      ArticulosService.update(ARTICULO_ID, {}, 'user-1', { foto: [imageFile] })
    ).rejects.toThrow('db error');

    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/catalogo/casco-v2.jpg');
    expect(deleteFileByUrl).not.toHaveBeenCalledWith('uploads/catalogo/casco-old.jpg');
  });

  it('retorna 404 cuando el artículo no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await expect(ArticulosService.update(ARTICULO_ID, { nombre: 'X' }, 'user-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'ARTICULO_NOT_FOUND',
    });
  });
});

describe('ArticulosService.deletePermanent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Pre-check: no signed actas by default for these legacy tests
    db.query.mockResolvedValue({ rows: [] });
  });

  it('retorna 404 cuando el artículo no existe', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/FOR UPDATE/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(ArticulosService.deletePermanent(ARTICULO_ID, 'user-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'ARTICULO_NOT_FOUND',
    });
  });

  it('retorna 409 cuando el artículo está asignado (custodia activa)', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/FOR UPDATE/.test(sql)) {
        return { rows: [{ id: ARTICULO_ID, estado: 'asignado', foto_url: null, factura_url: null, manual_url: null }] };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(ArticulosService.deletePermanent(ARTICULO_ID, 'user-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ARTICULO_ASSIGNED',
    });
  });

  it('elimina permanentemente y borra la foto si existe', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (/FOR UPDATE/.test(sql)) {
        return { rows: [{ id: ARTICULO_ID, estado: 'en_stock', foto_url: 'uploads/x.jpg', factura_url: null, manual_url: null }] };
      }
      if (/DELETE FROM articulo/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await ArticulosService.deletePermanent(ARTICULO_ID, 'user-1');

    expect(client.query).toHaveBeenCalledWith('DELETE FROM articulo WHERE id = $1', [ARTICULO_ID]);
    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/x.jpg');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});

describe('ArticulosService.deletePermanent — signed actas protection', () => {
  const ARTICLE_ID = '99999999-9999-4999-8999-999999999999';

  beforeEach(() => jest.clearAllMocks());

  it('throws 409 ARTICULO_HAS_SIGNED_ACTAS when article has signed entregas', async () => {
    // First db.query call is the signed-actas pre-check — return a row meaning signed actas exist
    db.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    await expect(
      ArticulosService.deletePermanent(ARTICLE_ID, 'user-1')
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'ARTICULO_HAS_SIGNED_ACTAS',
    });

    // Should NOT open a transaction since we throw before db.pool.connect
    expect(db.pool.connect).not.toHaveBeenCalled();
  });

  it('proceeds to delete transaction when no signed actas exist', async () => {
    // Pre-check returns empty (no signed actas)
    db.query.mockResolvedValueOnce({ rows: [] });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (/SELECT/.test(sql) || /FOR UPDATE/.test(sql)) {
        return { rows: [{ id: ARTICLE_ID, estado: 'en_stock', foto_url: null, factura_url: null, manual_url: null }] };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await ArticulosService.deletePermanent(ARTICLE_ID, 'user-1');
    // Transaction was started — meaning pre-check passed
    expect(db.pool.connect).toHaveBeenCalled();
  });
});

describe('ArticulosService.create — foto optional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea artículo sin foto y sin nro_serie (nro_serie null)', async () => {
    const payload = {
      tipo: 'epp',
      nombre: 'Guante genérico',
      bodega_id: BODEGA_ID,
      // nro_serie intentionally omitted — should default to null
    };

    // Pre-transaction bodega check succeeds
    db.query.mockResolvedValueOnce({ rows: [{ id: BODEGA_ID }] });

    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (/nextval/.test(sql)) return { rows: [{ val: '42' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID }] };
      if (/INSERT INTO articulo/.test(sql)) return { rows: [{ id: ARTICULO_ID }] };
      if (/INSERT INTO articulo_especialidad/.test(sql)) return { rows: [] };
      if (/INSERT INTO movimiento_activo/.test(sql)) return { rows: [] };
      if (/SELECT a\.\*/.test(sql)) {
        return {
          rows: [{ id: ARTICULO_ID, ...payload, nro_serie: null, codigo: 'EPP-00042', estado: 'en_stock' }],
        };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    // No files passed — simulates no-upload path
    const result = await ArticulosService.create(payload, 'user-1', {});

    // uploadFile must NOT be called since no foto file provided
    expect(uploadFile).not.toHaveBeenCalled();
    expect(result.id).toBe(ARTICULO_ID);
    expect(result.nro_serie).toBeNull();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});

describe('ArticulosService.cambiarEstado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza transición de estado no permitida', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/SELECT id, estado, bodega_actual_id, proyecto_actual_id(?:, usuario_actual_id)? FROM articulo/.test(sql)) {
        return {
          rows: [{ id: ARTICULO_ID, estado: 'asignado', bodega_actual_id: BODEGA_ID, proyecto_actual_id: null, usuario_actual_id: null }],
        };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(
      ArticulosService.cambiarEstado(ARTICULO_ID, { nuevo_estado: 'en_stock' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATE_TRANSITION' });
  });

  it('cambia estado en_stock → mantencion correctamente', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (/SELECT id, estado, bodega_actual_id, proyecto_actual_id(?:, usuario_actual_id)? FROM articulo/.test(sql)) {
        return {
          rows: [{ id: ARTICULO_ID, estado: 'en_stock', bodega_actual_id: BODEGA_ID, proyecto_actual_id: null, usuario_actual_id: null }],
        };
      }
      if (/FROM custodia_activo/.test(sql)) return { rows: [] };
      if (/UPDATE articulo SET/.test(sql)) return { rows: [] };
      if (/INSERT INTO movimiento_activo/.test(sql)) return { rows: [] };
      if (/SELECT a\.\*/.test(sql)) {
        return { rows: [{ id: ARTICULO_ID, estado: 'mantencion' }] };
      }
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const result = await ArticulosService.cambiarEstado(
      ARTICULO_ID,
      { nuevo_estado: 'mantencion', motivo: 'Revisión' },
      'user-1'
    );

    expect(result.estado).toBe('mantencion');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rechaza el cambio de estado cuando hay custodia activa', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      if (/SELECT id, estado, bodega_actual_id, proyecto_actual_id(?:, usuario_actual_id)? FROM articulo/.test(sql)) {
        return {
          rows: [{ id: ARTICULO_ID, estado: 'en_stock', bodega_actual_id: BODEGA_ID, proyecto_actual_id: null, usuario_actual_id: null }],
        };
      }
      if (/FROM custodia_activo/.test(sql)) return { rows: [{ id: 'cust-1' }] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(
      ArticulosService.cambiarEstado(ARTICULO_ID, { nuevo_estado: 'mantencion' }, 'user-1')
    ).rejects.toMatchObject({ statusCode: 422, code: 'ACTIVE_CUSTODY_EXISTS' });
  });
});
