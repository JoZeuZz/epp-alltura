'use strict';

const { sendSuccess } = require('../../lib/apiResponse');

const buildRes = () => ({
  status: jest.fn(function status() { return this; }),
  json: jest.fn(function json(payload) { return payload; }),
});

describe('sendSuccess', () => {
  it('normaliza entidades HTML legadas en datos de respuesta', () => {
    const res = buildRes();
    const createdAt = new Date('2026-06-24T12:00:00.000Z');

    sendSuccess(res, {
      message: 'Plantillas obtenidas',
      data: {
        nombre: 'Esmeril angular 4&#x2F;2 &amp; &quot;x&quot;',
        certificaciones: [{ nombre: 'Certificado A&#x2F;B' }],
        total: 1,
        created_at: createdAt,
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Plantillas obtenidas',
      data: {
        nombre: 'Esmeril angular 4/2 & "x"',
        certificaciones: [{ nombre: 'Certificado A/B' }],
        total: 1,
        created_at: createdAt,
      },
      errors: [],
    });
  });
});
