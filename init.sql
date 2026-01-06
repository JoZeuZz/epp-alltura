-- Archivo: init.sql
-- Este script crea todas las tablas necesarias para la aplicación Alltura Reports.

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creación de la tabla de clientes (empresas mandantes)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    specialty VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creación de la tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
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