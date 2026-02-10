const db = require('../../../db');
const { initializeDatabase, pool: initializePool } = require('../../../db/initialize');

const TRANSACTIONAL_TABLES = [
  'auditoria',
  'documento_referencia',
  'documento',
  'inspeccion_activo',
  'movimiento_activo',
  'movimiento_stock',
  'devolucion_detalle',
  'devolucion',
  'custodia_activo',
  'firma_entrega',
  'firma_token',
  'entrega_detalle',
  'entrega',
  'stock',
  'activo',
  'lote',
  'compra_detalle',
  'compra',
  'documento_compra',
  'notifications',
  'push_subscriptions',
  'articulo',
  'proveedor',
  'ubicacion',
  'trabajador',
  'usuario_rol',
  'usuario',
  'persona',
];

const isDbConfigured = () => Boolean(process.env.DB_NAME && process.env.DB_HOST && process.env.DB_USER);

const assertSafeReset = () => {
  const dbName = String(process.env.DB_NAME || '');
  const safeByName = /test/i.test(dbName);
  const safeByFlag = process.env.DB_TEST_RESET_ALLOWED === 'true';

  if (!safeByName && !safeByFlag) {
    throw new Error(
      'Reset de base de datos bloqueado. Usa una DB de pruebas (DB_NAME con "test") o define DB_TEST_RESET_ALLOWED=true.'
    );
  }
};

const initializeSchema = async () => {
  assertSafeReset();
  await initializeDatabase();
};

const resetTransactionalData = async () => {
  assertSafeReset();

  await db.query(`TRUNCATE TABLE ${TRANSACTIONAL_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
};

const closeAllPools = async () => {
  try {
    await db.pool.end();
  } catch {
    // Ignore close errors in tests.
  }

  try {
    await initializePool.end();
  } catch {
    // Ignore close errors in tests.
  }
};

module.exports = {
  isDbConfigured,
  initializeSchema,
  resetTransactionalData,
  closeAllPools,
};
