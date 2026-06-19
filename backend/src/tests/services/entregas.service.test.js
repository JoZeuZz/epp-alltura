jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));
jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
  deleteFileByUrl: jest.fn(),
  resolveHeaderImages: jest.fn(async (row) => row),
}));
jest.mock('../../lib/auditoriaDb', () => ({ writeAuditEvent: jest.fn(async () => {}) }));

const db = require('../../db');
const { writeAuditEvent } = require('../../lib/auditoriaDb');
const EntregasService = require('../../services/entregas.service');

const ENTREGA_ID  = 'a1111111-1111-4111-8111-111111111111';
const USER_ID     = 'a2222222-2222-4222-8222-222222222222';
const WORKER_ID   = 'a3333333-3333-4333-8333-333333333333';
const BODEGA_ID   = 'a4444444-4444-4444-8444-444444444444';
const PROYECTO_ID = 'a5555555-5555-4555-8555-555555555555';
const ARTICULO_ID = 'a6666666-6666-4666-8666-666666666666';

const HEADER_ROW = {
  id: ENTREGA_ID, creado_por_usuario_id: USER_ID, trabajador_id: WORKER_ID,
  nombres: 'Juan', apellidos: 'Pérez', rut: '12345678-9',
  creador_nombres: null, creador_apellidos: null,
  ubicacion_origen_id: BODEGA_ID, usuario_origen_id: null,
  ubicacion_destino_id: PROYECTO_ID, tipo: 'entrega', estado: 'borrador',
  nota_destino: null, motivo_anulacion: null, creado_en: new Date(),
  confirmada_en: null, fecha_devolucion_esperada: null,
  evidencia_foto_url: 'http://test/img.jpg',
  firmado_en: null, firma_imagen_url: null, cantidad_items: 1,
};

const PAYLOAD = {
  trabajador_id: WORKER_ID,
  ubicacion_origen_id: BODEGA_ID,
  ubicacion_destino_id: PROYECTO_ID,
  evidencia_foto_url: 'http://test/img.jpg',
  detalles: [{ articulo_id: ARTICULO_ID, condicion_salida: 'ok' }],
};

function makeClient(queryImpl) {
  return { query: jest.fn(queryImpl), release: jest.fn() };
}

function makeHappyCreateClient() {
  return makeClient(async (sql) => {
    if (/BEGIN|COMMIT/.test(sql)) return { rows: [] };
    if (/FROM trabajador/.test(sql)) return { rows: [{ id: WORKER_ID, estado: 'activo', persona_estado: 'activo' }] };
    if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID, estado: 'activo' }] };
    if (/FROM proyectos/.test(sql)) return { rows: [{ id: PROYECTO_ID, estado: 'activo' }] };
    if (/FROM articulo/.test(sql)) return { rows: [{ id: ARTICULO_ID, estado: 'en_stock', bodega_actual_id: BODEGA_ID, label: 'Casco' }] };
    if (/FROM custodia_activo/.test(sql)) return { rows: [] };
    if (/borrador.*pendiente_firma|pendiente_firma.*borrador/.test(sql)) return { rows: [] };
    if (/INSERT INTO entrega\b/.test(sql)) return { rows: [{ id: ENTREGA_ID }] };
    if (/INSERT INTO entrega_detalle/.test(sql)) return { rows: [] };
    if (/FROM entrega e/.test(sql)) return { rows: [HEADER_ROW] };
    if (/FROM entrega_detalle ed/.test(sql)) return { rows: [] };
    return { rows: [] };
  });
}

beforeEach(() => jest.clearAllMocks());

