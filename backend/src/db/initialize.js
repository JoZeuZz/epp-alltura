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
        role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'supervisor', 'client')),
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
        assigned_client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Crear tabla de scaffolds si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS scaffolds (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        scaffold_number VARCHAR(255),
        area VARCHAR(255),
        tag VARCHAR(255),
        width DECIMAL NOT NULL,
        length DECIMAL NOT NULL,
        height DECIMAL NOT NULL,
        cubic_meters DECIMAL NOT NULL,
        progress_percentage INTEGER NOT NULL DEFAULT 100 CHECK(progress_percentage >= 0 AND progress_percentage <= 100),
        card_status VARCHAR(50) NOT NULL DEFAULT 'green' CHECK(card_status IN ('green', 'red')),
        assembly_status VARCHAR(50) NOT NULL DEFAULT 'assembled' CHECK(assembly_status IN ('assembled', 'disassembled')),
        assembly_image_url VARCHAR(255) NOT NULL,
        assembly_notes TEXT,
        assembly_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        location TEXT,
        observations TEXT,
        disassembly_image_url VARCHAR(255),
        disassembly_notes TEXT,
        disassembled_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Crear tabla de historial de andamios si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS scaffold_history (
        id SERIAL PRIMARY KEY,
        scaffold_id INTEGER NOT NULL REFERENCES scaffolds(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        change_type VARCHAR(100) NOT NULL,
        previous_data JSONB,
        new_data JSONB,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

    // Verificar y poblar clientes (empresas mandantes)
    const clientsCheck = await client.query("SELECT COUNT(*) as count FROM clients");
    if (parseInt(clientsCheck.rows[0].count) === 0) {
      logger.info('Poblando empresas clientes (empresas mandantes)...');

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
