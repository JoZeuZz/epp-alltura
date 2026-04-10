const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const { logger } = require('../lib/logger');
const { getPoolConfig } = require('./poolConfig');

const pool = new Pool(getPoolConfig());

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForDatabase = async (retries = 20, delay = 2000) => {
  for (let i = 0; i < retries; i += 1) {
    try {
      const client = await pool.connect();
      client.release();
      return;
    } catch (err) {
      const attempt = i + 1;
      logger.warn(
        `Attempt ${attempt}/${retries}: cannot connect to DB (${err.code || err.message}). Retrying in ${delay}ms...`
      );
      await wait(delay);
    }
  }

  throw new Error(
    'Timed out waiting for database. Ensure Postgres is running and DB_HOST/DB_PORT are correct.'
  );
};

const loadSchemaSql = () => {
  const initDir = path.resolve(__dirname, '../../../db/init');
  if (!fs.existsSync(initDir)) {
    logger.warn(`DB init directory not found, skipping schema initialization: ${initDir}`);
    return [];
  }

  const sqlFiles = fs
    .readdirSync(initDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!sqlFiles.length) {
    logger.warn(`No SQL files found in ${initDir}. Skipping schema initialization.`);
    return [];
  }

  return sqlFiles.map((file) => {
    const fullPath = path.join(initDir, file);
    return { file, sql: fs.readFileSync(fullPath, 'utf8') };
  });
};

const initializeDatabase = async () => {
  await waitForDatabase();

  const schemaFiles = loadSchemaSql();
  if (!schemaFiles.length) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const { file, sql } of schemaFiles) {
      await client.query(sql);
      logger.info(`Database schema initialized from db/init/${file}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error initializing database schema:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  initializeDatabase,
  pool,
};
