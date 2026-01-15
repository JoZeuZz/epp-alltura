const fs = require('fs');
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

async function runMigration(migrationFile) {
  console.log(`Running migration: ${migrationFile}`);
  const client = await pool.connect();
  
  try {
    const migrationPath = path.resolve(__dirname, '../db/migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log(`✓ Migration ${migrationFile} completed successfully`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`✗ Error running migration ${migrationFile}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Usage: node run_migration.js <migration_file.sql>');
    process.exit(1);
  }
  
  try {
    await runMigration(migrationFile);
    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
