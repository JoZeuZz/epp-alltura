const { Pool } = require('pg');
require('dotenv').config();
const { logger } = require('../lib/logger');
const { getPoolConfig } = require('./poolConfig');

const pool = new Pool(getPoolConfig());

// Manejo de errores del pool
pool.on('error', (err, _client) => {
  logger.error('Error inesperado en cliente inactivo del pool', err);
  // No hacemos process.exit aquí para permitir que PM2 o el proceso manager maneje el restart
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Señal de terminación recibida, cerrando pool de conexiones...');
  try {
    await pool.end();
    logger.info('Pool de conexiones cerrado exitosamente');
    process.exit(0);
  } catch (err) {
    logger.error('Error al cerrar pool de conexiones', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Export the pool itself for transactions
};
