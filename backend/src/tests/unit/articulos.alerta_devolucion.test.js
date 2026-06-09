'use strict';

describe('alerta_devolucion logic', () => {
  const computeAlertaDevolucion = (proyectoEstado, proyectoActualId) => {
    return proyectoEstado === 'finalizado' && proyectoActualId != null;
  };

  it('es true cuando proyecto_estado es finalizado y hay proyecto_actual_id', () => {
    expect(computeAlertaDevolucion('finalizado', 'some-uuid')).toBe(true);
  });

  it('es false cuando proyecto_estado es activo', () => {
    expect(computeAlertaDevolucion('activo', 'some-uuid')).toBe(false);
  });

  it('es false cuando proyecto_estado es inactivo', () => {
    expect(computeAlertaDevolucion('inactivo', 'some-uuid')).toBe(false);
  });

  it('es false cuando proyecto_actual_id es null aunque estado sea finalizado', () => {
    expect(computeAlertaDevolucion('finalizado', null)).toBe(false);
  });

  it('es false cuando proyecto_estado es null (artículo en bodega)', () => {
    expect(computeAlertaDevolucion(null, null)).toBe(false);
  });
});
