'use strict';

const GRUPOS_VALIDOS = new Set(['equipo', 'herramienta']);

const SUBCLASIFICACIONES_POR_GRUPO = {
  equipo: new Set(['epp', 'medicion_ensayos']),
  herramienta: new Set(['manual', 'electrica_cable', 'inalambrica_bateria']),
};

const ESPECIALIDADES_VALIDAS = new Set([
  'oocc',
  'ooee',
  'equipos',
  'trabajos_verticales_lineas_de_vida',
]);

const SUBCLASIFICACIONES_NO_SERIALES = new Set(['epp']);

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const normalizeGrupoPrincipal = (value) => {
  if (value === undefined) return undefined;
  const normalized = normalizeKey(value);
  return GRUPOS_VALIDOS.has(normalized) ? normalized : null;
};

const normalizeSubclasificacion = (value, grupoPrincipal) => {
  if (value === undefined) return undefined;
  const normalized = normalizeKey(value);
  if (!normalized) return null;

  if (!grupoPrincipal) {
    const allowedInAnyGroup = Object.values(SUBCLASIFICACIONES_POR_GRUPO).some((set) =>
      set.has(normalized)
    );
    return allowedInAnyGroup ? normalized : null;
  }

  const allowedForGroup = SUBCLASIFICACIONES_POR_GRUPO[grupoPrincipal];
  return allowedForGroup && allowedForGroup.has(normalized) ? normalized : null;
};

const normalizeEspecialidades = (value) => {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const key = normalizeKey(item);
    if (!key || !ESPECIALIDADES_VALIDAS.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
};

const resolveTrackingMode = (subclasificacion) => {
  if (!subclasificacion) return 'serial';
  return SUBCLASIFICACIONES_NO_SERIALES.has(subclasificacion) ? 'lote' : 'serial';
};

module.exports = {
  GRUPOS_VALIDOS,
  SUBCLASIFICACIONES_POR_GRUPO,
  ESPECIALIDADES_VALIDAS,
  SUBCLASIFICACIONES_NO_SERIALES,
  normalizeGrupoPrincipal,
  normalizeSubclasificacion,
  normalizeEspecialidades,
  resolveTrackingMode,
};
