'use strict';

// Copy of the pure function from articulos.controller.js
function applyLocationFilter(items, ubicacion) {
  if (!ubicacion) return items;
  if (ubicacion === '__none__') {
    return items.filter((a) => a.bodega_nombre == null && a.proyecto_nombre == null);
  }
  return items.filter((a) => a.bodega_nombre === ubicacion || a.proyecto_nombre === ubicacion);
}

const makeItem = (overrides) => ({
  id: 'art-1',
  bodega_nombre: null,
  proyecto_nombre: null,
  estado: 'en_stock',
  ...overrides,
});

describe('applyLocationFilter', () => {
  const items = [
    makeItem({ id: '1', bodega_nombre: 'Bodega Santiago' }),
    makeItem({ id: '2', proyecto_nombre: 'Faena Antofagasta' }),
    makeItem({ id: '3', bodega_nombre: null, proyecto_nombre: null }),
  ];

  it('returns all items when ubicacion is undefined', () => {
    expect(applyLocationFilter(items, undefined)).toHaveLength(3);
  });

  it('returns all items when ubicacion is empty string', () => {
    expect(applyLocationFilter(items, '')).toHaveLength(3);
  });

  it('returns only items with no bodega and no proyecto when ubicacion is __none__', () => {
    const result = applyLocationFilter(items, '__none__');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('returns items matching bodega_nombre', () => {
    const result = applyLocationFilter(items, 'Bodega Santiago');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns items matching proyecto_nombre', () => {
    const result = applyLocationFilter(items, 'Faena Antofagasta');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty array when no items match', () => {
    const result = applyLocationFilter(items, 'Bodega Inexistente');
    expect(result).toHaveLength(0);
  });
});
