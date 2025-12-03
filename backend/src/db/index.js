const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../lib/logger');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // Máximo de clientes en el pool
  idleTimeoutMillis: 30000, // Cerrar clientes inactivos después de 30 segundos
  connectionTimeoutMillis: 2000, // Error si no se establece conexión en 2 segundos
});

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
