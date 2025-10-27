const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const logger = require('../lib/logger');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const initializeDatabase = async () => {
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Crear tabla de clientes si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        contact_info TEXT,
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

    // Crear tabla de scaffolds si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS scaffolds (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        scaffold_number VARCHAR(255),
        area VARCHAR(255),
        tag VARCHAR(255),
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

    // Verificar si existe el usuario admin
    const adminCheck = await client.query(
      "SELECT id FROM users WHERE email = 'admin@alltura.cl'"
    );

    if (adminCheck.rows.length === 0) {
      logger.info('No se encontró usuario admin. Creando usuarios de prueba...');

      // Crear usuario administrador
      const adminPassword = await bcrypt.hash('password123', 10);
      await client.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['Administrador', 'Alltura', 'admin@alltura.cl', adminPassword, 'admin']
      );

      // Crear usuario técnico
      const techPassword = await bcrypt.hash('password123', 10);
      await client.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['Técnico', 'de Campo', 'tech@alltura.cl', techPassword, 'technician']
      );

      logger.info('Usuarios de prueba creados exitosamente.');
    } else {
      logger.info('Usuario admin ya existe. Saltando creación de usuarios.');
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
