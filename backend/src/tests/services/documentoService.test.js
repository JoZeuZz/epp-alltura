'use strict';

jest.mock('../../db', () => {
  const query = jest.fn();
  const connect = jest.fn();
  return { query, pool: { connect } };
});

const db = require('../../db');
const { findActaUrl, saveActaUrl } = require('../../services/documentoService');

const TIPO         = 'acta_entrega';
const ENTIDAD_TIPO = 'entrega';
const ENTIDAD_ID   = '11111111-0000-0000-0000-000000000001';
const ARCHIVO_URL  = 'https://storage.googleapis.com/bucket/actas/test.pdf';
const USER_ID      = 'user-1';
const DOC_ID       = 'doc-00000000-0000-0000-0000-000000000001';

function makeClient(queryImpl) {
  return { query: jest.fn(queryImpl), release: jest.fn() };
}

describe('documentoService.findActaUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns archivo_url when a cached entry exists', async () => {
    db.query.mockResolvedValue({ rows: [{ archivo_url: ARCHIVO_URL }] });
    const result = await findActaUrl(TIPO, ENTIDAD_TIPO, ENTIDAD_ID);
    expect(result).toBe(ARCHIVO_URL);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM documento'),
      [TIPO, ENTIDAD_TIPO, ENTIDAD_ID]
    );
  });

  it('returns null when no entry exists', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const result = await findActaUrl(TIPO, ENTIDAD_TIPO, ENTIDAD_ID);
    expect(result).toBeNull();
  });
});

describe('documentoService.saveActaUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('runs BEGIN → DELETE → INSERT documento → INSERT referencia → COMMIT in order', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return {};
      if (/DELETE FROM documento/.test(sql)) return {};
      if (/INSERT INTO documento\b/.test(sql)) return { rows: [{ id: DOC_ID }] };
      if (/INSERT INTO documento_referencia/.test(sql)) return {};
      return {};
    });
    db.pool.connect.mockResolvedValue(client);

    await saveActaUrl(TIPO, ENTIDAD_TIPO, ENTIDAD_ID, ARCHIVO_URL, USER_ID);

    const sqls = client.query.mock.calls.map(c => c[0]);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls.some(s => /DELETE FROM documento/.test(s))).toBe(true);
    expect(sqls.some(s => /INSERT INTO documento\b/.test(s))).toBe(true);
    expect(sqls.some(s => /INSERT INTO documento_referencia/.test(s))).toBe(true);
    expect(sqls[sqls.length - 1]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('rolls back on error and releases client', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return {};
      throw new Error('db error');
    });
    db.pool.connect.mockResolvedValue(client);

    await expect(
      saveActaUrl(TIPO, ENTIDAD_TIPO, ENTIDAD_ID, ARCHIVO_URL, USER_ID)
    ).rejects.toThrow('db error');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('passes archivo_url and userId to INSERT documento', async () => {
    const client = makeClient(async (sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return {};
      if (/DELETE/.test(sql)) return {};
      if (/INSERT INTO documento\b/.test(sql)) {
        expect(params).toContain(ARCHIVO_URL);
        expect(params).toContain(USER_ID);
        return { rows: [{ id: DOC_ID }] };
      }
      if (/INSERT INTO documento_referencia/.test(sql)) return {};
      return {};
    });
    db.pool.connect.mockResolvedValue(client);
    await saveActaUrl(TIPO, ENTIDAD_TIPO, ENTIDAD_ID, ARCHIVO_URL, USER_ID);
  });
});
