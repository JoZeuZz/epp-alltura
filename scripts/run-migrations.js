#!/usr/bin/env node
/**
 * Runner de migraciones SQL.
 * Lee db/migrations/*.sql en orden lexicográfico, aplica las no registradas en schema_migrations.
 * Cada migración corre dentro de una transacción individual.
 *
 * Uso: node scripts/run-migrations.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const { Pool } = require('pg');

const isDryRun = process.argv.includes('--dry-run');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const migrationsDir = path.resolve(__dirname, '../db/migrations');

const loadMigrationFiles = () => {
  if (!fs.existsSync(migrationsDir)) {
    console.log(`[migrations] Directorio ${migrationsDir} no encontrado. No hay migraciones.`);
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      filename: file,
      sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8'),
    }));
};

const run = async () => {
  const files = loadMigrationFiles();

  if (!files.length) {
    console.log('[migrations] Sin archivos .sql en db/migrations/ — nada que aplicar.');
    return;
  }

  const pool = new Pool(poolConfig);
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        filename    TEXT NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.map((r) => r.filename));

    const pending = files.filter((f) => !appliedSet.has(f.filename));

    if (!pending.length) {
      console.log('[migrations] Todo al día — sin migraciones pendientes.');
      return;
    }

    console.log(`[migrations] ${pending.length} migración(es) pendiente(s):`);
    pending.forEach((f) => console.log(`  - ${f.filename}`));

    if (isDryRun) {
      console.log('[migrations] --dry-run activo — no se aplican cambios.');
      return;
    }

    for (const { filename, sql } of pending) {
      console.log(`[migrations] Aplicando ${filename}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`[migrations] ✅ ${filename} aplicada.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrations] ❌ Error en ${filename}: ${err.message}`);
        process.exitCode = 1;
        return;
      }
    }

    console.log('[migrations] Todas las migraciones aplicadas correctamente.');
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error('[migrations] Error fatal:', err.message);
  process.exitCode = 1;
});
