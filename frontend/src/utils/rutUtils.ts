import { validateRut, formatRut, RutFormat } from '@fdograph/rut-utilities';

/**
 * Valida si un RUT chileno es válido (verifica el dígito verificador matemáticamente).
 * Acepta formatos: "12345678-9", "12.345.678-9", "12345678-K".
 */
export const isValidRut = (rut: string): boolean => validateRut(rut, false);

/**
 * Normaliza un RUT al formato de almacenamiento: XXXXXXXX-X (sin puntos, con guion).
 * Ejemplo: "12.345.678-9" → "12345678-9"
 */
export const normalizeRut = (rut: string): string => formatRut(rut, RutFormat.DASH);

