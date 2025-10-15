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
    role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'technician')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creación de la tabla de clientes
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creación de la tabla de proyectos
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creación de la tabla de andamios (anteriormente 'reports')
CREATE TABLE scaffolds (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scaffold_number VARCHAR(255),
    area VARCHAR(255),
    tag VARCHAR(255),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Creación de la tabla intermedia para asignar usuarios a proyectos
CREATE TABLE project_users (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- La inserción de usuarios se manejará a través del script de setup para asegurar el hasheo correcto de contraseñas.