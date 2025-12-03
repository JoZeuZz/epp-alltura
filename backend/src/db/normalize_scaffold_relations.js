/**
 * Script de normalización completa para scaffolds
 * Crea tablas: companies, supervisors, end_users
 * Actualiza scaffolds con foreign keys
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

const normalizeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🚀 Iniciando normalización completa de base de datos...\n');

    // 1. Crear tabla de empresas/solicitantes
    console.log('📋 Creando tabla companies (solicitantes)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ Tabla companies creada');

    // 2. Crear tabla de supervisores
    console.log('📋 Creando tabla supervisors...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS supervisors (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        rut VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(first_name, last_name)
      );
    `);
    console.log('✓ Tabla supervisors creada');

    // 3. Crear tabla de usuarios finales
    console.log('📋 Creando tabla end_users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS end_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        department VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✓ Tabla end_users creada');

    // 4. Agregar foreign keys a scaffolds
    console.log('📋 Actualizando tabla scaffolds con foreign keys...');
    
    // Eliminar columnas de texto antiguas si existen
    await client.query(`
      ALTER TABLE scaffolds 
      DROP COLUMN IF EXISTS requestor,
      DROP COLUMN IF EXISTS end_user,
      DROP COLUMN IF EXISTS supervisor
    `);

    // Agregar nuevas columnas con foreign keys
    await client.query(`
      ALTER TABLE scaffolds
      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES supervisors(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS end_user_id INTEGER REFERENCES end_users(id) ON DELETE SET NULL
    `);
    console.log('✓ Tabla scaffolds actualizada con foreign keys');

    // 5. Insertar datos de ejemplo
    console.log('\n📝 Insertando datos de ejemplo...');

    // Empresas comunes en Chile
    await client.query(`
      INSERT INTO companies (name, contact_person, email, phone) VALUES
      ('CMPC', 'Juan González', 'contacto@cmpc.cl', '+56912345678'),
      ('Arauco', 'María Silva', 'info@arauco.cl', '+56987654321'),
      ('Codelco', 'Pedro Martínez', 'contacto@codelco.cl', '+56923456789'),
      ('SQM', 'Ana Torres', 'info@sqm.com', '+56945678901'),
      ('Colbún', 'Luis Ramírez', 'contacto@colbun.cl', '+56956789012')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✓ Empresas de ejemplo insertadas');

    // Supervisores de ejemplo
    await client.query(`
      INSERT INTO supervisors (first_name, last_name, email, phone, rut) VALUES
      ('Carlos', 'Rodríguez', 'carlos.rodriguez@alltura.cl', '+56911111111', '12345678-9'),
      ('Patricia', 'López', 'patricia.lopez@alltura.cl', '+56922222222', '23456789-0'),
      ('Roberto', 'Soto', 'roberto.soto@alltura.cl', '+56933333333', '34567890-1'),
      ('Carmen', 'Muñoz', 'carmen.munoz@alltura.cl', '+56944444444', '45678901-2')
      ON CONFLICT (first_name, last_name) DO NOTHING
    `);
    console.log('✓ Supervisores de ejemplo insertados');

    // Usuarios finales de ejemplo
    const companiesResult = await client.query('SELECT id FROM companies LIMIT 3');
    const companyIds = companiesResult.rows.map(r => r.id);
    
    if (companyIds.length > 0) {
      await client.query(`
        INSERT INTO end_users (name, company_id, department) VALUES
        ('Equipo de Mantención', $1, 'Mantención Industrial'),
        ('Departamento de Producción', $1, 'Producción'),
        ('Área de Calidad', $2, 'Control de Calidad'),
        ('Equipo de Operaciones', $2, 'Operaciones'),
        ('Mantención Eléctrica', $3, 'Electricidad')
        ON CONFLICT (name) DO NOTHING
      `, [companyIds[0], companyIds[1], companyIds[2] || companyIds[0]]);
      console.log('✓ Usuarios finales de ejemplo insertados');
    }

    // 6. Verificar estructura final
    console.log('\n📊 Verificando estructura de tablas...\n');

    const tables = ['companies', 'supervisors', 'end_users', 'scaffolds'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`\n📋 Tabla: ${table}`);
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }

    await client.query('COMMIT');
    console.log('\n✅ Normalización completada exitosamente!\n');

    // Mostrar estadísticas
    const companiesCount = await client.query('SELECT COUNT(*) FROM companies');
    const supervisorsCount = await client.query('SELECT COUNT(*) FROM supervisors');
    const endUsersCount = await client.query('SELECT COUNT(*) FROM end_users');

    console.log('📊 Datos insertados:');
    console.log(`  - Empresas: ${companiesCount.rows[0].count}`);
    console.log(`  - Supervisores: ${supervisorsCount.rows[0].count}`);
    console.log(`  - Usuarios Finales: ${endUsersCount.rows[0].count}\n`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la normalización:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

normalizeDatabase().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
