/**
 * Script de migración para agregar los nuevos campos a la tabla scaffolds
 * Ejecutar con: node backend/src/db/migrate_add_scaffold_fields.js
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

const migrateDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Iniciando migración de base de datos...');

    // Agregar las nuevas columnas si no existen
    await client.query(`
      ALTER TABLE scaffolds 
      ADD COLUMN IF NOT EXISTS requestor VARCHAR(255),
      ADD COLUMN IF NOT EXISTS end_user VARCHAR(255),
      ADD COLUMN IF NOT EXISTS supervisor VARCHAR(255)
    `);

    console.log('✓ Columnas agregadas exitosamente: requestor, end_user, supervisor');

    // Verificar las columnas existentes
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'scaffolds'
      ORDER BY ordinal_position
    `);

    console.log('\nColumnas actuales en la tabla scaffolds:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    await client.query('COMMIT');
    console.log('\n✓ Migración completada exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

migrateDatabase().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
