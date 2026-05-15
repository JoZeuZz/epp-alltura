const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../', p), 'utf8');

describe('Business rules current state', () => {
  it('articulos route uses the physical-item contract (tipo / nro_serie / bodega)', () => {
    const routes = read('routes/articulos.routes.js');

    expect(routes).toMatch(/tipo:\s*Joi\.string\(\)\.valid/);
    expect(routes).toMatch(/nro_serie:\s*Joi\.string\(\)/);
    expect(routes).toMatch(/bodega_id:\s*Joi\.string\(\)\.uuid\(\)/);
    // Legacy catalog fields must no longer appear in the validation schema.
    expect(routes).not.toContain('grupo_principal');
    expect(routes).not.toContain('subclasificacion');
    expect(routes).not.toContain('tracking_mode');
    expect(routes).not.toContain('retorno_mode');
  });

  it('entregas enforce per-article serial flow against the articulo table', () => {
    const entregasService = read('services/entregas.service.js');

    expect(entregasService).toContain("FROM articulo");
    expect(entregasService).toContain("'ASSET_NOT_AVAILABLE'");
    expect(entregasService).toContain("'ACTIVE_CUSTODY_EXISTS'");
    expect(entregasService).toContain("en_stock");
    // Legacy lote/cantidad based flow must be gone.
    expect(entregasService).not.toContain('lote_id');
  });

  it('devoluciones operate on custodia_id against the articulo table', () => {
    const devolucionesService = read('services/devoluciones.service.js');

    expect(devolucionesService).toContain('custodia_id');
    expect(devolucionesService).toContain("'CUSTODY_NOT_ACTIVE'");
    expect(devolucionesService).toContain("'CUSTODY_NOT_FOUND'");
    expect(devolucionesService).toContain('FROM custodia_activo');
    // Legacy custodia_activo_id / activo_ids based flow must be gone.
    expect(devolucionesService).not.toContain('custodia_activo_id');
  });
});
