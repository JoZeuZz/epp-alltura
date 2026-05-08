const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../', p), 'utf8');

describe('Business rules current state', () => {
  it('articulos forbid legacy fields in route validation', () => {
    const routes = read('routes/articulos.routes.js');

    expect(routes).toContain('tracking_mode ya no se recibe en el payload de artículo');
    expect(routes).toContain('retorno_mode ya no se recibe en el payload de artículo');
    expect(routes).toContain('Use subclasificacion en lugar de categoria');
  });

  it('entregas and devoluciones enforce serial-only flow', () => {
    const entregasService = read('services/entregas.service.js');
    const devolucionesService = read('services/devoluciones.service.js');

    expect(entregasService).toContain('NON_SERIAL_NOT_SUPPORTED');
    expect(entregasService).toContain('SERIAL_ASSETS_REQUIRED');

    expect(devolucionesService).toContain('NON_SERIAL_NOT_SUPPORTED');
    expect(devolucionesService).toContain('SERIAL_ASSETS_REQUIRED');
  });
});
