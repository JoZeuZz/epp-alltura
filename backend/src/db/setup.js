
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create users table
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
      );
    `);

    // Create clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        contact_info TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create scaffolds table (previously reports)
    await client.query(`
      CREATE TABLE IF NOT EXISTS scaffolds (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id),
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
      );
    `);

    // Add new columns to scaffolds table if they don't exist
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS scaffold_number VARCHAR(255)`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS area VARCHAR(255)`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS tag VARCHAR(255)`);

    // Create project_users join table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_users (
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, user_id)
      );
    `);

    // Seed test users
    const adminPassword = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Administrador', 'Alltura', 'admin@alltura.cl', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [adminPassword]);

    const techPassword = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Técnico', 'de Campo', 'tech@alltura.cl', $1, 'technician')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [techPassword]);

    await client.query('COMMIT');
    console.log('Database tables created and seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error setting up database:', err);
  } finally {
    client.release();
    pool.end();
  }
};

setupDatabase();
