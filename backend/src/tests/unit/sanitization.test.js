'use strict';

jest.mock('../../lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockSanitizePlainText = jest.fn((value) => String(value)
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  .replace(/<[^>]*>/g, ''));

jest.mock('isomorphic-dompurify', () => Object.assign(
  jest.fn(() => ({ sanitize: mockSanitizePlainText })),
  { sanitize: mockSanitizePlainText }
));

const { sanitizeStrict } = require('../../middleware/sanitization');

const runSanitizeStrict = (body) => {
  const req = { body, query: {}, params: {} };
  const next = jest.fn();

  sanitizeStrict(req, {}, next);

  expect(next).toHaveBeenCalledWith();
  return req.body;
};

describe('sanitizeStrict', () => {
  it('preserva puntuación válida de texto plano sin convertirla a entidades HTML', () => {
    const body = runSanitizeStrict({
      nombre: 'Esmeril angular 4/2 & "x"',
      nested: { marca: 'Bauker/3M' },
      items: ['A/B'],
    });

    expect(body).toEqual({
      nombre: 'Esmeril angular 4/2 & "x"',
      nested: { marca: 'Bauker/3M' },
      items: ['A/B'],
    });
  });

  it('remueve HTML en campos de texto plano', () => {
    const body = runSanitizeStrict({
      descripcion: '<b>Seguro</b><script>alert(1)</script> 4/2',
    });

    expect(body.descripcion).toBe('Seguro 4/2');
  });

  it('normaliza entidades HTML legadas antes de guardar texto plano', () => {
    const body = runSanitizeStrict({
      nombre: 'Esmeril angular 4&#x2F;2 &amp; &quot;x&quot;',
      descripcion: '&lt;b&gt;Seguro&lt;&#x2F;b&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;',
    });

    expect(body.nombre).toBe('Esmeril angular 4/2 & "x"');
    expect(body.descripcion).toBe('Seguro');
  });
});
