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
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    specialty VARCHAR(255),
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

-- Creación de la tabla de empresas/solicitantes
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

-- Creación de la tabla de supervisores
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

-- Creación de la tabla de usuarios finales
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

-- Creación de la tabla de andamios (anteriormente 'reports')
CREATE TABLE scaffolds (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scaffold_number VARCHAR(255),
    area VARCHAR(255),
    tag VARCHAR(255),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
);

-- Creación de la tabla intermedia para asignar usuarios a proyectos
CREATE TABLE project_users (
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
-- DATOS INICIALES - Empresas Mandantes
-- ================================================================
INSERT INTO companies (name, contact_person, email, phone, address) 
VALUES 
    ('CMPC S.A.', 'Gerencia de Operaciones', 'contacto@cmpc.cl', '+56 41 2345678', 'Planta Laja, Región del Biobío, Chile')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- DATOS INICIALES - Empresas Clientes (Subcontrato)
-- ================================================================
INSERT INTO clients (name, email, phone, address, specialty) 
VALUES 
    ('CMPC S.A.', 'licitaciones@cmpc.cl', '+56 41 2345678', 'Av. El Golf 150, Las Condes, Santiago', 'Producción de Celulosa y Papel'),
    ('Massebal SpA', 'contacto@massebal.cl', '+56 41 2789456', 'Concepción, Región del Biobío', 'Montaje Industrial y Mantención'),
    ('Bunker Ingeniería y Construcción', 'proyectos@bunker.cl', '+56 41 2567890', 'Los Ángeles, Región del Biobío', 'Construcción Industrial y Montajes'),
    ('Simming S.A.', 'operaciones@simming.cl', '+56 41 2456789', 'Coronel, Región del Biobío', 'Servicios de Montaje y Mantención Industrial'),
    ('CMG Construcción y Montaje', 'contacto@cmg.cl', '+56 41 2678901', 'Talcahuano, Región del Biobío', 'Montaje de Estructuras y Andamios Industriales')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- DATOS INICIALES - Supervisores
-- ================================================================
INSERT INTO supervisors (first_name, last_name, email, phone, rut)
VALUES
    ('Carlos', 'Muñoz Silva', 'carlos.munoz@alltura.cl', '+56 9 8765 4321', '12.345.678-9'),
    ('María', 'González Torres', 'maria.gonzalez@alltura.cl', '+56 9 7654 3210', '13.456.789-0'),
    ('Roberto', 'Pérez Valdés', 'roberto.perez@alltura.cl', '+56 9 6543 2109', '14.567.890-1'),
    ('Patricia', 'Soto Ramírez', 'patricia.soto@alltura.cl', '+56 9 5432 1098', '15.678.901-2')
ON CONFLICT (first_name, last_name) DO NOTHING;

-- ================================================================
-- DATOS INICIALES - Usuarios Finales (Departamentos de CMPC)
-- ================================================================
INSERT INTO end_users (name, company_id, department, email, phone)
VALUES
    ('Departamento de Mantención - Planta Laja', (SELECT id FROM companies WHERE name = 'CMPC S.A.'), 'Mantención Industrial', 'mantencion.laja@cmpc.cl', '+56 41 2345679'),
    ('Área de Producción - Planta Laja', (SELECT id FROM companies WHERE name = 'CMPC S.A.'), 'Producción', 'produccion.laja@cmpc.cl', '+56 41 2345680'),
    ('Gerencia de Proyectos CMPC', (SELECT id FROM companies WHERE name = 'CMPC S.A.'), 'Proyectos', 'proyectos@cmpc.cl', '+56 41 2345681'),
    ('Departamento de Calidad', (SELECT id FROM companies WHERE name = 'CMPC S.A.'), 'Control de Calidad', 'calidad@cmpc.cl', '+56 41 2345682'),
    ('Equipo de Seguridad Industrial', (SELECT id FROM companies WHERE name = 'CMPC S.A.'), 'Seguridad y Prevención', 'seguridad@cmpc.cl', '+56 41 2345683')
ON CONFLICT (name) DO NOTHING;

-- La inserción de usuarios se manejará a través del script de setup para asegurar el hasheo correcto de contraseñas.