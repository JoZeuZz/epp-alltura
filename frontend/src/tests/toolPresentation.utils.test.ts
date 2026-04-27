import {
  getToolActionFlags,
  getToolRawStatus,
  getToolStatusBadgeClasses,
  getToolStatusDotClasses,
  getToolStatusLabel,
  getToolVisibleCode,
  getToolVisibleLocation,
  getToolVisibleMonetaryValue,
  getToolVisibleName,
  getToolVisibleResponsible,
  getToolVisibleSerial,
} from '../utils/toolPresentation';

describe('toolPresentation helpers', () => {
  it('expone estado legible para estados conocidos y desconocidos', () => {
    expect(getToolStatusLabel('en_stock')).toBe('Disponible');
    expect(getToolStatusLabel('asignado')).toBe('Asignado');
    expect(getToolStatusLabel('estado_custom')).toBe('estado_custom');
  });

  it('retorna badge class coherente por estado visual', () => {
    expect(getToolStatusBadgeClasses('en_stock')).toContain('green');
    expect(getToolStatusBadgeClasses('asignado')).toContain('blue');
    expect(getToolStatusBadgeClasses('dado_de_baja')).toContain('red');
  });

  it('formatea moneda CLP y fallback monetario', () => {
    expect(getToolVisibleMonetaryValue({ valor: 120000 })).toMatch(/\$\s?120\.?000/);
    expect(getToolVisibleMonetaryValue({ valor_monetario: '99000' })).toMatch(/\$/);
    expect(getToolVisibleMonetaryValue({})).toBe('Sin valor registrado');
  });

  it('resuelve fallback de responsable correctamente', () => {
    expect(getToolVisibleResponsible({ responsable_nombre: 'Ana Rojas' })).toBe('Ana Rojas');
    expect(getToolVisibleResponsible({ custodio_nombres: 'Juan', custodio_apellidos: 'Pérez' })).toBe('Juan Pérez');
    expect(getToolVisibleResponsible({})).toBe('Sin responsable');
  });

  it('resuelve campos visibles con datos completos', () => {
    const tool = {
      id: 'a1',
      codigo: 'TAL-001',
      articulo_nombre: 'Taladro',
      nro_serie: 'SER-123',
      estado: 'en_stock',
      ubicacion_nombre: 'Bodega Central',
      valor: 120000,
    };

    expect(getToolVisibleCode(tool)).toBe('TAL-001');
    expect(getToolVisibleName(tool)).toBe('Taladro');
    expect(getToolVisibleSerial(tool)).toBe('SER-123');
    expect(getToolVisibleLocation(tool)).toBe('Bodega Central');
    expect(getToolVisibleMonetaryValue(tool)).toContain('$');
    expect(getToolRawStatus(tool)).toBe('en_stock');
    expect(getToolStatusLabel(tool.estado)).toBe('Disponible');
    expect(getToolStatusBadgeClasses(tool.estado)).toContain('green');
    expect(getToolStatusDotClasses(tool.estado)).toContain('green');
  });

  it('aplica fallbacks seguros cuando faltan datos', () => {
    const tool = {
      id: 'a2',
      estado: 'unknown_state',
    };

    expect(getToolVisibleCode(tool)).toBe('a2');
    expect(getToolVisibleName(tool)).toBe('Herramienta sin nombre');
    expect(getToolVisibleSerial(tool)).toBeNull();
    expect(getToolVisibleLocation(tool)).toBe('Sin ubicación');
    expect(getToolVisibleResponsible(tool)).toBe('Sin responsable');
    expect(getToolVisibleMonetaryValue(tool)).toBe('Sin valor registrado');
    expect(getToolStatusLabel(tool.estado)).toBe('unknown_state');
  });

  it('calcula flags de acciones según reglas actuales', () => {
    expect(getToolActionFlags({ id: '1', estado: 'en_stock' })).toEqual({
      canAssign: true,
      canReturn: false,
      canRelocate: true,
      canChangeStatus: true,
      canEdit: true,
    });

    expect(getToolActionFlags({ id: '2', estado: 'asignado', custodio_trabajador_id: 't1' })).toEqual({
      canAssign: false,
      canReturn: true,
      canRelocate: false,
      canChangeStatus: false,
      canEdit: true,
    });

    expect(getToolActionFlags({ id: '3', estado: 'mantenimiento' })).toEqual({
      canAssign: false,
      canReturn: false,
      canRelocate: false,
      canChangeStatus: true,
      canEdit: true,
    });
  });
});
