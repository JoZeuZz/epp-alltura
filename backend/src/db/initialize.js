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
  const schemaPath = path.resolve(__dirname, '../../../db/init/001-init.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  return fs.readFileSync(schemaPath, 'utf8');
};

const initializeDatabase = async () => {
  await waitForDatabase();
  const client = await pool.connect();

  try {
    const sql = loadSchemaSql();

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    logger.info('Database schema initialized from db/init/001-init.sql');
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
