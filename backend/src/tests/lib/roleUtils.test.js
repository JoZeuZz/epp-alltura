const {
  toDbRole,
  toExternalRole,
  normalizeDbRoles,
  buildCompatibleRoles,
  hasAnyRequiredRole,
} = require('../../lib/roleUtils');

describe('roleUtils authenticable roles', () => {
  it('keeps only admin and supervisor as valid database roles', () => {
    expect(toDbRole('admin')).toBe('admin');
    expect(toDbRole('supervisor')).toBe('supervisor');
    expect(toDbRole('bodega')).toBeNull();
    expect(toDbRole('trabajador')).toBeNull();
    expect(toDbRole('worker')).toBeNull();
    expect(toDbRole('client')).toBeNull();
  });

  it('does not expose legacy external role aliases', () => {
    expect(toExternalRole('admin')).toBe('admin');
    expect(toExternalRole('supervisor')).toBe('supervisor');
    expect(toExternalRole('trabajador')).toBeNull();
    expect(toExternalRole('worker')).toBeNull();
  });

  it('normalizes mixed stored roles by dropping legacy login roles', () => {
    expect(normalizeDbRoles(['supervisor', 'bodega', 'worker', 'client', 'trabajador'])).toEqual([
      'supervisor',
    ]);
    expect(buildCompatibleRoles(['trabajador', 'worker', 'client'])).toEqual({
      dbRoles: [],
      compatibleRoles: [],
    });
  });

  it('does not authorize legacy roles in permission checks', () => {
    expect(hasAnyRequiredRole(['supervisor'], ['supervisor'])).toBe(true);
    expect(hasAnyRequiredRole(['bodega'], ['supervisor'])).toBe(false);
    expect(hasAnyRequiredRole(['worker', 'trabajador', 'client'], ['supervisor'])).toBe(false);
  });
});
