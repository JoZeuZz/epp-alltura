#!/usr/bin/env node

/**
 * Script CLI para crear usuarios administrativos sobre esquema MER.
 *
 * Flujo:
 * 1) Solicita datos interactivos.
 * 2) Valida email, rol, RUT y fortaleza de contraseña.
 * 3) Crea persona + usuario + usuario_rol en una transacción.
 */

const readline = require('readline');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const bcrypt = require('bcrypt');
const db = require('../db');
const { validatePasswordStrength, PASSWORD_CONFIG } = require('../middleware/passwordPolicy');
const { toDbRole } = require('../lib/roleUtils');
const { PATTERNS } = require('../validation');

const ALLOWED_ROLES = new Set(['admin', 'supervisor', 'bodega']);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const print = (message, color = 'reset') => {
  process.stdout.write(`${colors[color]}${message}${colors.reset}\n`);
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeRut = (rut) => String(rut || '').trim().toUpperCase();

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      rl.close();
      resolve(String(answer || '').trim());
    });
  });

const askHidden = (question) =>
  new Promise((resolve) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') {
      ask(question).then(resolve);
      return;
    }

    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = '';

    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };

    const onData = (chunk) => {
      const key = String(chunk);

      if (key === '\u0003') {
        cleanup();
        print('Operación cancelada por el usuario.', 'yellow');
        process.exit(1);
      }

      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
        return;
      }

      if (key === '\u007f' || key === '\b') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }

      if (key >= ' ') {
        value += key;
        stdout.write('*');
      }
    };

    stdout.write(`${colors.cyan}${question}${colors.reset}`);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });

const fail = async (message) => {
  print(`\n${message}`, 'red');
  await db.pool.end();
  process.exit(1);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRut = (rut) => PATTERNS.RUT.test(rut);

const ensureRoleExists = async (roleName) => {
  const { rows } = await db.query('SELECT id, nombre FROM rol WHERE nombre = $1 LIMIT 1', [roleName]);
  return rows[0] || null;
};

const createAdminUser = async () => {
  print('\n╔══════════════════════════════════════════════════════════════╗', 'bright');
  print('║    CREADOR MER DE USUARIOS ADMIN/SUPERVISOR/BODEGA         ║', 'bright');
  print('╚══════════════════════════════════════════════════════════════╝\n', 'bright');

  try {
    const nombres = await ask('Nombres: ');
    const apellidos = await ask('Apellidos: ');
    const email = normalizeEmail(await ask('Email login: '));
    const rut = normalizeRut(await ask('RUT (formato 12.345.678-5 o 12345678-5): '));
    const telefono = await ask('Teléfono (opcional): ');
    const roleInput = await ask('Rol (admin/supervisor/bodega) [admin]: ');
    const role = toDbRole((roleInput || 'admin').trim().toLowerCase());

    if (!nombres) {
      await fail('El campo "Nombres" es obligatorio.');
    }

    if (!apellidos) {
      await fail('El campo "Apellidos" es obligatorio.');
    }

    if (!validateEmail(email)) {
      await fail('Email inválido.');
    }

    if (!validateRut(rut)) {
      await fail('RUT inválido.');
    }

    if (!ALLOWED_ROLES.has(role)) {
      await fail('Rol inválido. Debe ser admin, supervisor o bodega.');
    }

    const roleRecord = await ensureRoleExists(role);
    if (!roleRecord) {
      await fail(`No existe el rol "${role}" en la tabla rol. Ejecuta inicialización de DB.`);
    }

    const existingUser = await db.query(
      'SELECT id FROM usuario WHERE LOWER(email_login) = LOWER($1) LIMIT 1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      await fail(`Ya existe un usuario con email_login "${email}".`);
    }

    const existingPersona = await db.query(
      'SELECT id FROM persona WHERE UPPER(rut) = UPPER($1) LIMIT 1',
      [rut]
    );
    if (existingPersona.rows.length > 0) {
      await fail(`Ya existe una persona con RUT "${rut}".`);
    }

    print('\nRequisitos de contraseña:', 'yellow');
    print(`- Mínimo ${PASSWORD_CONFIG.MIN_LENGTH} caracteres`, 'yellow');
    print('- Validación contra contraseñas comunes/comprometidas', 'yellow');

    let password = '';
    while (true) {
      const pass1 = await askHidden('Contraseña: ');
      const pass2 = await askHidden('Confirmar contraseña: ');

      if (!pass1) {
        print('La contraseña es obligatoria.', 'red');
        continue;
      }

      if (pass1 !== pass2) {
        print('Las contraseñas no coinciden.', 'red');
        continue;
      }

      print('Validando contraseña...', 'cyan');
      const validation = await validatePasswordStrength(pass1);
      if (!validation.valid) {
        print('La contraseña no cumple los requisitos:', 'red');
        validation.errors.forEach((error) => print(`- ${error}`, 'red'));
        continue;
      }

      password = pass1;
      break;
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_CONFIG.BCRYPT_ROUNDS);
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const personaResult = await client.query(
        `
        INSERT INTO persona (rut, nombres, apellidos, telefono, email, estado)
        VALUES ($1, $2, $3, $4, $5, 'activo')
        RETURNING id
        `,
        [rut, nombres, apellidos, telefono || null, email]
      );

      const personaId = personaResult.rows[0].id;

      const usuarioResult = await client.query(
        `
        INSERT INTO usuario (persona_id, email_login, password_hash, estado)
        VALUES ($1, $2, $3, 'activo')
        RETURNING id
        `,
        [personaId, email, passwordHash]
      );

      const usuarioId = usuarioResult.rows[0].id;

      await client.query(
        `
        INSERT INTO usuario_rol (usuario_id, rol_id)
        VALUES ($1, $2)
        `,
        [usuarioId, roleRecord.id]
      );

      await client.query('COMMIT');

      print('\nUsuario creado correctamente.', 'green');
      print(`- usuario_id: ${usuarioId}`, 'cyan');
      print(`- persona_id: ${personaId}`, 'cyan');
      print(`- email_login: ${email}`, 'cyan');
      print(`- rol: ${roleRecord.nombre}`, 'cyan');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    print(`\nError al crear usuario: ${error.message}`, 'red');
    print(error.stack || '', 'red');
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
};

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  print('Uso: npm run create-admin --prefix backend', 'bright');
  print('Crea un usuario admin/supervisor/bodega sobre tablas MER.', 'bright');
  process.exit(0);
}

createAdminUser();
