const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const { getPoolConfig } = require('./poolConfig');

const pool = new Pool(getPoolConfig());

const requiredTables = [
  'persona',
  'usuario',
  'trabajador',
  'rol',
  'usuario_rol',
  'ubicacion',
  'proveedor',
  'articulo',
  'documento_compra',
  'compra',
  'compra_detalle',
  'activo',
  'stock',
  'entrega',
  'entrega_detalle',
  'firma_entrega',
  'firma_token',
  'custodia_activo',
  'devolucion',
  'devolucion_detalle',
  'movimiento_stock',
  'movimiento_activo',
  'inspeccion_activo',
  'documento',
  'documento_referencia',
  'auditoria',
  'notifications',
  'push_subscriptions',
];

const requiredRoles = ['admin', 'supervisor', 'bodega', 'trabajador'];

const checkDatabase = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name
      `,
      [requiredTables]
    );

    const existing = new Set(result.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((name) => !existing.has(name));

    console.log('Tables found:', Array.from(existing));
    if (missing.length > 0) {
      console.error('Missing tables:', missing);
      process.exitCode = 1;
    }

    const roles = await client.query('SELECT nombre FROM rol ORDER BY nombre');
    const roleNames = roles.rows.map((row) => row.nombre);
    const missingRoles = requiredRoles.filter((role) => !roleNames.includes(role));

    console.log('Roles:', roleNames);
    if (missingRoles.length > 0) {
      console.error('Missing seed roles:', missingRoles);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Database check failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

checkDatabase();
