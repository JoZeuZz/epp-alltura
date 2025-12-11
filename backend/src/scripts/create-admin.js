#!/usr/bin/env node

/**
 * Script CLI para crear usuarios administrativos de forma segura
 * 
 * Uso:
 *   node src/scripts/create-admin.js
 * 
 * Características de seguridad:
 * - Solicita contraseña de forma interactiva (no visible en terminal)
 * - Valida fortaleza de contraseña según NIST SP 800-63B
 * - Verifica contra base de datos de contraseñas comprometidas
 * - Hashea con bcrypt (12 rounds)
 * - Marca usuario para cambiar contraseña en primer login
 */

const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { validatePasswordStrength, PASSWORD_CONFIG } = require('../middleware/passwordPolicy');

// Configuración de base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Imprime mensaje con color
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Solicita input del usuario
 */
function prompt(question, isPassword = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (isPassword) {
      // Ocultar entrada para contraseñas
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      let password = '';
      print(question, 'cyan');

      stdin.on('data', (char) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          // Enter o Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (char === '\u0003') {
          // Ctrl+C
          print('\nOperación cancelada', 'yellow');
          process.exit(0);
        } else if (char === '\u007f' || char === '\b') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(question);
          }
        } else {
          password += char;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Valida formato de email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Crea un usuario administrador
 */
async function createAdminUser() {
  print('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  print('║   🔒 CREADOR SEGURO DE USUARIOS ADMINISTRATIVOS 🔒      ║', 'bright');
  print('╚═══════════════════════════════════════════════════════════╝\n', 'bright');

  try {
    // 1. Solicitar información del usuario
    print('Por favor, ingresa la información del nuevo usuario administrador:\n', 'blue');

    const firstName = await prompt('Nombre: ');
    if (!firstName) {
      print('❌ El nombre es requerido', 'red');
      process.exit(1);
    }

    const lastName = await prompt('Apellido: ');
    if (!lastName) {
      print('❌ El apellido es requerido', 'red');
      process.exit(1);
    }

    const email = await prompt('Email: ');
    if (!isValidEmail(email)) {
      print('❌ Email inválido', 'red');
      process.exit(1);
    }

    const role = await prompt('Rol (admin/technician) [admin]: ') || 'admin';
    if (!['admin', 'technician'].includes(role)) {
      print('❌ Rol inválido. Debe ser "admin" o "technician"', 'red');
      process.exit(1);
    }

    // 2. Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      print(`❌ Ya existe un usuario con el email: ${email}`, 'red');
      process.exit(1);
    }

    // 3. Solicitar contraseña con validación
    print(`\n📋 Requisitos de contraseña:`, 'yellow');
    print(`   • Mínimo ${PASSWORD_CONFIG.MIN_LENGTH} caracteres`, 'yellow');
    print(`   • No debe estar en bases de datos de contraseñas comprometidas`, 'yellow');
    print(`   • Debe ser única y difícil de adivinar\n`, 'yellow');

    let password;
    let passwordValid = false;

    while (!passwordValid) {
      password = await prompt('Contraseña: ', true);

      if (!password) {
        print('❌ La contraseña es requerida', 'red');
        continue;
      }

      const confirmPassword = await prompt('Confirmar contraseña: ', true);

      if (password !== confirmPassword) {
        print('❌ Las contraseñas no coinciden. Intenta de nuevo.\n', 'red');
        continue;
      }

      // Validar fortaleza de contraseña
      print('\n🔍 Validando fortaleza de contraseña...', 'cyan');
      const validation = await validatePasswordStrength(password);

      if (!validation.valid) {
        print('\n❌ Contraseña no cumple con los requisitos:', 'red');
        validation.errors.forEach((error) => {
          print(`   • ${error}`, 'red');
        });
        print('\nIntenta con una contraseña diferente.\n', 'yellow');
        continue;
      }

      passwordValid = true;
      print('✅ Contraseña válida', 'green');
    }

    // 4. Hashear contraseña con bcrypt (12 rounds)
    print('\n🔐 Hasheando contraseña de forma segura...', 'cyan');
    const passwordHash = await bcrypt.hash(password, PASSWORD_CONFIG.BCRYPT_ROUNDS);

    // 5. Insertar usuario en la base de datos
    print('💾 Creando usuario en la base de datos...', 'cyan');

    // Agregar columnas de seguridad si no existen (Fase 2: Authentication Hardening)
    print('🔧 Verificando esquema de base de datos...', 'cyan');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45)
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT
    `);

    const result = await pool.query(
      `INSERT INTO users 
       (first_name, last_name, email, password_hash, role, must_change_password, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id, email, role`,
      [firstName, lastName, email, passwordHash, role, true]
    );

    const user = result.rows[0];

    // 6. Éxito
    print('\n╔═══════════════════════════════════════════════════════════╗', 'green');
    print('║                  ✅ USUARIO CREADO EXITOSAMENTE          ║', 'green');
    print('╚═══════════════════════════════════════════════════════════╝\n', 'green');

    print(`📧 Email: ${user.email}`, 'cyan');
    print(`👤 Rol: ${user.role}`, 'cyan');
    print(`🔑 ID: ${user.id}`, 'cyan');
    print(`\n⚠️  IMPORTANTE: El usuario deberá cambiar su contraseña en el primer login\n`, 'yellow');

    // 7. Registro en logs
    console.log(
      JSON.stringify({
        event: 'admin_user_created',
        user_id: user.id,
        email: user.email,
        role: user.role,
        created_at: new Date().toISOString(),
        created_by: 'cli_script',
      })
    );

  } catch (error) {
    print(`\n❌ Error al crear usuario: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar script
createAdminUser();
