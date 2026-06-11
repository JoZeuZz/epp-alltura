jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));
jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
  deleteFileByUrl: jest.fn(),
  resolveImageUrl: jest.fn(async (url) => (url ? `/resolved/${url}` : url)),
  resolveHeaderImages: jest.fn(async (row) => row),
}));
jest.mock('../../lib/auditoriaDb', () => ({ writeAuditEvent: jest.fn(async () => {}) }));
jest.mock('../../lib/signatureUtils', () => ({ requirePrivilegedActor: jest.fn() }));

const db = require('../../db');
const { writeAuditEvent } = require('../../lib/auditoriaDb');
const DevolucionesService = require('../../services/devoluciones.service');

const DEVOLUCION_ID       = 'b1111111-1111-4111-8111-111111111111';
const USER_ID             = 'b2222222-2222-4222-8222-222222222222';
const WORKER_ID           = 'b3333333-3333-4333-8333-333333333333';
const BODEGA_RECEPCION_ID = 'b4444444-4444-4444-8444-444444444444';
const CUSTODIA_ID         = 'b5555555-5555-4555-8555-555555555555';
const ARTICULO_ID         = 'b6666666-6666-4666-8666-666666666666';
const PROYECTO_ID         = 'b7777777-7777-4777-8777-777777777777';

const DEVOLUCION_HEADER = {
  id: DEVOLUCION_ID, trabajador_id: WORKER_ID, recibido_por_usuario_id: USER_ID,
  ubicacion_recepcion_id: BODEGA_RECEPCION_ID, estado: 'borrador',
  creado_en: new Date(), confirmada_en: null, notas: null,
  evidencia_foto_url: 'http://test/img.jpg',
  nombres: 'Juan', apellidos: 'Pérez', rut: '12345678-9',
  receptor_nombres: null, receptor_apellidos: null, cantidad_detalles: 1,
  firma_imagen_url: null, firmado_en: null, texto_aceptacion: null,
};

const PAYLOAD = {
  trabajador_id: WORKER_ID,
  ubicacion_recepcion_id: BODEGA_RECEPCION_ID,
  evidencia_foto_url: 'http://test/img.jpg',
  notas: null,
  detalles: [{ custodia_id: CUSTODIA_ID, condicion_entrada: 'ok', disposicion: 'devuelto' }],
};

function makeClient(queryImpl) {
  return { query: jest.fn(queryImpl), release: jest.fn() };
}

function makeHappyCreateClient() {
  return makeClient(async (sql) => {
    if (/BEGIN|COMMIT/.test(sql)) return { rows: [] };
    if (/FROM trabajador/.test(sql)) return { rows: [{ id: WORKER_ID, estado: 'activo', persona_estado: 'activo' }] };
    if (/FROM bodegas/.test(sql)) return { rows: [{ id: BODEGA_RECEPCION_ID, estado: 'activo' }] };
    if (/FROM custodia_activo ca/.test(sql)) return { rows: [{ id: CUSTODIA_ID, articulo_id: ARTICULO_ID, trabajador_id: WORKER_ID, proyecto_id: PROYECTO_ID, estado: 'activa', label: 'Casco' }] };
    if (/INSERT INTO devolucion\b/.test(sql)) return { rows: [{ id: DEVOLUCION_ID }] };
    if (/INSERT INTO devolucion_detalle/.test(sql)) return { rows: [] };
    if (/FROM devolucion d/.test(sql)) return { rows: [DEVOLUCION_HEADER] };
    if (/FROM devolucion_detalle dd/.test(sql)) return { rows: [] };
    return { rows: [] };
  });
}

function makeConfirmClient(disposicion) {
  const DEVOLUCION_ROW = {
    id: DEVOLUCION_ID, estado: 'borrador', trabajador_id: WORKER_ID,
    bodega_recepcion_id: BODEGA_RECEPCION_ID,
  };
  return makeClient(async (sql) => {
    if (/BEGIN|COMMIT/.test(sql)) return { rows: [] };
    if (/FROM devolucion\n/.test(sql)) return { rows: [DEVOLUCION_ROW] };
    if (/FROM firma_devolucion/.test(sql)) return { rows: [{ id: 'firma-1' }] };
    if (/FROM devolucion_detalle\n/.test(sql)) return { rows: [{ id: 'dd-1', custodia_id: CUSTODIA_ID, articulo_id: ARTICULO_ID, disposicion, notas: null }] };
    if (/FROM custodia_activo\n/.test(sql)) return { rows: [{ id: CUSTODIA_ID, articulo_id: ARTICULO_ID, trabajador_id: WORKER_ID, proyecto_id: PROYECTO_ID, estado: 'activa' }] };
    if (/FROM articulo/.test(sql)) return { rows: [{ id: ARTICULO_ID, estado: 'asignado', proyecto_actual_id: PROYECTO_ID, label: 'Casco' }] };
    if (/UPDATE custodia_activo/.test(sql)) return { rows: [] };
    if (/UPDATE articulo/.test(sql)) return { rows: [] };
    if (/INSERT INTO movimiento_activo/.test(sql)) return { rows: [] };
    if (/UPDATE devolucion/.test(sql)) return { rows: [] };
    if (/FROM devolucion d/.test(sql)) return { rows: [DEVOLUCION_HEADER] };
    if (/FROM devolucion_detalle dd/.test(sql)) return { rows: [] };
    return { rows: [] };
  });
}

