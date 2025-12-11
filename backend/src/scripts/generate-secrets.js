#!/usr/bin/env node

/**
 * Generador de Secretos Criptográficamente Seguros
 * 
 * Este script genera secretos aleatorios seguros para uso en producción
 * siguiendo las mejores prácticas de OWASP y NIST.
 * 
 * Uso:
 *   node src/scripts/generate-secrets.js
 */

const crypto = require('crypto');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSecret(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generatePassword(length = 32) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

print('\n╔═══════════════════════════════════════════════════════════════════╗', 'bright');
print('║   🔐 GENERADOR DE SECRETOS CRIPTOGRÁFICAMENTE SEGUROS 🔐        ║', 'bright');
print('╚═══════════════════════════════════════════════════════════════════╝\n', 'bright');

print('Secretos generados con crypto.randomBytes() - Criptográficamente seguros\n', 'cyan');

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print('JWT Secrets (256 bits / 64 caracteres hex)', 'yellow');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print(`JWT_SECRET=${generateSecret(64)}`, 'green');
print(`JWT_REFRESH_SECRET=${generateSecret(64)}`, 'green');

print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print('Database Password (32 caracteres alfanuméricos + símbolos)', 'yellow');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print(`DB_PASSWORD=${generatePassword(32)}`, 'green');

print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print('Redis Password (32 caracteres alfanuméricos + símbolos)', 'yellow');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print(`REDIS_PASSWORD=${generatePassword(32)}`, 'green');

print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print('Session Secret (256 bits / 64 caracteres hex)', 'yellow');
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
print(`SESSION_SECRET=${generateSecret(64)}`, 'green');

print('\n╔═══════════════════════════════════════════════════════════════════╗', 'yellow');
print('║                    ⚠️  INSTRUCCIONES IMPORTANTES                  ║', 'yellow');
print('╚═══════════════════════════════════════════════════════════════════╝', 'yellow');

print('\n1. NUNCA commitees estos secretos al repositorio', 'red');
print('2. Copia estos valores al archivo .env de forma segura', 'yellow');
print('3. Usa secretos DIFERENTES para cada entorno (dev, staging, prod)', 'yellow');
print('4. Almacena secretos de producción en AWS Secrets Manager o Vault', 'yellow');
print('5. Rota estos secretos cada 90 días', 'yellow');
print('6. No compartas estos secretos por email, Slack, etc.', 'red');

print('\n📋 Ejemplo de uso en .env:', 'cyan');
print('   cp .env.example .env', 'cyan');
print('   # Luego reemplaza los valores CAMBIAR_POR_* con los generados arriba\n', 'cyan');

print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');
