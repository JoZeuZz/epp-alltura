/**
 * Script de migración: Separar campos de contact_info en la tabla clients
 * Este script actualiza la estructura de la tabla clients sin perder datos existentes
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

const migrateClientsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Iniciando migración de la tabla clients...\n');

    // Verificar si las columnas nuevas ya existen
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name IN ('email', 'phone', 'address', 'specialty')
    `);

    if (checkColumns.rows.length > 0) {
      console.log('✓ Las columnas ya existen. Migración no necesaria.');
      await client.query('ROLLBACK');
      return;
    }

    // 1. Agregar las nuevas columnas
    console.log('📋 Agregando nuevas columnas a la tabla clients...');
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS specialty VARCHAR(255)
    `);
    console.log('✓ Columnas agregadas\n');

    // 2. Obtener todos los clientes existentes
    console.log('📋 Obteniendo clientes existentes...');
    const { rows: clients } = await client.query('SELECT id, name, contact_info FROM clients');
    console.log(`✓ Se encontraron ${clients.length} clientes\n`);

    // 3. Migrar datos de contact_info a los nuevos campos
    console.log('🔄 Migrando datos...');
    for (const clientRow of clients) {
      let email = null;
      let phone = null;
      let address = null;
      let specialty = null;

      if (clientRow.contact_info) {
        // Intentar extraer información del campo contact_info
        const info = clientRow.contact_info;
        
        // Extraer email
        const emailMatch = info.match(/Email:\s*([^\s|]+)/i);
        if (emailMatch) email = emailMatch[1];

        // Extraer teléfono
        const phoneMatch = info.match(/Teléfono:\s*([^\s|]+(?:\s+\d+)*)/i);
        if (phoneMatch) phone = phoneMatch[1].trim();

        // Extraer dirección
        const addressMatch = info.match(/Dirección:\s*([^|]+?)(?:\s*\||$)/i);
        if (addressMatch) address = addressMatch[1].trim();

        // Extraer especialidad
        const specialtyMatch = info.match(/Especialidad:\s*(.+?)(?:\s*$)/i);
        if (specialtyMatch) specialty = specialtyMatch[1].trim();
      }

      await client.query(
        'UPDATE clients SET email = $1, phone = $2, address = $3, specialty = $4 WHERE id = $5',
        [email, phone, address, specialty, clientRow.id]
      );

      console.log(`  ✓ Migrado: ${clientRow.name}`);
    }

    console.log('\n✓ Datos migrados exitosamente\n');

    // 4. Eliminar la columna contact_info (opcional - comentado por seguridad)
    // console.log('📋 Eliminando columna contact_info...');
    // await client.query('ALTER TABLE clients DROP COLUMN contact_info');
    // console.log('✓ Columna eliminada\n');

    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente!\n');

    // Mostrar resultado
    const { rows: updatedClients } = await client.query(
      'SELECT name, email, phone, address, specialty FROM clients ORDER BY name'
    );
    
    console.log('📊 Datos actualizados:');
    console.table(updatedClients);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la migración:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

// Ejecutar la migración
migrateClientsTable()
  .then(() => {
    console.log('\nProceso completado.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error en el proceso:', err);
    process.exit(1);
  });
