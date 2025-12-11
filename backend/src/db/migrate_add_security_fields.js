/**
 * Migración: Agregar campos de seguridad a la tabla users
 * 
 * Agrega las siguientes columnas necesarias para la Fase 2 (Authentication Hardening):
 * - failed_login_attempts: Contador de intentos fallidos de login
 * - account_locked_until: Timestamp hasta cuando la cuenta está bloqueada
 * - last_login_at: Fecha del último login exitoso
 * - last_login_ip: IP del último login
 * - last_login_user_agent: User-Agent del último login
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración: Agregar campos de seguridad a users...');
    
    await client.query('BEGIN');

    // Verificar qué columnas ya existen
    const { rows: existingColumns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN (
        'failed_login_attempts',
        'account_locked_until',
        'last_login_at',
        'last_login_ip',
        'last_login_user_agent',
        'must_change_password'
      )
    `);

    const existingColumnNames = existingColumns.map(row => row.column_name);
    console.log('📋 Columnas existentes:', existingColumnNames.length > 0 ? existingColumnNames.join(', ') : 'ninguna');

    // Agregar columnas solo si no existen
    const columnsToAdd = [
      {
        name: 'failed_login_attempts',
        definition: 'INTEGER DEFAULT 0',
      },
      {
        name: 'account_locked_until',
        definition: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'last_login_at',
        definition: 'TIMESTAMP WITH TIME ZONE',
      },
      {
        name: 'last_login_ip',
        definition: 'VARCHAR(45)',
      },
      {
        name: 'last_login_user_agent',
        definition: 'TEXT',
      },
      {
        name: 'must_change_password',
        definition: 'BOOLEAN DEFAULT FALSE',
      },
    ];

    let addedCount = 0;
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        console.log(`  ➕ Agregando columna: ${column.name}`);
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN ${column.name} ${column.definition}
        `);
        addedCount++;
      } else {
        console.log(`  ✓ Columna ya existe: ${column.name}`);
      }
    }

    await client.query('COMMIT');
    
    console.log(`✅ Migración completada: ${addedCount} columna(s) agregada(s)`);
    
    // Verificar resultado final
    const { rows: finalColumns } = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN (
        'failed_login_attempts',
        'account_locked_until',
        'last_login_at',
        'last_login_ip',
        'last_login_user_agent',
        'must_change_password'
      )
      ORDER BY column_name
    `);

    console.log('\n📊 Columnas de seguridad en la tabla users:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})${col.column_default ? ` [default: ${col.column_default}]` : ''}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migración
migrate()
  .then(() => {
    console.log('\n✨ ¡Listo! Ya puedes hacer login normalmente.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
