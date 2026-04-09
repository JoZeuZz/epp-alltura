/**
 * Utilidades de RUT chileno compartidas entre capas (scripts, servicios, validaciones).
 */

/**
 * Valida un RUT chileno verificando el digito verificador con modulo 11.
 * Acepta formatos: 12345678-9, 12.345.678-9, 12345678-K.
 * @param {string} rut
 * @returns {boolean}
 */
function validateRutChileno(rut) {
  if (!rut || typeof rut !== 'string') return false;
  const clean = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(clean)) return false;

  const dv = clean.slice(-1);
  const digits = clean.slice(0, -1);

  let sum = 0;
  let mul = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expectedDv;
}

/**
 * Normaliza un RUT a formato XXXXXXXX-X (sin puntos, DV en mayuscula).
 * @param {string} rut
 * @returns {string}
 */
function normalizeRut(rut) {
  if (!rut || typeof rut !== 'string') return rut;
  const clean = rut.replace(/\./g, '').toUpperCase().trim();
  if (clean.includes('-')) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

module.exports = {
  validateRutChileno,
  normalizeRut,
};
