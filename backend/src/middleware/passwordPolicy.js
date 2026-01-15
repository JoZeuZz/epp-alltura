const crypto = require('crypto');
const https = require('https');
const Joi = require('joi');

/**
 * Password Policy Configuration siguiendo NIST SP 800-63B
 * 
 * Referencias:
 * - NIST SP 800-63B: https://pages.nist.gov/800-63-3/sp800-63b.html
 * - OWASP Password Storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */

const PASSWORD_CONFIG = {
  MIN_LENGTH: 12, // NIST recomienda mínimo 8, usamos 12 para mayor seguridad
  MAX_LENGTH: 128, // Prevenir DoS con contraseñas extremadamente largas
  MIN_STRENGTH_SCORE: 3, // Score mínimo de zxcvbn (0-4)
  BCRYPT_ROUNDS: 12, // OWASP recomienda 12+ rounds
  CHECK_PWNED: true, // Verificar contra HaveIBeenPwned
  MAX_PWNED_COUNT: 0, // No permitir contraseñas comprometidas
};

/**
 * Valida la fortaleza de una contraseña según NIST SP 800-63B
 * 
 * NIST Guidelines:
 * - Mínimo 8 caracteres (usamos 12 para mayor seguridad)
 * - Máximo 64+ caracteres (usamos 128 para prevenir DoS)
 * - Permitir TODOS los caracteres (unicode, espacios, emojis)
 * - NO forzar reglas de composición (mayúsculas, números, símbolos)
 * - Verificar contra base de datos de contraseñas comprometidas
 * 
 * @param {string} password - Contraseña a validar
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
async function validatePasswordStrength(password) {
  const errors = [];

  // 1. Validar longitud mínima
  if (!password || password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    errors.push(`La contraseña debe tener al menos ${PASSWORD_CONFIG.MIN_LENGTH} caracteres`);
  }

  // 2. Validar longitud máxima (prevenir DoS)
  if (password && password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    errors.push(`La contraseña no debe exceder ${PASSWORD_CONFIG.MAX_LENGTH} caracteres`);
  }

  // 3. Verificar contra base de datos de contraseñas comprometidas (HaveIBeenPwned)
  if (PASSWORD_CONFIG.CHECK_PWNED && password && password.length >= PASSWORD_CONFIG.MIN_LENGTH) {
    try {
      const pwnedCount = await checkPwnedPassword(password);
      if (pwnedCount > PASSWORD_CONFIG.MAX_PWNED_COUNT) {
        errors.push(
          `Esta contraseña ha sido expuesta en ${pwnedCount.toLocaleString()} filtraciones de datos. ` +
          'Por favor, elige una contraseña diferente.'
        );
      }
    } catch (error) {
      // Si HaveIBeenPwned no está disponible, continuamos (fail open)
      // pero logueamos el error
      logger.warn('Error verificando contraseña contra HaveIBeenPwned', { 
        error: error.message,
        stack: error.stack 
      });
    }
  }

  // 4. Validar que no sea extremadamente común (validación adicional)
  if (password && isCommonPassword(password)) {
    errors.push('Esta contraseña es demasiado común. Por favor, elige una más segura.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verifica si una contraseña ha sido comprometida usando HaveIBeenPwned API
 * Usa el modelo k-Anonymity: solo envía los primeros 5 caracteres del hash SHA-1
 * 
 * @param {string} password - Contraseña a verificar
 * @returns {Promise<number>} - Número de veces que la contraseña ha sido expuesta
 */
function checkPwnedPassword(password) {
  return new Promise((resolve, reject) => {
    // Generar hash SHA-1 de la contraseña
    const sha1Hash = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();

    // k-Anonymity: solo enviar primeros 5 caracteres
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);

    // Timeout de 5 segundos
    const timeout = setTimeout(() => {
      reject(new Error('Timeout verificando contraseña contra HaveIBeenPwned'));
    }, 5000);

    https
      .get(`https://api.pwnedpasswords.com/range/${prefix}`, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeout);

          if (res.statusCode !== 200) {
            return reject(new Error(`HaveIBeenPwned API returned status ${res.statusCode}`));
          }

          // Buscar el sufijo en la respuesta
          const hashes = data.split('\r\n');
          for (const hash of hashes) {
            const [hashSuffix, count] = hash.split(':');
            if (hashSuffix === suffix) {
              return resolve(parseInt(count, 10));
            }
          }

          // No encontrado = contraseña no comprometida
          resolve(0);
        });
      })
      .on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Lista de contraseñas extremadamente comunes para validación rápida
 * Esta es una lista mínima; HaveIBeenPwned es la fuente principal
 */
const COMMON_PASSWORDS = new Set([
  'password',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'password123',
  'admin123',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'shadow',
  'michael',
  'jennifer',
  'computer',
]);

/**
 * Verifica si la contraseña está en la lista de contraseñas comunes
 * @param {string} password
 * @returns {boolean}
 */
function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Genera una contraseña criptográficamente segura
 * 
 * @param {number} length - Longitud de la contraseña (por defecto 16)
 * @returns {string} - Contraseña generada
 */
function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';

  // Usar crypto.randomBytes para generación criptográficamente segura
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

/**
 * Middleware de Express para validar contraseñas en requests
 */
const passwordValidationMiddleware = async (req, res, next) => {
  const { password, newPassword } = req.body;
  const passwordToValidate = password || newPassword;

  if (!passwordToValidate) {
    return next(); // No hay contraseña para validar
  }

  const validation = await validatePasswordStrength(passwordToValidate);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'Contraseña no cumple con los requisitos de seguridad',
      details: validation.errors,
    });
  }

  next();
};

/**
 * Schema de Joi para validación de contraseñas
 */
const passwordSchema = Joi.string()
  .min(PASSWORD_CONFIG.MIN_LENGTH)
  .max(PASSWORD_CONFIG.MAX_LENGTH)
  .required()
  .messages({
    'string.min': `La contraseña debe tener al menos ${PASSWORD_CONFIG.MIN_LENGTH} caracteres`,
    'string.max': `La contraseña no debe exceder ${PASSWORD_CONFIG.MAX_LENGTH} caracteres`,
    'any.required': 'La contraseña es requerida',
  });

module.exports = {
  validatePasswordStrength,
  checkPwnedPassword,
  generateSecurePassword,
  passwordValidationMiddleware,
  passwordSchema,
  PASSWORD_CONFIG,
};
