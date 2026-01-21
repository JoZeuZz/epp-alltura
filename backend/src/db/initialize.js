const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
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

    // Crear tabla de clientes PRIMERO (necesaria para foreign key en users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        specialty VARCHAR(255),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Crear tabla de usuarios (referencia a clients)
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
        must_change_password BOOLEAN DEFAULT FALSE,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        last_login_ip VARCHAR(45),
        last_login_user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Índice para mejorar búsquedas por empresa cliente
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id)
    `);

    // Crear tabla de proyectos si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
        active BOOLEAN DEFAULT true,
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
        assembly_status VARCHAR(50) NOT NULL DEFAULT 'assembled' CHECK(assembly_status IN ('assembled', 'disassembled', 'in_progress')),
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
        scaffold_id INTEGER REFERENCES scaffolds(id) ON DELETE SET NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        change_type VARCHAR(100) NOT NULL,
        previous_data JSONB,
        new_data JSONB,
        description TEXT,
        scaffold_number VARCHAR(255),
        project_name VARCHAR(255),
        area VARCHAR(255),
        tag VARCHAR(255),
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

    // ================================================================
    // SISTEMA DE NOTAS DE CLIENTES Y NOTIFICACIONES IN-APP
    // ================================================================

    // Crear tabla de notas de clientes (polimórfica: para scaffolds o proyectos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) NOT NULL CHECK(target_type IN ('scaffold', 'project')),
        scaffold_id INTEGER REFERENCES scaffolds(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        note_text TEXT NOT NULL CHECK(LENGTH(note_text) >= 1 AND LENGTH(note_text) <= 5000),
        is_resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        resolution_notes TEXT CHECK(resolution_notes IS NULL OR LENGTH(resolution_notes) <= 1000),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT check_target_exactly_one CHECK (
          (target_type = 'scaffold' AND scaffold_id IS NOT NULL AND project_id IS NULL) OR
          (target_type = 'project' AND project_id IS NOT NULL AND scaffold_id IS NULL)
        )
      )
    `);

    // Índices para client_notes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_notes_user ON client_notes(user_id, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_notes_scaffold ON client_notes(scaffold_id, created_at DESC) WHERE scaffold_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_notes_project ON client_notes(project_id, created_at DESC) WHERE project_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_notes_unresolved ON client_notes(is_resolved, created_at DESC) WHERE is_resolved = false`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_notes_target_type ON client_notes(target_type, created_at DESC)`);

    // Trigger para actualizar updated_at automáticamente en client_notes
    await client.query(`
      CREATE OR REPLACE FUNCTION update_client_notes_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_client_notes_updated_at'
        ) THEN
          CREATE TRIGGER trigger_update_client_notes_updated_at
            BEFORE UPDATE ON client_notes
            FOR EACH ROW
            EXECUTE FUNCTION update_client_notes_updated_at();
        END IF;
      END $$
    `);

    // Crear tabla de notificaciones in-app persistentes
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK(type IN ('new_client_note', 'note_resolved', 'scaffold_updated', 'project_assigned', 'note_urgent', 'system', 'scaffold_modification_added', 'modification_pending_approval', 'modification_approved', 'modification_rejected')),
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL CHECK(LENGTH(message) >= 1 AND LENGTH(message) <= 1000),
        metadata JSONB,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Índices para notifications
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(user_id, type, created_at DESC)`);

    logger.info('✅ Tabla notifications e índices creados/verificados');

    // Crear tabla de modificaciones de andamios (metros cúbicos adicionales)
    await client.query(`
      CREATE TABLE IF NOT EXISTS scaffold_modifications (
        id SERIAL PRIMARY KEY,
        scaffold_id INTEGER NOT NULL REFERENCES scaffolds(id) ON DELETE CASCADE,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        height DECIMAL NOT NULL CHECK(height > 0),
        width DECIMAL NOT NULL CHECK(width > 0),
        length DECIMAL NOT NULL CHECK(length > 0),
        cubic_meters DECIMAL NOT NULL CHECK(cubic_meters > 0),
        reason TEXT,
        approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Índices para scaffold_modifications
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scaffold_mods_scaffold ON scaffold_modifications(scaffold_id, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scaffold_mods_pending ON scaffold_modifications(approval_status, created_at DESC) WHERE approval_status = 'pending'`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scaffold_mods_status ON scaffold_modifications(scaffold_id, approval_status)`);

    // Trigger para auto-update de updated_at en scaffold_modifications
    await client.query(`
      CREATE OR REPLACE FUNCTION update_scaffold_modifications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_scaffold_modifications_updated_at'
        ) THEN
          CREATE TRIGGER trigger_update_scaffold_modifications_updated_at
            BEFORE UPDATE ON scaffold_modifications
            FOR EACH ROW
            EXECUTE FUNCTION update_scaffold_modifications_updated_at();
        END IF;
      END $$
    `);

    logger.info('✅ Tablas client_notes, notifications, scaffold_modifications creadas/verificadas');

    // Agregar columnas faltantes a scaffold_history si no existen
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'scaffold_history' AND column_name = 'scaffold_number'
        ) THEN
          ALTER TABLE scaffold_history ADD COLUMN scaffold_number VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'scaffold_history' AND column_name = 'project_name'
        ) THEN
          ALTER TABLE scaffold_history ADD COLUMN project_name VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'scaffold_history' AND column_name = 'area'
        ) THEN
          ALTER TABLE scaffold_history ADD COLUMN area VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'scaffold_history' AND column_name = 'tag'
        ) THEN
          ALTER TABLE scaffold_history ADD COLUMN tag VARCHAR(255);
        END IF;
      END $$;
    `);

    // Actualizar CHECK constraint de assembly_status para permitir 'in_progress'
    await client.query(`
      DO $$ 
      BEGIN
        -- Eliminar el constraint anterior si existe
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'scaffolds_assembly_status_check' 
          AND table_name = 'scaffolds'
        ) THEN
          ALTER TABLE scaffolds DROP CONSTRAINT scaffolds_assembly_status_check;
        END IF;
        
        -- Agregar el nuevo constraint con 'in_progress'
        ALTER TABLE scaffolds ADD CONSTRAINT scaffolds_assembly_status_check 
        CHECK (assembly_status IN ('assembled', 'disassembled', 'in_progress'));
      END $$;
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
