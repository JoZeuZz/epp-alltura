const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { logger } = require('../lib/logger');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const wait = ms => new Promise(res => setTimeout(res, ms));

const waitForDatabase = async (retries = 20, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      return;
    } catch (err) {
      const attempt = i + 1;
      logger.warn(`Attempt ${attempt}/${retries}: cannot connect to DB (${err.code || err}). Retrying in ${delay}ms...`);
      await wait(delay);
    }
  }
  throw new Error('Timed out waiting for database. Please ensure Postgres is running (eg. `docker-compose up -d`) and that DB_HOST/DB_PORT config is correct.');
};

const initializeDatabase = async () => {
  await waitForDatabase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Crear tabla de usuarios si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rut VARCHAR(50),
        phone_number VARCHAR(50),
        profile_picture_url VARCHAR(255),
        role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'technician')),
        must_change_password BOOLEAN DEFAULT FALSE,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        last_login_ip VARCHAR(45),
        last_login_user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Crear tabla de clientes si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        specialty VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Crear tabla de proyectos si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Crear tabla de empresas/solicitantes si no existe
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
      )
    `);

    // Crear tabla de supervisores si no existe
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
      )
    `);

    // Crear tabla de usuarios finales si no existe
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
      )
    `);

    // Crear tabla de scaffolds si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS scaffolds (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        scaffold_number VARCHAR(255),
        area VARCHAR(255),
        tag VARCHAR(255),
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        supervisor_id INTEGER REFERENCES supervisors(id) ON DELETE SET NULL,
        end_user_id INTEGER REFERENCES end_users(id) ON DELETE SET NULL,
        height DECIMAL NOT NULL,
        width DECIMAL NOT NULL,
        depth DECIMAL NOT NULL,
        cubic_meters DECIMAL NOT NULL,
        progress_percentage INTEGER NOT NULL,
        assembly_notes TEXT,
        assembly_image_url VARCHAR(255) NOT NULL,
        assembly_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(50) NOT NULL DEFAULT 'assembled' CHECK(status IN ('assembled', 'disassembled')),
        disassembly_notes TEXT,
        disassembly_image_url VARCHAR(255),
        disassembled_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Crear tabla project_users si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_users (
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, user_id)
      )
    `);

    // Crear tabla push_subscriptions si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subscription_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // ⚠️  SEGURIDAD: NO crear usuarios por defecto con contraseñas hardcodeadas
    // Los usuarios administrativos deben ser creados usando el script seguro:
    //   node src/scripts/create-admin.js
    //
    // Para desarrollo local, puedes crear usuarios manualmente con:
    //   npm run create-admin
    //
    // Razones de seguridad:
    // 1. CVE-ALLTURA-001: Credenciales hardcodeadas son una vulnerabilidad crítica
    // 2. Las contraseñas por defecto son conocidas por atacantes
    // 3. OWASP Top 10 A07:2021 - Identification and Authentication Failures
    
    const adminCheck = await client.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    );

    if (parseInt(adminCheck.rows[0].count) === 0) {
      logger.warn('⚠️  NO SE ENCONTRARON USUARIOS ADMINISTRADORES');
      logger.warn('⚠️  Por favor, crea un usuario administrador usando:');
      logger.warn('⚠️    node src/scripts/create-admin.js');
      logger.warn('⚠️  o:');
      logger.warn('⚠️    npm run create-admin');
    } else {
      logger.info(`✅ Se encontraron ${adminCheck.rows[0].count} usuario(s) administrador(es)`);
    }

    // Verificar y poblar empresas mandantes
    const companiesCheck = await client.query("SELECT COUNT(*) as count FROM companies");
    if (parseInt(companiesCheck.rows[0].count) === 0) {
      logger.info('Poblando empresas mandantes...');
      
      // CMPC - Compañía Manufacturera de Papeles y Cartones
      await client.query(`
        INSERT INTO companies (name, contact_person, email, phone, address) 
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'CMPC S.A.',
        'Gerencia de Operaciones',
        'contacto@cmpc.cl',
        '+56 41 2345678',
        'Planta Laja, Región del Biobío, Chile'
      ]);

      logger.info('✓ Empresa mandante CMPC S.A. creada');
    }

    // Verificar y poblar clientes
    const clientsCheck = await client.query("SELECT COUNT(*) as count FROM clients");
    if (parseInt(clientsCheck.rows[0].count) === 0) {
      logger.info('Poblando empresas clientes (subcontrato)...');

      const clients = [
        {
          name: 'CMPC S.A.',
          email: 'licitaciones@cmpc.cl',
          phone: '+56 41 2345678',
          address: 'Av. El Golf 150, Las Condes, Santiago',
          specialty: 'Producción de Celulosa y Papel'
        },
        {
          name: 'Massebal SpA',
          email: 'contacto@massebal.cl',
          phone: '+56 41 2789456',
          address: 'Concepción, Región del Biobío',
          specialty: 'Montaje Industrial y Mantención'
        },
        {
          name: 'Bunker Ingeniería y Construcción',
          email: 'proyectos@bunker.cl',
          phone: '+56 41 2567890',
          address: 'Los Ángeles, Región del Biobío',
          specialty: 'Construcción Industrial y Montajes'
        },
        {
          name: 'Simming S.A.',
          email: 'operaciones@simming.cl',
          phone: '+56 41 2456789',
          address: 'Coronel, Región del Biobío',
          specialty: 'Servicios de Montaje y Mantención Industrial'
        },
        {
          name: 'CMG Construcción y Montaje',
          email: 'contacto@cmg.cl',
          phone: '+56 41 2678901',
          address: 'Talcahuano, Región del Biobío',
          specialty: 'Montaje de Estructuras y Andamios Industriales'
        }
      ];

      for (const clientData of clients) {
        await client.query(
          'INSERT INTO clients (name, email, phone, address, specialty) VALUES ($1, $2, $3, $4, $5)',
          [clientData.name, clientData.email, clientData.phone, clientData.address, clientData.specialty]
        );
      }

      logger.info(`✓ ${clients.length} clientes creados`);
    }

    // Verificar y poblar supervisores
    const supervisorsCheck = await client.query("SELECT COUNT(*) as count FROM supervisors");
    if (parseInt(supervisorsCheck.rows[0].count) === 0) {
      logger.info('Poblando supervisores de ejemplo...');

      const supervisors = [
        { first_name: 'Carlos', last_name: 'Muñoz Silva', email: 'carlos.munoz@alltura.cl', phone: '+56 9 8765 4321', rut: '12.345.678-9' },
        { first_name: 'María', last_name: 'González Torres', email: 'maria.gonzalez@alltura.cl', phone: '+56 9 7654 3210', rut: '13.456.789-0' },
        { first_name: 'Roberto', last_name: 'Pérez Valdés', email: 'roberto.perez@alltura.cl', phone: '+56 9 6543 2109', rut: '14.567.890-1' },
        { first_name: 'Patricia', last_name: 'Soto Ramírez', email: 'patricia.soto@alltura.cl', phone: '+56 9 5432 1098', rut: '15.678.901-2' }
      ];

      for (const supervisor of supervisors) {
        await client.query(
          'INSERT INTO supervisors (first_name, last_name, email, phone, rut) VALUES ($1, $2, $3, $4, $5)',
          [supervisor.first_name, supervisor.last_name, supervisor.email, supervisor.phone, supervisor.rut]
        );
      }

      logger.info(`✓ ${supervisors.length} supervisores creados`);
    }

    // Verificar y poblar usuarios finales
    const endUsersCheck = await client.query("SELECT COUNT(*) as count FROM end_users");
    if (parseInt(endUsersCheck.rows[0].count) === 0) {
      logger.info('Poblando usuarios finales (departamentos de CMPC)...');

      const cmpcId = await client.query("SELECT id FROM companies WHERE name = 'CMPC S.A.'");
      const companyId = cmpcId.rows[0]?.id;

      if (companyId) {
        const endUsers = [
          { name: 'Departamento de Mantención - Planta Laja', department: 'Mantención Industrial', email: 'mantencion.laja@cmpc.cl', phone: '+56 41 2345679' },
          { name: 'Área de Producción - Planta Laja', department: 'Producción', email: 'produccion.laja@cmpc.cl', phone: '+56 41 2345680' },
          { name: 'Gerencia de Proyectos CMPC', department: 'Proyectos', email: 'proyectos@cmpc.cl', phone: '+56 41 2345681' },
          { name: 'Departamento de Calidad', department: 'Control de Calidad', email: 'calidad@cmpc.cl', phone: '+56 41 2345682' },
          { name: 'Equipo de Seguridad Industrial', department: 'Seguridad y Prevención', email: 'seguridad@cmpc.cl', phone: '+56 41 2345683' }
        ];

        for (const endUser of endUsers) {
          await client.query(
            'INSERT INTO end_users (name, company_id, department, email, phone) VALUES ($1, $2, $3, $4, $5)',
            [endUser.name, companyId, endUser.department, endUser.email, endUser.phone]
          );
        }

        logger.info(`✓ ${endUsers.length} usuarios finales creados`);
      }
    }

    await client.query('COMMIT');
    logger.info('Base de datos inicializada correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error inicializando la base de datos:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase, pool };
