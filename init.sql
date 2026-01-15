-- Archivo: init.sql
-- Este script crea todas las tablas necesarias para la aplicación Alltura Reports.

-- Creación de la tabla de clientes (empresas mandantes) - PRIMERO
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  specialty VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creación de la tabla de usuarios (Actualizado)
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

-- Índice para mejorar búsquedas por empresa cliente
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);

-- Creación de la tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
  active BOOLEAN DEFAULT true,
  assigned_client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creación de la tabla de andamios (anteriormente 'reports')
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

-- Creación de la tabla de historial de andamios
-- Historial inmutable: sobrevive a la eliminación de andamios
CREATE TABLE IF NOT EXISTS scaffold_history (
    id SERIAL PRIMARY KEY,
    scaffold_id INTEGER REFERENCES scaffolds(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    change_type VARCHAR(100) NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    description TEXT,
    -- Campos denormalizados para preservar información tras eliminación
    scaffold_number VARCHAR(255),
    project_name VARCHAR(255),
    area VARCHAR(255),
    tag VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para optimizar consultas de historial por usuario
CREATE INDEX IF NOT EXISTS idx_scaffold_history_user ON scaffold_history(user_id, created_at DESC);

-- Creación de la tabla intermedia para asignar usuarios a proyectos
CREATE TABLE IF NOT EXISTS project_users (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subscription_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ================================================================
-- SISTEMA DE NOTAS DE CLIENTES Y NOTIFICACIONES IN-APP
-- ================================================================

-- Tabla de notas de clientes (polimórfica: para scaffolds o proyectos)
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
    resolution_notes TEXT CHECK(LENGTH(resolution_notes) <= 1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_target_exactly_one CHECK (
        (target_type = 'scaffold' AND scaffold_id IS NOT NULL AND project_id IS NULL) OR
        (target_type = 'project' AND project_id IS NOT NULL AND scaffold_id IS NULL)
    )
);

-- Índices para client_notes
CREATE INDEX IF NOT EXISTS idx_client_notes_user ON client_notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notes_scaffold ON client_notes(scaffold_id, created_at DESC) WHERE scaffold_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_notes_project ON client_notes(project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_notes_unresolved ON client_notes(is_resolved, created_at DESC) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_client_notes_target_type ON client_notes(target_type, created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_client_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_notes_updated_at
    BEFORE UPDATE ON client_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_client_notes_updated_at();

-- Tabla de notificaciones in-app persistentes
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
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(user_id, type, created_at DESC);

-- Tabla de modificaciones de andamios (metros cúbicos adicionales)
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
);

-- Índices para scaffold_modifications
CREATE INDEX IF NOT EXISTS idx_scaffold_mods_scaffold ON scaffold_modifications(scaffold_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scaffold_mods_pending ON scaffold_modifications(approval_status, created_at DESC) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scaffold_mods_status ON scaffold_modifications(scaffold_id, approval_status);

-- Trigger para auto-update de updated_at en scaffold_modifications
CREATE OR REPLACE FUNCTION update_scaffold_modifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scaffold_modifications_updated_at
    BEFORE UPDATE ON scaffold_modifications
    FOR EACH ROW
    EXECUTE FUNCTION update_scaffold_modifications_updated_at();

-- ================================================================
-- DATOS INICIALES - Empresas Clientes (Empresas Mandantes)
-- ================================================================
INSERT INTO clients (name, email, phone, address, specialty) 
VALUES 
    ('CMPC S.A.', 'licitaciones@cmpc.cl', '+56 41 2345678', 'Av. El Golf 150, Las Condes, Santiago', 'Producción de Celulosa y Papel'),
    ('Massebal SpA', 'contacto@massebal.cl', '+56 41 2789456', 'Concepción, Región del Biobío', 'Montaje Industrial y Mantención'),
    ('Bunker Ingeniería y Construcción', 'proyectos@bunker.cl', '+56 41 2567890', 'Los Ángeles, Región del Biobío', 'Construcción Industrial y Montajes'),
    ('Simming S.A.', 'operaciones@simming.cl', '+56 41 2456789', 'Coronel, Región del Biobío', 'Servicios de Montaje y Mantención Industrial'),
    ('CMG Construcción y Montaje', 'contacto@cmg.cl', '+56 41 2678901', 'Talcahuano, Región del Biobío', 'Montaje de Estructuras y Andamios Industriales')
ON CONFLICT (name) DO NOTHING;

-- La inserción de usuarios se manejará a través del script de setup para asegurar el hasheo correcto de contraseñas.