beforeEach(() => jest.clearAllMocks());

describe('DevolucionesService.create', () => {
  test('feliz: inserta devolucion + detalle, escribe audit event, COMMIT', async () => {
    const client = makeHappyCreateClient();
    db.pool.connect.mockResolvedValue(client);

    const result = await DevolucionesService.create(PAYLOAD, USER_ID);

    expect(result.id).toBe(DEVOLUCION_ID);
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'crear', entidadTipo: 'devolucion', entidadId: DEVOLUCION_ID })
    );
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[sqls.length - 1]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test('error de validación (trabajador no encontrado) → ROLLBACK + release', async () => {
    const client = makeClient(async (sql) => {
      if (/BEGIN|ROLLBACK/.test(sql)) return { rows: [] };
      if (/FROM trabajador/.test(sql)) return { rows: [] }; // not found
      return { rows: [] };
    });
    db.pool.connect.mockResolvedValue(client);

    const err = await DevolucionesService.create(PAYLOAD, USER_ID).catch((e) => e);

    expect(err.code).toBe('WORKER_NOT_FOUND');
    const sqls = client.query.mock.calls.map(([q]) => q.trim());
    expect(sqls).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('DevolucionesService.confirm — mapeo de disposicion', () => {
  test('devuelto → custodia=devuelta, artículo=en_stock con bodega_actual_id set', async () => {
    const client = makeConfirmClient('devuelto');
    db.pool.connect.mockResolvedValue(client);

    const result = await DevolucionesService.confirm(DEVOLUCION_ID, USER_ID);

    expect(result.id).toBe(DEVOLUCION_ID);
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'actualizar', entidadTipo: 'devolucion' })
    );
    // returnsToStock=true → UPDATE articulo con [estado, bodega_actual_id, articulo_id]
    const updateArticuloCall = client.query.mock.calls.find(([q]) => /UPDATE articulo/.test(q));
    expect(updateArticuloCall[1]).toEqual(['en_stock', BODEGA_RECEPCION_ID, ARTICULO_ID]);
    // custodia → devuelta
    const updateCustodiaCall = client.query.mock.calls.find(([q]) => /UPDATE custodia_activo/.test(q));
    expect(updateCustodiaCall[1][0]).toBe('devuelta');
  });

  test('perdido → custodia=perdida, artículo=perdido sin bodega ni proyecto', async () => {
    const client = makeConfirmClient('perdido');
    db.pool.connect.mockResolvedValue(client);

    await DevolucionesService.confirm(DEVOLUCION_ID, USER_ID);

    // returnsToStock=false → UPDATE articulo con [estado, articulo_id] (NULL locations en SQL)
    const updateArticuloCall = client.query.mock.calls.find(([q]) => /UPDATE articulo/.test(q));
    expect(updateArticuloCall[1]).toEqual(['perdido', ARTICULO_ID]);
    const updateCustodiaCall = client.query.mock.calls.find(([q]) => /UPDATE custodia_activo/.test(q));
    expect(updateCustodiaCall[1][0]).toBe('perdida');
  });

  test('baja → custodia=baja, artículo=dado_de_baja sin bodega ni proyecto', async () => {
    const client = makeConfirmClient('baja');
    db.pool.connect.mockResolvedValue(client);

    await DevolucionesService.confirm(DEVOLUCION_ID, USER_ID);

    const updateArticuloCall = client.query.mock.calls.find(([q]) => /UPDATE articulo/.test(q));
    expect(updateArticuloCall[1]).toEqual(['dado_de_baja', ARTICULO_ID]);
    const updateCustodiaCall = client.query.mock.calls.find(([q]) => /UPDATE custodia_activo/.test(q));
    expect(updateCustodiaCall[1][0]).toBe('baja');
  });
});