describe('EntregasService.create', () => {
  test('feliz: inserta entrega + detalle, escribe audit event, hace COMMIT', async () => {
    const client = makeHappyCreateClient();
    db.pool.connect.mockResolvedValue(client);

    const result = await EntregasService.create(PAYLOAD, USER_ID);

    expect(result.id).toBe(ENTREGA_ID);
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'crear', entidadTipo: 'entrega', entidadId: ENTREGA_ID })
    );
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[sqls.length - 1]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test('trabajador inactivo → WORKER_NOT_ACTIVE (400), ROLLBACK, release', async () => {
    const client = makeClient(async (sql) => {
      if (/BEGIN|ROLLBACK/.test(sql)) return { rows: [] };
      if (/FROM trabajador/.test(sql)) return { rows: [{ id: WORKER_ID, estado: 'inactivo', persona_estado: 'activo' }] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const err = await EntregasService.create(PAYLOAD, USER_ID).catch((e) => e);

    expect(err.code).toBe('WORKER_NOT_ACTIVE');
    expect(err.statusCode).toBe(400);
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('artículo no en_stock → ASSET_NOT_AVAILABLE (409)', async () => {
    const client = makeClient(async (sql) => {
      if (/BEGIN|ROLLBACK/.test(sql)) return { rows: [] };
      if (/FROM trabajador/.test(sql)) return { rows: [{ id: WORKER_ID, estado: 'activo', persona_estado: 'activo' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID, estado: 'activo' }] };
      if (/FROM proyectos/.test(sql)) return { rows: [{ id: PROYECTO_ID, estado: 'activo' }] };
      if (/FROM articulo/.test(sql)) return { rows: [{ id: ARTICULO_ID, estado: 'asignado', bodega_actual_id: BODEGA_ID, label: 'Casco' }] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const err = await EntregasService.create(PAYLOAD, USER_ID).catch((e) => e);

    expect(err.code).toBe('ASSET_NOT_AVAILABLE');
    expect(err.statusCode).toBe(409);
  });

  test('error en INSERT → ROLLBACK + release', async () => {
    const client = makeClient(async (sql) => {
      if (/BEGIN|ROLLBACK/.test(sql)) return { rows: [] };
      if (/FROM trabajador/.test(sql)) return { rows: [{ id: WORKER_ID, estado: 'activo', persona_estado: 'activo' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID, estado: 'activo' }] };
      if (/FROM proyectos/.test(sql)) return { rows: [{ id: PROYECTO_ID, estado: 'activo' }] };
      if (/FROM articulo/.test(sql)) return { rows: [{ id: ARTICULO_ID, estado: 'en_stock', bodega_actual_id: BODEGA_ID, label: 'Casco' }] };
      if (/FROM custodia_activo/.test(sql)) return { rows: [] };
      if (/INSERT INTO entrega\b/.test(sql)) throw new Error('DB failure mid-transaction');
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const err = await EntregasService.create(PAYLOAD, USER_ID).catch((e) => e);

    expect(err.message).toBe('DB failure mid-transaction');
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('EntregasService.confirm', () => {
  test('feliz (bodega path): transiciona artículo a asignado, crea custodia, audit, COMMIT', async () => {
    const ENTREGA_ROW = {
      id: ENTREGA_ID, estado: 'borrador', trabajador_id: WORKER_ID,
      bodega_origen_id: BODEGA_ID, proyecto_destino_id: PROYECTO_ID,
      usuario_origen_id: null, fecha_devolucion_esperada: null, nota_destino: null,
    };
    const client = makeClient(async (sql) => {
      if (/BEGIN|COMMIT/.test(sql)) return { rows: [] };
      if (/FROM entrega\n/.test(sql)) return { rows: [ENTREGA_ROW] };
      if (/FROM firma_entrega/.test(sql)) return { rows: [{ id: 'firma-1' }] };
      if (/FROM entrega_detalle\n/.test(sql)) return { rows: [{ id: 'det-1', articulo_id: ARTICULO_ID, notas: null }] };
      if (/FROM articulo/.test(sql)) return { rows: [{ id: ARTICULO_ID, estado: 'en_stock', bodega_actual_id: BODEGA_ID, usuario_actual_id: null, label: 'Casco' }] };
      if (/FROM custodia_activo/.test(sql)) return { rows: [] };
      if (/UPDATE articulo/.test(sql)) return { rows: [] };
      if (/INSERT INTO custodia_activo/.test(sql)) return { rows: [] };
      if (/INSERT INTO movimiento_activo/.test(sql)) return { rows: [] };
      if (/UPDATE entrega/.test(sql)) return { rows: [] };
      if (/FROM entrega e/.test(sql)) return { rows: [HEADER_ROW] };
      if (/FROM entrega_detalle ed/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const result = await EntregasService.confirm(ENTREGA_ID, USER_ID);

    expect(result.id).toBe(ENTREGA_ID);
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'actualizar', entidadTipo: 'entrega' })
    );
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls[sqls.length - 1]).toBe('COMMIT');
    expect(client.query.mock.calls.some(([q]) => /INSERT INTO custodia_activo/.test(q))).toBe(true);
  });
});

describe('EntregasService.list — new filters', () => {
  beforeEach(() => {
    db.query.mockResolvedValue({ rows: [] });
  });

  test('estado_in passes array to ANY($n::text[])', async () => {
    await EntregasService.list({ estado_in: 'borrador,pendiente_firma' });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toMatch(/e\.estado = ANY\(/);
  });

  test('articulo_id adds EXISTS subquery', async () => {
    await EntregasService.list({ articulo_id: ARTICULO_ID });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toMatch(/EXISTS.*entrega_detalle/s);
  });

  test('empty list returned when db has no rows', async () => {
    const result = await EntregasService.list({ estado_in: 'borrador' });
    expect(result).toEqual([]);
  });
});

describe('EntregasService.anular', () => {
  test('entrega borrador → estado anulada, escribe audit event, COMMIT', async () => {
    const client = makeClient(async (sql) => {
      if (/BEGIN|COMMIT/.test(sql)) return { rows: [] };
      if (/FROM entrega\n/.test(sql)) return { rows: [{ id: ENTREGA_ID, estado: 'borrador' }] };
      if (/UPDATE entrega/.test(sql)) return { rows: [] };
      if (/FROM entrega e/.test(sql)) return { rows: [HEADER_ROW] };
      if (/FROM entrega_detalle ed/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const result = await EntregasService.anular(ENTREGA_ID, { motivo: 'Error de prueba' }, USER_ID);

    expect(result.id).toBe(ENTREGA_ID);
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'actualizar',
        entidadTipo: 'entrega',
        diff: expect.objectContaining({ estado: 'anulada' }),
      })
    );
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls[sqls.length - 1]).toBe('COMMIT');
  });
});

describe('EntregasService.create — deduplication', () => {
  const EXISTING_ENTREGA_ID = 'b1111111-1111-4111-8111-111111111111';

  function makeDedupClient(duplicateFound) {
    return makeClient(async (sql) => {
      if (/BEGIN|ROLLBACK/.test(sql)) return { rows: [] };
      if (/FROM trabajador/.test(sql)) return { rows: [{ id: WORKER_ID, estado: 'activo', persona_estado: 'activo' }] };
      if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_ID, estado: 'activo' }] };
      if (/FROM proyectos/.test(sql)) return { rows: [{ id: PROYECTO_ID, estado: 'activo' }] };
      if (/FROM articulo/.test(sql)) return { rows: [{ id: ARTICULO_ID, estado: 'en_stock', bodega_actual_id: BODEGA_ID, label: 'Casco' }] };
      if (/FROM custodia_activo/.test(sql)) return { rows: [] };
      // Dedup query: matches borrador/pendiente_firma check
      if (/borrador.*pendiente_firma|pendiente_firma.*borrador/.test(sql)) {
        return duplicateFound
          ? { rows: [{ id: EXISTING_ENTREGA_ID }] }
          : { rows: [] };
      }
      // _getByIdWithClient queries (called when duplicate found)
      if (/FROM entrega e/.test(sql)) return { rows: [{ ...HEADER_ROW, id: EXISTING_ENTREGA_ID }] };
      if (/FROM entrega_detalle ed/.test(sql)) return { rows: [] };
      return { rows: [] };
    });
  }

  test('duplicate found → throws DELIVERY_DRAFT_EXISTS (409) with existing_entrega', async () => {
    const client = makeDedupClient(true);
    db.pool.connect.mockResolvedValue(client);

    const err = await EntregasService.create(PAYLOAD, USER_ID).catch((e) => e);

    expect(err.code).toBe('DELIVERY_DRAFT_EXISTS');
    expect(err.statusCode).toBe(409);
    expect(err.data).toMatchObject({ existing_entrega: expect.objectContaining({ id: EXISTING_ENTREGA_ID }) });
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls).toContain('ROLLBACK');
  });

  test('no duplicate → proceeds normally (INSERT called)', async () => {
    const client = makeDedupClient(false);
    // Override INSERT + _getByIdWithClient (needed after dedup returns empty)
    const origImpl = client.query.getMockImplementation();
    client.query.mockImplementation(async (sql) => {
      if (/INSERT INTO entrega\b/.test(sql)) return { rows: [{ id: ENTREGA_ID }] };
      if (/INSERT INTO entrega_detalle/.test(sql)) return { rows: [] };
      if (/borrador.*pendiente_firma|pendiente_firma.*borrador/.test(sql)) return { rows: [] };
      if (/FROM entrega e/.test(sql)) return { rows: [HEADER_ROW] };
      if (/FROM entrega_detalle ed/.test(sql)) return { rows: [] };
      return origImpl(sql);
    });
    db.pool.connect.mockResolvedValue(client);

    const result = await EntregasService.create(PAYLOAD, USER_ID);
    expect(result.id).toBe(ENTREGA_ID);
  });
});
