
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { getPoolConfig } = require('./poolConfig');

const pool = new Pool(getPoolConfig());

const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create clients table FIRST (needed for foreign key in users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        contact_info TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create users table (references clients)
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
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create index for client_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
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
      );
    `);

    // Add columns if they don't exist (for migration from old structure)
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS scaffold_number VARCHAR(255)`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS area VARCHAR(255)`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS tag VARCHAR(255)`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS card_status VARCHAR(50) DEFAULT 'green'`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS assembly_status VARCHAR(50) DEFAULT 'assembled'`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS location TEXT`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS observations TEXT`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
    await client.query(`ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS length DECIMAL`);
    
    // Add active column to projects for soft delete
    await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`);
    
    // Rename old column if exists
    await client.query(`ALTER TABLE scaffolds RENAME COLUMN IF EXISTS depth TO length`);
    
    // Remove old columns if they exist
    await client.query(`ALTER TABLE scaffolds DROP COLUMN IF EXISTS status`);
    await client.query(`ALTER TABLE scaffolds DROP COLUMN IF EXISTS requestor`);
    await client.query(`ALTER TABLE scaffolds DROP COLUMN IF EXISTS end_user`);
    await client.query(`ALTER TABLE scaffolds DROP COLUMN IF EXISTS supervisor`);

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

    const supervisorPassword = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ('Supervisor', 'de Campo', 'supervisor@alltura.cl', $1, 'supervisor')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [supervisorPassword]);

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
